
const jwt = require('jwt-simple')
const { IncomingForm } = require('formidable')
const xml2js = require('xml2js');
const moment = require("moment")
const md5 = require('md5');
const fs = require('fs');
var mongoose = require('mongoose');

const Players = require('../../models/players')
const Logs = require('../../models/logs')
const Logfiles = require('../../models/logfiles')
const Admins = require('../../models/admins')
const Channels = require('../../models/channels')
const Contracts = require('../../models/contracts')
const Customers = require('../../models/customers')
const Branches = require('../../models/branches')
const Verticals = require('../../models/verticals')

const { fileStore, fileDelete, fixFile } = require('../file');

const WebSocket = require('ws');

const socket = require('../../socket')

var wslist = []
const wss = new WebSocket.Server({ server: socket });
const broadcast = (msg) => {
  wss.clients.forEach((client) => client.send(msg))
}
wss.on('connection', function connection(ws) {
  console.log("client connected");
  ws.on('message', async (msg) => {
    console.log('data received', msg)
    const data = JSON.parse(msg)
    if (data.from == 'module') {
      if (data.name == 'device') {
        const id = await registerDevice(data.data)
        wslist.push({ id, ws })
        ws.send(JSON.stringify({ from: 'server', to: 'module', name: 'id', data: id.toString() }))
      }
      else if (data.name == 'files') {
        broadcast(JSON.stringify({ from: 'server', to: 'web', name: 'missedfiles', data: data.data }))
      }
    } else if (data.from == 'web') {
      if (data.name == 'missedfiles') {
        console.log('here')
        getLogfiles(data.data)
      } else if (data.name == 'upload') {
        uploadLogfiles(data.data)
      }
    }
  })
  
  ws.on("test", function incoming(message) {
    console.log(message);
  });
  ws.onclose = (e) => {
    console.log('close:', e.reason)
  }
});
wss.on('listening', () => {
  console.log('socket server is listening on port 3001')
})

const adminKey = 'abcdef'
const idLen = 8

const getLogfiles = (playerId) => {
  try {
    broadcast(JSON.stringify({ from: 'server', to: 'module', name: 'files', data: playerId }))
  } catch (e) {
    console.log(e)
  }
}
const uploadLogfiles = (data) => {
  try {
    broadcast(JSON.stringify({ from: 'server', to: 'module', name: 'upload', data }))
  } catch (e) {
    console.log(e)
  }
}
const createToken = (id) => {
  return jwt.encode({ _id: id }, adminKey)
}

const registerDevice = async (data) => {
  const player = await Players.findOne({ name: data.name.toUpperCase() })
  if (!player) {
    await Players.create({ name: data.name.toUpperCase(), lastUpdate: moment(data.date, 'DD-MM-yyyy H:m:s A') })
  }
  const p = await Players.findOne({ name: data.name.toUpperCase() })
  return p._id
}

