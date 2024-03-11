const app = require('express')()
const http = require('http')
var server =  http.createServer(app)
server.listen(3001)
server.on('listening', () => {
    console.log('Listening socket 3001')
})
server.on('error', (error) => {
    console.log('error on listen socket: $s', error)
})
module.exports = server