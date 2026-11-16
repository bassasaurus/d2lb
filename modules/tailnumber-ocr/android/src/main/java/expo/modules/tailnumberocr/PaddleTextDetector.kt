package expo.modules.tailnumberocr

import android.content.Context
import android.graphics.Bitmap
import ai.onnxruntime.OnnxTensor
import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.OrtSession
import java.io.Closeable
import java.nio.FloatBuffer
import kotlin.math.*

/** DB scene-text heatmap -> bounded connected components -> oriented boxes. */
internal class PaddleTextDetector(context: Context): Closeable {
  private val environment=OrtEnvironment.getEnvironment().apply {setTelemetry(false)}
  private val session=OrtSession.SessionOptions().use {options ->
    options.setIntraOpNumThreads(2);options.setInterOpNumThreads(1)
    options.setOptimizationLevel(OrtSession.SessionOptions.OptLevel.ALL_OPT)
    val bytes=context.assets.open("tailnumber-ocr/ch_PP-OCRv5_det_mobile.onnx").use {it.readBytes()}
    environment.createSession(bytes,options)
  }
  private data class Point(val x: Double,val y: Double)
  private fun cross(a: Point,b: Point,c: Point)=(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)
  private fun hull(points: List<Point>): List<Point> {
    val ordered=points.distinct().sortedWith(compareBy<Point> {it.x}.thenBy {it.y})
    if(ordered.size<3)return ordered
    fun half(sequence: List<Point>): MutableList<Point> {
      val result=mutableListOf<Point>()
      for(p in sequence) {while(result.size>=2 && cross(result[result.size-2],result.last(),p)<=0)result.removeAt(result.lastIndex);result.add(p)}
      return result
    }
    val lower=half(ordered);val upper=half(ordered.reversed());lower.removeAt(lower.lastIndex);upper.removeAt(upper.lastIndex)
    return lower+upper
  }
  private fun box(points: List<Point>,width: Int,height: Int): Pair<Double,List<List<Double>>>? {
    val boundary=hull(points);if(boundary.size<3)return null
    var bestArea=Double.MAX_VALUE;var best: DoubleArray?=null
    for(i in boundary.indices) {
      val a=boundary[i];val b=boundary[(i+1)%boundary.size]
      var angle=atan2(b.y-a.y,b.x-a.x)
      val c=cos(angle);val s=sin(angle)
      val us=boundary.map {it.x*c+it.y*s};val vs=boundary.map {-it.x*s+it.y*c}
      val u0=us.min();val u1=us.max();val v0=vs.min();val v1=vs.max()
      val area=(u1-u0)*(v1-v0)
      if(area<bestArea) {bestArea=area;best=doubleArrayOf(angle,u0,u1,v0,v1)}
    }
    val values=best?:return null
    var angle=values[0];var u0=values[1];var u1=values[2];var v0=values[3];var v1=values[4]
    // Re-project on a left-to-right long axis; a min-area rectangle may start
    // with any of its four edges. Do not silently reverse the character order.
    if(u1-u0<v1-v0)angle+=Math.PI/2
    while(angle>Math.PI/2)angle-=Math.PI
    while(angle< -Math.PI/2)angle+=Math.PI
    val c=cos(angle);val s=sin(angle)
    val us=boundary.map {it.x*c+it.y*s};val vs=boundary.map {-it.x*s+it.y*c}
    u0=us.min();u1=us.max();v0=vs.min();v1=vs.max()
    if(u1-u0<5 || v1-v0<3)return null
    // DB predicts a shrunken text polygon. Expand to retain character edges.
    val padding=(u1-u0)*(v1-v0)*1.6/(2*((u1-u0)+(v1-v0)))+2
    u0-=padding;u1+=padding;v0-=padding;v1+=padding
    val quad=listOf(Point(u0,v0),Point(u1,v0),Point(u1,v1),Point(u0,v1)).map {
      listOf(((it.x*c-it.y*s)/(width-1)).coerceIn(0.0,1.0),((it.x*s+it.y*c)/(height-1)).coerceIn(0.0,1.0))
    }
    return Pair(bestArea,quad)
  }
  fun detect(source: Bitmap): List<List<List<Double>>> {
    val scale=min(736.0/min(source.width,source.height),1408.0/max(source.width,source.height))
    val width=max(32,(source.width*scale/32).roundToInt()*32)
    val height=max(32,(source.height*scale/32).roundToInt()*32)
    val resized=Bitmap.createScaledBitmap(source,width,height,true)
    val pixels=IntArray(width*height)
    try {resized.getPixels(pixels,0,width,0,0,width,height)}finally {if(resized!==source)resized.recycle()}
    val input=FloatArray(3*width*height)
    for(i in pixels.indices) {val p=pixels[i];input[i]=(p and 255)/127.5f-1f;input[width*height+i]=((p shr 8) and 255)/127.5f-1f;input[2*width*height+i]=((p shr 16) and 255)/127.5f-1f}
    OnnxTensor.createTensor(environment,FloatBuffer.wrap(input),longArrayOf(1,3,height.toLong(),width.toLong())).use {tensor ->
      session.run(mapOf(session.inputNames.first() to tensor)).use {result ->
        @Suppress("UNCHECKED_CAST")val map=(result[0].value as Array<Array<Array<FloatArray>>>)[0][0]
        val rows=map.size;val cols=map[0].size
        val mask=BooleanArray(rows*cols)
        for(y in 0 until rows)for(x in 0 until cols)if(map[y][x]>.3f) {
          mask[y*cols+x]=true
          if(x+1<cols)mask[y*cols+x+1]=true
          if(y+1<rows)mask[(y+1)*cols+x]=true
          if(x+1<cols && y+1<rows)mask[(y+1)*cols+x+1]=true
        }
        val visited=BooleanArray(mask.size);val queue=IntArray(mask.size)
        val boxes=mutableListOf<Pair<Double,List<List<Double>>>>()
        var components=0
        for(start in mask.indices) {
          if(!mask[start] || visited[start])continue
          if(++components>1000)break
          var head=0;var tail=1;queue[0]=start;visited[start]=true
          val boundary=mutableListOf<Point>();var confidence=0.0;var core=0
          while(head<tail) {
            val index=queue[head++];val x=index%cols;val y=index/cols
            if(map[y][x]>.3f) {confidence+=map[y][x];core++}
            var edge=false
            for(dy in -1..1)for(dx in -1..1) {
              if(dx==0 && dy==0)continue
              val nx=x+dx;val ny=y+dy
              if(nx !in 0 until cols || ny !in 0 until rows || !mask[ny*cols+nx]) {edge=true;continue}
              val next=ny*cols+nx
              if(!visited[next]) {visited[next]=true;queue[tail++]=next}
            }
            if(edge)boundary.add(Point(x.toDouble(),y.toDouble()))
          }
          if(tail<12 || core==0 || confidence/core<.5)continue
          box(boundary,cols,rows)?.let {boxes.add(it)}
        }
        return boxes.sortedByDescending {it.first}.take(8).map {it.second}
      }
    }
  }
  override fun close() {session.close()}
}
