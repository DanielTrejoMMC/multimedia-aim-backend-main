var mongoose = require('mongoose');

var verticalsSchema = mongoose.Schema({
  _id: { type: String },
  name: { type: String, default: '' },
  metadata: { type: JSON, default: {} }
});

module.exports = mongoose.model('verticals', verticalsSchema);