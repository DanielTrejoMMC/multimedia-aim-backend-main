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
router.post('/profile/image', admin.uploadProfileImage)
router.delete('/profile/image', admin.deleteProfileImage)

router.post('/resetpwd', admin.resetPwd)

router.get('/manage', admin.getManageItems)

router.post('/manage/contract', admin.addContract)
router.post('/contracts', admin.getContracts)

router.post('/channels', admin.getChannels)
router.post('/manage/channel', admin.addChannel)

router.post('/branches', admin.getBranches)
router.post('/manage/branch', admin.addBranch)

router.post('/verticals', admin.getVerticals)
router.post('/manage/businessvertical', admin.addVertical)

router.post('/customers', admin.getCustomers)
router.post('/manage/customer', admin.addCustomer)

router.post('/image/upload', admin.uploadImage)
router.post('/contract/logs', admin.getContractLogs)
router.post('/loghistory', admin.getLogfileHistory)

module.exports = router;
