const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/axios_pacientes').then(async () => {
   const db = mongoose.connection;
   const pacs = await db.collection('pacientes').find().toArray();
   let fixed = 0;
   for (let p of pacs) {
       if (!p.servicioHoy) {
           await db.collection('pacientes').updateOne({_id: p._id}, {$set: {servicioHoy: p.servicio}});
           fixed++;
       }
   }
   console.log('Pacientes arreglados:', fixed);
   process.exit(0);
});
