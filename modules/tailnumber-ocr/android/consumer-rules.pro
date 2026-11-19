# ONNX calls Java metadata/value classes through JNI. R8 cannot see these calls.
# Required by https://onnxruntime.ai/docs/build/android.html
-keep class ai.onnxruntime.** { *; }
