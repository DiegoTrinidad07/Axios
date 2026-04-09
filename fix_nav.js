const fs = require('fs');
let content = fs.readFileSync('public/index.html', 'utf8');

// Regex to match the button tag and everything inside until the closing button tag, where it contains 'Mi visita' or 'Mi Salud'
const regex = /<button[^>]*class="nav-btn[^>]*>[\s\S]*?(?:Mi visita|Mi Salud)[\s\S]*?<\/button>/gi;
const result = content.replace(regex, '');

// Also remove orphan SVG fragments left over by previous bad script
const fragmentRegex = /^\s*<svg[^>]*>[\s\S]*?<span>(?:Mi visita|Mi Salud)<\/span><\/button>\s*$/gim;
const cleanResult = result.replace(fragmentRegex, '');

fs.writeFileSync('public/index.html', cleanResult);
console.log('Cleaned up nav blocks safely.');
