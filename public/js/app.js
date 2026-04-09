
// API WRAPPER FOR BACKEND MIGRATION
window.storage = {
  get: async function(key) {
    if (key.startsWith('paciente:')) {
      const folio = key.replace('paciente:', '');
      try {
        const res = await fetch('/api/pacientes/folio/' + folio);
        if (res.ok) {
           const data = await res.json();
           if (!data || data.no_existe) return null;
           return { value: JSON.stringify(data) };
        }
      } catch(e) { console.error('API Error', e); }
    } else if (key === 'folios_lista') {
      try {
        const res = await fetch('/api/pacientes');
        if (res.ok) {
           const data = await res.json();
           return { value: JSON.stringify(data.map(p => p.folio)) };
        }
      } catch(e) { console.error('API Error', e); }
    }
    return null;
  },
  set: async function(key, val) {
    if (key.startsWith('paciente:')) {
       try {
         await fetch('/api/pacientes', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: val
         });
       } catch(e) { console.error('API Error', e); }
    }
  },
  list: async function(prefix) {
    if (prefix === 'paciente:') {
       try {
        const res = await fetch('/api/pacientes');
        if (res.ok) {
           const data = await res.json();
           return { keys: data.map(p => 'paciente:' + p.folio) };
        }
       } catch(e) { console.error('API Error', e); }
    }
    return { keys: [] };
  }
};

// ══ SCREEN ROUTING ══
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('on'));
  document.getElementById(id).classList.add('on');
  const appList = ['s-journey','s-wait','s-results','s-dashboard','s-perfil'];
  const isApp = appList.includes(id);
  document.getElementById('demoBar').style.display = isApp ? 'flex' : 'none';
  const fab = document.getElementById('aiFab');
  if (fab) { fab.style.display = isApp ? 'flex' : 'none'; }
  if (id === 's-dashboard') setTimeout(() => buildMiniChart('glucosa'), 100);
  
  if (id === 's-journey' || id === 's-wait') {
     if (typeof startQueuePolling === 'function') startQueuePolling();
  }
}

// ══ NAVIGATION ══
// Mapa: pantalla → índice del botón en el nav (0=Mi visita,1=Espera,2=Resultados,3=Mi Salud,4=Perfil)
const screenNavIndex = {
  's-journey':   0,
  's-wait':      0,
  's-results':   1,
  's-dashboard': -1,
  's-perfil':    2
};

function navSwitch(targetScreen) {
  showScreen(targetScreen);
  // Limpiar activo en TODOS los navs
  document.querySelectorAll('.bottom-nav .nav-btn').forEach(b => b.classList.remove('active'));
  // Activar el botón correcto en todos los navs según la pantalla destino
  const idx = screenNavIndex[targetScreen];
  if (idx !== undefined) {
    document.querySelectorAll('.bottom-nav').forEach(nav => {
      const btns = nav.querySelectorAll('.nav-btn');
      if (btns[idx]) btns[idx].classList.add('active');
    });
  }
}

// ══ LOGIN ══
function setTab(type, btn) {
  document.querySelectorAll('.login-tab').forEach(t => t.classList.remove('on'));
  btn.classList.add('on');
  document.getElementById('login-patient').style.display = type === 'patient' ? 'flex' : 'none';
  document.getElementById('login-staff').style.display = type === 'staff' ? 'flex' : 'none';
}

async function doLogin(type) {
  if (type === 'patient') {
    const folioInput = (document.getElementById('l-folio')?.value || '').trim().toUpperCase();
    if (!folioInput) {
      showToast('⚠️', 'Por favor ingresa tu folio de visita.', 'amber');
      return;
    }
    // Mostrar loading
    const btn = document.querySelector('#login-patient .btn-primary-dark');
    if (btn) { btn.textContent = 'Verificando…'; btn.disabled = true; }

    try {
      const result = await window.storage.get('paciente:' + folioInput);
      if (result && result.value) {
        const usuario = JSON.parse(result.value);
        if (btn) { btn.textContent = 'Verificado ✓'; btn.disabled = false; }
        showLoginIntentModal(usuario);
      } else {
        // Folio NO encontrado
        if (btn) { btn.textContent = 'Ingresar al recorrido →'; btn.disabled = false; }
        showFolioError(folioInput);
      }
    } catch(e) {
      if (btn) { btn.textContent = 'Ingresar al recorrido →'; btn.disabled = false; }
      showFolioError(folioInput);
    }
  }
}

function showFolioError(folio) {
  // Mostrar error visual en el campo
  const input = document.getElementById('l-folio');
  if (input) {
    input.style.borderColor = 'var(--r5)';
    input.style.boxShadow = '0 0 0 3px rgba(220,38,38,.15)';
    setTimeout(() => {
      input.style.borderColor = '';
      input.style.boxShadow = '';
    }, 3000);
  }
  // Toast de error
  showToast('❌', `Folio "${folio}" no encontrado. Verifica o regístrate como paciente nuevo.`, 'amber');
  // Mostrar hint de registro
  const hint = document.querySelector('.login-hint');
  if (hint) {
    hint.style.color = 'var(--r4)';
    hint.innerHTML = `Folio no registrado. <span onclick="showScreen('s-triage')" style="color:var(--g4);cursor:pointer;">Crear perfil nuevo →</span>`;
    setTimeout(() => {
      hint.style.color = '';
      hint.innerHTML = `¿Primera visita? <span onclick="showScreen('s-triage')">Crear perfil nuevo →</span>`;
    }, 5000);
  }
}

let currentUser = null;
let isLoginUpdate = false;
let pendingLoginUser = null;

function showLoginIntentModal(usuario) {
  pendingLoginUser = usuario;
  let modal = document.getElementById('loginIntentModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'loginIntentModal';
    modal.style.cssText = 'position:absolute;inset:0;background:rgba(7,9,15,.8);backdrop-filter:blur(6px);z-index:160;display:flex;align-items:center;justify-content:center;padding:24px;';
    modal.innerHTML = `
      <div style="background:var(--s8);border-radius:28px;border:1px solid var(--bord);padding:28px 24px;width:100%;max-width:320px;text-align:center;animation:popIn .4s cubic-bezier(.34,1.56,.64,1) both;">
        <div style="width:56px;height:56px;background:linear-gradient(135deg,var(--g7),var(--g5));border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:26px;margin:0 auto 14px;">👋</div>
        <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:800;color:var(--wh);margin-bottom:6px;" id="login-intent-title">¡Hola!</div>
        <div style="font-size:12px;color:var(--s3);margin-bottom:20px;line-height:1.6;">Encontramos tu perfil activo. ¿Qué deseas hacer hoy?</div>
        
        <button onclick="handleLoginIntent('history')" style="width:100%;padding:12px;border-radius:12px;background:var(--s7);border:1px solid var(--bord);color:var(--wh);font-size:13px;font-weight:700;cursor:pointer;margin-bottom:10px;font-family:'DM Sans',sans-serif;transition:all 0.15s;">Ver mis estudios anteriores</button>
        
        <button onclick="handleLoginIntent('new')" style="width:100%;padding:12px;border-radius:12px;background:var(--g6);border:none;color:var(--wh);font-size:13px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.15s;">Agendar nueva cita/estudios</button>
      </div>`;
    document.querySelector('.phone').appendChild(modal);
  } else {
    modal.style.display = 'flex';
  }
  document.getElementById('login-intent-title').textContent = `¡Hola, ${usuario.nombre}!`;
}

