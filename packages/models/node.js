import filePath from 'node:path'
import { fileURLToPath } from 'node:url'

export default {
  detectionPath: resolve('./assets/en_PP-OCRv3_det_infer.onnx'),
  recognitionPath: resolve('./assets/en_PP-OCRv3_rec_infer.onnx'),
  dictionaryPath: resolve('./assets/en_dict.txt'),
}

function resolve(path) {
  return filePath.resolve(filePath.dirname(fileURLToPath(import.meta.url)), path)
}
