const Discord = require('discord.js');

const User = require('./User');
const Guild = require('./Guild');
const Channel = require('./Channel');
const Attachment = require('./Attachment');

class Message{
    /**
     * @param {Discord.Message} message 
     */
    constructor(message){
        this.msg = message;

        this.id = message.id;

        this.timestamp = message.createdTimestamp;

        this.text = message.content;
        this.cleanText = message.cleanContent.replace(/<:(\w+):\d+>/g, "<:$1:>");

        let usedEmojis = [...new Set([...this.cleanText.matchAll(/:\w+:/g)].map(i => i[0]))];
        for (let e of usedEmojis) {
            let r = message.guild?.emojis?.cache?.find?.(emoji => emoji.name == e.substring(1, e.length - 1))
            this.cleanText = this.cleanText.replaceAll(new RegExp(e, "g"), r?.toString() || Emojis.getEmoji(e.substring(1, e.length - 1)) || "Unknown Emoji");
        }

        this.channel = new Channel(message.channel);
        this.guild = this.channel.guild;
        
        this.author = new User(message.author);
    }

    /**
     * 
     * @param {String} text 
     * @param {Attachment[]} attachments 
     */
    reply(text, ...attachments){
        return this.msg.reply({
			content: text || " ",
			files: attachments.map(({file, name}) => new Discord.MessageAttachment(file, name))
		});
    }
}

module.exports = Message;