package expo.modules.tailnumberocr

import android.graphics.*
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class EnhancedOcrTest {
  private fun registration(): Bitmap {
    val bitmap=Bitmap.createBitmap(1000,300,Bitmap.Config.ARGB_8888)
    Canvas(bitmap).apply {
      drawColor(Color.rgb(220,225,220))
      drawText("N123AB",90f,210f,Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color=Color.rgb(65,70,65);textSize=160f;typeface=Typeface.create(Typeface.MONOSPACE,Typeface.BOLD)
      })
    }
    return bitmap
  }
  @Test fun rejectsCrossedOrOutOfGuideCorners() {
    val image=registration()
    try {
      for(points in listOf(
        listOf(listOf(0.0,0.0),listOf(1.0,1.0),listOf(1.0,0.0),listOf(0.0,1.0)),
        listOf(listOf(-0.1,0.0),listOf(1.0,0.0),listOf(1.0,1.0),listOf(0.0,1.0)))) {
        try { EnhancedOcr.rectify(image,points).recycle();fail("Invalid crop accepted") }
        catch(_:IllegalArgumentException) { /* Expected */ }
      }
    } finally {image.recycle()}
  }
  @Test fun perspectiveCorrectionReadsTheSelectedRegistration() {
    val original=registration()
    val photographed=Bitmap.createBitmap(1400,700,Bitmap.Config.ARGB_8888)
    val destination=floatArrayOf(100f,100f,1250f,280f,1180f,520f,180f,610f)
    val matrix=Matrix().apply {setPolyToPoly(floatArrayOf(0f,0f,999f,0f,999f,299f,0f,299f),0,destination,0,4)}
    Canvas(photographed).apply {drawColor(Color.WHITE);drawBitmap(original,matrix,Paint(Paint.FILTER_BITMAP_FLAG))}
    val corners=(0..3).map {i -> listOf(destination[i*2].toDouble()/1399,destination[i*2+1].toDouble()/699)}
    val recognizer=TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
    try {
      val passes=EnhancedOcr.recognize(photographed,recognizer,corners)
      assertTrue("Rectified registration missing",passes.flatten().any {it.replace(" ","")=="N123AB"})
    } finally {recognizer.close();original.recycle();photographed.recycle()}
  }
  @Test fun lcdStyleGridAndLowContrastRetainAReadablePass() {
    val image=registration()
    Canvas(image).apply {
      val paint=Paint().apply {color=Color.argb(28,255,255,255);strokeWidth=1f}
      for(x in 0 until image.width step 3) drawLine(x.toFloat(),0f,x.toFloat(),image.height.toFloat(),paint)
      for(y in 0 until image.height step 3) drawLine(0f,y.toFloat(),image.width.toFloat(),y.toFloat(),paint)
    }
    val recognizer=TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
    try {
      val passes=EnhancedOcr.recognize(image,recognizer)
      assertTrue("LCD-style registration missing",passes.flatten().any {it.replace(" ","")=="N123AB"})
      assertTrue("Image variants were not run",passes.size>=3)
    } finally {recognizer.close();image.recycle()}
  }
  @Test fun bundledSceneTextModelReadsKnownRegistration() {
    val image=registration()
    val context=InstrumentationRegistry.getInstrumentation().targetContext
    try {PaddleLineReader(context).use {reader ->
      val reading=reader.read(image)
      assertEquals("N123AB",reading.text.replace(" ",""))
      assertTrue("Low model confidence on known image",reading.confidence>=0.7f)
    }} finally {image.recycle()}
  }

}