const createIncId = (id) => {
  const len = id ? id.length : idLen
  return ((parseInt(id) + 1) / Math.pow(10, len)).toFixed(len).toString().replace('0.', '')
}
const parseForm = async (req) => {
  const form = new IncomingForm();
  try {
    var data = await new Promise(function (resolve, reject) {
      form.parse(req, async function (err, fields, files) {
        if (err) {
          reject(err)
        } else {
          const path = await fileStore(files.file, "upload/logs");
          await fixFile(path)
          resolve({ path, name: files.file.name, time: fields.time })
        }
      })
    })

  } catch (e) {
    return null
  }
  return data
}
const uploadLogfile = async (req, res) => {
  const sendRes = (success, result, error) => {
    broadcast(JSON.stringify({
      from: 'server', to: 'web', name: 'upload', data: {
        uploading: false, playerId: id
      }
    }))
    return res.json({ success, result, error })
  }
  try {
    var { time, id } = req.query
    broadcast(JSON.stringify({
      from: 'server', to: 'web', name: 'upload', data: {
        uploading: true, playerId: id
      }
    }))
    console.log("saving log file")
    const { path, name } = await parseForm(req)
    time = moment(time, 'DD-MM-yyyy H:m:s A')
    if (path == null) return res.status(400).json({ success: false, error: 'Unexpected error occured' })
    console.log("parsing XML")
    const result = await parseXML(path)
    if (result == null) return res.status(400).json({ success: false, error: 'Error while parsing XML' })
    console.log("Validating log file")
    var json = result['billing-log']
    const playerName = json['player-name'][0]
    var player = await Players.findById(id)
    const logfile = await Logfiles.findOne({playerId: player._id, name: name})
    if( logfile) {
      console.log(`Log file ${name} was already uploaded.`)
      return sendRes(false, {}, `Log file ${name} was already uploaded.`)

    }
    if (playerName.toUpperCase() != player.name.toUpperCase() || !player) {
      console.log('Player name does not match')
      return sendRes(false, {}, 'Player name does not match')
    }
    const logDate = json['log-start-date'][0]
    console.log(logDate.substring(0, 10).replace(/-/g, ''))
    if (name.indexOf(logDate.substring(0, 10).replace(/-/g, '')) < 0) {
      console.log('Log date does not match')
      return sendRes(false, {}, 'Log date does not match')
    }
    const entry = json.entry
    console.log("Saving to DB")



    var contracts = await Contracts.find()
    var customers = await Customers.find()
    var channels = await Channels.find()
    var newCustomers = []
    var newContracts = []
    var newChannels = []

    var customerIds = player.customerIds || []
    var contractIds = player.contractIds || []

    var logs = []
    console.log('length of log', entry.length)
    for (let i = 0; i < entry.length; i++) {
      var mediaitemPath = entry[i]['mediaitem-path'][0];

      mediaitemPath = mediaitemPath.substring(0, mediaitemPath.indexOf('[')) + mediaitemPath.substring(mediaitemPath.indexOf(']') + 1)

      if (mediaitemPath.indexOf('_aim') < 0) continue

      const t = mediaitemPath.split('_')
      var customerId, channelId, contractDate, contractId, campaignName

      if (t.length != 6) continue
      customerId = t[2]
      channelId = t[3]
      contractDate = t[4]
      campaignName = t[5]
      contractId = customerId + channelId + contractDate
      if (campaignName.lastIndexOf('.') == campaignName.length - 4) {
        campaignName = campaignName.substring(0, campaignName.length - 4)
      }

      logs.push({
        in: entry[i].in[0],
        out: entry[i].out[0],
        duration: entry[i].duration[0],
        channel: entry[i].channel[0],
        frame: entry[i].frame[0],
        mediaitemPath,
        playerId: player._id,
        customerId,
        contractId,
        campaignName
      })

      if (customers.findIndex(e => e._id == customerId) < 0 && newCustomers.findIndex(e => e._id == customerId) < 0)
        newCustomers.push({ _id: customerId })
      if (channels.findIndex(e => e._id == channelId) < 0 && newChannels.findIndex(e => e._id == channelId) < 0)
        newChannels.push({ _id: channelId })
      const j = contracts.findIndex(e => e._id == contractId)
      if (j < 0) {
        var index = newContracts.findIndex(e => e._id == contractId)
        if (index < 0) {
          newContracts.push({ _id: contractId, channelId, customerId, totalPrints: 1 })
        } else {
          newContracts[index].totalPrints++
        }
      } else {
        contracts[j].totalPrints++
      }
      if (customerIds.findIndex(e => e == customerId) < 0)
        customerIds.push(customerId)
      if (contractIds.findIndex(e => e == contractId) < 0)
        contractIds.push(contractId)
    }
    contracts.forEach(async e => {
      await e.save()
    })
    await Customers.insertMany(newCustomers)
    await Contracts.insertMany(newContracts)
    await Channels.insertMany(newChannels)
    player.customerIds = customerIds
    player.contractIds = contractIds

    player.lastUpdate = moment.now()
    player.totalLogs = player.totalLogs + logs.length
    player.logFiles = player.logFiles + 1

    await player.save()
    await Logs.insertMany(logs)
    await Logfiles.create({
      playerId: player._id,
      playerName: playerName.toUpperCase(),
      logs: logs.length, name, time
    })
    await fileDelete(path || "FileNotExist");
    console.log('returning')

    return sendRes(true, path, '')

  } catch (e) {
    console.log(e)
    return sendRes(false, {}, 'Unexpected error occured')
  }
}
const parseXML = async (path) => {
  try {
    const xml = fs.readFileSync(`public\/${path}`);
    var data = await new Promise(function (resolve, reject) {
      xml2js.parseString(xml, { mergeAttrs: true }, async (err, result) => {
        if (err) {
          reject(err)
        } else {
          resolve(result)
        }
      })
    })
  } catch (e) {
    return null
  }
  return data
}



