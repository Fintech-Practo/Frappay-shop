import fs from "node:fs";
import path from "node:path";
import { PNG } from "../../backend/node_modules/pngjs/lib/png.js";

const inputPath = path.resolve("src/assets/Logo.png");
const outputPath = path.resolve("src/assets/LogoTransparent.png");

const source = fs.readFileSync(inputPath);
const png = PNG.sync.read(source);

for (let i = 0; i < png.data.length; i += 4) {
  const r = png.data[i];
  const g = png.data[i + 1];
  const b = png.data[i + 2];

  if (r < 20 && g < 20 && b < 20) {
    png.data[i + 3] = 0;
  }
}

fs.writeFileSync(outputPath, PNG.sync.write(png));
console.log(`Transparent logo written to ${outputPath}`);
