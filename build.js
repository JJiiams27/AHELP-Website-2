import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputDir = path.join(__dirname, 'improved-website-v14');
const outputDir = path.join(__dirname, 'dist');

const nav = fs.readFileSync(path.join(inputDir, 'partials', 'nav.html'), 'utf8');
const footer = fs.readFileSync(path.join(inputDir, 'partials', 'footer.html'), 'utf8');

function render(content) {
  return content
    .replace(/{% include "partials\/nav.html" %}/g, nav)
    .replace(/{% include "partials\/footer.html" %}/g, footer);
}

fs.mkdirSync(outputDir, { recursive: true });
const entries = fs.readdirSync(inputDir, { withFileTypes: true });
for (const entry of entries) {
  const srcPath = path.join(inputDir, entry.name);
  const outPath = path.join(outputDir, entry.name);
  if (entry.isDirectory()) {
    if (entry.name === 'partials') continue; // skip partials
    fs.cpSync(srcPath, outPath, { recursive: true });
  } else if (entry.name.endsWith('.html')) {
    const content = fs.readFileSync(srcPath, 'utf8');
    const rendered = render(content);
    fs.writeFileSync(outPath, rendered);
  } else {
    fs.copyFileSync(srcPath, outPath);
  }
}
