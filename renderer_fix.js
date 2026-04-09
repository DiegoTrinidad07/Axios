// ══ DYNAMIC JOURNEY RENDERER ══
function renderDynamicJourney(studyName, status, waitTime) {
  const container = document.getElementById('dynamic-journey-container');
  if (!container) return;
  
  // R = 100, Circumference = 628.3
  const circ = 628.3;
  // Let's assume max typical wait time for full circle is 30 minutes
  const maxWait = 30;
  let pct = 1; // full by default
  
  if (status === 'wait' && waitTime > 0) {
      pct = Math.min(waitTime / maxWait, 1);
  } else if (status === 'ocupado') {
      pct = 0.05; // almost empty when inside
  } else if (status === 'done' || status === 'resultados') {
      pct = 0;
  }
  
  const offset = circ * (1 - pct);
  
  // Decide steps based on status
  let html = `<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding: 40px 0; animation: fadeIn 0.5s ease-out;">`;
  
  // Title
  html += `<div style="font-size:12px;color:var(--link3);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:20px;">Estudio en curso:</div>`;
  html += `<h2 style="color:var(--wh);margin-bottom:40px;text-align:center;font-size:22px;">${studyName}</h2>`;
  
  // SVG Circle Timer
  let circleColor = 'var(--g4)'; // green default
  if (status === 'wait') circleColor = '#f59e0b'; // amber
  if (status === 'ocupado') circleColor = '#ef4444'; // red
  
  html += `
  <div style="position:relative; width: 220px; height: 220px; display:flex; align-items:center; justify-content:center;">
    <svg width="220" height="220" viewBox="0 0 220 220" style="transform: rotate(-90deg);">
      <circle cx="110" cy="110" r="100" fill="none" stroke="var(--s6)" stroke-width="8" />
      <circle id="journey-ring" cx="110" cy="110" r="100" fill="none" stroke="${circleColor}" stroke-width="8" 
              stroke-dasharray="${circ}" stroke-dashoffset="${offset}" stroke-linecap="round" 
              style="transition: stroke-dashoffset 1s linear;" />
    </svg>
    <div style="position:absolute; text-align:center;">
  `;
  
  if (status === 'wait') {
       html += `
       <div id="journey-timer-text" data-basemins="${waitTime}" style="font-size:42px; font-weight:800; color:${circleColor}; font-family:'DM Mono',monospace;">${String(waitTime).padStart(2,'0')}:00</div>
       <div style="font-size:14px; color:var(--link3); margin-top:5px;">minutos aprox</div>
       `;
  } else if (status === 'ocupado') {
       html += `
       <div style="font-size:14px; font-weight:700; color:${circleColor}; text-transform:uppercase; letter-spacing:1px; line-height:1.5;">ES TU<br>TURNO</div>
       `;
  } else if (status === 'done' || status === 'resultados') {
       html += `
       <div style="font-size:42px;">✅</div>
       `;
  }
  
  html += `
    </div>
  </div>`;
  
  // Status message
  if (status === 'wait') {
      html += `<div style="margin-top:40px; font-size:14px; color:var(--s3); text-align:center;">Por favor aguarda. El tiempo se recalcula dinámicamente.</div>`;
  } else if (status === 'ocupado') {
      html += `<div style="margin-top:40px; font-size:14px; color:var(--wh); text-align:center; font-weight:600; padding:10px 20px; background:#ef444415; border-radius:12px; border:1px solid #ef444430;">Dirígete al módulo asignado de inmediato.</div>`;
  }
  
  html += `</div>`;
  
  // Only update if it changed to avoid animation flicker
  if (container.dataset.lastState !== studyName + status + waitTime) {
      container.innerHTML = html;
      container.dataset.lastState = studyName + status + waitTime;
  }
}

// Global visual decay timer for the circle
setInterval(() => {
  const circle = document.getElementById('journey-ring');
  if (circle) {
    let currentOffset = parseFloat(circle.getAttribute('stroke-dashoffset')) || 0;
    const circ = 628.3;
    const maxWaitSecs = 30 * 60; // 30 mins
    const decayPerSecond = circ / maxWaitSecs;
    if (currentOffset < circ) {
       circle.setAttribute('stroke-dashoffset', Math.min(circ, currentOffset + decayPerSecond));
    }
  }

  const timerText = document.getElementById('journey-timer-text');
  if (timerText) {
    let spent = parseInt(timerText.dataset.spentSecs || '0');
    spent += 1;
    timerText.dataset.spentSecs = spent;
    
    let baseMins = parseInt(timerText.dataset.basemins || '0');
    let totalSecs = baseMins * 60;
    let remaining = Math.max(0, totalSecs - spent);
    
    let m = Math.floor(remaining / 60);
    let s = remaining % 60;
    timerText.textContent = String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
  }
}, 1000);
