
// ══ DATA ══
let patientsData = [];

async function loadPatients() {
  try {
    const res = await fetch('http://172.20.28.28:3001/api/pacientes');
    if (!res.ok) throw new Error('API error');
    const raw = await res.json();
    patientsData = raw.map((p, idx) => ({
      id: 'P-' + String(idx + 1).padStart(2, '0'),
      nombre: p.nombreCompleto || p.nombre || '',
      edad: p.edad || '—',
      servicio: p.servicioHoy || '—',
      seguro: p.derechohabiencia || '—',
      status: p.status || 'wait',
      gravedad: p.gravedad || 'verde',
      alergias: p.alergias && p.alergias.length ? p.alergias : ['Ninguna'],
      condiciones: p.condiciones && p.condiciones.length ? p.condiciones : ['Ninguna'],
      folio: p.folio,
      modulo: p.modulo || '—',
      estudioActual: p.estudioActual || null
    }));
    initDash(); initQueue(); initPatients();
  } catch (err) {
    console.error('Fetch error:', err);
    showToast('⚠️', 'Error conectando a la base de datos', 'amber');
  }
}

async function updatePatientStatus(folio, status, estudio = null) {
  try {
    let payload = { status, modulo: status === 'ocupado' || status === 'active' ? 'Módulo ' + Math.floor(Math.random()*4+1) : '—' };
    if (estudio) payload.estudioActual = estudio;
    if (status === 'next_study') payload.estudioActual = estudio;

    const res = await fetch(`http://172.20.28.28:3001/api/pacientes/folio/${folio}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if(res.ok) {
       showToast('✅', status === 'next_study' ? 'Estudio completado, ruteando...' : status === 'done' ? 'Paciente retirado' : `Paciente ${status}`, 'green');
       await loadPatients();
    }
  } catch(e) { console.error(e); }
}

async function deletePatient(folio) {
  if(!confirm('¿Estás seguro que deseas eliminar este paciente de la base de datos de manera irreversible?')) return;
  try {
    const res = await fetch(`http://172.20.28.28:3001/api/pacientes/folio/${folio}`, { method: 'DELETE' });
    if(res.ok) {
       showToast('🗑️', 'Paciente eliminado de la BD', 'info');
       closePatModal();
       await loadPatients();
    }
  } catch(e) { console.error(e); }
}

function openAddPatModal() { document.getElementById('addPatModal').classList.add('open'); }
function closeAddPatModal() { document.getElementById('addPatModal').classList.remove('open'); }

async function submitNewPatient() {
  const nombre = document.getElementById('ap-nombre').value.trim();
  const apellidos = document.getElementById('ap-apellidos').value.trim();
  const servicioHoy = document.getElementById('ap-servicio').value;
  const urgente = document.getElementById('ap-urgente').checked;
  const conCita = document.getElementById('ap-cita').checked;
  if(!nombre || !apellidos) return showToast('⚠️','Faltan el nombre o los apellidos','amber');
  
  const folio = 'SD-' + new Date().getFullYear() + '-' + Math.floor(10000 + Math.random() * 90000);
  
  try {
     const res = await fetch('http://172.20.28.28:3001/api/pacientes', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ nombre, apellidos, servicioHoy, folio, status: 'wait', urgente, conCita })
     });
     if(res.ok) {
       showToast('✅', 'Registrado con éxito', 'green');
       closeAddPatModal();
       document.getElementById('ap-nombre').value = '';
       document.getElementById('ap-apellidos').value = '';
       await loadPatients();
     } else {
       showToast('⚠️', 'Error al guardar', 'amber');
     }
  } catch(e) { console.error(e); }
}

// ══ INIT ══
function initDash() {
  const total  = patientsData.length;
  const wait   = patientsData.filter(p => p.status === 'wait').length;
  const done   = patientsData.filter(p => p.status === 'done').length;
  const alerts = patientsData.filter(p => p.status === 'alert').length;
  document.getElementById('stat-total').textContent  = total;
  document.getElementById('stat-wait').textContent   = wait;
  document.getElementById('stat-done').textContent   = done;
  document.getElementById('stat-alerts').textContent = alerts + (patientsData.filter(p=>p.alergias.some(a=>a!=='Ninguna')).length);
}

