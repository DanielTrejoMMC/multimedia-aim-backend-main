var mongoose = require('mongoose');

var customersSchema = mongoose.Schema({
  _id: { type: String },
  name: { type: String, default: '' },
  metadata: { type: JSON, default: {} },
  verticalId: { type: mongoose.Schema.Types.String, ref: 'verticals' },
});

module.exports = mongoose.model('customers', customersSchema);