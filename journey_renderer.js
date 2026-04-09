
// ══ DYNAMIC JOURNEY RENDERER ══
function renderDynamicJourney(studyName, status, waitTime) {
  const container = document.getElementById('dynamic-journey-container');
  if (!container) return;
  
  // Decide steps based on status
  let html = `<div class="track-card" id="dj-tracker" style="animation: fadeInUp 0.4s ease-out;background:var(--s8);border:1px solid var(--bord);border-radius:24px;padding:24px;">`;
  html += `<div class="track-label" style="font-size:12px;color:var(--link3);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:16px;">Recorrido activo: <strong style="color:var(--wh);">ESTUDIO DE ${studyName.toUpperCase()}</strong></div>`;
  
  // Step 1: Assignation / Wait
  if (status === 'wait') {
    html += `
      <div class="jstep js-active">
        <div class="jstep-left"><div class="jcircle" style="animation: pulse-ring 2s infinite;">⏳</div><div class="jline"></div></div>
        <div class="jstep-right">
          <div class="jstep-name">Esperando módulo libre</div>
          <div class="jstep-detail">Tiempo estimado de atención: ~${waitTime} min</div>
          <div class="jchip jchip-active" style="background:#f59e0b20;color:#fbbf24;border:1px solid #fbbf2440;">● En guardia</div>
        </div>
      </div>
      <div class="jstep js-pend">
        <div class="jstep-left"><div class="jcircle" style="font-size:11px;color:var(--link3);">2</div><div class="jline"></div></div>
        <div class="jstep-right">
          <div class="jstep-name">Pasar a módulo</div>
          <div class="jstep-detail">Aguardando llamado automático</div>
          <div class="jchip jchip-pend">Pendiente</div>
        </div>
      </div>
      <div class="jstep js-pend">
        <div class="jstep-left"><div class="jcircle" style="font-size:11px;color:var(--link3);">3</div></div>
        <div class="jstep-right">
          <div class="jstep-name">Procesando estudio</div>
          <div class="jstep-detail">Realización del estudio médico</div>
          <div class="jchip jchip-pend">Pendiente</div>
        </div>
      </div>
    `;
  } else if (status === 'ocupado') {
    html += `
      <div class="jstep js-done">
        <div class="jstep-left"><div class="jcircle">✓</div><div class="jline"></div></div>
        <div class="jstep-right">
          <div class="jstep-name">Módulo asignado</div>
          <div class="jstep-detail">El sistema encontró lugar para ti</div>
          <div class="jchip jchip-done">✓ Listo</div>
        </div>
      </div>
      <div class="jstep js-active">
        <div class="jstep-left"><div class="jcircle" style="animation: pulse-ring 2s infinite;">🏃</div><div class="jline"></div></div>
        <div class="jstep-right">
          <div class="jstep-name">Dirígete al módulo</div>
          <div class="jstep-detail">Tu estudio de ${studyName} está por ocurrir</div>
          <div class="jchip jchip-active">● Foco</div>
        </div>
      </div>
      <div class="jstep js-pend">
        <div class="jstep-left"><div class="jcircle" style="font-size:11px;color:var(--link3);">3</div></div>
        <div class="jstep-right">
          <div class="jstep-name">Finalización</div>
          <div class="jstep-detail">Cuando salgas pasarás a la siguiente fase</div>
          <div class="jchip jchip-pend">Pendiente</div>
        </div>
      </div>
    `;
  } else if (status === 'done' || status === 'resultados') {
    html += `
      <div class="jstep js-done">
        <div class="jstep-left"><div class="jcircle">✓</div></div>
        <div class="jstep-right">
          <div class="jstep-name">Estudios completados</div>
          <div class="jstep-detail">Tu visita ha finalizado con éxito</div>
          <div class="jchip jchip-done">✓ Completado</div>
        </div>
      </div>
    `;
  }
  
  html += `</div>`;
  
  // Only update if it changed to avoid animation flicker
  if (container.dataset.lastState !== studyName + status) {
      container.innerHTML = html;
      container.dataset.lastState = studyName + status;
  }
}
