var mongoose = require('mongoose');

var channelsSchema = mongoose.Schema({
  _id: { type: String },
  name: { type: String, default: '' },
  metadata: { type: JSON, default: {} },
});

module.exports = mongoose.model('channels', channelsSchema);