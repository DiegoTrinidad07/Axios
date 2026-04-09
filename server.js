const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

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

// Esquema de Paciente Mongoose
const pacienteSchema = new mongoose.Schema({
    folio: { type: String, required: true, unique: true },
    nombre: { type: String, required: true },
    apellidos: { type: String, required: true },
    nombreCompleto: { type: String },
    fechaNacimiento: { type: String },
    edad: { type: Number },
    tipoSangre: { type: String },
    curp: { type: String },
    telefono: { type: String },
    derechohabiencia: { type: String },
    idiomas: [{ type: String }],
    condiciones: [{ type: String }],
    alergias: [{ type: String }],
    servicioHoy: { type: mongoose.Schema.Types.Mixed },
    fechaRegistro: { type: Date, default: Date.now },
    status: { type: String, default: 'wait' },
    modulo: { type: String, default: '—' },
    estudioActual: { type: String, default: null },
    gravedad: { type: String, default: 'verde' },
    urgente: { type: Boolean, default: false },
    conCita: { type: Boolean, default: false },
    visitas: [
        {
            fecha: String,
            servicio: String,
            area: String
        }
    ]
});

const Paciente = mongoose.model('Paciente', pacienteSchema);

// ----------- RUTAS DE LA API -----------

// GET: Ver todos los pacientes (para el lado administrativo/staff)
app.get('/api/pacientes', async (req, res) => {
    try {
        const pacientes = await Paciente.find().sort({ fechaRegistro: -1 });
        res.json(pacientes);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener pacientes' });
    }
});

