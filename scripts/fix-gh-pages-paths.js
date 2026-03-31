const fs = require('fs');
const path = require('path');

const distIndexPath = path.join(__dirname, '..', 'dist', 'index.html');

if (!fs.existsSync(distIndexPath)) {
  console.error('dist/index.html was not found. Run the web export before this script.');
  process.exit(1);
}

const html = fs.readFileSync(distIndexPath, 'utf8');

// Expo web export emits root-absolute URLs for scripts and assets.
// This breaks on GitHub Pages project sites hosted under /<repo-name>/.
// Rewrite all root-absolute paths to relative ones.
let fixedHtml = html;

// Fix script/link/img src and href that start with /
fixedHtml = fixedHtml.replace(/((?:src|href)=")\/(?!\/)/g, '$1./');

if (fixedHtml !== html) {
  fs.writeFileSync(distIndexPath, fixedHtml, 'utf8');
  console.log('Updated dist/index.html to use relative asset paths.');
} else {
  console.log('No root-absolute asset paths found in dist/index.html.');
}