function handleLoginIntent(intent) {
  const modal = document.getElementById('loginIntentModal');
  if (modal) modal.style.display = 'none';
  const usuario = pendingLoginUser;
  
  const btn = document.querySelector('#login-patient .btn-primary-dark');
  if (btn) { btn.textContent = 'Ingresar a mi visita →'; btn.disabled = false; }
  
  if (intent === 'history') {
    currentUser = usuario;
    isLoginUpdate = false;
    applyUserToUI(usuario);
    showToast('👋', `¡Bienvenido/a de nuevo, ${usuario.nombre}!`, 'green');
    showScreen('s-wait');
  } else if (intent === 'new') {
    currentUser = usuario;
    isLoginUpdate = true;
    selectedService = [];
    document.querySelectorAll('.svc-tile').forEach(t => t.classList.remove('sel'));
    const lbl = document.getElementById('svc-selected-label');
    if (lbl) lbl.textContent = 'Selecciona tus estudios';

    showToast('👋', `¡Hola ${usuario.nombre}! Selecciona tus estudios para hoy.`, 'green');
    const finalBtn = document.getElementById('btn-finish-triage');
    if (finalBtn) finalBtn.textContent = 'Comenzar visita →';
    
    showScreen('s-triage');
    trStep(3);
  }
}

// ══ FOLIO MODAL ══

window.copyFolioHandler = function(el) {
  const folioToCopy = el.dataset.folio || el.textContent;
  function onSuccess() {
    el.textContent = 'Folio copiado';
    setTimeout(() => { if (el.textContent === 'Folio copiado') el.textContent = folioToCopy; }, 1500);
  }
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(folioToCopy).then(onSuccess).catch(e => console.error(e));
  } else {
    try {
      let t = document.createElement('textarea');
      t.value = folioToCopy;
      t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.appendChild(t);
      t.select();
      document.execCommand('copy');
      document.body.removeChild(t);
      onSuccess();
    } catch (e) {
      console.error(e);
    }
  }
};
function showFolioModal(folio, nombre) {
  localStorage.setItem('savedLocalFolio', folio);
  // Crear modal de folio si no existe
  let modal = document.getElementById('folioModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'folioModal';
    modal.style.cssText = 'position:absolute;inset:0;background:rgba(7,9,15,.8);backdrop-filter:blur(6px);z-index:160;display:flex;align-items:center;justify-content:center;padding:24px;';
    modal.innerHTML = `
      <div style="background:var(--s8);border-radius:28px;border:1px solid var(--bord);padding:28px 24px;width:100%;max-width:320px;text-align:center;animation:popIn .4s cubic-bezier(.34,1.56,.64,1) both;">
        <div style="width:56px;height:56px;background:linear-gradient(135deg,var(--g7),var(--g5));border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:26px;margin:0 auto 14px;">🎉</div>
        <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:800;color:var(--wh);margin-bottom:6px;" id="folio-nombre-title">¡Listo, ${nombre}!</div>
        <div style="font-size:12px;color:var(--s3);margin-bottom:20px;line-height:1.6;">Tu perfil fue creado. Guarda tu folio para iniciar sesión en futuras visitas sin volver a registrarte.</div>
        <div style="background:var(--s7);border:1px solid var(--bord);border-radius:14px;padding:14px;margin-bottom:20px;">
          <div style="font-size:10px;color:var(--s4);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px;">Tu folio de acceso</div>
          <div style="font-family:'DM Mono',monospace;font-size:22px;font-weight:700;color:var(--g4);letter-spacing:1px;cursor:pointer;display:block;text-align:center;padding:12px 14px;border-radius:12px;background:rgba(22,163,74,.15);" id="folio-display" data-folio="${folio}" onclick="window.copyFolioHandler(this)" title="Toca para copiar">${folio}</div>
          <div style="font-size:10px;color:var(--s4);margin-top:6px;">Úsalo junto con tu fecha de nacimiento</div>
        </div>
        <button onclick="closeFolioModal()" style="width:100%;padding:12px;border-radius:12px;background:var(--g6);border:none;color:var(--wh);font-size:14px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;">Entendido, entrar →</button>
      </div>`;
    document.querySelector('.phone').appendChild(modal);
  } else {
    document.getElementById('folio-display').textContent = folio;
      document.getElementById('folio-display').dataset.folio = folio;
    document.getElementById('folio-nombre-title').textContent = `¡Listo, ${nombre}!`;
    modal.style.display = 'flex';
  }
}

function closeFolioModal() {
  const modal = document.getElementById('folioModal');
  if (modal) modal.style.display = 'none';
  showToast('✅', 'Folio guardado. ¡Tu visita está activa!', 'green');
  setTimeout(() => showScreen('s-wait'), 900);
}

// ══ MODAL PREPARACIÓN ══
const prepData = {
  'Laboratorio':          ['🍽️ Ayuno de 8–12 horas (agua sí)', '💊 Informa tus medicamentos actuales', '💧 Puedes tomar agua sin problema', '👕 Ropa cómoda con manga corta'],
  'Resonancia magnética': ['🚫 Sin objetos metálicos (aretes, cinturones)', '👗 Sin ropa con cremalleras o broches metálicos', '📢 Avisa si tienes implantes o marcapasos', '🧘 No es necesario ayuno salvo indicación'],
  'Electrocardiograma':   ['👕 Ropa fácil de abrir en la parte superior', '🚫 No apliques cremas en pecho y piernas', '☕ Evita cafeína 2 hrs antes', '😌 Descansa 5 min antes del estudio'],
  'Lentes':               ['👁️ Trae tus lentes o lentes de contacto actuales', '🚗 Considera no manejar si recibes gotas', '📋 Trae receta previa si la tienes'],
  'Nutrición':            ['📋 Lleva registro de lo que comiste los últimos 3 días', '🏋️ Informa tu nivel de actividad física', '💊 Lista de suplementos o vitaminas que tomas'],
  'Tomografía':           ['🍽️ Ayuno de 4 horas', '💧 Puedes tomar agua', '🚫 Sin objetos metálicos', '📢 Informa alergias al contraste si aplica'],
  'Ultrasonido':          ['💧 Llega con vejiga llena (toma 1L de agua 1 hr antes)', '🍽️ Ayuno de 4 horas para ultrasonido abdominal', '👗 Ropa cómoda y de fácil acceso'],
  'Papanicolaou':         ['🚫 No relaciones sexuales 48 hrs antes', '🚫 No duchas vaginales ni óvulos 48 hrs antes', '📅 No realizarlo durante el período menstrual', '👗 Ropa cómoda'],
  'Rayos X':              ['🚫 Retira objetos metálicos (aretes, collares, cinturón)', '👗 Se pedirá bata hospitalaria', '🤰 Informa si estás embarazada', '⏱️ El estudio tarda aprox. 10 min'],
  'Densitometría':        ['👗 Ropa sin hebillas ni cremalleras metálicas', '💊 No tomes calcio el día del estudio', '🍽️ No es necesario ayuno', '📋 Informa si tuviste fractura reciente'],
  'Mastografía':          ['🚫 No uses desodorante ni talco el día del estudio', '👗 Blusa o camiseta fácil de retirar', '📅 Mejor realizarla la primera semana post-período'],
  'Biopsia':              ['🍽️ Ayuno de 4 horas', '💊 Informa anticoagulantes o aspirina', '🚗 Trae a alguien que te acompañe', '📋 El médico explicará el procedimiento'],
  'COVID-19':             ['😷 Usa cubrebocas hasta el momento de la prueba', '🚫 No uses spray nasal 30 min antes', '⏱️ Prueba rápida: 15 min · PCR: 24 hrs']
};

