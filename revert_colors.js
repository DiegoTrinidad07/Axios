const fs = require('fs');
const files = ['public/index.html', 'public/js/app.js'];

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf-8');
  content = content.replace(/#2563EB/gi, '#16A34A');
  content = content.replace(/37,99,235/gi, '22,163,74');
  
  content = content.replace(/#3B82F6/gi, '#22C55E');
  content = content.replace(/59,130,246/gi, '34,197,94');
  
  content = content.replace(/#60A5FA/gi, '#4ADE80');
  content = content.replace(/96,165,250/gi, '74,222,128');
  
  fs.writeFileSync(f, content);
});
console.log('Reverted to new green colors successfully');
