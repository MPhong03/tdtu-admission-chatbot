const fs = require('fs');
const path = require('path');
const unzipper = require('unzipper');
const dotenv = require("dotenv");

dotenv.config();

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const MODEL_ZIP_URL = process.env.MODEL_ZIP_URL;
const zipPath = path.resolve(__dirname, '../../../tmp/ner_onnx.zip');
const extractTo = path.resolve(__dirname, '../../resources/ner_onnx');

async function downloadFile(url, dest) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Download failed: ${res.status}`);

    await new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        res.body.pipe(file);
        res.body.on('error', reject);
        file.on('finish', resolve);
    });
}

async function unzipFile(zip, dest) {
    console.log('✅ File downloaded, size:', fs.statSync(dest).size);
    return fs.createReadStream(zip).pipe(unzipper.Extract({ path: dest })).promise();
}

(async () => {
    try {
        if (fs.existsSync(path.join(extractTo, 'model.onnx'))) {
            console.log('✅ Model already exists, skipping download.');
            return;
        }

        console.log('📥 Downloading model...');
        await downloadFile(MODEL_ZIP_URL, zipPath);

        console.log('📦 Extracting model...');
        await unzipFile(zipPath, extractTo);

        console.log('✅ Model ready at:', extractTo);
    } catch (err) {
        console.error('❌ Failed to prepare model:', err);
        process.exit(1);
    }
})();