function initQueue() {
  const listEl = document.getElementById('queue-list');
  const activeContainer = document.getElementById('queue-active-turn');
  if (activeContainer) activeContainer.innerHTML = '';
  
  let activeCount = patientsData.filter(p => p.status === 'active' || p.status === 'ocupado').length;
  let waitCount = patientsData.filter(p => p.status === 'wait').length;
  
  document.getElementById('q-stat-wait').textContent = waitCount + activeCount;
  document.getElementById('q-stat-mod').textContent = activeCount;

  let mods = new Set();
  patientsData.forEach(p => {
      if (p.status === 'wait' || p.status === 'active' || p.status === 'ocupado') {
          let sList = Array.isArray(p.servicio) ? p.servicio : (p.servicio ? (typeof p.servicio === 'string' && p.servicio.includes(',') ? p.servicio.split(',').map(s=>s.trim()) : [p.servicio]) : []);
          sList.forEach(s => mods.add(s));
      }
  });

  const orderMap = { rojo: 1, amarillo: 2, verde: 3 };
  const cMap = { rojo: 'var(--r5)', amarillo: 'var(--a4)', verde: 'var(--g4)' };

  let fullHTML = '';

  if (mods.size === 0) {
      listEl.innerHTML = '<div style="color:var(--s4);font-size:12px;text-align:center;padding:20px;">Sin pacientes en colas activas</div>';
      return;
  }

  const createCard = (p, isActiveGroup, isOccupiedElsewhere) => {
      let stColor = isActiveGroup ? 'var(--g4)' : (isOccupiedElsewhere ? 'var(--s4)' : 'var(--s3)');
      let bgPill = isActiveGroup ? 'rgba(46,204,130,.1)' : (isOccupiedElsewhere ? 'rgba(248,113,113,.1)' : 'rgba(245,158,11,.1)');
      let colPill = isActiveGroup ? 'var(--g4)' : (isOccupiedElsewhere ? 'var(--r4)' : 'var(--a4)');
      let labelPill = isActiveGroup ? (p.status === 'ocupado' ? `Ocupado: ${p.estudioActual}` : 'En atención') : (isOccupiedElsewhere ? `Ocupado en: ${p.estudioActual}` : 'En espera');
      let opacity = isOccupiedElsewhere ? '0.6' : '1';

      return `<div class="dark-card" style="margin-bottom:8px;cursor:pointer;opacity:${opacity};" onclick="openPatModal('${p.id}')">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="font-family:'DM Mono',monospace;font-size:18px;font-weight:700;color:${stColor};min-width:40px;">${p.id}</div>
          <div style="flex:1;">
            <div style="display:flex;align-items:center;gap:6px;">
              <div style="width:8px;height:8px;border-radius:50%;background:${cMap[p.gravedad]||'var(--s3)'};flex-shrink:0;box-shadow: 0 0 5px ${cMap[p.gravedad]||'transparent'};"></div>
              <div style="font-size:12px;font-weight:600;color:var(--wh);">${p.nombre}</div>
            </div>
            <div style="font-size:10px;color:var(--s3);margin-top:2px;">Pendiente: ${Array.isArray(p.servicio)?p.servicio.join(', '):p.servicio} · ${p.edad} años</div>
            ${(Array.isArray(p.alergias) && p.alergias.some(a=>a!=='Ninguna')) ? `<div style="font-size:10px;color:var(--r4);margin-top:2px;">⚠️ Alergia: ${p.alergias.join(', ')}</div>` : ''}
          </div>
          <span style="font-size:10px;font-weight:700;padding:4px 9px;border-radius:20px;background:${bgPill};color:${colPill}">${labelPill}</span>
        </div>
      </div>`;
  };

  mods.forEach(cat => {
      let relevantPatients = patientsData.filter(p => {
          let sList = Array.isArray(p.servicio) ? p.servicio : (p.servicio ? (typeof p.servicio === 'string' && p.servicio.includes(',') ? p.servicio.split(',').map(s=>s.trim()) : [p.servicio]) : []);
          return sList.includes(cat);
      });

      const waitingUnsorted = relevantPatients.filter(p => p.status === 'wait');
      const active = relevantPatients.filter(p => (p.status === 'active' || p.status === 'ocupado') && p.estudioActual === cat);
      const occupiedElsewhere = relevantPatients.filter(p => (p.status === 'active' || p.status === 'ocupado') && p.estudioActual !== cat);
      const waiting = waitingUnsorted.sort((a,b) => orderMap[a.gravedad] - orderMap[b.gravedad]);

      let moduleCards = '';
      [...active, ...waiting].forEach(p => moduleCards += createCard(p, active.includes(p), false));
      occupiedElsewhere.forEach(p => moduleCards += createCard(p, false, true));

      fullHTML += `
         <div style="margin-top:20px;margin-bottom:8px;background:rgba(255,255,255,0.02);padding:10px;border-radius:12px;border:1px solid var(--s5);">
            <div style="font-size:15px;color:var(--wh);font-weight:700;margin-bottom:12px;display:flex;align-items:center;gap:8px;">
               <div style="width:4px;height:14px;background:var(--bl1);border-radius:2px;"></div>
               Módulo: ${cat} <span style="font-size:11px;color:var(--s4);font-weight:400;margin-left:auto;background:var(--s6);padding:2px 6px;border-radius:8px;">${relevantPatients.length} pacientes</span>
            </div>
            ${moduleCards}
         </div>
      `;
  });

  listEl.innerHTML = fullHTML;
}

