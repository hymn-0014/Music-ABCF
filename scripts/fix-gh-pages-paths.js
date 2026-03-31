const fs = require('fs');
const path = require('path');

const distIndexPath = path.join(__dirname, '..', 'dist', 'index.html');

if (!fs.existsSync(distIndexPath)) {
  console.error('dist/index.html was not found. Run the web export before this script.');
  process.exit(1);
}

const html = fs.readFileSync(distIndexPath, 'utf8');

// Expo web export emits a root-absolute script URL. This breaks on project pages
// where the app is hosted under /<repo-name>/. Rewrite it to a relative URL.
const fixedHtml = html.replace(
  /(<script\s+src=")\/_expo\//g,
  '$1./_expo/'
);

if (fixedHtml !== html) {
  fs.writeFileSync(distIndexPath, fixedHtml, 'utf8');
  console.log('Updated dist/index.html to use relative _expo asset paths.');
} else {
  console.log('No root-absolute _expo asset paths found in dist/index.html.');
}
