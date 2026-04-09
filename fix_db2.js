const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/axios_pacientes').then(async () => {
   const db = mongoose.connection;
   const pacs = await db.collection('pacientes').find().toArray();
   let fixed = 0;
   for (let p of pacs) {
       let sourceServ = p.servicioHoy || p.servicio;
       let properArray = [];
       if (typeof sourceServ === 'string') {
           properArray = sourceServ.split(',').map(s => s.trim());
       } else if (Array.isArray(sourceServ) && sourceServ.length === 1 && sourceServ[0].includes(',')) {
           properArray = sourceServ[0].split(',').map(s => s.trim());
       } else if (Array.isArray(sourceServ)) {
           properArray = sourceServ;
       }
       if (properArray.length > 0) {
           await db.collection('pacientes').updateOne({_id: p._id}, {$set: {servicioHoy: properArray}});
           fixed++;
       }
   }
   console.log('DB Records Fixed:', fixed);
   process.exit(0);
});
