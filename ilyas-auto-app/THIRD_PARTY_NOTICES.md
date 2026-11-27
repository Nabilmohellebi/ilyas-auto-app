Third-party components used by the vehicle photo plate editor

## License plate detector

The plate bounding-box detector is loaded at runtime from the pinned
`faisalthaheem/open-lpr-models` Hugging Face repository revision
`detector-2026.10.1`:

- Artifact: `onnx/plate_yolox_tiny_640.onnx`
- Upstream project: https://github.com/faisalthaheem/open-lpr
- Model repository: https://huggingface.co/faisalthaheem/open-lpr-models
- Model card and provenance: https://huggingface.co/faisalthaheem/open-lpr-models/blob/detector-2026.10.1/README.md
- License: Apache License 2.0 (full text copied to `LICENSES/OPEN_LPR_MODEL_APACHE_2.0.txt`)
- Upstream notice: Copyright the open-lpr contributors. See https://huggingface.co/faisalthaheem/open-lpr-models/blob/detector-2026.10.1/NOTICE

Only the plate detector is used. The OCR model and its character dictionary
are not downloaded or used by this website.

## ONNX Runtime Web

Browser inference uses `onnxruntime-web` version 1.31.1:

- Project: https://github.com/microsoft/onnxruntime
- Package: https://www.npmjs.com/package/onnxruntime-web
- License: MIT (distributed with the npm package).
