var mongoose = require('mongoose');

var test = mongoose.Schema({
    id: { type: String, default: '' },
    tp: { type: Number, default: 0 },
});
module.exports = mongoose.model('test', test);