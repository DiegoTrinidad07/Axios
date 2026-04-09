const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Archivo estático principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Inicializar SQLite
const db = new sqlite3.Database(path.join(__dirname, 'pacientes.sqlite'), (err) => {
    if (err) {
        console.error('Error al abrir la base de datos:', err.message);
    } else {
        console.log('Conectado exitosamente a SQLite');
        db.run(`CREATE TABLE IF NOT EXISTS pacientes (
            folio TEXT PRIMARY KEY,
            nombre TEXT,
            apellidos TEXT,
            nombreCompleto TEXT,
            fechaNacimiento TEXT,
            edad INTEGER,
            tipoSangre TEXT,
            curp TEXT,
            telefono TEXT,
            derechohabiencia TEXT,
            idiomas TEXT,
            condiciones TEXT,
            alergias TEXT,
            servicioHoy TEXT,
            fechaRegistro DATETIME DEFAULT CURRENT_TIMESTAMP,
            status TEXT DEFAULT 'wait',
            modulo TEXT DEFAULT '—',
            estudioActual TEXT DEFAULT NULL,
            gravedad TEXT DEFAULT 'verde',
            urgente INTEGER DEFAULT 0,
            conCita INTEGER DEFAULT 0,
            visitas TEXT
        )`, (err) => {
            if (err) console.error('Error creando la tabla:', err.message);
        });
    }
});

// Helper para parsear campos JSON que vienen de SQLite
function parseSQLPatient(row) {
    if (!row) return null;
    return {
        ...row,
        urgente: row.urgente === 1,
        conCita: row.conCita === 1,
        idiomas: JSON.parse(row.idiomas || '[]'),
        condiciones: JSON.parse(row.condiciones || '[]'),
        alergias: JSON.parse(row.alergias || '[]'),
        servicioHoy: JSON.parse(row.servicioHoy || '[]'),
        visitas: JSON.parse(row.visitas || '[]')
    };
}

// Helper para parsear la fecha a un formato amigable visualmente temporalmente si hiciera falta
function getArea(svc) {
    const svcs = Array.isArray(svc) ? svc : [svc];
    const map = {
      'Laboratorio':'Laboratorio', 'Resonancia magnética':'Imagenología', 'Electrocardiograma':'Cardiología',
      'Lentes':'Optometría', 'Nutrición':'Nutrición', 'Tomografía':'Imagenología', 'Ultrasonido':'Imagenología',
      'Papanicolaou':'Ginecología', 'Rayos X':'Radiología', 'Densitometría':'Imagenología',
      'Mastografía':'Mastología', 'Biopsia':'Patología', 'COVID-19':'Laboratorio'
    };
    return svcs.map(s => map[s] || 'Área general').join(', ');
}

// ----------- RUTAS DE LA API -----------

// GET: Ver todos los pacientes
app.get('/api/pacientes', (req, res) => {
    db.all(`SELECT * FROM pacientes ORDER BY fechaRegistro DESC`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Error al obtener pacientes' });
        res.json(rows.map(parseSQLPatient));
    });
});

// GET: Obtener un paciente específico por folio
app.get('/api/pacientes/folio/:folio', (req, res) => {
    db.get(`SELECT * FROM pacientes WHERE folio = ?`, [req.params.folio], (err, row) => {
        if (err) return res.status(500).json({ error: 'Error al buscar paciente' });
        if (row) {
            res.json(parseSQLPatient(row));
        } else {
            res.status(200).json({ no_existe: true });
        }
    });
});

