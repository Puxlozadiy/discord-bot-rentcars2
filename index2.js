const {MessageActionRow, MessageButton, Client, Interaction, MessageSelectMenu, ThreadChannel, Channel, ChannelManager, CategoryChannel, MessageEmbed, Permissions, MessageAttachment} = require('discord.js')
const client = new Client({
    intents: [
        'GUILD_MESSAGES',
        'GUILDS',
        'GUILD_MESSAGE_REACTIONS'
    ],
    partials: ['REACTION', 'MESSAGE', 'CHANNEL', 'GUILD_MEMBER']
})

client.on('messageReactionAdd', async (reaction, user) => {
    console.log(reaction.emoji.identifier)
    /* if(reaction.message.channel.id == 960970285291561040n){
        var channelID = getEmoji(reaction.emoji.identifier.toString())
        if(channelID != 0){
            var channel = reaction.message.guild.channels.cache.get(`${channelID}`)
            channel.permissionOverwrites.create(user.id, {
                'VIEW_CHANNEL': true,
                'READ_MESSAGE_HISTORY': true,
                'SEND_MESSAGES': false,
                'ADD_REACTIONS': false
        })
        }
    } */
})


client.on('ready', () => {
    const row = new MessageActionRow().addComponents([
        new MessageButton().setCustomId('new-order').setLabel('Сделать заказ').setStyle('PRIMARY')
    ])
    const embed = new MessageEmbed().setTitle('Mercedes G63 AMG 6x6').setImage('https://i.imgur.com/wGetQbV.png')
            .addFields(
                {name: 'Багажник:', value: '230 кг (25 мяса)\n\u200B', inline: true}, 
                {name: 'Скорость:', value: '280 км/ч', inline: true},
                {name: 'Усреднённые расценки:', value: '1 час - $6.000\n1.5 часа - $8.000\n2 часа - $10.000\n3 часа - $13.000\nДо рестарта - договорная'},
                )
    const channel = client.channels.cache.get('962686261741641729');
    message = channel.messages.fetch(`962713062945751060`).then(msg => {
        msg.edit({
            embeds: [embed],
            components: [row]
        })
    })
})

client.login('OTE2NTA0MTAwNDcwOTQ3ODkw.YarG9Q.hoL9dpmRVzZRs5WIDpQWYdkqJOY')