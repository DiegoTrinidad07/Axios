const fs = require('fs');
let content = fs.readFileSync('../Axios_APP_BACKUP/public/index.html', 'utf8');

// Remove Demo Block 
const demoBlock = `    <!-- DEMO QUICK ENTRY -->
    <div style="margin-top:16px;display:flex;gap:7px;">
      <div onclick="doDemo(1)" style="flex:1;background:rgba(255,255,255,.04);border:1px solid var(--bord);border-radius:10px;padding:9px 6px;text-align:center;cursor:pointer;transition:all .15s;" onmouseover="this.style.background='rgba(74,222,128,.07)'" onmouseout="this.style.background='rgba(255,255,255,.04)'">
        <div style="font-size:9px;color:var(--s4);margin-bottom:2px;">Demo 1</div>
        <div style="font-size:12px;color:var(--s2);font-weight:600;">🩸 En espera</div>
      </div>
      <div onclick="doDemo(2)" style="flex:1;background:rgba(255,255,255,.04);border:1px solid var(--bord);border-radius:10px;padding:9px 6px;text-align:center;cursor:pointer;transition:all .15s;" onmouseover="this.style.background='rgba(74,222,128,.07)'" onmouseout="this.style.background='rgba(255,255,255,.04)'">
        <div style="font-size:9px;color:var(--s4);margin-bottom:2px;">Demo 2</div>
        <div style="font-size:12px;color:var(--s2);font-weight:600;">⏳ Esperando</div>
      </div>
      <div onclick="doDemo(3)" style="flex:1;background:rgba(255,255,255,.04);border:1px solid var(--bord);border-radius:10px;padding:9px 6px;text-align:center;cursor:pointer;transition:all .15s;" onmouseover="this.style.background='rgba(74,222,128,.07)'" onmouseout="this.style.background='rgba(255,255,255,.04)'">
        <div style="font-size:9px;color:var(--s4);margin-bottom:2px;">Demo 3</div>
        <div style="font-size:12px;color:var(--s2);font-weight:600;">✅ Resultados</div>
      </div>
    </div>`;
content = content.replace(demoBlock, '');

let lines = content.split('\n');
let toKeep = [];

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.includes('<button class="nav-btn') || line.includes('<button class="nav-btn active"')) {
        let fullButton = line;
        let skipLines = 0;
        
        while (i + skipLines < lines.length && !fullButton.includes('</button>')) {
            skipLines++;
            fullButton += lines[i + skipLines];
        }
        
        if (fullButton.includes('Mi visita') || fullButton.includes('Mi Salud')) {
            i += skipLines;
            continue;
        }
    }
    
    if (line.includes('<button class="nav-btn') && line.includes('</button>') && (line.includes('Mi visita') || line.includes('Mi Salud'))) {
        continue;
    }
    
    toKeep.push(line);
}

fs.writeFileSync('public/index.html', toKeep.join('\n'));
console.log('Restored and cleaned up index safely.');
