package expo.modules.tailnumberocr

import android.content.Context
import android.graphics.Bitmap
import ai.onnxruntime.OnnxTensor
import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.OrtSession
import java.io.Closeable
import java.nio.FloatBuffer
import kotlin.math.*

/** Bundled PP-OCRv5 English line recognizer. No download or remote inference. */
internal class PaddleLineReader(context: Context): Closeable {
  private val environment=OrtEnvironment.getEnvironment().apply {setTelemetry(false)}
  private val session=OrtSession.SessionOptions().use {options ->
    options.setIntraOpNumThreads(2);options.setInterOpNumThreads(1)
    options.setOptimizationLevel(OrtSession.SessionOptions.OptLevel.ALL_OPT)
    val bytes=context.assets.open("tailnumber-ocr/en_PP-OCRv5_rec_mobile.onnx").use {it.readBytes()}
    environment.createSession(bytes,options)
  }
  private val characters=listOf("")+requireNotNull(session.metadata.customMetadata["character"]).trimEnd('\n', '\r').split("\n")+listOf(" ")
  data class Reading(val text: String,val confidence: Float)
  fun read(source: Bitmap): Reading {
    val height=48
    val resizedWidth=ceil(height.toDouble()*source.width/source.height).toInt().coerceIn(1,1024)
    val width=max(320,resizedWidth)
    val resized=Bitmap.createScaledBitmap(source,resizedWidth,height,true)
    val pixels=IntArray(resizedWidth*height)
    try {resized.getPixels(pixels,0,resizedWidth,0,0,resizedWidth,height)}
    finally {if(resized!==source) resized.recycle()}
    val input=FloatArray(3*height*width)
    for(y in 0 until height) for(x in 0 until resizedWidth) {
      val pixel=pixels[y*resizedWidth+x];val offset=y*width+x
      // PP-OCR's BGR, CHW, [-1,1] input. Unused width is normalized-zero padding.
      input[offset]=(pixel and 255)/127.5f-1f
      input[height*width+offset]=((pixel shr 8) and 255)/127.5f-1f
      input[2*height*width+offset]=((pixel shr 16) and 255)/127.5f-1f
    }
    OnnxTensor.createTensor(environment,FloatBuffer.wrap(input),longArrayOf(1,3,height.toLong(),width.toLong())).use {tensor ->
      session.run(mapOf(session.inputNames.first() to tensor)).use {result ->
        @Suppress("UNCHECKED_CAST") val steps=(result[0].value as Array<Array<FloatArray>>)[0]
        val output=StringBuilder();var previous=-1;var confidence=0f;var count=0
        for(step in steps) {
          require(step.size==characters.size) {"OCR character dictionary mismatch"}
          var best=0
          for(i in 1 until step.size) if(step[i]>step[best]) best=i
          if(best!=0 && best!=previous) {output.append(characters[best]);confidence+=step[best];count++}
          previous=best
        }
        return Reading(output.toString(),if(count==0) 0f else confidence/count)
      }
    }
  }
  override fun close() {session.close()}
}
