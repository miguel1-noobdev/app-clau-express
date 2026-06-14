const mongoose = require('mongoose');

const recordSchema = new mongoose.Schema({
  fecha: { type: String, required: true },
  horaInicio: { type: String, required: true },
  horaFin: { type: String, required: true },
  totalHoras: { type: Number, required: true },
  horasNocturnas: { type: Number, default: 0 },
  parador: { type: String, required: true },
  notas: { type: String, default: '' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

const Record = mongoose.model('Record', recordSchema);

module.exports = Record;
