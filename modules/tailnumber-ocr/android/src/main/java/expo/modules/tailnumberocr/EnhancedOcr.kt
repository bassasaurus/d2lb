package expo.modules.tailnumberocr

import android.graphics.*
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.Text
import com.google.mlkit.vision.text.TextRecognizer
import java.util.concurrent.TimeUnit
import kotlin.math.*

/** Bounded on-device image variants. No character substitutions or network calls. */
internal object EnhancedOcr {
  fun decode(path: String): Bitmap {
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    BitmapFactory.decodeFile(path, bounds)
    require(bounds.outWidth > 0 && bounds.outHeight > 0) { "Image unavailable" }
    var sample = 1
    while (max(bounds.outWidth, bounds.outHeight) / sample > 2200) sample *= 2
    return requireNotNull(BitmapFactory.decodeFile(path, BitmapFactory.Options().apply {
      inSampleSize = sample; inPreferredConfig = Bitmap.Config.ARGB_8888
    }))
  }

  // Ordered top-left, top-right, bottom-right, bottom-left. Only pixels in this
  // quadrilateral are retained; the surrounding guide/photo is never re-scanned.
  fun rectify(source: Bitmap, corners: List<List<Double>>): Bitmap {
    require(corners.size == 4 && corners.all { it.size == 2 && it.all { n -> n.isFinite() && n in 0.0..1.0 } })
    val pts = corners.map { PointF((it[0] * (source.width - 1)).toFloat(), (it[1] * (source.height - 1)).toFloat()) }
    var area = 0f
    for (i in 0..3) {
      val a = pts[i]; val b = pts[(i+1)%4]; val c = pts[(i+2)%4]
      require((b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x) > 0f) { "Crop corners must not cross" }
      area += a.x*b.y-b.x*a.y
    }
    require(area > source.width * source.height * 0.01f) { "Crop is too small" }
    fun distance(a: PointF,b: PointF) = hypot(a.x-b.x,a.y-b.y)
    val w=max(distance(pts[0],pts[1]),distance(pts[3],pts[2]))
    val h=max(distance(pts[0],pts[3]),distance(pts[1],pts[2]))
    val scale=(1200f/max(w,h)).coerceIn(0.25f,3f)
    val width=max(32,(w*scale).roundToInt()); val height=max(32,(h*scale).roundToInt())
    val out=Bitmap.createBitmap(width+48,height+48,Bitmap.Config.ARGB_8888)
    val matrix=Matrix()
    require(matrix.setPolyToPoly(pts.flatMap { listOf(it.x,it.y) }.toFloatArray(),0,
      floatArrayOf(24f,24f,width+24f,24f,width+24f,height+24f,24f,height+24f),0,4))
    Canvas(out).apply {
      drawColor(Color.WHITE)
      save();clipRect(24f,24f,width+24f,height+24f)
      drawBitmap(source,matrix,Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG));restore()
    }
    return out
  }

  private fun padded(source: Bitmap, angle: Float = 0f, smooth: Boolean = false): Bitmap {
    val size=1200f/max(source.width,source.height)
    val scaled=Bitmap.createScaledBitmap(source,max(1,(source.width*size).roundToInt()),max(1,(source.height*size).roundToInt()),true)
    val matrix=Matrix().apply { postRotate(angle) }
    var rotated=Bitmap.createBitmap(scaled,0,0,scaled.width,scaled.height,matrix,true)
    if(smooth) {
      // Averaging adjacent pixels suppresses display-grid/moire detail without
      // sharpening it. Keep a separate untouched pass for small characters.
      val small=Bitmap.createScaledBitmap(rotated,max(1,rotated.width/2),max(1,rotated.height/2),true)
      val soft=Bitmap.createScaledBitmap(small,rotated.width,rotated.height,true)
      small.recycle();if(rotated!==scaled) rotated.recycle();rotated=soft
    }
    val output=Bitmap.createBitmap(rotated.width+64,rotated.height+64,Bitmap.Config.ARGB_8888)
    Canvas(output).apply { drawColor(Color.WHITE);drawBitmap(rotated,32f,32f,Paint(Paint.FILTER_BITMAP_FLAG)) }
    if(rotated!==scaled) rotated.recycle()
    if(scaled!==source) scaled.recycle()
    return output
  }

  private fun levels(source: Bitmap): Bitmap {
    val pixels=IntArray(source.width*source.height);source.getPixels(pixels,0,source.width,0,0,source.width,source.height)
    val histogram=IntArray(256)
    for(i in pixels.indices) { val c=pixels[i];val gray=(Color.red(c)*77+Color.green(c)*150+Color.blue(c)*29)/256;pixels[i]=gray;histogram[gray]++ }
    val threshold=max(1,pixels.size/100)
    var low=0;var high=255;var sum=0
    while(low<254 && sum+histogram[low]<threshold) {sum+=histogram[low];low++}
    sum=0;while(high>low+1 && sum+histogram[high]<threshold) {sum+=histogram[high];high--}
    val range=max(32,high-low)
    for(i in pixels.indices) { val gray=((pixels[i]-low)*255/range).coerceIn(0,255);pixels[i]=Color.rgb(gray,gray,gray) }
    return Bitmap.createBitmap(pixels,source.width,source.height,Bitmap.Config.ARGB_8888)
  }

  fun recognize(source: Bitmap, recognizer: TextRecognizer, corners: List<List<Double>> = emptyList(), lineReader: PaddleLineReader? = null, detector: PaddleTextDetector? = null, onUncertain: () -> Unit = {}): List<List<String>> {
    val selected=if(corners.isEmpty()) source else rectify(source,corners)
    val passes=mutableListOf<List<String>>()
    val modelPasses=mutableListOf<List<String>>()
    fun modelRead(image: Bitmap): String? {
      if(lineReader==null) return null
      val reading=lineReader.read(image)
      val value=reading.text.uppercase(java.util.Locale.ROOT).replace("\\s".toRegex(),"")
      // Coarse shape check only; exact grammar and disclosed look-alikes remain
      // in the shared JS layer. A second engine must not invent missing text.
      if(reading.confidence>=0.5f && Regex("N[A-Z0-9|!]{2,5}|(?:[A-Z]{1,3}|[0-9][A-Z]|[A-Z][0-9])-[A-Z0-9]{2,5}|(?:JA|JR|HL|B)[A-Z0-9]{2,5}").matches(value))
        {if(reading.confidence<0.8f)onUncertain();modelPasses.add(listOf(reading.text));return reading.text}
      return null
    }
    val deadline=System.nanoTime()+TimeUnit.SECONDS.toNanos(14)
    fun read(image: Bitmap): Text {
      val remaining=deadline-System.nanoTime()
      check(remaining>0) { "Recognition timed out" }
      return Tasks.await(recognizer.process(InputImage.fromBitmap(image,0)),remaining,TimeUnit.NANOSECONDS)
    }
    fun lines(text: Text)=text.textBlocks.flatMap { block -> block.lines.map { it.text } }
    try {
      if(detector!=null && lineReader!=null) {
        val geometric=mutableListOf<String>()
        for(quad in detector.detect(selected)) {
          if(System.nanoTime()>deadline-TimeUnit.SECONDS.toNanos(2)) break
          val strip=try {rectify(selected,quad)} catch(_:IllegalArgumentException) {continue}
          try {
            modelRead(strip)?.let {geometric.add(it)}
            val light=levels(strip)
            try {modelRead(light)?.let {geometric.add(it)}} finally {light.recycle()}
          } finally {strip.recycle()}
        }
        // Do not let a whole-picture line guess outweigh separately detected
        // physical registrations. All regions are one pass for ambiguity checks.
        if(geometric.isNotEmpty())return listOf(geometric.distinct())
      }
      val original=padded(selected)
      try {
        modelRead(selected)
        val first=read(original);passes.add(lines(first))
        val light=levels(original)
        try {modelRead(light);passes.add(lines(read(light)))} finally {light.recycle()}
        // Rectify detected text quadrilaterals before trying general rotations.
        // Use geometry, not hard-coded aircraft registrations or guessed letters.
        val regions=first.textBlocks.flatMap {it.lines}.filter {
          it.text.length in 3..18 && it.text.any { c -> c.isDigit() || c=='-' } && it.cornerPoints?.size==4
        }.sortedByDescending { it.boundingBox?.let { box -> box.width()*box.height() } ?: 0 }.take(4)
        for(line in regions) {
          if(System.nanoTime()>deadline-TimeUnit.SECONDS.toNanos(2)) break
          val points=line.cornerPoints!!;val cx=points.map {it.x}.average();val cy=points.map {it.y}.average()
          val quad=points.map {listOf(((cx+(it.x-cx)*1.18)/(original.width-1)).coerceIn(0.0,1.0),((cy+(it.y-cy)*1.3)/(original.height-1)).coerceIn(0.0,1.0))}
          val corrected=try {rectify(original,quad)} catch(_:IllegalArgumentException) {continue}
          try {modelRead(corrected);passes.add(lines(read(corrected)))} finally {corrected.recycle()}
        }
      } finally {original.recycle()}
      // LCD pass and bounded angle/orientation retries. Preserve all distinct
      // readings so JS can require agreement rather than pick the first guess.
      for(angle in listOf(0f,-15f,15f,-30f,30f,180f)) {
        if(System.nanoTime()>deadline-TimeUnit.SECONDS.toNanos(2)) break
        val variant=padded(selected,angle,smooth=angle==0f)
        try {modelRead(variant);passes.add(lines(read(variant)))} finally {variant.recycle()}
      }
      return if(modelPasses.isEmpty()) passes else modelPasses
    } catch (error: java.util.concurrent.TimeoutException) {
      if(passes.isEmpty()) throw error
      return if(modelPasses.isEmpty()) passes else modelPasses
    } finally {if(selected!==source) selected.recycle()}
  }
}