function initPatients() {
  renderPatients(patientsData);
}

function renderPatients(list) {
  const el = document.getElementById('patient-list');
  const cm = { rojo: 'var(--r5)', amarillo: 'var(--a4)', verde: 'var(--g4)' };
  el.innerHTML = '<div class="dark-card">' + list.map(p => `
    <div class="pat-row" onclick="openPatModal('${p.id}')">
      <div class="pat-av" style="border:2px solid ${cm[p.gravedad] || 'var(--bord)'};">${p.nombre.charAt(0)}</div>
      <div>
        <div class="pat-name">${p.nombre}</div>
        <div class="pat-detail">${Array.isArray(p.servicio)?p.servicio.join(', '):p.servicio} · ${p.folio}</div>
      </div>
      <span class="pat-status ${
        p.status==='ocupado'?'ps-alert':
        p.status==='active'?'ps-active':
        p.status==='done'?'ps-done':
        p.status==='alert'?'ps-alert':'ps-wait'
      }">${
        p.status==='ocupado'?'Ocupado':
        p.status==='active'?'Activo':
        p.status==='done'?'Atendido':
        p.status==='alert'?'⚠️ Alerta':'En espera'
      }</span>
    </div>`).join('') + '</div>';
}

function filterPatients(q) {
  const filtered = patientsData.filter(p =>
    p.nombre.toLowerCase().includes(q.toLowerCase()) ||
    p.folio.toLowerCase().includes(q.toLowerCase()) ||
    p.servicio.toLowerCase().includes(q.toLowerCase())
  );
  renderPatients(filtered);
}