// POST: Registrar o actualizar paciente (Upsert)
app.post('/api/pacientes', (req, res) => {
    const data = req.body;
    let folio = data.folio;
    if (!folio) return res.status(400).json({ error: 'Folio es requerido' });

    // Determinar Arrays puros
    let sourceServ = data.servicioHoy || data.servicio;
    let sList = [];
    if (typeof sourceServ === 'string') {
        sList = sourceServ.split(',').map(s => s.trim());
    } else if (Array.isArray(sourceServ) && sourceServ.length === 1 && sourceServ[0].includes(',')) {
        sList = sourceServ[0].split(',').map(s => s.trim());
    } else if (Array.isArray(sourceServ)) {
        sList = sourceServ;
    }

    // Gravedad
    let gravedad = 'amarillo';
    if (data.urgente) gravedad = 'rojo';
    else if (data.conCita) gravedad = 'verde';

    // Visitas
    let visitas = data.visitas || [{
        fecha: new Date().toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' }).toUpperCase(),
        servicio: sList.join(', '),
        area: getArea(sList)
    }];

    const nombreCompleto = `${data.nombre || ''} ${data.apellidos || ''}`.trim();
    const urg = data.urgente ? 1 : 0;
    const conCit = data.conCita ? 1 : 0;

    let idiomas = JSON.stringify(data.idiomas || []);
    let condiciones = JSON.stringify(data.condiciones || []);
    let alergias = JSON.stringify(data.alergias || []);
    let servicioHoy = JSON.stringify(sList);
    let visitasJson = JSON.stringify(visitas);

    // Upsert genérico a SQLite
    const selectQuery = `SELECT folio FROM pacientes WHERE folio = ?`;
    db.get(selectQuery, [folio], (err, row) => {
        if (err) return res.status(500).json({ error: 'Error DB' });

        if (row) {
            // Existe - Update (Asumimos que el front manda los datos actualizados conservando el resto o reemplazando)
            const updateSql = `UPDATE pacientes SET 
                nombre = ?, apellidos = ?, nombreCompleto = ?, fechaNacimiento = ?, edad = ?, tipoSangre = ?,
                curp = ?, telefono = ?, derechohabiencia = ?, idiomas = ?, condiciones = ?, alergias = ?,
                servicioHoy = ?, status = ?, modulo = ?, estudioActual = ?, gravedad = ?, urgente = ?, conCita = ?, visitas = ?
                WHERE folio = ?`;
                
            db.run(updateSql, [
                data.nombre||'', data.apellidos||'', nombreCompleto, data.fechaNacimiento||'', data.edad||0, data.tipoSangre||'',
                data.curp||'', data.telefono||'', data.derechohabiencia||'', idiomas, condiciones, alergias,
                servicioHoy, data.status||'wait', data.modulo||'—', data.estudioActual||null, data.gravedad||gravedad, urg, conCit, visitasJson,
                folio
            ], function(err2) {
                if(err2) return res.status(400).json({ error: 'Fallo al actualizar paciente' });
                // Re-fetch to return
                db.get(`SELECT * FROM pacientes WHERE folio = ?`, [folio], (e, r) => res.json(parseSQLPatient(r)));
            });
        } else {
            // No existe = Crear
            const insertSql = `INSERT INTO pacientes (
                folio, nombre, apellidos, nombreCompleto, fechaNacimiento, edad, tipoSangre,
                curp, telefono, derechohabiencia, idiomas, condiciones, alergias,
                servicioHoy, status, modulo, estudioActual, gravedad, urgente, conCita, visitas
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            
            db.run(insertSql, [
                folio, data.nombre||'', data.apellidos||'', nombreCompleto, data.fechaNacimiento||'', data.edad||0, data.tipoSangre||'',
                data.curp||'', data.telefono||'', data.derechohabiencia||'', idiomas, condiciones, alergias,
                servicioHoy, data.status||'wait', data.modulo||'—', data.estudioActual||null, gravedad, urg, conCit, visitasJson
            ], function(err2) {
                if(err2) return res.status(400).json({ error: 'Fallo al registrar paciente' });
                db.get(`SELECT * FROM pacientes WHERE folio = ?`, [folio], (e, r) => res.status(201).json(parseSQLPatient(r)));
            });
        }
    });
});

// PUT: Actualizar estado y módulo del paciente (Panel de Staff)
app.put('/api/pacientes/folio/:folio', (req, res) => {
    const { status, modulo, estudioActual } = req.body;
    const folio = req.params.folio;

    db.get(`SELECT * FROM pacientes WHERE folio = ?`, [folio], (err, row) => {
        if (err || !row) return res.status(404).json({ error: 'Paciente no encontrado' });

        const p = parseSQLPatient(row);

        if (status === 'next_study') {
            let sList = p.servicioHoy || [];
            sList = sList.filter(s => s !== estudioActual);
            
            let newStatus = sList.length > 0 ? 'wait' : 'done';
            let newModulo = newStatus === 'wait' ? '—' : p.modulo;

            db.run(`UPDATE pacientes SET servicioHoy = ?, status = ?, estudioActual = ?, modulo = ? WHERE folio = ?`,
                [JSON.stringify(sList), newStatus, null, newModulo, folio], function(err2) {
                    if (err2) return res.status(500).json({ error: 'Error' });
                    db.get(`SELECT * FROM pacientes WHERE folio = ?`, [folio], (e, r) => res.json(parseSQLPatient(r)));
            });

        } else {
            // Verificar colisión en "ocupado"
            if (status === 'ocupado' && estudioActual) {
                db.get(`SELECT folio FROM pacientes WHERE status = 'ocupado' AND estudioActual = ? AND folio != ?`, [estudioActual, folio], (err2, inUse) => {
                    if (inUse) return res.status(400).json({ error: `El módulo ${estudioActual} ya está siendo ocupado por otro.` });
                    
                    db.run(`UPDATE pacientes SET status = ?, modulo = ?, estudioActual = ? WHERE folio = ?`,
                        [status, modulo, estudioActual, folio], function(err3) {
                            if (err3) return res.status(500).json({ error: 'Error' });
                            db.get(`SELECT * FROM pacientes WHERE folio = ?`, [folio], (e, r) => res.json(parseSQLPatient(r)));
                    });
                });
            } else {
               // Update normal
               let sql = `UPDATE pacientes SET status = ?, modulo = ?`;
               let params = [status, modulo];
               if (estudioActual !== undefined) {
                   sql += `, estudioActual = ?`;
                   params.push(estudioActual);
               }
               sql += ` WHERE folio = ?`;
               params.push(folio);

               db.run(sql, params, function(err3) {
                   if (err3) return res.status(500).json({ error: 'Error' });
                   db.get(`SELECT * FROM pacientes WHERE folio = ?`, [folio], (e, r) => res.json(parseSQLPatient(r)));
               });
            }
        }
    });
});

// DELETE: Eliminar de manera irreversible a un paciente
app.delete('/api/pacientes/folio/:folio', (req, res) => {
    db.run(`DELETE FROM pacientes WHERE folio = ?`, [req.params.folio], function(err) {
        if (err) return res.status(500).json({ error: 'Error al eliminar paciente' });
        if (this.changes > 0) res.json({ message: 'Paciente eliminado exitosamente' });
        else res.status(404).json({ error: 'Paciente no encontrado' });
    });
});

// ----------- ROBOTIC AUTO-DISPATCHER -----------
const serviceTimes = {
    'Densitometría': 20, 'Electrocardiograma': 20, 'Laboratorio': 20,
    'Optometría': 20, 'Lentes': 10, 'Mastografía': 20, 'Nutrición': 20,
    'Papanicolaou': 20, 'Rayos X': 30, 'Resonancia magnética': 40,
    'Tomografía': 30, 'Ultrasonido': 30, 'Biopsia': 15
};
const needsPrepLoc = ['Laboratorio', 'Biopsia', 'Tomografía', 'Ultrasonido', 'Resonancia magnética', 'Nutrición', 'Papanicolaou'];

function autoDispatchQueue() {
    db.all(`SELECT * FROM pacientes WHERE status IN ('wait', 'active', 'ocupado')`, [], (err, rows) => {
        if (err || !rows) return;
        const pacientes = rows.map(parseSQLPatient);

        const active = pacientes.filter(p => p.status === 'active' || p.status === 'ocupado');
        const waitingUnsorted = pacientes.filter(p => p.status === 'wait');
        
        const orderMap = { rojo: 1, amarillo: 2, verde: 3 };
        const waiting = waitingUnsorted.sort((a,b) => {
            if (orderMap[a.gravedad] !== orderMap[b.gravedad]) return orderMap[a.gravedad] - orderMap[b.gravedad];
            return new Date(a.fechaRegistro) - new Date(b.fechaRegistro);
        });

        const activeModules = new Set();
        pacientes.forEach(p => {
            let sList = p.servicioHoy || [];
            sList.forEach(s => activeModules.add(s));
        });

        const fullQ = [...active, ...waiting];

        const getWait = (svc, pIndex) => {
            let t = 0;
            for (let i = 0; i < pIndex; i++) {
                let sL = fullQ[i].servicioHoy || [];
                if (sL.includes(svc)) {
                    t += (serviceTimes[svc] || 10);
                }
            }
            return t;
        };

        const getOptimalFor = (p) => {
            let sList = p.servicioHoy || [];
            if (sList.length === 0) return null;
            
            let pIndex = fullQ.findIndex(x => x.folio === p.folio);
            if (pIndex === -1) pIndex = fullQ.length - 1;

            let optimal = [];
            sList.forEach(s => {
               let w = getWait(s, pIndex);
               optimal.push({ svc: s, wait: w });
            });
            
            optimal.sort((a,b) => {
                if (a.wait !== b.wait) return a.wait - b.wait;
                let aP = needsPrepLoc.includes(a.svc) ? 1 : 0;
                let bP = needsPrepLoc.includes(b.svc) ? 1 : 0;
                return bP - aP;
            });
            return optimal.length > 0 ? optimal[0].svc : null;
        };

        for (const mod of activeModules) {
            const inUse = active.filter(p => p.estudioActual === mod).length;
            if (inUse === 0) {
                // Modulo libre
                for (const candidate of waiting) {
                    const optModule = getOptimalFor(candidate);
                    if (optModule === mod) {
                        let genMod = 'Módulo ' + Math.floor(Math.random()*4+1);
                        db.run(`UPDATE pacientes SET status = 'ocupado', estudioActual = ?, modulo = ? WHERE folio = ?`,
                            [mod, genMod, candidate.folio], function(e) {
                                if(!e) console.log(`[Auto-Dispatcher] Paciente ${candidate.folio} fue auto-llamado a ${mod}`);
                        });
                        break; 
                    }
                }
            }
        }
    });
}

setInterval(autoDispatchQueue, 10000);

const HOST = '0.0.0.0';
app.listen(PORT, HOST, () => {
    console.log(`🚀 Servidor SQL(SQLite) ejecutándose en http://localhost:${PORT} y red local`);
});
