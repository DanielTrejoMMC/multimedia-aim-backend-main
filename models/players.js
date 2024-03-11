var mongoose = require('mongoose');

var playersSchema = mongoose.Schema({
  name: { type: String, default: '' },
  desc: { type: String, default: '' },
  lastUpdate: { type: Date, default: '' },
  totalLogs: { type: Number, default: 0 },
  logFiles: { type: Number, default: 0 },
  branchId: { type: mongoose.Schema.Types.String, ref: 'branches', default: null },
  channelId: { type: mongoose.Schema.Types.String, ref: 'channels', default: null },
  customerIds: [{ type: String, default: '' }],
  contractIds: [{ type: mongoose.Schema.Types.String, ref:'contracts', default: '' }],
  metadata: {type: mongoose.Schema.Types.String, default: ''}
});

module.exports = mongoose.model('players', playersSchema);