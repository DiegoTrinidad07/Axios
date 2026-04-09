const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/axios_pacientes').then(async () => {
   const db = mongoose.connection;
   const pacs = await db.collection('pacientes').find().toArray();
   console.dir(pacs.map(p => ({folio: p.folio, status: p.status, servicio: p.servicio, servicioHoy: p.servicioHoy})), {depth: null});
   process.exit(0);
});
