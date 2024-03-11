var mongoose = require('mongoose');

var branchesSchema = mongoose.Schema({
  _id: {type: String},
  name: { type: String, default: '' },
  metadata: { type: JSON, default: {} },
  channelId: { type: mongoose.Schema.Types.String, ref: 'channels' },
  geoLocation: { type: JSON, default: {} }
});

module.exports = mongoose.model('branches', branchesSchema);