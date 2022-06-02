module.exports = time => {
    hours = time.substring(0, 1)
    minutes = 0
    if(time.search('5') > 0){
        minutes = 30
    }
    rentTime = new Date(new Date().toLocaleString('en-US', {timeZone: 'Europe/Moscow'}))
    rentTime.setMinutes(new Date().getMinutes() + parseInt(minutes))
    rentTime.setHours(new Date().getHours() + parseInt(hours) + 3)
    if(new Date().getMinutes() + parseInt(minutes) > 59){
        rentTime.setHours(rentTime.getHours() + 1)
    }
    hours = rentTime.getHours().toString().padStart(2, '0')
    minutes = rentTime.getMinutes().toString().padStart(2, '0')
    time = `${hours}:${minutes}`
    return time
}