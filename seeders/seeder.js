const md5 = require('md5');
var mongoose = require('mongoose');
var constants = require('../app/constants');
var Admins = require('../models/admins');
var Players = require('../models/players');
const Users = require('../models/users');
mongoose.connect(constants.dburl, { useNewUrlParser: true, useUnifiedTopology: true }, async (err) => {
    var admin = [{
        email: 'admin@admin.com',
        password: md5('admin'),
        role: 0,
        active: true
    }]
    var players = []
    for(var i=0; i<50; i++) {
      players.push({
        name: 'Player ' + i.toString()
      })
    }
    // await Players.collection.insertMany(players)
    // var rank = [{userId:null, rank:1}, {userId:null, rank:2}, {userId:null, rank:3}]
    await Admins.collection.deleteMany();
    await Admins.collection.insertMany(admin);
    // await Ranks.collection.deleteMany();
    // await Ranks.collection.insertMany(rank)

    // var streamers = await Streamers.find()
    // for (let i = 0; i < streamers.length; i++) {
    //   var s = streamers[i];
    //   s.id = generateHash(s._id.toString())
    //   await s.save()
    // }
    // var users = await Users.find()
    // for (let i = 0; i < users.length; i++) {
    //   var s = users[i];
    //   s.id = generateHash(s._id.toString())
    //   await s.save()
    // }
    process.exit(0);
});