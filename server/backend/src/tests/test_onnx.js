const ort = require('onnxruntime-node');

async function main() {
  try {
    const session = await ort.InferenceSession.create('src/resources/ner_onnx/model.onnx');
    console.log('ONNX loaded successfully');
  } catch (err) {
    console.error('ONNX load failed:', err);
  }
}

main();