// ══ PATIENT MODAL ══
// ----------- GET OPTIMAL STUDY FOR STAFF -----------
function getOptimalStudyFor(pId) {
    const activeTop = patientsData.filter(x => x.status === 'active' || x.status === 'ocupado');
    const waitingQueue = patientsData.filter(x => x.status === 'wait');
    const fw = [...activeTop, ...waitingQueue];
    const myIndexRaw = fw.findIndex(x => x.id === pId);
    const myIndex = myIndexRaw === -1 ? fw.length - 1 : myIndexRaw;
    const p = fw[myIndexRaw] || patientsData.find(x => x.id === pId);
    
    if (!p) return 'Recepción';
    
    let baseSvcStr = p.servicio || 'Laboratorio';
    let sList = Array.isArray(baseSvcStr) ? baseSvcStr : (typeof baseSvcStr === 'string' && baseSvcStr.includes(',') ? baseSvcStr.split(',').map(s=>s.trim()) : [baseSvcStr]);
    if (sList.length === 0) return 'Recepción';
    
    const serviceTimes = {
      'Densitometría': 12, 'Electrocardiograma': 7, 'Laboratorio': 5,
      'Optometría': 10, 'Lentes': 10, 'Mastografía': 8, 'Nutrición': 15,
      'Papanicolaou': 8, 'Rayos X': 10, 'Resonancia magnética': 30,
      'Tomografía': 20, 'Ultrasonido': 15, 'Biopsia': 15
    };
    const needsPrep = ['Laboratorio', 'Biopsia', 'Tomografía', 'Ultrasonido', 'Resonancia magnética', 'Nutrición', 'Papanicolaou'];
    
    const getWait = (svc) => {
        let t = 0;
        for (let i = 0; i < myIndex; i++) {
            let itemSvc = fw[i].servicio || 'Laboratorio';
            let sL = Array.isArray(itemSvc) ? itemSvc : (typeof itemSvc === 'string' && itemSvc.includes(',') ? itemSvc.split(',').map(s=>s.trim()) : [itemSvc]);
            if (sL.includes(svc)) {
                t += (serviceTimes[svc] || 10);
            }
        }
        return t;
    };
    
    let optimal = [];
    sList.forEach(s => {
       let w = getWait(s);
       optimal.push({ svc: s, wait: w });
    });
    
    const needsPrepLoc = ['Laboratorio', 'Biopsia', 'Tomografía', 'Ultrasonido', 'Resonancia magnética', 'Nutrición', 'Papanicolaou'];
    optimal.sort((a,b) => {
        if (a.wait !== b.wait) return a.wait - b.wait;
        let aP = needsPrepLoc.includes(a.svc) ? 1 : 0;
        let bP = needsPrepLoc.includes(b.svc) ? 1 : 0;
        return bP - aP;
    });
    
    return optimal.length > 0 ? optimal[0].svc : 'Recepción';
}

