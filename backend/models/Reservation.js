const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  time: { type: String, required: true },
  guests: { type: Number, required: true },
  name: { type: String, required: true },
  contact: { type: String, required: true }, // Phone or email
  confirmed: { type: Boolean, default: false },
});

module.exports = mongoose.model('Reservation', reservationSchema);