function openPrepModal() {
  const svc = selectedService || 'Laboratorio';
  const modal = document.getElementById('prepModal');
  const label = document.getElementById('prep-svc-label');
  const content = document.getElementById('prep-content');
  if (!modal) return;
  if (label) label.textContent = svc;
  const items = prepData[svc] || prepData['Laboratorio'];
  content.innerHTML = items.map(item => `
    <div style="display:flex;gap:10px;align-items:flex-start;background:var(--lbg);border:1px solid var(--lborder);border-radius:12px;padding:11px 13px;">
      <span style="font-size:16px;flex-shrink:0;">${item.split(' ')[0]}</span>
      <span style="font-size:12px;color:var(--link2);line-height:1.5;">${item.split(' ').slice(1).join(' ')}</span>
    </div>`).join('');
  modal.style.display = 'flex';
}

function closePrepModal() {
  const modal = document.getElementById('prepModal');
  if (modal) modal.style.display = 'none';
}

// ══ TRIAGE ══
function trStep(n) {
  if (n === 1) {
    currentUser = null;
    isLoginUpdate = false;
  }
  [1,2,3].forEach(i => {
    const el = document.getElementById('tr-s' + i);
    if (el) el.style.display = i === n ? 'block' : 'none';
  });
  
  if (isLoginUpdate) {
    document.getElementById('tr-header-title').innerHTML = 'Renovar estudios';
    document.getElementById('tr-dots').style.display = 'none';
  } else {
    document.getElementById('tr-header-title').innerHTML = `Registro inicial · <span style="color:var(--g4)">Paso <span id="tr-num">${n}</span> de 3</span>`;
    document.getElementById('tr-dots').style.display = 'flex';
    document.getElementById('tr-num').textContent = n;
    const dots = document.getElementById('tr-dots').children;
    for(let i=0; i<3; i++){
      dots[i].style.background = i < n ? 'var(--g5)' : 'var(--s5)';
    }
  }
}

function backFromStep3() {
  if (isLoginUpdate) {
    showScreen('s-login');
  } else {
    trStep(2);
  }
}

  // ── Aplicar datos al perfil ──
  function applyUserToUI(usuario) {
  // Actualizar currentUser
  currentUser = usuario;

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

    set('perf-nombre', usuario.nombreCompleto || '—');
    set('perf-folio',  usuario.folio ? 'Folio · ' + usuario.folio : (usuario.curp || 'Sin folio'));
    set('perf-edad',   usuario.edad != null ? usuario.edad + ' años' : '—');
    set('perf-sangre', usuario.tipoSangre !== '—' ? usuario.tipoSangre : '—');
    set('perf-tel',    usuario.telefono || '—');
    set('perf-seguro', usuario.derechohabiencia !== '—' ? usuario.derechohabiencia : '—');

    // Tags
    const tagsEl = document.getElementById('perf-tags');
    if (tagsEl) {
      const conds   = (usuario.condiciones || ['Ninguna']).filter(c => c !== 'Ninguna');
      const alrgs   = (usuario.alergias    || ['Ninguna']).filter(a => a !== 'Ninguna');
      const idiomas = (usuario.idiomas     || ['Español']);
      const sangre  = usuario.tipoSangre;
      let html = '';
      if (sangre && sangre !== '—') html += `<span class="dtag dtag-blood">🩸 ${sangre}</span>`;
      conds.forEach(c => html += `<span class="dtag dtag-cond">${c}</span>`);
      if (!conds.length)            html += `<span class="dtag dtag-allergy">Sin condiciones</span>`;
      alrgs.forEach(a => html += `<span class="dtag dtag-allergy">${a}</span>`);
      if (!alrgs.length)            html += `<span class="dtag dtag-allergy">Sin alergias</span>`;
      idiomas.forEach(i => html += `<span class="dtag dtag-lang">${i}</span>`);
      tagsEl.innerHTML = html;
    }

    // Saludo en journey
    const greet = document.querySelector('.hcl-greet');
    if (greet && usuario.nombre) greet.textContent = `Hola de nuevo, ${usuario.nombre} 👋`;

    // Axios IA welcome
    const welcomeText = document.getElementById('ai-welcome-text');
    if (welcomeText && usuario.nombre) {
      welcomeText.textContent = `Bienvenido/a, ${usuario.nombre}. Soy tu filtro preventivo: analizo tu historial silenciosamente para evitar errores antes de tu consulta de ${usuario.servicioHoy || 'hoy'}.`;
    }

    // Historial consulta hoy
    const svcEl  = document.getElementById('ch-today-svc');
    const areaEl = document.getElementById('ch-today-area');
    if (svcEl && usuario.servicioHoy)  svcEl.textContent = usuario.servicioHoy;
    if (areaEl && usuario.servicioHoy) areaEl.innerHTML  = (svcAreaMap[usuario.servicioHoy] || usuario.servicioHoy) + ' · <span style="color:var(--g4);">En curso</span>';

    // Cargar visitas previas del perfil
    loadVisitasEnPerfil(usuario);
  }

  async function loadVisitasEnPerfil(usuario) {
    const histEl = document.getElementById('perfil-hist');
    if (!histEl) return;
    // Visita actual siempre aparece
    const hoy = new Date();
    const fechaHoy = hoy.toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' }).toUpperCase();
    let html = `
      <div class="ch-item" id="ch-today-row">
        <div class="ch-date">${fechaHoy}</div>
        <div class="ch-reason" id="ch-today-svc2">${usuario.servicioHoy || 'Servicio'}</div>
        <div class="ch-doc">${svcAreaMap[usuario.servicioHoy] || 'Área'} · <span style="color:var(--g4);">En curso</span></div>
      </div>`;
    // Cargar visitas históricas guardadas
    try {
      const r = await window.storage.get('visitas:' + usuario.folio);
      if (r && r.value) {
        const visitas = JSON.parse(r.value);
        visitas.slice().reverse().forEach(v => {
          html += `<div class="ch-item">
            <div class="ch-date">${v.fecha}</div>
            <div class="ch-reason">${v.servicio}</div>
            <div class="ch-doc">${v.area} · Completada</div>
          </div>`;
        });
      }
    } catch(e) {}
    if (histEl) histEl.innerHTML = html;
  }

