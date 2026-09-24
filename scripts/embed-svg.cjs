const fs = require('fs');
const path = require('path');

const pngPath = path.resolve(__dirname, '../artifacts/rd-trauma-healing/public/favicon-48x48.png');
const svgPath = path.resolve(__dirname, '../artifacts/rd-trauma-healing/public/favicon.svg');

const data = fs.readFileSync(pngPath).toString('base64');
const svg = `<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
  <image href="data:image/png;base64,${data}" width="48" height="48" />
</svg>
`;

fs.writeFileSync(svgPath, svg, 'utf8');
console.log('favicon.svg embedded with self-contained data URI');
