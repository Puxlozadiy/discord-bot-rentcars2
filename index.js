const {MessageActionRow, MessageButton, Client, Interaction, MessageSelectMenu, ThreadChannel, Channel, ChannelManager, CategoryChannel, MessageEmbed, Permissions, MessageAttachment} = require('discord.js')
const fs = require('fs');
const { measureMemory } = require('vm');
const getCar = require('./get_car')
const getEmoji = require('./get_emoji')
const getTime = require('./get_time')


const client = new Client({
    intents: [
        'GUILD_MESSAGES',
        'GUILDS',
        'GUILD_MESSAGE_REACTIONS',
        'GUILD_MEMBERS'
    ],
    partials: ['REACTION', 'MESSAGE', 'CHANNEL', 'GUILD_MEMBER']
})


process.on('unhandledRejection', error => {
	console.error('Unhandled promise rejection:', error);
});


client.on('interactionCreate', async (interaction) => {
    logTime = new Date(new Date().toLocaleString('en-US', {timeZone: 'Europe/Moscow'}))
    logTime = `${logTime.getHours()}:${logTime.getMinutes()}`
    log = `${logTime} ${interaction.user.username} нажал ${interaction.customId}`
    if(interaction.isButton()){
        if(interaction.customId === 'confirm-rules'){
            interaction.deferUpdate()
            interaction.member.roles.add('969496253266284565')
        }
        if(interaction.customId === 'new-order'){
            try{
                interaction.deferUpdate()
                var users = JSON.parse(fs.readFileSync('./users.json', 'utf-8'))
                for(var i = 0; i < users.users.length; i++){
                    target_user = users.users[i]
                    if(interaction.user.id == target_user.id){
                        if(target_user.cooldown != 0){
                            interaction.user.send({content: 'Заказ можно делать 1 раз в 10 минут!'})
                            return
                        }
                    }
                }
                const row = new MessageActionRow().addComponents(
                    [
                        new MessageSelectMenu()
                            .setCustomId('select-time')
                            .setPlaceholder('Выбрать..')
                            .addOptions(
                                [
                                    {
                                        label: '1 час',
                                        value: '1 час'
                                    },
                                    {
                                        label: '1.5 часа',
                                        value: '1.5 часа'
                                    },
                                    {
                                        label: '2 часа',
                                        value: '2 часа'
                                    },
                                    {
                                        label: '3 часа',
                                        value: '3 часа'
                                    },
                                    {
                                        label: 'Рестарт',
                                        value: 'Рестарт'
                                    },
                                    {
                                        label: 'Другое',
                                        value: 'Другое'
                                    },
                                ]
                            )
                    ]
                )
                //showModal(modal, {client: client, interaction: interaction})
                var info = fs.readFileSync('./order-info.json', 'utf-8')
                ordersInfo = JSON.parse(info)
                channelName = `заказ-${ordersInfo.orderCount}`
                category = interaction.guild.channels.cache.get('968966734788853811')
                const channel = await interaction.guild.channels.create(channelName, {
                    type: 'GUILD_TEXT',
                    parent: category,
                    permissionOverwrites: [
                        {
                            id: interaction.guild.id,
                            deny: ['VIEW_CHANNEL'],
                        },
                        {
                            id: interaction.user.id,
                            allow: ['VIEW_CHANNEL'],
                        },
                    ],
                });
                channel.send({content: `<@${interaction.user.id}>\nВыберите время, на которое вы хотите арендовать автомобиль:`, ephemeral: true, components: [row]}).then(msg => {getMsgId(msg.id, ordersInfo.orderCount - 1)})
                newOrder = {orderNum: ordersInfo.orderCount, orderChannel: (await channel).id, ended: false, customerId: interaction.user.id, beforeDelete: 600, car: `${interaction.message.embeds[0].title}`, customerName: interaction.user.username, aboutToEnd: false}
                ordersInfo.orderCount++
                fs.writeFileSync('./order-info.json', JSON.stringify(ordersInfo))
                fs.readFile('./orders.json', 'utf-8', (err, orders) => {
                    orders = JSON.parse(orders)
                    orders.orders.push(newOrder)
                    fs.writeFileSync('./orders.json', JSON.stringify(orders, null, 2))
                })
                var userFounded = false
                for(var i = 0; i < users.users.length; i++){
                    target_user = users.users[i]
                    if(interaction.user.id == target_user.id){
                        target_user.cooldown = 600
                        userFounded = true
                    }
                }
                if(userFounded == false){
                    users.users.push({id: interaction.user.id, cooldown: 1800})
                }
                fs.writeFileSync('./users.json', JSON.stringify(users, null, 2))
                log = `${logTime} ${interaction.user.username} сделал заказ на ${newOrder.car}. Номер заказа ${newOrder.orderNum}`
            }
            catch(err){
                console.log(err)
            }
            
        }
        if(interaction.customId === 'take-order'){
            orders = JSON.parse(fs.readFileSync('./orders.json', 'utf-8'))
            orderCount = parseInt(interaction.message.embeds[0].title.substring(7))
            target_order = orders.orders[orderCount]
            if(target_order.dealerId == undefined || target_order.dealerId == ''){
                if(target_order.aboutToEnd == false){
                    const row2 = new MessageActionRow().addComponents([
                        new MessageButton().setCustomId('timer-go').setLabel('Отдал ключи').setStyle('PRIMARY'),
                        new MessageButton().setCustomId('untake-order').setLabel('Отказаться от заказа').setStyle('DANGER'),
                        new MessageButton().setCustomId('end-order').setLabel('Закрыть заказ').setStyle('DANGER'),
                    ])
                    var channel = interaction.guild.channels.cache.get(`${target_order.orderChannel}`)
                    channel.send({
                        content: `Уважаемый <@${target_order.customerId}>, ваш заказ принял <@${interaction.user.id}>! Далее можете общаться в данном чате!\n\nУправление для арендодателя:`,
                        components: [row2]
                    }).then(msg => getMsgId2(msg.id, orderCount))
                    channel.permissionOverwrites.create(interaction.user.id, {
                        'VIEW_CHANNEL': true
                    })
                    target_order.dealerId = interaction.user.id
                    target_order.beforeDelete = 86400
                    fs.writeFileSync('./orders.json', JSON.stringify(orders, null, 2))
                    users = JSON.parse(fs.readFileSync('./users.json', 'utf-8'))
                    for(var i = 0; i < users.users.length; i++){
                        target_user = users.users[i]
                        if(target_user.id == target_order.customerId){
                            if(target_user.orders == undefined){
                                target_user.orders = 1
                            }
                            else target_user.orders += 1
                        }
                    }
                    fs.writeFileSync('./users.json', JSON.stringify(users, null, 2))
                    log = `${logTime} ${interaction.user.username} взял заказ ${orderCount}.`
                }
            }
            const row = new MessageActionRow().addComponents([new MessageButton().setCustomId('take-order').setLabel('Взять заказ').setStyle('DANGER').setDisabled(true)])
            interaction.update({
                    embeds: interaction.message.embeds,
                    components: [row]
            })
        }
        if(interaction.customId === 'untake-order'){
            interaction.deferUpdate()
            orders = JSON.parse(fs.readFileSync('./orders.json', 'utf-8'))
            orderCount = interaction.channel.name.substring(6)
            target_order = orders.orders[orderCount]
            if(interaction.user.id === target_order.dealerId){
                if(target_order.aboutToEnd == false){
                    target_order.orderTaked = ''
                    target_order.beforeDelete = 7200
                    target_order.dealerId = ''
                    fs.writeFileSync('./orders.json', JSON.stringify(orders, null, 2))
                    var channel = interaction.guild.channels.cache.get(`${target_order.orderNotificChannel}`)
                    await channel.messages.fetch(target_order.orderNotific).then(msg => {
                        const embed = msg.embeds[0]
                        const row = new MessageActionRow().addComponents([new MessageButton().setCustomId('take-order').setLabel('Взять заказ').setStyle('SUCCESS')])
                        msg.edit({embeds: [embed], components: [row]})
                    })
                    await interaction.message.delete()
                    await interaction.channel.send({
                        content: `<@${interaction.user.id}> отказался от заказа. Просим подождать другого исполнителя!`
                    })
                    await interaction.channel.permissionOverwrites.delete(interaction.user)
                    users = JSON.parse(fs.readFileSync('./users.json', 'utf-8'))
                    for(var i = 0; i < users.users.length; i++){
                        target_user = users.users[i]
                        if(target_user.id == target_order.customerId){
                            target_user.orders -= 1
                        }
                    }
                    fs.writeFileSync('./users.json', JSON.stringify(users, null, 2))
                    log = `${logTime} ${interaction.user.username} отказался от заказа ${orderCount}.`
                }
                
            }
        }
        if(interaction.customId === 'timer-go'){
            orders = fs.readFileSync('./orders.json', 'utf-8')
            orders = JSON.parse(orders)
            orderCount = parseInt(interaction.channel.name.substring(6))
            target_order = orders.orders[orderCount]
            if(interaction.user.id == target_order.dealerId && target_order.timer != true){
                const row = new MessageActionRow().addComponents([
                    new MessageButton().setCustomId('timer-go').setLabel('Отдал ключи').setStyle('PRIMARY').setDisabled(true),
                    new MessageButton().setCustomId('untake-order').setLabel('Отказаться от заказа').setStyle('DANGER').setDisabled(true),
                    new MessageButton().setCustomId('end-order').setLabel('Закрыть заказ').setStyle('DANGER'),
                ])
                const row2 = new MessageActionRow().addComponents([
                    new MessageButton().setCustomId('extra5m').setLabel('+ 5мин').setStyle('PRIMARY'),
                    new MessageButton().setCustomId('extra30m').setLabel('+ 30мин').setStyle('PRIMARY'),
                    new MessageButton().setCustomId('extra1h').setLabel('+ 1час').setStyle('PRIMARY'),
                ])
                interaction.update({content: interaction.message.content, components: [row]})
                if(target_order.time != 'Рестарт' && target_order.time != 'Другое'){
                    var time = getTime(target_order.time)
                    var channel = interaction.channel
                    channel.send({
                        content: `Время пошло! Ваша аренда закончится ${time}.`,
                        components: [row2]
                    })
                    target_order.time = time
                    target_order.beforeDelete = 86400
                    target_order.timer = true
                    orders.orders[orderCount] = target_order
                    fs.writeFileSync('./orders.json', JSON.stringify(orders, null, 2))
                }
                else{
                    const row = new MessageActionRow().addComponents([
                        new MessageButton().setCustomId('end-order').setLabel('Завершить заказ').setStyle('DANGER')
                    ])
                    var channel = interaction.channel
                    channel.send({
                        content: `Аренда началась! Приятной поездки :)\n\nУправление для арендодателя:`,
                        components: [row]
                    })
                    target_order.timer = true
                    target_order.beforeDelete = 86400
                    orders.orders[orderCount] = target_order
                    fs.writeFileSync('./orders.json', JSON.stringify(orders, null, 2))
                }
                log = `${logTime} ${interaction.user.username} запустил таймер заказа ${orderCount}.`
            }
        }
        if(interaction.customId === 'end-order'){
            interaction.message.content
            orderCount = parseInt(interaction.channel.name.substring(6))
            orders = JSON.parse(fs.readFileSync('./orders.json', 'utf-8'))
            order = orders.orders[orderCount]
            if(order.orderNotific != ''){
                order.beforeDelete = 600
                order.timer = false
                order.aboutToEnd = true
                orderNotific = order.orderNotific
                order.orderNotific = ''
                fs.writeFileSync('./orders.json', JSON.stringify(orders, null, 2))
                const row = new MessageActionRow().addComponents([new MessageButton().setCustomId('end-order').setLabel('Отменить заказ').setStyle('DANGER').setDisabled(true)])
                const row2 = new MessageActionRow().addComponents([
                    new MessageButton().setCustomId('timer-go').setLabel('Отдал ключи').setStyle('PRIMARY').setDisabled(true),
                    new MessageButton().setCustomId('untake-order').setLabel('Отказаться от заказа').setStyle('DANGER').setDisabled(true),
                    new MessageButton().setCustomId('end-order').setLabel('Закрыть заказ').setStyle('DANGER').setDisabled(true),
                ])
                const row3 = new MessageActionRow().addComponents([new MessageButton().setCustomId('end-order').setLabel('Завершить заказ').setStyle('DANGER').setDisabled(true)])
                if(interaction.message.content.startsWith('**Ваш')){
                    interaction.update({content: interaction.message.content, components: [row]})
                    var channel1 = client.channels.cache.get(order.orderChannel)
                    if(order.orderTaked != undefined && order.orderTaked != ''){
                        await channel1.messages.fetch(order.orderTaked).then(msg => msg.edit({content: msg.content, components: [row2]}))
                    }
                    if(order.timerEndMessage != undefined && order.timerEndMessage != ''){
                        await channel1.messages.fetch(order.timerEndMessage).then(msg => msg.edit({content: msg.content, components: [row3]}))
                    }
                }
                else if(interaction.message.content.startsWith('Уважаемый')){
                    interaction.update({content: interaction.message.content, components: [row2]})
                    var channel1 = client.channels.cache.get(order.orderChannel)
                    channel1.messages.fetch(order.orderInfoMessage).then(msg => msg.edit({content: msg.content, components: [row]}))
                    if(order.timerEndMessage != undefined && order.timerEndMessage != ''){
                        channel1.messages.fetch(order.timerEndMessage).then(msg => msg.edit({content: msg.content, components: [row3]}))
                    }
                }
                else if(interaction.message.content.startsWith('Время')){
                    var channel1 = client.channels.cache.get(order.orderChannel)
                    channel1.messages.fetch(order.orderInfoMessage).then(msg => msg.edit({content: msg.content, components: [row]}))
                    channel1.messages.fetch(order.orderTaked).then(msg => msg.edit({content: msg.content, components: [row2]}))
                    interaction.update({content: interaction.message.content, components: [row3]})
                }
                interaction.channel.send({
                    content: 'Заказ закрыт! Данный чат удалится через 10 минут.'
                })
                const channel2 = client.channels.cache.get(`${order.orderNotificChannel}`);
                message = channel2.messages.fetch(orderNotific).then(msg => msg.delete())
                log = `${logTime} ${interaction.user.username} закрыл заказ ${orderCount}.`
            }
            
        }
        if(interaction.customId.startsWith('extra')){
            try{
                orderCount = parseInt(interaction.channel.name.substring(6))
                orders = JSON.parse(fs.readFileSync('./orders.json', 'utf-8'))
                target_order = orders.orders[orderCount]
                if(target_order.dealerId == interaction.user.id){
                    hours = parseInt(target_order.time.substring(0,2))
                    minutes = parseInt(target_order.time.substring(3,5))
                    if(interaction.customId === 'extra5m'){
                        minutes += 5
                        if(minutes >= 60){
                            minutes-=60
                            hours+=1
                        }
                        interaction.channel.send({content: 'Добавлено 5 минут ко времени аренды.'})
                        log = `${logTime} ${interaction.user.username} добавил 5 минут ко времени ${orderCount} заказа.`
                    }
                    if(interaction.customId === 'extra30m'){
                        minutes += 30
                        if(minutes >= 60){
                            minutes-=60
                            hours+=1
                            if(hours>=24) hours = 0
                        }
                        interaction.channel.send({content: 'Добавлено 30 минут ко времени аренды.'})
                        log = `${logTime} ${interaction.user.username} добавил 30 минут ко времени ${orderCount} заказа.`
                    }
                    if(interaction.customId === 'extra1h'){
                        hours+=1
                        if(hours>=24) hours = 0
                        interaction.channel.send({content: 'Добавлен 1 час ко времени аренды.'})
                        log = `${logTime} ${interaction.user.username} добавил 1 час ко времени ${orderCount} заказа.`
                    }
                    hours = hours.toString().padStart(2, '0')
                    minutes = minutes.toString().padStart(2, '0')
                    target_order.time = `${hours}:${minutes}`
                    target_order.timer = true
                    fs.writeFileSync('./orders.json', JSON.stringify(orders, null, 2))
                    interaction.update({
                        content: `Время пошло! Ваша аренда закончится ${target_order.time}.`,
                        components: [interaction.message.components[0]]
                    })
                }
            }
            catch(err){console.log(err)}
        }
        if(interaction.customId === 'tgl-notifics-on'){
            interaction.deferUpdate()
            carname = interaction.message.content.slice(25, -1)
            cars = JSON.parse(fs.readFileSync('./cars.json', 'utf-8'))
            for(var car of cars){
                if(car.name == carname){
                    for(var sub of car.subscribers){
                        if(sub == interaction.user.id) {
                            return
                        }
                    }
                    var channel = interaction.guild.channels.cache.get(`${car.channelID}`)
                    channel.permissionOverwrites.create(interaction.user, {
                        'VIEW_CHANNEL': true,
                        'READ_MESSAGE_HISTORY': true,
                        'SEND_MESSAGES': false,
                        'ADD_REACTIONS': false
                    })
                    car.subscribers.push(interaction.user.id.toString())
                    const row = new MessageActionRow().addComponents(new MessageButton().setCustomId('new-order').setLabel(`Сделать заказ (${car.subscribers.length} машин)`).setStyle('PRIMARY'))
                    if(car.messageID != ''){
                        channel1 = interaction.guild.channels.cache.get(car.adChannel)
                        if(channel1 != undefined) {
                            channel1.messages.fetch(car.messageID).then(msg => {
                            if(msg != undefined) {
                                msg.edit({embeds: [msg.embeds[0]], components: [row]})
                            }
                        })}
                    }
                }
            }
            fs.writeFileSync('./cars.json', JSON.stringify(cars, null, 2))
        }
        if(interaction.customId === 'tgl-notifics-off'){
            interaction.deferUpdate()
            carname = interaction.message.content.slice(25, -1)
            cars = JSON.parse(fs.readFileSync('./cars.json', 'utf-8'))
            for(var car of cars){
                if(car.name == carname){
                    var channel = interaction.guild.channels.cache.get(`${car.channelID}`)
                    channel.permissionOverwrites.delete(interaction.user)
                    car.subscribers = car.subscribers.filter(value => {if(value != interaction.user.id) return value})
                    const row = new MessageActionRow().addComponents(new MessageButton().setCustomId('new-order').setLabel(`Сделать заказ (${car.subscribers.length} машин)`).setStyle('PRIMARY'))
                    if(car.messageID != ''){
                        channel1 = interaction.guild.channels.cache.get(car.adChannel)
                        if(channel1 != undefined) channel1.messages.fetch(car.messageID).then(msg => {
                            if(msg != undefined) msg.edit({embeds: [msg.embeds[0]], components: [row]})
                        })
                    }
                }
            }
            fs.writeFileSync('./cars.json', JSON.stringify(cars, null, 2))
        }
        if(interaction.customId === 'trybot'){
            interaction.reply({
                content: 'Пошёл ты'
            })
        }
    }
    if(interaction.isSelectMenu()){
        if(interaction.customId === 'select-time'){
            try{
                time = interaction.values[0]
                orderCount = interaction.channel.name.substring(6)
                orders = JSON.parse(fs.readFileSync('./orders.json', 'utf-8'))
                target_order = orders.orders[orderCount]
                target_order.time = time
                result = `**Ваш заказ принят! Ожидайте ответа в данном чате!**\nНомер заказа: ${orderCount}\nВыбрано авто: ${target_order.car}\nВыбрано время: ${time}`
                const row2 = new MessageActionRow().addComponents([new MessageButton().setCustomId('end-order').setLabel('Отменить заказ').setStyle('DANGER')])
                interaction.update({
                    content: result,
                    components: [row2]
                })
                car = target_order.car
                targetId = getCar(car)
                const orderEmbed = new MessageEmbed().setTitle(`Заказ №${orderCount}`).addFields({name: 'Автомобиль:', value: `${car}`, inline: true}, { name: '\u200B', value: '\u200B', inline: true }, {name: 'Время:', value: `${time}`, inline: true})
                const row = new MessageActionRow().addComponents([new MessageButton().setCustomId('take-order').setLabel('Взять заказ').setStyle('SUCCESS')])
                var channel = interaction.guild.channels.cache.get(`${targetId}`)
                target_order.beforeDelete = 7200
                fs.writeFileSync('./orders.json', JSON.stringify(orders, null, 2))
                await channel.send({
                    content: `@here, заказ от ${target_order.customerName}`,
                    embeds: [orderEmbed],
                    components: [row]
                }).then(message => {
                    addIDsToOrder(message.id, message.channelId, orderCount)
                })
                log = `${logTime} ${interaction.user.username} выбрал время для ${orderCount} заказа.`
            }
            catch(err){
                console.log(err)
            }
        }
    }
    console.log(log)
} )