async function finishTriage() {
  if (isLoginUpdate && currentUser) {
    if (selectedService.length === 0 && typeof selectedService !== 'string') {
       showToast('⚠️', 'Selecciona al menos un estudio antes de continuar.', 'amber');
       return;
    }
    currentUser.servicioHoy = selectedService;
    try {
      await window.storage.set('paciente:' + currentUser.folio, JSON.stringify(currentUser));
    } catch(e) {}
    applyUserToUI(currentUser);
    showToast('✅', 'Tus estudios fueron registrados para hoy.', 'green');
    showScreen('s-wait');
    return;
  }

  // ── Recopilar datos personales (paso 1) ──
  const nombre    = (document.getElementById('tr-nombre')?.value   || '').trim();
  const apellidos = (document.getElementById('tr-apellidos')?.value || '').trim();
  const fnac      = document.getElementById('tr-fnac')?.value      || '';
  const sangre    = document.getElementById('tr-sangre')?.value    || '';
  const curp      = (document.getElementById('tr-curp')?.value     || '').trim();
  const tel       = (document.getElementById('tr-tel')?.value      || '').trim();
  const seguro    = document.getElementById('tr-seguro')?.value    || '';

  if (!nombre || !apellidos) {
    showToast('⚠️', 'Por favor ingresa tu nombre y apellidos.', 'amber');
    trStep(1);
    return;
  }

  // ── Recopilar chips (paso 2) ──
  const getChips = (containerId) =>
    [...document.querySelectorAll('#' + containerId + ' .chip.on')]
      .map(c => c.textContent.trim());

  const idiomas    = getChips('ch-lang');
  const condiciones = [...document.querySelectorAll('#tr-s2 .chip.on.danger')].map(c => c.textContent.trim());
  const alergias   = [...document.querySelectorAll('#tr-s2 .chip.on.warn')].map(c => c.textContent.trim());

  // ── Calcular edad ──
  let edad = null;
  if (fnac) {
    const hoy = new Date();
    const nac = new Date(fnac);
    edad = hoy.getFullYear() - nac.getFullYear();
    const m = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
  }

  // ── Generar folio único ──
  const folio = 'SD-' + new Date().getFullYear() + '-' + Math.floor(10000 + Math.random() * 89999);

  // ── Construir objeto de usuario ──
  const usuario = {
    nombre, apellidos,
    nombreCompleto: nombre + ' ' + apellidos,
    fechaNacimiento: fnac,
    edad,
    tipoSangre: sangre,
    curp,
    telefono: tel,
    derechohabiencia: seguro,
    idiomas: idiomas.length ? idiomas : ['Español'],
    condiciones: condiciones.length ? condiciones : ['Ninguna'],
    alergias: alergias.length ? alergias : ['Ninguna'],
    servicioHoy: selectedService,
    folio,
    fechaRegistro: new Date().toISOString()
  };

  // ── Guardar con window.storage (persistente) ──
  try {
    await window.storage.set('paciente:' + folio, JSON.stringify(usuario));
    // También guardar lista de folios para admin
    let foliosList = [];
    try {
      const r = await window.storage.get('folios_lista');
      if (r) foliosList = JSON.parse(r.value);
    } catch(e) {}
    if (!foliosList.includes(folio)) foliosList.push(folio);
    await window.storage.set('folios_lista', JSON.stringify(foliosList));
  } catch(e) { console.error('Storage error:', e); }

  // ── Aplicar al UI ──
  applyUserToUI(usuario);

  // ── Mostrar folio al paciente ──
  showFolioModal(folio, nombre);
}

// ══ CHIPS ══
function toggleChip(el, type) {
  el.classList.toggle('on');
  if (type === 'danger' && el.classList.contains('on')) el.classList.add('danger');
  else el.classList.remove('danger');
  if (type === 'warn' && el.classList.contains('on')) el.classList.add('warn');
  else if (type !== 'warn') el.classList.remove('warn');
}

function toggleChipSingle(el, groupId) {
  const group = document.getElementById(groupId);
  if (group) group.querySelectorAll('.chip').forEach(c => c.classList.remove('on'));
  el.classList.add('on');
}

// ══ SERVICE SELECTION ══
const svcAiHints = {
  'Laboratorio': 'Tu historial de glucosa sugiere añadir HbA1c. GPT-4o lo incluyó automáticamente.',
  'Resonancia magnética': 'Basado en tu edad y perfil, considera solicitar contraste si el médico lo indica.',
  'Electrocardiograma': 'Con tu historial de presión arterial, el ECG es ideal como control preventivo.',
  'Lentes': 'Última evaluación visual: hace 18 meses. Revisión oportuna.',
  'Nutrición': 'Tu IMC y glucosa sugieren que una consulta nutricional complementaría tus resultados.',
  'Tomografía': 'Asegúrate de no haber comido 4 horas antes. GPT-4o enviará un recordatorio de preparación.',
  'Ultrasonido': 'Para mayor precisión, llega con vejiga llena si es abdominal.',
  'Papanicolaou': 'Se recomienda anualmente a partir de los 25 años. Tu último fue hace 14 meses.',
  'Rayos X': 'Retira objetos metálicos antes del estudio. El tiempo estimado es de 10 min.',
  'Densitometría': 'Recomendada cada 2 años a partir de los 40. Ideal si tienes antecedentes familiares.',
  'Mastografía': 'Recomendada anualmente después de los 40. Evita realizarla durante el período.',
  'Biopsia': 'Este procedimiento requiere ayuno de 4 horas. El médico confirmará los detalles.',
  'COVID-19': 'Resultado disponible en 15 min (prueba rápida) o 24 hrs (PCR).'
};

const svcAreaMap = {
  'Laboratorio':'Laboratorio','Resonancia magnética':'Imagenología','Electrocardiograma':'Cardiología',
  'Lentes':'Optometría','Nutrición':'Nutrición','Tomografía':'Imagenología','Ultrasonido':'Imagenología',
  'Papanicolaou':'Ginecología','Rayos X':'Radiología','Densitometría':'Imagenología',
  'Mastografía':'Mastología','Biopsia':'Patología','COVID-19':'Laboratorio'
};

let selectedService = [];

function selService(el, name) {
  if (selectedService.includes(name)) {
    selectedService = selectedService.filter(s => s !== name);
    el.classList.remove('sel');
  } else {
    selectedService.push(name);
    el.classList.add('sel');
  }

  const lbl = document.getElementById('svc-selected-label');
  if (lbl) {
    if (selectedService.length === 1) lbl.textContent = '✓ ' + selectedService[0] + ' seleccionado';
    else if (selectedService.length > 1) lbl.textContent = '✓ ' + selectedService.length + ' estudios seleccionados';
    else lbl.textContent = 'Selecciona un estudio';
  }

  const firstSvc = selectedService.length > 0 ? selectedService[0] : 'Laboratorio';

  const hint = document.getElementById('svc-ai-hint');
  const txt  = document.getElementById('svc-ai-text');
  if (hint && txt) {
    txt.textContent = svcAiHints[firstSvc] || 'Servicio registrado. El área fue notificada.';
    hint.style.display = 'flex';
  }
  // Sync perfil historial
  const svcEl  = document.getElementById('ch-today-svc');
  const areaEl = document.getElementById('ch-today-area');
  if (svcEl)  svcEl.textContent = firstSvc;
  if (areaEl) areaEl.innerHTML  = (svcAreaMap[firstSvc] || firstSvc) + ' · <span style="color:var(--g4);">En curso</span>';
}

