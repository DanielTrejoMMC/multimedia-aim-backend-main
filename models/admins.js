var mongoose = require('mongoose');

var adminsSchema = mongoose.Schema({
    email: { type: String, require: true, default: '' },
    password: { type: String, default: '' },
    role: { type: Number, default: 1 },
    active: { type: Boolean, default: true },
    fullName: {type: String, default: ''},
    imgPath: {type: String, default: ''}
});

module.exports = mongoose.model('admins', adminsSchema);