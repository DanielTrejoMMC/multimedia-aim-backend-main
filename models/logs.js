var mongoose = require('mongoose');

var logsSchema = mongoose.Schema({
    description: { type: String, default: '' },
    playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'players' },
    in: { type: mongoose.Schema.Types.Date, default: '' },
    out: { type: mongoose.Schema.Types.Date, default: '' },
    duration: { type: Number, default: 0 },
    channel: { type: String, default: '' },
    frame: { type: String, default: '' },
    mediaitemPath: { type: String, default: '' },
    customerId: { type: String, default: '' },
    contractId: { type: String, default: '' },
    campaignName: { type: String, default: '' },
});
module.exports = mongoose.model('logs', logsSchema);