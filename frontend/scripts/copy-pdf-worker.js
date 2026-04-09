import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const workerPath = path.resolve(__dirname, '../node_modules/pdfjs-dist/build/pdf.worker.min.mjs');
const destPath = path.resolve(__dirname, '../public/pdf.worker.min.mjs');

console.log(`Copying PDF worker from ${workerPath} to ${destPath}...`);

try {
    fs.copyFileSync(workerPath, destPath);
    console.log('PDF worker copied successfully!');
} catch (err) {
    console.error('Error copying PDF worker:', err);
    process.exit(1);
}