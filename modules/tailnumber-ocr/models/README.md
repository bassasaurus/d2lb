# Bundled English line-recognition model

- Model: PaddleOCR `en_PP-OCRv5_mobile_rec`, ONNX conversion by RapidAI.
- Source: https://www.modelscope.cn/models/RapidAI/RapidOCR/resolve/v3.10.0/onnx/PP-OCRv5/rec/en_PP-OCRv5_rec_mobile.onnx
- PaddleOCR source/license: https://github.com/PaddlePaddle/PaddleOCR (Apache-2.0).
- Conversion source/license: https://github.com/RapidAI/RapidOCR (Apache-2.0).
- SHA-256: `c3461add59bb4323ecba96a492ab75e06dda42467c9e3d0c18db5d1d21924be8`.
- Retrieved 2026-11-16. Size: 7872351 bytes.

The model is shipped in Android assets. Recognition uses ONNX Runtime locally;
there are no first-run model downloads or image uploads. ONNX Runtime telemetry
is explicitly disabled. The character dictionary is read from model metadata and
its size is checked against each inference output. ML Kit supplies text geometry;
the scene-text model re-reads the selected line and the corrected regions.

Upstream licenses are included here. The model and runtime add to APK size; this
is intentional to support offline first use. Do not claim benchmark accuracy from
manually rectified samples as first-scan accuracy.

Scene-text detector: `ch_PP-OCRv5_mobile_det`, converted by RapidAI, bundled as
`ch_PP-OCRv5_det_mobile.onnx`. SHA-256: `4d97c44a20d30a81aad087d6a396b08f786c4635742afc391f6621f5c6ae78ae`.
Source: https://www.modelscope.cn/models/RapidAI/RapidOCR/resolve/v3.10.0/onnx/PP-OCRv5/det/ch_PP-OCRv5_det_mobile.onnx
The detector runs before line recognition. Connected text areas are bounded,
scored, expanded and straightened locally. Model weights are not trained or
modified for the supplied test photos. Fallbacks retain the original guide limit.