// ══ TOAST ══
let toastTimer;
function showToast(icon, msg, type) {
  const t = document.getElementById('toast');
  const colors = { green: '#031209', amber: '#1a0e00', info: '#030b1a', ok: '#031209' };
  document.getElementById('t-ico').textContent = icon;
  document.getElementById('t-msg').textContent = msg;
  t.style.background = colors[type] || '#0d1117';
  clearTimeout(toastTimer);
  t.classList.add('show');
  toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}

// ══ LOGOUT ══
function doLogout() {
  currentUser = null;
  stopQueuePolling();
  const folioInput = document.getElementById('l-folio');
  if (folioInput) { folioInput.value = ''; folioInput.style.borderColor = ''; folioInput.style.boxShadow = ''; }
  const hint = document.querySelector('.login-hint');
  if (hint) hint.innerHTML = `¿Primera visita? <span onclick="showScreen('s-triage')">Crear perfil nuevo →</span>`;
  showToast('👋', 'Sesión cerrada. ¡Hasta pronto!', 'ok');
  setTimeout(() => showScreen('s-login'), 1500);
}

// ══ QUEUE POLLING LOGIC ══
let pollTimer = null;
let currentMyWaitTime = 0;

function startQueuePolling() {
  if (pollTimer) clearInterval(pollTimer);
  fetchQueueAndUpdate();
  pollTimer = setInterval(fetchQueueAndUpdate, 15000); // 15 segundos
}

function stopQueuePolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
}

async function fetchQueueAndUpdate() {
  if (!currentUser) return;
  try {
    const res = await fetch('/api/pacientes');
    if (!res.ok) return;
    const data = await res.json();
    
    const myDbData = data.find(p => p.folio === currentUser.folio);
    if (myDbData) {
        currentUser.servicioHoy = myDbData.servicioHoy;
        currentUser.status = myDbData.status;
        currentUser.estudioActual = myDbData.estudioActual;
        try { await window.storage.set('paciente:' + currentUser.folio, JSON.stringify(currentUser)); } catch(e){}
    }
    
    const active = data.filter(p => p.status === 'active' || p.status === 'ocupado');
    const waitingUnsorted = data.filter(p => p.status === 'wait');
    const orderMap = { rojo: 1, amarillo: 2, verde: 3 };
    const waiting = waitingUnsorted.sort((a,b) => orderMap[a.gravedad] - orderMap[b.gravedad]);
    const fullQueue = [...active, ...waiting];
    
    const serviceTimes = {
      'Densitometría': 20, 'Electrocardiograma': 20, 'Laboratorio': 20,
      'Optometría': 20, 'Lentes': 10, 'Mastografía': 20, 'Nutrición': 20,
      'Papanicolaou': 20, 'Rayos X': 30, 'Resonancia magnética': 40,
      'Tomografía': 30, 'Ultrasonido': 30, 'Biopsia': 15
    };
    
    // Orquestador Clínico
    let baseMySvc = currentUser.servicioHoy || 'Laboratorio';
    let sData = Array.isArray(baseMySvc) ? baseMySvc : (typeof baseMySvc === 'string' && baseMySvc.includes(',') ? baseMySvc.split(',').map(s=>s.trim()) : [baseMySvc]);
    
    let myIndex = fullQueue.findIndex(p => p.folio === currentUser.folio);
    if (myIndex === -1) myIndex = fullQueue.length - 1; // Si es usuario Demo o no está, asumimos final de la fila
    
    const getWaitForSvc = (svc) => {
        let t = 0;
        for (let i = 0; i < myIndex; i++) {
           let loopSvc = fullQueue[i].servicioHoy || 'Laboratorio';
           let svcs = Array.isArray(loopSvc) ? loopSvc : (typeof loopSvc === 'string' && loopSvc.includes(',') ? loopSvc.split(',').map(s=>s.trim()) : [loopSvc]);
           if (svcs.includes(svc)) {
               t += (serviceTimes[svc] || 10);
           }
        }
        return t;
    };

    let optimalRoute = [];
    
    sData.forEach(s => {
       let w = getWaitForSvc(s);
       optimalRoute.push({ svc: s, wait: w });
    });
    
    // Sort strictly by wait time, tie-breaker: needsPrep bias
    const needsPrepLoc = ['Laboratorio', 'Biopsia', 'Tomografía', 'Ultrasonido', 'Resonancia magnética', 'Nutrición', 'Papanicolaou'];
    optimalRoute.sort((a,b) => {
       if (a.wait !== b.wait) return a.wait - b.wait;
       let aP = needsPrepLoc.includes(a.svc) ? 1 : 0;
       let bP = needsPrepLoc.includes(b.svc) ? 1 : 0;
       return bP - aP;
    });
    if (optimalRoute.length === 0) optimalRoute = [{ svc: 'Recepción', wait: 5 }];
    let firstStep = optimalRoute[0];
    
    let timeAhead = firstStep.wait;
    
    if (currentMyWaitTime > 0 && timeAhead > currentMyWaitTime) {
       showToast('🚨', 'En atención a un caso médico urgente, tu tiempo se extendió unos minutos. Agradecemos tu empatía.', 'amber');
    }
    currentMyWaitTime = timeAhead;
    
    // Inyectar Rutas a Pantalla
    window.isOrchestrating = true; // Bloquear mensajes genéricos falsos
    const orchTextEl = document.getElementById('orchText');
    const countdownEl = document.getElementById('j-countdown');
    const uiTurno = document.getElementById('j-turnolabel');

    let isTurnoRed = (currentUser.status === 'ocupado' || currentMyWaitTime === 0);

    if (isTurnoRed) {
        let textMod = currentUser.estudioActual || firstStep.svc;
        if (orchTextEl) orchTextEl.innerHTML = `<strong style="font-size:16px;">🚨 ¡ES TU TURNO!</strong><br/>Pasa ahora mismo al módulo de <strong>${textMod}</strong>.`;
        if (uiTurno) uiTurno.innerHTML = `<strong style="color:var(--g4);font-size:18px;">¡Adelante! Pasa a: ${textMod}</strong>`;
        if (countdownEl) countdownEl.textContent = '—';
        if (typeof renderDynamicJourney === 'function') renderDynamicJourney(textMod, 'ocupado', 0);
    } else if (currentUser.status === 'done' || currentUser.status === 'resultados') {
        if (orchTextEl) orchTextEl.innerHTML = `<strong>✅ Visita Completada:</strong> Todos tus estudios han concluido exitosamente.`;
        if (uiTurno) uiTurno.innerHTML = `<strong style="color:var(--g4)">Estudios Finalizados</strong>`;
        if (countdownEl) countdownEl.textContent = '0';
    } else {
        if (orchTextEl) {
           if (optimalRoute.length > 1) {
               orchTextEl.innerHTML = `<strong>Ruta Óptima:</strong> ${optimalRoute.map(o => o.svc).join(' ➔ ')}. Iniciando en ${firstStep.svc}.`;
           } else {
               orchTextEl.innerHTML = `GPT-4o calculó la carga de <strong>${firstStep.svc}</strong> (Aprox ${firstStep.wait} min).`;
           }
        }
        if (countdownEl) countdownEl.textContent = currentMyWaitTime;
        if (uiTurno) uiTurno.innerHTML = `<strong style="color:var(--r4)">Dirígete a: ${firstStep.svc}</strong> · Aprox ${currentMyWaitTime} min`;
        if (typeof renderDynamicJourney === 'function') renderDynamicJourney(firstStep.svc, 'wait', currentMyWaitTime);
    }

  } catch(e) { console.error('Poller Error', e); }
}