const uploadProfileImage = async (req, res) => {
  try {
    var admin = await Admins.findById(req.body.admin._id)
    const form = new IncomingForm();
    form.parse(req, async function (err, fields, files) {
      try {
        // var { title, description } = fields
        // var news = await News.create({ title, description })
        // console.log(fields)
        const imgPath = await fileStore(files.file, "upload/images");
        await fileDelete(admin.imgPath || "FileNotExist");
        admin.imgPath = imgPath
        await admin.save()
        return res.status(200).json({ success: true, result: imgPath })

      } catch (error) {
        console.log(error)
        res.status(200).json({ success: false, error: 'Unexpected error occured' })
      }
    });
  } catch (e) {
    console.log(e)
    res.status(200).json({ success: false, error: 'Unexpected error occured' })
  }
}
const deleteProfileImage = async (req, res) => {
  try {
    var admin = await Admins.findById(req.body.admin._id)
    admin.imgPath = ''
    await fileDelete(admin.imgPath || 'FileNotExist')
    await admin.save()
    return res.json({ success: true })
  } catch (e) {
    console.log(e)
    res.status(200).json({ success: false, error: e.message })
  }
}
const login = async (req, res) => {
  try {
    var { email, password } = req.body
    password = md5(password)
    var admin = await Admins.findOne({ email: email, password: password })
    if (!admin) return res.status(400).json({ success: false, error: 'Email or password is incorrect' })
    if (!admin.active) return res.status(400).json({ success: false, error: 'Account is inactive currently' })
    res.status(200).json({ success: true, token: createToken(admin._id) })
  } catch (e) {
    console.log(e)
    res.status(400).json({ success: false, error: 'Unexpected error occured' })
  }
}
const authenticate = async (req, res, next) => {
  var token = req.headers.authorization;
  try {
    var payload = jwt.decode(token, adminKey);
    var admin = await Admins.findById(payload._id);
    req.body.admin = admin;

    next();
  } catch (e) {
    res.status(200).json({ success: false, error: e.message });
  }
}
const loginjwt = async (req, res) => {
  try {
    const id = req.body.admin._id
    const admin = await Admins.findById(id)
    const channels = await Channels.find()
    const branches = await Branches.find().populate('channelId')
    const contracts = await Contracts.find().populate('channelId').populate('customerId')
    const verticals = await Verticals.find()
    const customers = await Customers.find().populate('verticalId')
    if (!admin) return res.status(200).json({ success: false, error: 'Invalid admin' })
    return res.status(200).json({
      success: true,
      token: createToken(admin._id),
      profile: {
        fullName: admin.fullName,
        imgPath: admin.imgPath
      },
      manage: {
        channels, branches, contracts, verticals, customers
      }
    })
  } catch (e) {
    console.log(e)
    res.status(200).json({ success: false, error: 'Unexpected error occured' })
  }
}
const resetPwd = async (req, res) => {
  try {
    const { oldPwd, newPwd } = req.body
    const id = req.body.admin._id
    var admin = await Admins.findById(id)
    if (admin.password != md5(oldPwd))
      return res.status(400).json({ success: false, error: 'Current password doesn\'t match with old one.' })
    admin.password = md5(newPwd)
    await admin.save()
    return res.status(200).json({ success: true })

  } catch (e) {
    console.log(e)
    res.status(400).json({ success: false, error: 'Unexpected error occured' })
  }
}

