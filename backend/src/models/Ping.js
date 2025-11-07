const { Schema, model } = require('mongoose');

const PingSchema = new Schema({
  at: { type: Date, default: Date.now },
  note: { type: String, default: '' },
}, { versionKey: false });

module.exports = model('Ping', PingSchema);
