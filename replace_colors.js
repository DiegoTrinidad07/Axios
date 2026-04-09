const fs = require('fs');
const files = ['public/css/styles.css', 'public/index.html', 'public/js/app.js'];

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf-8');
  content = content.replace(/#116b42/gi, '#2563EB'); // old g6 (primary)
  content = content.replace(/17,107,66/gi, '37,99,235'); // old g6 rgb
  content = content.replace(/#c4b5fd/gi, '#93c5fd'); 
  content = content.replace(/46,204,130/gi, '96,165,250'); // old g4 rgb
  content = content.replace(/26,153,96/gi, '59,130,246'); // old g5 rgb
  content = content.replace(/0,119,75/gi, '37,99,235'); // ring pulse rgb
  content = content.replace(/#1a9960/gi, '#3B82F6'); // old g5
  content = content.replace(/#2ecc82/gi, '#60A5FA'); // old g4
  fs.writeFileSync(f, content);
});
console.log('Replaced successfully');