const getPlayers = async (req, res) => {
  try {
    var { limit, offset, channels, customerId, contractId, name } = req.body
    // if (channels.length == 0) {
    //   channels = await Channels.find()
    //   channels = channels.map(e => e._id)
    //   channels.push(null)
    // }
    // channels = channels.map(e => mongoose.Types.ObjectId(e))
    var filter = {
      name: {
        $regex: name || '',
        $options: "i"
      }
    }
    if (contractId) {
      filter.contractIds = {
        $regex: contractId || [],
        $options: "i"
      }
    }
    if (customerId) {
      filter.customerIds = {
        $regex: customerId || [],
        $options: "i"
      }
    }
    if (channels.length != 0)
      filter.channelId = { $in: channels }
    const players = await Players.find(
      filter).skip(offset * limit)
      .limit(limit)
      .populate('branchId')
      .populate('channelId')
    const count = players.length
    return res.json({ success: true, result: { players, count } })

  } catch (e) {
    console.log(e)
    res.status(400).json({ success: false, error: e.message })
  }
}

const getHistory = async (req, res) => {
  try {
    var { limit, offset, playerId, from, to, customerId, contractId } = req.body
    var logs = []
    if (!from)
      from = moment('1900-01-01 00:00:00')
    if (!to)
      to = moment('2999-12-31 00:00:00')
    logs = await Logs.find(
      {
        playerId,
        in: { $gte: from },
        out: { $lte: to },
        customerId: { $regex: customerId, $options: 'i' },
        contractId: { $regex: contractId, $options: 'i' },
      }).skip(offset * limit).limit(limit).sort([['in', 1]])
    const count = await Logs.find({
      playerId, in: { $gte: from }, out: { $lte: to }, customerId: { $regex: customerId, $options: 'i' },
      contractId: { $regex: contractId, $options: 'i' },
    }).countDocuments()
    // const player = await Players.findById(playerId)
    return res.json({ success: true, result: { logs, count } })
  } catch (e) {
    console.log(e)
    res.status(400).json({ success: false, error: e.message })
  }
}
const getProfile = async (req, res) => {
  try {
    const profile = await Admins.findById(req.body.admin._id, 'fullName imgPath')
    res.json({ success: true, result: profile })
  } catch (e) {
    console.log(e)
    res.status(400).json({ success: false, error: e.message })
  }
}
const updateProfile = async (req, res) => {
  try {
    var admin = await Admins.findById(req.body.admin._id)
    const form = new IncomingForm();
    form.parse(req, async function (err, fields, files) {
      console.log(fields, files)
      var { fullName } = fields
      const imgPath = await fileStore(files.file, "upload/images");
      await fileDelete(admin.imgPath || "FileNotExist");
      admin.imgPath = imgPath
      admin.fullName = fullName
      await admin.save()
      res.json({ success: true, result: { fullName, imgPath } })
    })
  } catch (e) {
    console.log(e)
    res.status(400).json({ success: false, error: e.message })
  }
}
const getManageItems = async (req, res) => {
  try {
    const channels = await Channels.find()
    const branches = await Branches.find().populate('channelId')
    // const contracts = await Contracts.find().populate('channelId').populate('customerId')
    const verticals = await Verticals.find()
    const customers = await Customers.find().populate('verticalId')
    return res.json({ success: true, result: { branches, channels, verticals, customers } })
  } catch (e) {
    console.log(e)
    res.status(400).json({ success: false, error: e.message })
  }
}
const getChannels = async (req, res) => {
  try {
    const { limit, offset } = req.body
    const channels = await Channels.find().skip(offset * limit).limit(limit)
    const count = await Channels.count()
    res.json({ success: true, result: { channels, count } })
  } catch (e) {
    console.log(e)
    res.status(400).json({ success: false, error: e.message })
  }
}
const getBranches = async (req, res) => {
  try {
    const { limit, offset } = req.body
    const branches = await Branches.find().populate('channelId').skip(offset * limit).limit(limit)
    const channels = await Channels.find()
    const count = await Branches.count()
    res.json({ success: true, result: { branches, channels, count } })
  } catch (e) {
    console.log(e)
    res.status(400).json({ success: false, error: e.message })
  }
}
const getCustomers = async (req, res) => {
  try {
    const { limit, offset } = req.body
    const customers = await Customers.find().populate('verticalId').skip(offset * limit).limit(limit)
    const verticals = await Verticals.find()
    const count = await Customers.count()
    res.json({ success: true, result: { customers, verticals, count } })
  } catch (e) {
    console.log(e)
    res.status(400).json({ success: false, error: e.message })
  }
}
const getVerticals = async (req, res) => {
  try {
    const { limit, offset } = req.body
    const verticals = await Verticals.find().skip(offset * limit).limit(limit)
    const count = await Verticals.count()
    res.json({ success: true, result: { verticals, count } })
  } catch (e) {
    console.log(e)
    res.status(400).json({ success: false, error: e.message })
  }
}
const addChannel = async (req, res) => {
  try {
    var { name, _id, auto, edit, offset, limit } = req.body
    if (auto) {
      const max = await Channels.find().sort({ '_id': -1 }).limit(1)
      if (max.length == 0) {
        _id = '00000000'
      } else {
        _id = createIncId(max[0]._id)
      }
    }
    var channel = await Channels.findById(_id)

    if (!edit)
      if (channel) {
        return res.status(400).json({ success: false, error: `Channel id ${_id} already exists` })
      }
      else {
        await Channels.create({ name, _id })
      }
    else {
      if (!channel)
        return res.status(400).json({ success: false, error: 'Channel does not exist' })
      channel.name = name
      await channel.save()
    }
    const count = await Channels.count()
    const channels = await Channels.find().skip(offset * limit).limit(limit)
    return res.json({ success: true, result: channels, count: count })
  } catch (e) {
    console.log(e)
    res.status(400).json({ success: false, error: e.message })
  }
}
const addVertical = async (req, res) => {
  try {
    var { name, _id, auto, edit, offset, limit } = req.body
    if (auto) {
      const max = await Verticals.find().sort({ '_id': -1 }).limit(1)
      if (max.length == 0) {
        _id = '00000000'
      } else {
        _id = createIncId(max[0]._id)
      }
    }
    var vertical = await Verticals.findById(_id)

    if (!edit)
      if (vertical) {
        return res.status(400).json({ success: false, error: `Vertical id ${_id} already exists` })
      }
      else {
        await Verticals.create({ name, _id })
      }
    else {
      if (!vertical)
        return res.status(400).json({ success: false, error: 'Vertical does not exist' })
      vertical.name = name
      await vertical.save()
    }
    const count = await Verticals.count()
    const verticals = await Verticals.find().skip(offset * limit).limit(limit)
    return res.json({ success: true, result: verticals, count })
  } catch (e) {
    console.log(e)
    res.status(400).json({ success: false, error: e.message })
  }
}
const addBranch = async (req, res) => {
  try {
    var { name, channelId, _id, metadata, auto, edit, offset, limit } = req.body
    if (auto) {
      const max = await Branches.find().sort({ '_id': -1 }).limit(1)
      if (max.length == 0) {
        _id = '00000000'
      } else {
        _id = createIncId(max[0]._id)
      }
    }
    var branch = await Branches.findById(_id)
    if (!edit)
      if (branch) {
        return res.status(400).json({ success: false, error: `Branch id ${_id} already exists` })
      }
      else {
        await Branches.create({ name, _id, channelId })
      }
    else {
      if (!branch)
        return res.status(400).json({ success: false, error: 'Branch does not exist' })
      branch.name = name
      branch.channelId = channelId
      await branch.save()
    }
    const count = await Branches.count()
    const branches = await Branches.find().populate('channelId').skip(offset * limit).limit(limit)
    return res.json({ success: true, result: branches, count })
  } catch (e) {
    console.log(e)
    res.status(400).json({ success: false, error: e.message })
  }
}
const addCustomer = async (req, res) => {
  try {
    var { name, verticalId, _id, metadata, auto, edit, offset, limit } = req.body
    if (auto) {
      const max = await Customers.find().sort({ '_id': -1 }).limit(1)
      if (max.length == 0) {
        _id = '00000000'
      } else {
        _id = createIncId(max[0]._id)
      }
    }
    var customer = await Customers.findById(_id)
    if (!edit)
      if (customer) {
        return res.status(400).json({ success: false, error: `Customer id ${_id} already exists` })
      }
      else {
        await Customers.create({ name, _id, verticalId })
      }
    else {
      if (!customer)
        return res.status(400).json({ success: false, error: 'Customer does not exist' })
      customer.name = name
      customer.verticalId = verticalId
      await customer.save()
    }
    const count = await Customers.count()
    const customers = await Customers.find().populate('verticalId').skip(offset * limit).limit(limit)
    return res.json({ success: true, result: customers, count })
  } catch (e) {
    console.log(e)
    res.status(400).json({ success: false, error: e.message })
  }
}
const addContract = async (req, res) => {
  try {
    const { contract } = req.body
    console.log(contract)
    var c = await Contracts.findById(contract._id)
    if (!c) return res.status(400).json({ success: false, error: 'Contract does not exist' })
    c = await Contracts.findByIdAndUpdate(contract._id, contract, { new: true }).populate('customerId').populate('branches')
    // await Contracts.create({ ...contract })
    // const contracts = await Contracts.find().populate('channelId').populate('customerId').populate('branches')
    return res.json({ success: true, result: c })
  } catch (e) {
    console.log(e)
    res.status(400).json({ success: false, error: e.message })
  }
}

