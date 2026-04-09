const fs = require('fs');
let content = fs.readFileSync('public/index.html', 'utf8');

// 1. Remove Demo buttons block (Lines 109-123 approximately)
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

// 2. Remove bottom nav components for 'Mi visita' taking care of exactly 2 lines each
const replaceNavVisitaActive = `  <button class="nav-btn active" onclick="navSwitch('s-journey')">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg><span>Mi visita</span></button>`;
content = content.replaceAll(replaceNavVisitaActive, '');

const replaceNavVisitaInactive = `  <button class="nav-btn" onclick="navSwitch('s-journey')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg><span>Mi visita</span></button>`;
content = content.replaceAll(replaceNavVisitaInactive, '');

const replaceNavSaludActive = `  <button class="nav-btn active"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg><span>Mi Salud</span></button>`;
content = content.replaceAll(replaceNavSaludActive, '');

const replaceNavSaludInactive = `  <button class="nav-btn" onclick="navSwitch('s-dashboard')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg><span>Mi Salud</span></button>`;
content = content.replaceAll(replaceNavSaludInactive, '');

const dashboardNavInactiveMulti = `  <button class="nav-btn" onclick="navSwitch('s-dashboard')">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg><span>Mi Salud</span></button>`;
content = content.replaceAll(dashboardNavInactiveMulti, '');

fs.writeFileSync('public/index.html', content);
console.log('Fixed UI cleanly.');
