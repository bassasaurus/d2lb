package expo.modules.tailnumberocr

import android.net.Uri
import java.util.concurrent.Executors
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class TailnumberOcrModule : Module() {
  private val worker = Executors.newSingleThreadExecutor()
  override fun definition() = ModuleDefinition {
    Name("TailnumberOcr")
    OnDestroy { worker.shutdown() }
    AsyncFunction("recognizeEnhanced") { uri: String, corners: List<List<Double>>, promise: Promise ->
      if (Uri.parse(uri).scheme != "file") {
        promise.reject("OCR_IMAGE", "Choose a local camera image.", null)
      } else worker.execute {
        val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
        try {
          val bitmap = EnhancedOcr.decode(requireNotNull(Uri.parse(uri).path))
          try {
            val context=requireNotNull(appContext.reactContext)
            PaddleLineReader(context).use {reader -> PaddleTextDetector(context).use {detector ->
              var lowConfidence=false
              val passes=EnhancedOcr.recognize(bitmap, recognizer, corners, reader, detector) {lowConfidence=true}
              promise.resolve(mapOf("passes" to passes,"lowConfidence" to lowConfidence))
            }}
          }
          finally { bitmap.recycle() }
        } catch (error: Exception) {
          promise.reject("OCR_FAILED", "Could not read the registration.", error)
        } finally { recognizer.close() }
      }
    }
    AsyncFunction("recognize") { uri: String, promise: Promise ->
      val context = appContext.reactContext
      if (context == null || Uri.parse(uri).scheme != "file") {
        promise.reject("OCR_IMAGE", "Choose a local camera image.", null)
        return@AsyncFunction
      }
      val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
      try {
        val image = InputImage.fromFilePath(context, Uri.parse(uri))
        recognizer.process(image)
          .addOnSuccessListener { result ->
            promise.resolve(result.textBlocks.flatMap { block -> block.lines.map { it.text } })
          }
          .addOnFailureListener { error -> promise.reject("OCR_FAILED", "Could not read the registration.", error) }
          .addOnCompleteListener { recognizer.close() }
      } catch (error: Exception) {
        recognizer.close()
        promise.reject("OCR_FAILED", "Could not read the registration.", error)
      }
    }
  }
}
