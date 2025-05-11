const fs = require('fs');
const https = require('https');
const path = require('path');
const unzipper = require('unzipper');

const MODEL_ZIP_URL = process.env.MODEL_ZIP_URL;
const zipPath = path.resolve(__dirname, '../../../tmp/ner_onnx.zip');
const extractTo = path.resolve(__dirname, '../../resources/ner_onnx');

async function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, response => {
            if (response.statusCode !== 200) {
                return reject(`Download failed: ${response.statusCode}`);
            }
            response.pipe(file);
            file.on('finish', () => file.close(resolve));
        }).on('error', reject);
    });
}

async function unzipFile(zip, dest) {
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