// ══ ADMIN PANEL ══
async function showAdminPanel() {
  const panel = document.getElementById('adminPanel');
  const list  = document.getElementById('adminList');
  panel.style.display = 'flex';
  list.innerHTML = '<div style="text-align:center;padding:30px;color:var(--s4);font-size:13px;">Cargando…</div>';

  try {
    const keysResult = await window.storage.list('paciente:');
    const keys = keysResult ? keysResult.keys : [];
    if (!keys.length) {
      list.innerHTML = '<div style="text-align:center;padding:30px 16px;"><div style="font-size:32px;margin-bottom:10px;">📋</div><div style="color:var(--s3);font-size:13px;line-height:1.6;">Aún no hay pacientes registrados.<br>Regístrate como paciente nuevo para empezar.</div></div>';
      return;
    }
    let html = '';
    for (const key of keys) {
      try {
        const r = await window.storage.get(key);
        if (!r) continue;
        const u = JSON.parse(r.value);
        const folio = key.replace('paciente:', '');
        html += `
          <div onclick="loginAsPatient('${folio}')" style="background:var(--s8);border:1px solid var(--bord);border-radius:14px;padding:14px;margin-bottom:10px;cursor:pointer;transition:all .15s;display:flex;align-items:center;gap:12px;"
               onmouseover="this.style.borderColor='var(--g6)';this.style.background='rgba(22,163,74,.08)'"
               onmouseout="this.style.borderColor='var(--bord)';this.style.background='var(--s8)'">
            <div style="width:40px;height:40px;border-radius:12px;background:var(--g7);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">👤</div>
            <div style="flex:1;min-width:0;">
              <div style="font-size:14px;font-weight:600;color:var(--wh);margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${u.nombreCompleto || u.nombre}</div>
              <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--g4);margin-bottom:3px;">${folio}</div>
              <div style="font-size:10px;color:var(--s4);">
                ${u.edad ? u.edad + ' años · ' : ''}${u.tipoSangre || ''}${u.servicioHoy ? ' · ' + u.servicioHoy : ''}
              </div>
            </div>
            <div style="color:var(--s4);font-size:18px;">›</div>
          </div>`;
      } catch(e) {}
    }
    list.innerHTML = html || '<div style="text-align:center;padding:20px;color:var(--s4);">Sin datos disponibles</div>';
  } catch(e) {
    list.innerHTML = `<div style="text-align:center;padding:20px;color:var(--r4);font-size:12px;">Error al cargar: ${e.message}</div>`;
  }
}

async function loginAsPatient(folio) {
  const panel = document.getElementById('adminPanel');
  try {
    const r = await window.storage.get('paciente:' + folio);
    if (r && r.value) {
      const u = JSON.parse(r.value);
      panel.style.display = 'none';
      applyUserToUI(u);
      showToast('👋', `Entrando como ${u.nombre} — Folio ${folio}`, 'green');
      setTimeout(() => showScreen('s-wait'), 800);
    }
  } catch(e) {}
}

// ══ DEMO STEPS ══
function doDemo(n) {
  // Si no hay usuario activo, cargar un perfil demo
  if (!currentUser) {
    const demoUser = {
      nombre: 'María', apellidos: 'García López',
      nombreCompleto: 'María García López',
      folio: 'SD-DEMO-00001',
      edad: 38, tipoSangre: 'O+', telefono: '999 123 4567',
      derechohabiencia: 'IMSS', idiomas: ['Español'],
      condiciones: ['Hipertensión leve'], alergias: ['Ninguna'],
      servicioHoy: 'Laboratorio'
    };
    applyUserToUI(demoUser);
  }
  if (n === 1) { showScreen('s-wait'); demoStep(1); }
  if (n === 2) { showScreen('s-wait'); }
  if (n === 3) { showScreen('s-results'); }
}

function demoStep(n) {
  [1,2,3].forEach(i => {
    const b = document.getElementById('db'+i);
    if (b) b.classList.toggle('act', i === n);
  });
  if (n === 1) {
    startQueuePolling(); // Inicia el sync con BD cada 2 minutos
    showToast('🩸', 'Turno sincronizado · Calculando tu fila...', 'green');
  } else if (n === 2) {
    fetchQueueAndUpdate(); // Call orchestrator artificially to ensure it builds text
    showToast('🔔', '¡Tu turno es el siguiente! Avanza a tu área designada.', 'amber');
    document.getElementById('j-countdown').textContent = '2';
    // Remove static overrides to let orchestrator format j-turnolabel properly
    document.getElementById('j-waitbar').style.width = '95%';
  } else if (n === 3) {
    showToast('✅', '¡Tus resultados ya están disponibles!', 'green');
    setTimeout(() => showScreen('s-results'), 1600);
  }
}

// ══ SURVEY ══
function selOpt(el) {
  el.parentElement.querySelectorAll('.survey-opt').forEach(o => o.classList.remove('sel'));
  el.classList.add('sel');
  setTimeout(() => showToast('✅', '¡Gracias por tu respuesta!', 'green'), 200);
}

// ══ MINI CHART ══
const chartData = {
  glucosa:    { label: 'Glucosa en ayuno',  color: '#d97706', data: [88,90,92,89,94,96,93,98,95,97,100,99,102], ref: 99  },
  colesterol: { label: 'Colesterol LDL',    color: '#E57373', data: [118,122,120,125,124,128,126,130,132,136,134,138,142], ref: 130 },
  hemoglobina:{ label: 'Hemoglobina',       color: '#2E8B57', data: [13.2,13.5,13.4,13.8,13.6,13.7,13.5,13.9,14.0,13.8,13.7,13.9,13.8], ref: 16 },
  presion:    { label: 'Presión sistólica', color: '#2E8B57', data: [128,126,130,124,122,125,120,122,118,120,119,117,118], ref: 120 }
};
const months = ['M','A','M','J','J','A','S','O','N','D','E','F','M'];
let miniChart;