function addIDsToOrder(msgId, channelId, orderCount){
    orders = JSON.parse(fs.readFileSync('./orders.json', 'utf-8'))
    orders.orders[orderCount].orderNotific = msgId
    orders.orders[orderCount].orderNotificChannel = channelId
    fs.writeFileSync('./orders.json', JSON.stringify(orders, null, 2))
}

function getMsgId(messageId, orderCount){
    orders = JSON.parse(fs.readFileSync('./orders.json', 'utf-8'))
    orders.orders[orderCount].orderInfoMessage = messageId
    fs.writeFileSync('./orders.json', JSON.stringify(orders, null, 2))
}
function getMsgId2(messageId, orderCount){
    orders = JSON.parse(fs.readFileSync('./orders.json', 'utf-8'))
    orders.orders[orderCount].orderTaked = messageId
    fs.writeFileSync('./orders.json', JSON.stringify(orders, null, 2))
}
function getMsgId3(messageId, orderCount){
    orders = JSON.parse(fs.readFileSync('./orders.json', 'utf-8'))
    orders.orders[orderCount].timerEndMessage = messageId
    fs.writeFileSync('./orders.json', JSON.stringify(orders, null, 2))
}

client.on('ready', async () => {
    const row = new MessageActionRow().addComponents([
        new MessageButton().setCustomId('new-order').setLabel('Сделать заказ').setStyle('PRIMARY')
    ])
    const embed = new MessageEmbed().setTitle('Test').setImage('https://i.imgur.com/549qHPg.png')
            .addFields(
                {name: 'Багажник:', value: '200 кг (22 мяса)\n\u200B', inline: true}, 
                {name: 'Скорость:', value: '280 км/ч', inline: true},
                {name: 'Усреднённые расценки:', value: '1 час - $4.500\n1.5 часа - $6.000\n2 часа - $8.000\n3 часа - $10.000\nДо рестарта - договорная'},
                )
    const channel = client.channels.cache.get('965139984145322084');
    /* channel.messages.fetch('962713572910194699').then(msg => {
        const row = new MessageActionRow().addComponents([
            new MessageButton().setCustomId('new-order').setLabel('Сделать заказ').setStyle('PRIMARY')
        ])
        const embed = new MessageEmbed().setTitle('Bugati Veyron').setImage('https://i.imgur.com/oKC5iyF.png')
                .addFields(
                    {name: 'Багажник:', value: '15 кг\n\u200B', inline: true}, 
                    {name: 'Скорость:', value: '450 км/ч', inline: true},
                    {name: 'Усреднённые расценки:', value: 'До рестарта - договорная'},
                    )
        msg.edit({embeds: [embed], components: [row]})
    }) */
    //channel.send({embeds: [embed], components: [row]})
    /* var channel = client.channels.cache.get('961558785539862548');
    let id = 2
    channel.send({content: 'Хуй'})
    .then(message => {
        id = message
    })
    console.log(id) */
    //var channel = client.guild.channels.cache.get(`960912180826488872`)
    //message = channel.messages.fetch(`961588350144372808`).then(console.log)
    
    // Проверяет, когда время аренды вышло
    setInterval( async () => { 
        orders = JSON.parse(fs.readFileSync('./orders.json', 'utf-8'))
        for(var i = 0; i < orders.orders.length; i++){
            target_order = orders.orders[i]
            if(target_order.timer == true){
                var time = target_order.time
                if(time != 'Рестарт' && time != 'Другое'){
                    hours = parseInt(time.substring(0,2))
                    minutes = parseInt(time.substring(3,5))
                    nowa = new Date(new Date().toLocaleString('en-US', {timeZone: 'Europe/Moscow'}))
                    if(parseInt(nowa.getHours()) == hours && parseInt(nowa.getMinutes()) >= minutes){
                        console.log(`Время аренды ${target_order.orderNum} вышло!`)
                        var channel = client.channels.cache.get(`${target_order.orderChannel}`)
                        const row = new MessageActionRow().addComponents([
                            new MessageButton().setCustomId('end-order').setLabel('Завершить заказ').setStyle('DANGER')
                        ])
                        var customerId = target_order.customerId
                        var dealerId = target_order.dealerId
                        target_order.timer = false
                        fs.writeFileSync('./orders.json', JSON.stringify(orders, null, 2))
                        await channel.send({
                            content: `Время аренды вышло! <@${customerId}>, передайте автомобиль владельцу <@${dealerId}>. Спасибо, что выбрали нас и приходите ещё!`,
                            components: [row]
                        }).then(msg => getMsgId3(msg.id, i))
                    }
                }
            }
        }
    }, 10000);
})


