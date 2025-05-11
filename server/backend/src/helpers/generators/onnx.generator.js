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

    fs.mkdirSync(path.dirname(dest), { recursive: true });

    await new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        res.body.pipe(file);
        res.body.on('error', reject);
        file.on('finish', resolve);
    });
}

async function unzipFile(zip, dest) {
    const size = fs.statSync(zip).size;
    console.log('✅ File downloaded, size:', size);
    if (size < 100_000) {
        throw new Error(`Downloaded file too small to be valid zip (size: ${size} bytes)`);
    }

    return fs.createReadStream(zip).pipe(unzipper.Extract({ path: dest })).promise();
}

(async () => {
    try {
        const alreadyUnzipped = fs.existsSync(path.join(extractTo, 'model.onnx'));
        const zipExists = fs.existsSync(zipPath);

        if (alreadyUnzipped) {
            console.log('✅ Model already extracted, skipping.');
            return;
        }

        if (!zipExists) {
            console.log('📥 Downloading model...');
            await downloadFile(MODEL_ZIP_URL, zipPath);
        } else {
            console.log('📦 Zip already exists, skipping download.');
        }

        console.log('📦 Extracting model...');
        await unzipFile(zipPath, extractTo);

        console.log('✅ Model ready at:', extractTo);
    } catch (err) {
        console.error('❌ Failed to prepare model:', err);
        process.exit(1);
    }
})();
