const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/axios_pacientes').then(async () => {
   const db = mongoose.connection;
   await db.collection('pacientes').updateMany({status: 'ocupado'}, {$set: {status: 'wait', estudioActual: null, modulo: '—'}});
   console.log('Pacientes reiniciados a espera para limpiar empalmes.');
   process.exit(0);
});
