const fs = require('fs');
let content = fs.readFileSync('public/index.html', 'utf8');
let lines = content.split('\n');
let toKeep = [];

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Check if current line is a button start
    if (line.includes('<button class="nav-btn') || line.includes('<button class="nav-btn active"')) {
        let fullButton = line;
        let skipLines = 0;
        
        // Peek ahead to see if it's a multi-line button containing 'Mi visita' or 'Mi Salud'
        while (i + skipLines < lines.length && !fullButton.includes('</button>')) {
            skipLines++;
            fullButton += lines[i + skipLines];
        }
        
        if (fullButton.includes('Mi visita') || fullButton.includes('Mi Salud')) {
            // Skip this button completely
            i += skipLines;
            continue;
        }
    }
    
    // Check for single line buttons (just in case)
    if (line.includes('<button class="nav-btn') && line.includes('</button>') && (line.includes('Mi visita') || line.includes('Mi Salud'))) {
        continue;
    }
    
    toKeep.push(line);
}

fs.writeFileSync('public/index.html', toKeep.join('\n'));
console.log('Successfully eliminated navigation buttons line-by-line.');