function buildMiniChart(key) {
  const d = chartData[key];
  document.getElementById('mcc-title').textContent = d.label;
  const ctx = document.getElementById('miniChart').getContext('2d');
  if (miniChart) miniChart.destroy();
  const grad = ctx.createLinearGradient(0, 0, 0, 120);
  grad.addColorStop(0, d.color + '40');
  grad.addColorStop(1, d.color + '00');
  miniChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: months,
      datasets: [{
        data: d.data, borderColor: d.color, backgroundColor: grad,
        borderWidth: 2, pointRadius: 2.5, pointBackgroundColor: d.color,
        pointBorderColor: 'var(--wh)', pointBorderWidth: 1.5, tension: 0.4, fill: true
      }, {
        data: months.map(() => d.ref), borderColor: '#CBD5E0', borderWidth: 1,
        borderDash: [5, 4], pointRadius: 0, fill: false
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1c2333', padding: 8, cornerRadius: 8, callbacks: { label: c => ' ' + c.parsed.y } } },
      scales: {
        x: { grid: { display: false }, border: { display: false }, ticks: { color: '#7a8f9e', font: { size: 10, family: 'DM Sans' } } },
        y: { grid: { color: '#E4ECF0', lineWidth: 1 }, border: { display: false }, ticks: { color: '#7a8f9e', font: { size: 10, family: 'DM Sans' }, maxTicksLimit: 4 } }
      }
    }
  });
}

// ══════════════════════════════════════
//  CLAUDE AI ENGINE  (gpt-4o)
// ══════════════════════════════════════

// Historial de conversación del chat de espera
let chatHistory = [];

// Contexto clínico base — se recalcula con el servicio vigente
const patientCtx = () => ({
  nombre: 'María García López',
  edad: 38,
  seguro: 'IMSS',
  servicio_hoy: selectedService,
  marcadores: {
    glucosa:        { valor: 102,  unidad: 'mg/dL', referencia: '70-99',   estado: 'limítrofe' },
    colesterol_LDL: { valor: 142,  unidad: 'mg/dL', referencia: '<130',    estado: 'elevado'   },
    hemoglobina:    { valor: 13.8, unidad: 'g/dL',  referencia: '12-16',   estado: 'normal'    },
    presion:        { valor: '118/76', unidad: 'mmHg', referencia: '<120/80', estado: 'normal' }
  },
  condiciones: ['Hipertensión leve'],
  alergias: 'Ninguna'
});

const SYSTEM_CHAT = () => `Eres Axios IA, el asistente clínico de Salud Digna. Apoyas a pacientes durante su visita médica.

Perfil del paciente:
${JSON.stringify(patientCtx(), null, 2)}

FILTRO CLINICO ESTRICTO - SOLO responde sobre estas categorias:
1. Sintomas, malestares o sensaciones fisicas
2. Preparacion para estudios o procedimientos medicos
3. Significado de resultados de laboratorio o estudios
4. Medicamentos: dosis, efectos secundarios, interacciones, alergias
5. Enfermedades, condiciones cronicas o agudas
6. Nutricion, hidratacion y habitos de salud
7. Logistica de la visita actual (turno, modulo, tiempo de espera, pasos)
8. Primeros auxilios o situaciones de emergencia

Si el mensaje NO pertenece a ninguna de esas categorias, responde EXACTAMENTE esta frase y nada mas:
"Solo puedo ayudarte con temas relacionados a tu salud o visita medica. Tienes alguna duda sobre tu estudio de hoy o algun sintoma que quieras comentar?"

REGLAS:
- Responde SIEMPRE en espanol. Maximo 3 oraciones claras y directas.
- Nunca emitas diagnosticos definitivos. Sugiere consultar al medico para decisiones clinicas.
- Si el paciente describe sintomas urgentes (dolor en el pecho, dificultad para respirar, perdida de consciencia), indica que busque atencion inmediata.
- Usa lenguaje sencillo, sin tecnicismos innecesarios.
- Considera el perfil del paciente al responder (condiciones, alergias, servicio del dia).`;

// Simulador de IA (reemplaza a claudeCall)
async function claudeCall(prompt, sys, isChat) {
  return new Promise(resolve => {
    setTimeout(() => {
      if (!isChat) {
        resolve(JSON.stringify([
          {tipo:"critical",icono:"⚕️",titulo:"Ajuste de Estudio",descripcion:"Agregar HbA1c por antecedente diabético familiar.",confianza:96,accion:"Añadir a ruta"},
          {tipo:"warn",icono:"⚠️",titulo:"Riesgo de Ayuno",descripcion:"Paciente lleva >12 hrs de ayuno. Priorizar toma.",confianza:88,accion:"Subir prioridad"},
          {tipo:"ok",icono:"📋",titulo:"Cuestionario",descripcion:"Datos validados y emparejados con expediente.",confianza:99,accion:"Guardar log"}
        ]));
      } else {
        const p = prompt.toLowerCase();
        if (p.includes('duele') || p.includes('dolor') || p.includes('malestar')) {
          resolve('Entiendo. He registrado ese síntoma en tu pre-consulta. Por favor, notifica a la enfermera de inmediato si el dolor es muy intenso.');
        } else if (p.includes('ayuno') || p.includes('comer') || p.includes('agua')) {
          resolve('Puedes beber sorbos pequeños de agua natural sin problema. Recuerda mantenerte en ayunas de sólidos hasta pasar a tu estudio de laboratorio.');
        } else if (p.includes('tiempo') || p.includes('turno') || p.includes('falta')) {
          resolve('Claro, consultando con el sistema local... El tiempo de espera calculado aproximado es de 12 minutos para tu módulo.');
        } else {
          resolve('Excelente, he actualizado esa información en tu expediente clínico. El médico podrá leer esta nota. ¿Hay algo más que desees agregar?');
        }
      }
    }, 1400 + Math.random() * 800); // 1.4s - 2.2s de respuesta realista
  });
}

// Chat de espera rehabilitado con filtro clinico
async function sendWaitAI() {
  const inp  = document.getElementById('waitAiInp');
  const val  = inp.value.trim();
  if (!val) return;
  const list = document.getElementById('aiMsgList');
  const btn  = document.getElementById('chatSendBtn');

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
  typing.innerHTML = '<div class="ai-msg-from">\u2756 Axios IA</div><div class="ai-typing"><span></span><span></span><span></span></div>';
  list.appendChild(typing);
  list.scrollTop = list.scrollHeight;

  const reply = await claudeCall(val, SYSTEM_CHAT(), true);
  typing.innerHTML = '<div class="ai-msg-from">\u2756 Axios IA</div>' + reply;
  list.scrollTop = list.scrollHeight;
  inp.disabled = false;
  if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
  inp.focus();
}


// Panel IA — Claude genera decisiones al abrirse
async function openAI() {
  document.getElementById('aiPanel').classList.add('open');
  document.getElementById('aiBadge').style.display = 'none';
  await loadClaudeDecisions();
}

