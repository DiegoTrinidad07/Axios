const fs = require('fs');

let index = fs.readFileSync('public/index.html', 'utf8');
index = index.replaceAll('Ingresar a sala de espera →', 'Ingresar al recorrido →');
index = index.replaceAll('Entrar a sala de espera →', 'Entrar al recorrido →');
index = index.replace('<div class="hdr-title">Sala de Espera</div>', '<div class="hdr-title">Recorrido</div>');
index = index.replaceAll('<span>Espera</span>', '<span>Recorrido</span>');
fs.writeFileSync('public/index.html', index);

let appJs = fs.readFileSync('public/js/app.js', 'utf8');
appJs = appJs.replaceAll("'Ingresar a sala de espera \u2192'", "'Ingresar al recorrido \u2192'");
// Handle exact unicode or text differences
appJs = appJs.replaceAll("Ingresar a sala de espera", "Ingresar al recorrido");
fs.writeFileSync('public/js/app.js', appJs);

console.log('Renamed UI strings to Recorrido successfully.');
