var mongoose = require('mongoose');

var logfilesSchema = mongoose.Schema({
  name: { type: String, default: '' },
  time: { type: mongoose.Schema.Types.Date, default: '' },
  playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'players' },
  playerName: { type: String, default: '' },
  logs: {type: Number, default: 0}
});
module.exports = mongoose.model('logfiles', logfilesSchema);