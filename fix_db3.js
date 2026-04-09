const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/axios_pacientes').then(async () => {
   const db = mongoose.connection;
   const pacs = await db.collection('pacientes').find().toArray();
   let fixed = 0;
   for (let p of pacs) {
       if (p.estudioActual && p.estudioActual.includes(',')) {
           let firstMod = p.estudioActual.split(',')[0].trim();
           await db.collection('pacientes').updateOne({_id: p._id}, {$set: {estudioActual: firstMod}});
           fixed++;
       }
   }
   console.log('estudioActual corregidos:', fixed);
   process.exit(0);
});
