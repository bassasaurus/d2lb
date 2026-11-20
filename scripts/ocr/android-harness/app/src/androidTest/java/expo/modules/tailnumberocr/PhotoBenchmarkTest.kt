package expo.modules.tailnumberocr
import android.graphics.BitmapFactory
import android.util.Log
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import com.google.mlkit.vision.common.InputImage
import com.google.android.gms.tasks.Tasks
import org.junit.Test
import org.junit.runner.RunWith
import org.json.JSONArray
import java.io.File
import java.util.concurrent.TimeUnit
@RunWith(AndroidJUnit4::class)
class PhotoBenchmarkTest {
 @Test fun photos() {
  val context=InstrumentationRegistry.getInstrumentation().context
  val target=InstrumentationRegistry.getInstrumentation().targetContext
  val cases=JSONArray(context.assets.open("cases.json").bufferedReader().readText())
  val output=JSONArray()
  val recognizer=TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
  try {PaddleLineReader(target).use {reader -> PaddleTextDetector(target).use {detector ->
   for(i in 0 until cases.length()) {
    val row=cases.getJSONObject(i)
    val image=context.assets.open(row.getString("file")).use {BitmapFactory.decodeStream(it)}
    try {
     var uncertain=false
     val start=System.nanoTime()
     try {
      val passes=EnhancedOcr.recognize(image,recognizer,emptyList(),reader,detector) {uncertain=true}
      val legacy=Tasks.await(recognizer.process(InputImage.fromBitmap(image,0)),20,TimeUnit.SECONDS).textBlocks.flatMap {it.lines.map {line->line.text}}
      row.put("passes",JSONArray(passes.map {JSONArray(it)})).put("legacyLines",JSONArray(legacy))
     } catch(e:Exception) {row.put("passes",JSONArray()).put("error",e.javaClass.simpleName)}
     row.put("lowConfidence",uncertain).put("milliseconds",(System.nanoTime()-start)/1000000)
     output.put(row)
     File(target.filesDir.apply {mkdirs()},"benchmark.json").writeText(output.toString(2))
     Log.i("D2LB_BENCH",row.toString())
    } finally {image.recycle()}
   }
  }}} finally {recognizer.close()}
 }
}
