const generateRandomPin = (pins) => {
    var pin = ''
    do {
        for (let i = 0; i < 10; i++) {
            pin += Math.floor(Math.random() * 10).toString()
        }
    } while ((pins.filter(e => e.pin == pin)).length > 0)
    return pin
}

module.exports = {
    generateRandomPin
}