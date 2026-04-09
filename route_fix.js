const fs = require('fs');
let content = fs.readFileSync('public/js/app.js', 'utf8');

// Replace all occurrences of showScreen('s-journey') with showScreen('s-wait')
content = content.replaceAll("showScreen('s-journey')", "showScreen('s-wait')");

fs.writeFileSync('public/js/app.js', content);
console.log('Routing fixed from s-journey to s-wait.');