function openPatModal(id) {
  const p = patientsData.find(x => x.id === id);
  if (!p) return;
  const content = document.getElementById('patSheetContent');
  const alertBanner = p.status === 'alert' ?
    `<div style="background:rgba(248,113,113,.1);border:1px solid rgba(248,113,113,.25);border-radius:12px;padding:11px 13px;margin-bottom:12px;display:flex;gap:8px;align-items:center;">
      <span style="font-size:18px;">🚨</span>
      <div style="font-size:12px;color:var(--r4);font-weight:600;">Alerta clínica activa — Requiere atención inmediata</div>
    </div>` : '';
  const allergyBanner = p.alergias.some(a=>a!=='Ninguna') ?
    `<div style="background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.2);border-radius:12px;padding:11px 13px;margin-bottom:12px;display:flex;gap:8px;align-items:center;">
      <span style="font-size:18px;">⚠️</span>
      <div style="font-size:12px;color:var(--a4);font-weight:600;">Alergia registrada: ${p.alergias.join(', ')}</div>
    </div>` : '';
  content.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:44px;height:44px;border-radius:50%;background:var(--s7);border:1px solid var(--bord);display:flex;align-items:center;justify-content:center;font-family:'Syne',sans-serif;font-size:18px;font-weight:700;color:var(--g4);">${p.nombre.charAt(0)}</div>
        <div>
          <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:700;color:var(--wh);">${p.nombre}</div>
          <div style="font-size:11px;color:var(--s3);">${p.folio} · ${p.id}</div>
        </div>
      </div>
      <button onclick="closePatModal()" style="background:var(--s7);border:1px solid var(--bord);border-radius:9px;color:var(--s3);font-size:18px;width:30px;height:30px;cursor:pointer;display:flex;align-items:center;justify-content:center;">×</button>
    </div>
    ${alertBanner}${allergyBanner}
    <div class="dark-card" style="margin-bottom:10px;">
      <div class="dc-label">Datos clínicos</div>
      <div class="info-grid">
        <div><div class="ig-key">Servicio hoy</div><div class="ig-val">${p.servicio}</div></div>
        <div><div class="ig-key">Módulo</div><div class="ig-val">${p.modulo}</div></div>
        <div><div class="ig-key">Edad</div><div class="ig-val">${p.edad} años</div></div>
        <div><div class="ig-key">Derechohabiencia</div><div class="ig-val">${p.seguro}</div></div>
      </div>
      <div style="margin-top:10px;">
        <div style="font-size:10px;color:var(--s4);margin-bottom:7px;">Condiciones · Alergias</div>
        <div class="tag-row">
          ${p.condiciones.map(c=>`<span class="dtag dtag-cond">${c}</span>`).join('')}
          ${p.alergias.map(a=>`<span class="dtag dtag-allergy">${a}</span>`).join('')}
        </div>
      </div>
    </div>
    
    <div style="margin-top:12px;">
      ${(() => {
        if (p.status === 'ocupado') {
          return `<div style="padding:12px;background:rgba(248,113,113,.1);border:1px solid rgba(248,113,113,.2);border-radius:12px;margin-bottom:8px;">
            <div style="font-size:12px;color:var(--r4);margin-bottom:8px;font-weight:700;">🚨 Paciente actualmente ocupado en: ${p.estudioActual}</div>
            <button class="btn-sm btn-sm-g" style="width:100%;justify-content:center;" onclick="updatePatientStatus('${p.folio}', 'next_study', '${p.estudioActual}');closePatModal()">➜ Completar ${p.estudioActual} y Continuar Ruteo</button>
          </div>`;
        } else if (p.status === 'wait' || p.status === 'active') {
          let sList = Array.isArray(p.servicio) ? p.servicio : (p.servicio ? [p.servicio] : []);
          if (typeof p.servicio === 'string' && p.servicio.includes(',')) sList = p.servicio.split(',').map(s => s.trim());
          else if (typeof p.servicio === 'string') sList = [p.servicio];
          
          let opt = getOptimalStudyFor(p.id);
          let btns = sList.map(s => `<button class="btn-sm btn-sm-ghost" style="flex:1;justify-content:center;white-space:nowrap;" onclick="updatePatientStatus('${p.folio}', 'ocupado', '${s}');closePatModal()">▶ Iniciar ${s}</button>`).join('');
          
          return `<div style="display:flex;flex-direction:column;gap:8px;">
            <div style="font-size:11px;color:var(--s4);">Cálculo Óptimo sugerido por IA:</div>
            <button class="btn-sm btn-sm-ghost" style="width:100%;justify-content:center;background:rgba(46,204,130,.1);color:var(--g4);border-color:rgba(46,204,130,.2);font-weight:700;" onclick="updatePatientStatus('${p.folio}', 'ocupado', '${opt}');closePatModal()">➜ Seguir Sugerencia: Iniciar ${opt}</button>
            <div style="font-size:11px;color:var(--s4);margin-top:8px;">O iniciar módulo manualmente:</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">${btns}</div>
            <button class="btn-sm" style="margin-top:6px;background:var(--s6);color:var(--s3);border:none;" onclick="updatePatientStatus('${p.folio}', 'done');closePatModal()">Marcar todos como finalizados</button>
          </div>`;
        } else {
          return `<div style="font-size:12px;color:var(--s3);text-align:center;">Sin acciones disponibles (Finalizado o Cancelado)</div>`;
        }
      })()}
    </div>

    <div style="display:flex;margin-top:12px;">
      <button class="btn-sm btn-sm-ghost" style="flex:1;justify-content:center;color:var(--r4);border-color:var(--r4);" onclick="deletePatient('${p.folio}')">Eliminar de BD</button>
    </div>`;
  document.getElementById('patModal').classList.add('open');
}

function closePatModal() {
  document.getElementById('patModal').classList.remove('open');
}

// ══ NAV ══
const staffScreens = ['s-dash','s-queue','s-patients','s-ia'];
function navStaff(screen, idx) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('on'));
  document.getElementById(screen).classList.add('on');
  document.querySelectorAll('.bottom-nav .nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.bottom-nav').forEach(nav => {
    const btns = nav.querySelectorAll('.nav-btn');
    if (btns[idx]) btns[idx].classList.add('active');
  });
}

// ══ LOGIN ══
function doStaffLogin() {
  const email = document.getElementById('s-email').value.trim();
  const pass  = document.getElementById('s-pass').value.trim();
  if (!email || !pass) { showToast('⚠️','Ingresa correo y contraseña.','amber'); return; }
  showToast('🔐','Verificando credenciales...','info');
  setTimeout(async () => {
    await loadPatients();
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('on'));
    document.getElementById('s-dash').classList.add('on');
    showToast('👋','Bienvenido/a al panel de staff.','ok');
  }, 900);
}

// ══ TOAST ══
let toastTimer;
function showToast(icon, msg, type) {
  const t = document.getElementById('toast');
  document.getElementById('t-ico').textContent = icon;
  document.getElementById('t-msg').textContent = msg;
  const colors = { green:'#031209', amber:'#1a0e00', info:'#030b1a', ok:'#031209' };
  t.style.background = colors[type] || '#0d1117';
  clearTimeout(toastTimer);
  t.classList.add('show');
  toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}

// ══ STAFF AI ══
let staffChatHistory = [];

const STAFF_SYSTEM = () => `Eres Axios IA, el copiloto clínico de Salud Digna para personal de staff y médicos.
Tienes acceso al estado operativo del día:
- Pacientes activos: ${patientsData.length}
- En espera: ${patientsData.filter(p=>p.status==='wait').length}
- Con alertas: ${patientsData.filter(p=>p.status==='alert').map(p=>p.nombre).join(', ')}
- Con alergias: ${patientsData.filter(p=>p.alergias.some(a=>a!=='Ninguna')).map(p=>p.nombre+' ('+p.alergias.join(',')+')').join('; ')}

REGLAS:
- Responde SIEMPRE en español. Máximo 4 oraciones claras y precisas.
- Solo responde sobre temas médicos, clínicos u operativos de la clínica.
- Puedes sugerir protocolos, acciones de triaje, redistribución de módulos o manejo de alertas.
- Nunca tomes decisiones definitivas por el personal — siempre enmarca respuestas como sugerencias profesionales.
- Si la pregunta no es clínica ni operativa, redirige al contexto del panel.`;

async function sendStaffAI() {
  const inp  = document.getElementById('staffAiInp');
  const val  = inp.value.trim();
  if (!val) return;
  const list = document.getElementById('staffAiMsgList');
  const btn  = document.getElementById('staffSendBtn');

  const userDiv = document.createElement('div');
  userDiv.className = 'ai-msg user';
  userDiv.textContent = val;
  list.appendChild(userDiv);
  inp.value = '';
  inp.disabled = true;
  if (btn) { btn.disabled = true; btn.style.opacity = '.4'; }
  list.scrollTop = list.scrollHeight;

  const typing = document.createElement('div');
  typing.className = 'ai-msg bot';
  typing.innerHTML = '<div class="ai-msg-from">\u2756 Axios IA Staff</div><div class="ai-typing"><span></span><span></span><span></span></div>';
  list.appendChild(typing);
  list.scrollTop = list.scrollHeight;

  const messages = [
    { role:'system', content: STAFF_SYSTEM() },
    ...staffChatHistory,
    { role:'user', content: val }
  ];
  try {
    const res = await fetch('https://axios.dylanmut.workers.dev/chat', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ messages })
    });
    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content?.trim() || 'Sin respuesta.';
    staffChatHistory.push({ role:'user', content:val });
    staffChatHistory.push({ role:'assistant', content:reply });
    if (staffChatHistory.length > 12) staffChatHistory = staffChatHistory.slice(-12);
    typing.innerHTML = '<div class="ai-msg-from">\u2756 Axios IA Staff</div>' + reply;
  } catch(e) {
    typing.innerHTML = '<div class="ai-msg-from">\u2756 Axios IA Staff</div>⚠️ ' + e.message;
  }
  list.scrollTop = list.scrollHeight;
  inp.disabled = false;
  if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
  inp.focus();
}

function quickStaffAsk(q) {
  document.getElementById('staffAiInp').value = q;
  sendStaffAI();
}

// Auto refresh de pacientes
setInterval(() => {
  if (document.getElementById('s-login').classList.contains('on')) return; // In login
  loadPatients();
}, 10000);
