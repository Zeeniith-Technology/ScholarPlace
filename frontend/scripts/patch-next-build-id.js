/**
 * Ensures Next.js build doesn't throw "generate is not a function" when
 * config.generateBuildId is undefined (e.g. config loading quirk on Windows).
 * Run after npm install (postinstall).
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(
  __dirname,
  '..',
  'node_modules',
  'next',
  'dist',
  'build',
  'generate-build-id.js'
);

if (!fs.existsSync(filePath)) {
  process.exit(0);
}

let content = fs.readFileSync(filePath, 'utf8');
const guard = `if (typeof generate !== 'function') {
        generate = () => null;
    }
    `;

if (content.includes("if (typeof generate !== 'function')")) {
  process.exit(0);
}

const target = 'async function generateBuildId(generate, fallback) {\n    let buildId = await generate();';
const replacement = 'async function generateBuildId(generate, fallback) {\n    if (typeof generate !== \'function\') {\n        generate = () => null;\n    }\n    let buildId = await generate();';

if (!content.includes(target)) {
  process.exit(0);
}

content = content.replace(target, replacement);
fs.writeFileSync(filePath, content);
console.log('Patched next/dist/build/generate-build-id.js for generateBuildId fallback.');
