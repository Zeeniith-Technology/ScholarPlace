const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const publicDir = path.join(__dirname, '..', 'public', 'images');
const src = path.join(publicDir, 'Small_Logo.png');
const dest = path.join(publicDir, 'favicon.png');

if (!fs.existsSync(src)) {
  console.error('Source image not found:', src);
  process.exit(1);
}

sharp(src)
  .resize(32, 32)
  .png()
  .toFile(dest)
  .then(() => console.log('Favicon saved:', dest))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
