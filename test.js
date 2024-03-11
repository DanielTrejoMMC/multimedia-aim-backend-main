const test = require("./models/test")

var pin = ''
for (let i = 0; i < 10; i++) {
  pin += Math.floor(Math.random() * 10).toString()
}
console.log(pin)

test.updateMany