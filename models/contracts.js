var mongoose = require('mongoose');

var contractsSchema = mongoose.Schema({
  _id: { type: String },
  message: { type: String, default: '' },
  metadata: { type: JSON, default: {} },
  channelId: { type: mongoose.Schema.Types.String, ref: 'channels' },
  customerId: { type: mongoose.Schema.Types.String, ref: 'customers' },
  contractValidFrom: { type: Date, default: null },
  contractValidTo: { type: Date, default: null },
  msgValidFrom: { type: Date, default: null },
  msgValidTo: { type: Date, default: null },
  branches: [{ type: mongoose.Schema.Types.String, ref: 'branches' }],
  contractStatus: { type: Number, default: 0 },
  proofOfPrint: { type: String, default: '' },
  totalPrints: { type: Number, default: 0 },
  branch: { type: Number, default: 0 }
});

module.exports = mongoose.model('contracts', contractsSchema);