const fs = require('fs');
const content = fs.readFileSync('public/index.html', 'utf8');
const lines = content.split('\n');
const newLines = lines.filter(line => !line.includes("navSwitch('s-journey')") && !line.includes("navSwitch('s-dashboard')"));
fs.writeFileSync('public/index.html', newLines.join('\n'));
console.log('Removed matching lines.');