// GET: Obtener un paciente específico por folio (Lado del paciente - Login)
app.get('/api/pacientes/folio/:folio', async (req, res) => {
    try {
        const paciente = await Paciente.findOne({ folio: req.params.folio });
        if (paciente) {
            res.json(paciente);
        } else {
            res.status(404).json({ error: 'Paciente no encontrado' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Error al buscar paciente' });
    }
});

// Function helper to get area
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

// POST: Registrar un nuevo paciente (Lado del paciente - Triage)
app.post('/api/pacientes', async (req, res) => {
    try {
        const data = req.body;
        // Asignar nombre completo
        data.nombreCompleto = `${data.nombre} ${data.apellidos}`;
        
        // Espejear servicio a servicioHoy y asegurar que sea array correcto
        let sourceServ = data.servicioHoy || data.servicio;
        if (typeof sourceServ === 'string') {
            data.servicioHoy = sourceServ.split(',').map(s => s.trim());
        } else if (Array.isArray(sourceServ) && sourceServ.length === 1 && sourceServ[0].includes(',')) {
            data.servicioHoy = sourceServ[0].split(',').map(s => s.trim());
        } else {
            data.servicioHoy = sourceServ;
        }

        // Asignación de prioridad
        if (data.urgente) {
            data.gravedad = 'rojo';
        } else if (data.conCita) {
            data.gravedad = 'verde';
        } else {
            data.gravedad = 'amarillo'; // Sin cita y no urgente
        }
        
        // Agregar la visita actual al historial
        data.visitas = [{
            fecha: new Date().toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' }).toUpperCase(),
            servicio: Array.isArray(data.servicioHoy) ? data.servicioHoy.join(', ') : data.servicioHoy,
            area: getArea(data.servicioHoy)
        }];

        const pacienteGuardado = await Paciente.findOneAndUpdate(
            { folio: data.folio },
            { $set: data },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        res.status(201).json(pacienteGuardado);
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: 'Fallo al registrar paciente' });
    }
});

// PUT: Actualizar estado y módulo del paciente (Panel de Staff)
app.put('/api/pacientes/folio/:folio', async (req, res) => {
    try {
        const { status, modulo, estudioActual } = req.body;
        let updateDoc = { $set: {} };
        
        if (status === 'next_study') {
            const p = await Paciente.findOne({ folio: req.params.folio });
            if (!p) return res.status(404).json({ error: 'Paciente no encontrado' });
            
            let sList = Array.isArray(p.servicioHoy) ? p.servicioHoy : [p.servicioHoy];
            // Remove exact study that was completed
            sList = sList.filter(s => s !== estudioActual);
            
            let newStatus = sList.length > 0 ? 'wait' : 'done';
            
            updateDoc.$set = {
                servicioHoy: sList,
                status: newStatus,
                estudioActual: null,
                modulo: newStatus === 'wait' ? '—' : p.modulo
            };
        } else {
            // Prevenir asignación doble de sala
            if (status === 'ocupado' && estudioActual) {
                const inUse = await Paciente.findOne({
                    status: 'ocupado',
                    estudioActual: estudioActual,
                    folio: { $ne: req.params.folio }
                });
                if (inUse) {
                    return res.status(400).json({ error: `El módulo ${estudioActual} ya está siendo ocupado por otro paciente.` });
                }
            }

            updateDoc.$set = { status, modulo };
            if (estudioActual !== undefined) updateDoc.$set.estudioActual = estudioActual;
        }

        const paciente = await Paciente.findOneAndUpdate(
            { folio: req.params.folio },
            updateDoc,
            { new: true }
        );
        if (paciente) {
            res.json(paciente);
        } else {
            res.status(404).json({ error: 'Paciente no encontrado' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al actualizar estado del paciente' });
    }
});

// DELETE: Eliminar de manera irreversible a un paciente (Panel de Staff)
app.delete('/api/pacientes/folio/:folio', async (req, res) => {
    try {
        const paciente = await Paciente.findOneAndDelete({ folio: req.params.folio });
        if (paciente) {
            res.json({ message: 'Paciente eliminado exitosamente' });
        } else {
            res.status(404).json({ error: 'Paciente no encontrado' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Error al eliminar paciente' });
    }
});

// Helpers
function getArea(servicio) {
    const map = {
      'Laboratorio':'Laboratorio','Resonancia magnética':'Imagenología','Electrocardiograma':'Cardiología',
      'Lentes':'Optometría','Nutrición':'Nutrición','Tomografía':'Imagenología','Ultrasonido':'Imagenología',
      'Papanicolaou':'Ginecología','Rayos X':'Radiología','Densitometría':'Imagenología',
      'Mastografía':'Mastología','Biopsia':'Patología','COVID-19':'Laboratorio'
    };
    return map[servicio] || 'Área';
}

// ----------- ROBOTIC AUTO-DISPATCHER -----------
const serviceTimes = {
    'Densitometría': 20, 'Electrocardiograma': 20, 'Laboratorio': 20,
    'Optometría': 20, 'Lentes': 10, 'Mastografía': 20, 'Nutrición': 20,
    'Papanicolaou': 20, 'Rayos X': 30, 'Resonancia magnética': 40,
    'Tomografía': 30, 'Ultrasonido': 30, 'Biopsia': 15
};
const needsPrep = ['Laboratorio', 'Biopsia', 'Tomografía', 'Ultrasonido', 'Resonancia magnética', 'Nutrición', 'Papanicolaou'];

async function autoDispatchQueue() {
    try {
        const pacientes = await Paciente.find();
        const active = pacientes.filter(p => p.status === 'active' || p.status === 'ocupado');
        const waitingUnsorted = pacientes.filter(p => p.status === 'wait');
        
        const orderMap = { rojo: 1, amarillo: 2, verde: 3 };
        const waiting = waitingUnsorted.sort((a,b) => {
            if (orderMap[a.gravedad] !== orderMap[b.gravedad]) return orderMap[a.gravedad] - orderMap[b.gravedad];
            return new Date(a.fechaRegistro) - new Date(b.fechaRegistro);
        });

        const activeModules = new Set();
        pacientes.forEach(p => {
            if (p.status === 'wait' || p.status === 'active' || p.status === 'ocupado') {
                let sList = Array.isArray(p.servicioHoy) ? p.servicioHoy : (p.servicioHoy ? (typeof p.servicioHoy==='string'&&p.servicioHoy.includes(',') ? p.servicioHoy.split(',').map(s=>s.trim()) : [p.servicioHoy]) : []);
                sList.forEach(s => activeModules.add(s));
            }
        });

        const getWait = (svc, pIndex) => {
            let t = 0;
            const fullQ = [...active, ...waiting];
            for (let i = 0; i < pIndex; i++) {
                let sL = Array.isArray(fullQ[i].servicioHoy) ? fullQ[i].servicioHoy : (fullQ[i].servicioHoy ? (typeof fullQ[i].servicioHoy==='string'&&fullQ[i].servicioHoy.includes(',') ? fullQ[i].servicioHoy.split(',').map(s=>s.trim()) : [fullQ[i].servicioHoy]) : []);
                if (sL.includes(svc)) {
                    t += (serviceTimes[svc] || 10);
                }
            }
            return t;
        };

        const getOptimalFor = (p) => {
            let sList = Array.isArray(p.servicioHoy) ? p.servicioHoy : (p.servicioHoy ? (typeof p.servicioHoy==='string'&&p.servicioHoy.includes(',') ? p.servicioHoy.split(',').map(s=>s.trim()) : [p.servicioHoy]) : []);
            if (sList.length === 0) return null;
            
            const fullQ = [...active, ...waiting];
            let pIndex = fullQ.findIndex(x => x.folio === p.folio);
            if (pIndex === -1) pIndex = fullQ.length - 1;

            let optimal = [];
            sList.forEach(s => {
               let w = getWait(s, pIndex);
               optimal.push({ svc: s, wait: w });
            });
            
            const needsPrepLoc = ['Laboratorio', 'Biopsia', 'Tomografía', 'Ultrasonido', 'Resonancia magnética', 'Nutrición', 'Papanicolaou'];
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
                // Módulo libre, despachar al mejor postor
                for (const candidate of waiting) {
                    const optModule = getOptimalFor(candidate);
                    if (optModule === mod) {
                        await Paciente.findOneAndUpdate(
                            { folio: candidate.folio },
                            { $set: { status: 'ocupado', estudioActual: mod, modulo: 'Módulo ' + Math.floor(Math.random()*4+1) } }
                        );
                        console.log(`[Auto-Dispatcher] Paciente ${candidate.folio} fue auto-llamado a ${mod}`);
                        break; 
                    }
                }
            }
        }
    } catch(err) {
        console.error('Error in autoDispatchQueue:', err);
    }
}

// Ejecutar ciclo robótico cada 10 segundos
setInterval(autoDispatchQueue, 10000);

// Iniciar Conexión y Servidor
mongoose.connect('mongodb://localhost:27017/axios_pacientes')
    .then(() => {
        console.log('Conectado exitosamente a MongoDB');
        const HOST = '172.20.28.28';
        app.listen(PORT, HOST, () => {
            console.log(`🚀 Servidor ejecutándose en http://${HOST}:${PORT}`);
        });
    })
    .catch((err) => {
        console.error('Error conectando a MongoDB:', err.message);
    });