client.on('ready', async () => {
    setInterval( async () => {
        orders = JSON.parse(fs.readFileSync('./orders.json', 'utf-8'))
        for(var i = 0; i < orders.orders.length; i++){
            try{
                target_order = orders.orders[i]
                if(target_order.ended == false){
                    if(target_order.beforeDelete <= 0){
                        var guild = client.guilds.cache.get('959532285206609920')
                        var channel = guild.channels.cache.get(`${target_order.orderChannel}`) 
                        if(channel != undefined) channel.delete()
                        target_order.ended = true
                        if(target_order.orderNotific != '' && target_order.orderNotific != undefined){
                            var channel = client.channels.cache.get(`${target_order.orderNotificChannel}`)
                            await channel.messages.fetch(`${target_order.orderNotific}`).then(msg => {
                                if(msg != undefined) msg.delete()
                            })
                            target_order.orderNotific = ''
                        }
                    }
                    else {target_order.beforeDelete -= 1}
                }
            }
            catch(err) {console.log(err)}
        }
        fs.writeFileSync('./orders.json', JSON.stringify(orders, null, 2))
    }, 1000);
})

client.on('ready', () => {
    setInterval(() => {
        try{
            users = JSON.parse(fs.readFileSync('./users.json', 'utf-8'))
            for(var i = 0; i < users.users.length; i++){
                target_user = users.users[i]
                if(target_user.cooldown > 0){
                    target_user.cooldown -= 1
                }
            }
            fs.writeFileSync('./users.json', JSON.stringify(users, null, 2))
        }
        catch(err){
            console.log(err)
        }
    }, 1000); 
})

function logMapElements(value, key, map) {
    console.log(key)
}

client.on('ready', async () => {
    let guild = client.guilds.cache.get('959532285206609920')
    guild.members.list().then(users =>{
        for(var i = 0; i < users.length; i++){
        console.log(users[i].user.username)
        console.log(i)
    }
    }
    )
    /* members = await guild.members.fetch().then(user => {
        console.log(user.username)
    }) */

   /*  console.log(members)
    for(var i = 0; i < members.length; i++){
        console.log(members[i].username)
        console.log(i)
    } */
})

client.login('bot-token')