const uploadImage = async (req, res) => {
  try {
    const form = new IncomingForm();
    form.parse(req, async function (err, fields, files) {
      const imgPath = await fileStore(files.file, "upload/images");
      return res.status(200).json({ success: true, result: imgPath })
    });
  } catch (e) {
    console.log(e)
    res.status(400).json({ success: false, error: e.message })
  }
}
const getPlayer = async (req, res) => {
  try {
    const { id } = req.params
    const idMatch = { $match: { _id: mongoose.Types.ObjectId(id) } }
    var lookup = { from: 'contracts', let: { 'contractIds': '$contractIds' } }
    var pline = []
    const contractMatch = { $match: { $expr: { $in: ['$_id', '$$contractIds'] } } }
    const statusMatch = { $match: { contractStatus: 1 } }
    pline.push(contractMatch)
    pline.push(statusMatch)
    lookup.pipeline = pline
    lookup.as = 'contractIds'
    var aggrConds = []

    if (id) {
      aggrConds.push(idMatch)
    }
    aggrConds.push({ $lookup: lookup })
    var player = await Players.aggregate(aggrConds)
    player = await Players.populate(player, [{ path: 'channelId' }, { path: 'branchId' }])
    // const player = await Players.findById(id).populate('channelId').populate('branchId')
    return res.json({ success: true, result: player[0] })
  } catch (e) {
    console.log(e)
    res.status(400).json({ success: false, error: e.message })
  }
}
const getSummary = async (req, res) => {
  try {
    const mediaPlayers = await Players.count()
    const contracts = await Contracts.count()
    const customers = await Customers.count()
    const channels = await Channels.count()
    const branches = await Branches.count()
    const verticals = await Verticals.count()
    const users = await Admins.count()

    res.json({ success: true, result: { mediaPlayers, contracts, customers, channels, branches, verticals, users } })
  } catch (e) {
    console.log(e)
    res.status(400).json({ success: false, error: e.message })
  }
}
const savePlayer = async (req, res) => {
  try {
    const { name, desc, channelId, branchId, metadata } = req.body
    console.log(name, desc, channelId, branchId, metadata)
    const { id } = req.params
    await Players.findByIdAndUpdate(id, { name, desc, channelId, branchId, metadata })
    const player = await Players.findById(id)
    return res.json({ success: true, result: player })
  } catch (e) {
    console.log(e)
    res.status(400).json({ success: false, error: e.message })
  }
}
const getContracts = async (req, res) => {
  try {
    var { limit, offset, from, to, customer, contractStatus } = req.body
    var query = {}
    if (customer) {
      query.customerId = { $regex: customer || '', $options: 'i' }
    }
    if (contractStatus < 5) {
      query.contractStatus = contractStatus
    }
    if (from) {
      query.contractValidFrom = { $gte: ["$contractValidFrom", moment(from).toDate()] }
    }
    if (to) {
      query.contractValidTo = { $lte: ["$contractValidTo", moment(to).toDate()] }
    }
    const contracts = await Contracts.find(query).populate('customerId').populate('branches').skip(offset * limit).limit(limit)
    const count = await Contracts.count(query)
    res.json({ success: true, result: { contracts, count } })
  } catch (e) {
    console.log(e)
    res.status(400).json({ success: false, error: e.message })
  }
}
const getPlayerContract = async (req, res) => {
  try {
    var { limit, offset, from, to, customer, id, contractStatus } = req.body
    const customers = await Customers.find({ _id: { $regex: customer || '', $options: 'i' } })
    const customerIds = customers.map(e => e._id)
    // from = from ? moment(from) : moment('1900-01-01 00:00:00')
    // to = to ? moment(to) : moment('2999-12-31 00:00:00')

    var aggrConds = []
    const idMatch = { $match: { _id: mongoose.Types.ObjectId(id) } }
    var lookup = { from: 'contracts', let: { 'contractIds': '$contractIds' } }
    var pline = []
    const contractMatch = { $match: { $expr: { $in: ['$_id', '$$contractIds'] } } }
    const statusMatch = { $match: { contractStatus } }
    const customerMatch = { $match: { $expr: { $in: ['$customerId', customerIds] } } }

    var and = []
    if (from) {
      and.push({ $gte: ["$contractValidFrom", moment(from).toDate()] })
    }
    if (to) {
      and.push({ $lte: ["$contractValidTo", moment(to).toDate()] })
    }
    const contractDateMatch = { $match: { $expr: { $and: and } } }
    const skipMatch = { $skip: offset * limit }
    const limitMatch = { $limit: limit }

    pline.push(contractMatch)
    if (contractStatus < 5) {
      pline.push(statusMatch)
    }

    pline.push(customerMatch)
    pline.push(contractDateMatch)
    pline.push(skipMatch)
    pline.push(limitMatch)

    lookup.pipeline = pline
    lookup.as = 'contractIds'
    if (id) {
      aggrConds.push(idMatch)
    }
    aggrConds.push({ $lookup: lookup })
    const players = await Players.aggregate(aggrConds)
    const populatedPlayers = await Players.populate(players,
      [{
        path: 'contractIds',
        populate: [
          { path: 'customerId', model: 'customers' },
          { path: 'branches', model: 'branches' }]
      }, { path: 'channelId' }])
    res.json({ success: true, result: populatedPlayers })
  } catch (e) {
    console.log(e)
    res.status(400).json({ success: false, error: e.message })
  }
}
const getContractLogs = async (req, res) => {
  try {
    const { contractId, offset, limit } = req.body
    const logs = await Logs.find({ contractId }).populate('contractId').populate('playerId').populate('customerId').skip(offset * limit).limit(limit)
    const count = await Logs.find({ contractId }).count()
    res.json({ success: true, result: logs, count })
  } catch (e) {
    console.log(e.message)
    res.status(400).json({ success: false, error: e.message })
  }
}
const getLogfileHistory = async (req, res) => {
  try {
    const { playerId, offset, limit } = req.body
    const logs = await Logfiles.find({ playerId }).skip(offset * limit).limit(limit)
    const count = await Logfiles.count()
    res.json({ success: true, result: logs, count })
    // res.json({ success: true })
  } catch (e) {
    console.log(e)
    res.status(400).json({ success: false, error: e.message })
  }
}

const createPlayer = async (req, res) => {
  try {
    const { name } = req.body
    let player = await Players.findOne({ name })
    if (player)
      return res.status(400).json({ success: false, error: 'Player name already exists' })
    player = await Players.create({ name, lastUpdate: moment() })
    res.json({ success: true, result: player })
  } catch (e) {
    console.log(e)
    res.status(400).json({ success: false, error: e.message })

  }
}
module.exports = {
  uploadLogfile,
  login,
  authenticate,
  loginjwt,
  resetPwd,
  getPlayers,
  getHistory,
  getProfile,
  updateProfile,
  uploadProfileImage,
  deleteProfileImage,
  getManageItems,
  addChannel,
  addBranch,
  addVertical,
  addCustomer,
  addContract,
  uploadImage,
  getSummary,
  getPlayer,
  savePlayer,
  getPlayerContract,
  getContracts,
  getChannels,
  getBranches,
  getVerticals,
  getCustomers,
  getContractLogs,
  getLogfileHistory,
  createPlayer
}