async function loadClaudeDecisions() {
  const container = document.getElementById('gemini-decisions');
  if (!container) return;
  container.innerHTML = `
    <div style="text-align:center;padding:24px 0;display:flex;flex-direction:column;align-items:center;gap:10px;">
      <div class="ai-typing"><span></span><span></span><span></span></div>
      <div style="font-size:11px;color:var(--s4);">GPT-4o analizando tu perfil clínico…</div>
    </div>`;

  const raw = await claudeCall('Genera las 3 decisiones clínicas ahora. Responde ÚNICAMENTE con el array JSON, sin ningún texto adicional, sin markdown, sin explicaciones.', SYSTEM_DECISIONS(), false);
  try {
    // Extraer el array JSON aunque venga con texto extra
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('No JSON array found: ' + raw.substring(0, 100));
    const decisions = JSON.parse(match[0]);
    container.innerHTML = decisions.map(d => {
      const accent   = d.tipo === 'critical' ? 'var(--r4)' : d.tipo === 'warn' ? 'var(--a4)' : 'var(--g4)';
      const barStyle = d.tipo === 'critical' ? ';background:linear-gradient(90deg,var(--r5),var(--r4))'
                     : d.tipo === 'warn'     ? ';background:linear-gradient(90deg,var(--a5),var(--a4))' : '';
      const btnCls   = d.tipo === 'ok' ? 'g' : d.tipo === 'warn' ? 'a' : '';
      const tag      = d.tipo === 'critical' ? 'Alerta' : d.tipo === 'warn' ? 'Atención' : 'Info';
      const accionSafe = (d.accion || '').replace(/'/g, '&#39;');
      return `
      <div class="ai-decision ${d.tipo}">
        <div class="ai-d-top">
          <div class="ai-d-icon">${d.icono}</div>
          <div>
            <div class="ai-d-label ${d.tipo}">GPT-4o · ${tag}</div>
            <div class="ai-d-title">${d.titulo}</div>
          </div>
        </div>
        <div class="ai-d-body">${d.descripcion}</div>
        <div class="ai-confidence">
          <span class="ai-conf-label">Confianza</span>
          <div class="ai-conf-track"><div class="ai-conf-fill" style="width:${d.confianza}%${barStyle}"></div></div>
          <span class="ai-conf-pct" style="color:${accent}">${d.confianza}%</span>
        </div>
        <button class="ai-d-action ${btnCls}"
          onclick="showToast('✦','${accionSafe} — procesado por GPT-4o.','green');closeAIPanel()">
          ${d.accion}
        </button>
      </div>`;
    }).join('');
  } catch(err) {
    container.innerHTML = `
      <div style="font-size:12px;color:var(--s4);padding:12px;text-align:center;line-height:1.6;">
        ⚠️ Error al procesar respuesta.<br>
        <span style="font-size:10px;color:var(--s5);">${err.message}</span><br><br>
        <span style="color:var(--p4);cursor:pointer;font-weight:700;" onclick="loadClaudeDecisions()">Reintentar →</span>
      </div>`;
  }
}

function closeAIPanel() { document.getElementById('aiPanel').classList.remove('open'); }
function closeAIPanelOutside(e) {
  if (e.target === document.getElementById('aiPanel')) closeAIPanel();
}

// Orchestration ticker
const orchMessages = [
  'GPT-4o optimizó tu ruta → Módulo 3 ahorra 16 min vs Módulo 2 saturado',
  'Modelo predictivo: 127 pacientes activos · capacidad al 79%',
  () => { 
    const fwSvc = Array.isArray(selectedService) && selectedService.length > 0 ? selectedService[0] : (typeof selectedService === 'string' ? selectedService : 'estudios'); 
    return `GPT-4o analizó ${fwSvc} → perfil personalizado activo`; 
  },
  'Riesgo metabólico detectado → derivación a endocrinología sugerida',
  'Tiempo real: Laboratorio 87% · Consulta 72% · Farmacia 35%',
  'Hiperpersonalización activa → contenido ajustado a tu perfil por GPT-4o'
];

// ══ DARK MODE EN PERFIL ══
let darkMode = localStorage.getItem('darkMode') === 'true';

function applyDarkMode() {
  const toggle = document.getElementById('darkModeToggle');
  const slider = document.getElementById('dmSlider');
  const knob = document.getElementById('dmKnob');
  
  if (darkMode) {
    document.body.classList.add('dark-mode');
    if (toggle) toggle.checked = true;
    if (slider) slider.style.backgroundColor = 'var(--g5)';
    if (knob) knob.style.transform = 'translateX(20px)';
  } else {
    document.body.classList.remove('dark-mode');
    if (toggle) toggle.checked = false;
    if (slider) slider.style.backgroundColor = 'var(--s5)';
    if (knob) knob.style.transform = 'translateX(0)';
  }
}

function toggleDarkMode() {
  darkMode = !darkMode;
  localStorage.setItem('darkMode', darkMode);
  applyDarkMode();
}

document.addEventListener('DOMContentLoaded', () => {
  applyDarkMode();
  const savedFolio = localStorage.getItem('savedLocalFolio');
  if (savedFolio) {
    const dl = document.getElementById('saved-folios');
    if (dl) dl.innerHTML = `<option value="${savedFolio}">`;
  }
});
// Ejecutamos por si ya cargó
applyDarkMode();

let orchIdx = 0;
setInterval(() => {
  if (window.isOrchestrating) return; // Preserve real routes
  const el = document.getElementById('orchText');
  if (!el) return;
  el.style.opacity = '0';
  setTimeout(() => {
    orchIdx = (orchIdx + 1) % orchMessages.length;
    const msg = orchMessages[orchIdx];
    el.textContent = typeof msg === 'function' ? msg() : msg;
    el.style.transition = 'opacity .5s';
    el.style.opacity = '1';
  }, 400);
}, 4000);

// Init
document.getElementById('demoBar').style.display = 'none';
document.querySelectorAll('.ai-model-badge').forEach(b => b.textContent = 'GPT-4o ✦');


// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').then(reg => {
      console.log('SW registered: ', reg.scope);
    }).catch(err => {
      console.log('SW registration failed: ', err);
    });
  });
}

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
  html += `<h2 style="color:var(--link);margin-bottom:40px;text-align:center;font-size:22px;">${studyName}</h2>`;
  
  // SVG Circle Timer
  let circleColor = 'var(--g4)'; // green default
  if (status === 'wait') circleColor = '#f59e0b'; // amber
  if (status === 'ocupado') circleColor = '#ef4444'; // red
  
  html += `
  <div style="position:relative; width: 220px; height: 220px; display:flex; align-items:center; justify-content:center;">
    <svg width="220" height="220" viewBox="0 0 220 220" style="transform: rotate(-90deg);">
      <circle cx="110" cy="110" r="100" fill="none" stroke="var(--lborder)" stroke-width="8" />
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
      html += `<div style="margin-top:40px; font-size:14px; color:var(--link); text-align:center;">Por favor aguarda. El tiempo se recalcula dinámicamente.</div>`;
  } else if (status === 'ocupado') {
      html += `<div style="margin-top:40px; font-size:14px; color:var(--link); text-align:center; font-weight:600; padding:10px 20px; background:#ef444415; border-radius:12px; border:1px solid #ef444430;">Dirígete al módulo asignado de inmediato.</div>`;
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
