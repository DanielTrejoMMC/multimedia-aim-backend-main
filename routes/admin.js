var express = require('express');
var router = express.Router();

var admin = require('../controllers/api/admin');


router.post('/login', admin.login)
router.post('/log/upload', admin.uploadLogfile)
router.use('/', admin.authenticate)

router.get('/loginjwt', admin.loginjwt)
router.get('/summary', admin.getSummary)
router.post('/players', admin.getPlayers)
router.get('/player/:id', admin.getPlayer)
router.post('/player/contract', admin.getPlayerContract)
router.post('/player/create', admin.createPlayer)
router.post('/player/:id', admin.savePlayer)
router.post('/history', admin.getHistory)
router.get('/profile', admin.getProfile)
router.post('/profile', admin.updateProfile)
router.post('/resetpwd', admin.resetPwd)
router.post('/profile/image', admin.uploadProfileImage)
router.delete('/profile/image', admin.deleteProfileImage)
router.get('/manage', admin.getManageItems)
router.post('/manage/channel', admin.addChannel)
router.post('/manage/branch', admin.addBranch)
router.post('/manage/businessvertical', admin.addVertical)
router.post('/manage/customer', admin.addCustomer)
router.post('/manage/contract', admin.addContract)
router.post('/contracts', admin.getContracts)
router.post('/channels', admin.getChannels)
router.post('/branches', admin.getBranches)
router.post('/verticals', admin.getVerticals)
router.post('/customers', admin.getCustomers)
router.post('/image/upload', admin.uploadImage)
router.post('/contract/logs', admin.getContractLogs)
router.post('/loghistory', admin.getLogfileHistory)

module.exports = router;
