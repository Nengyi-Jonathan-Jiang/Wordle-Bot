const Discord = require('discord.js');
const Attachment = require('./Attachment');
const Guild = require('./Guild');

class Channel{
    /**
     * @param {Discord.TextBasedChannel} channel
     */
    constructor(channel){
        this.chnl = channel;

        this.guild = channel.guild 
            ? new Guild(channel.guild.name, channel.guild.id)
            : new Guild("DM", channel.recipient.id);

        this.name = channel.name || channel.recipient.username;
        this.id = channel.id;
    }

    toString(){
        return `${this.guild}-${this.id}`;
    }

    get repr(){
        return `${this.guild.repr}-${this.name}`
    }

    /**
     * @param {String} text 
     * @param {Attachment[]} attachments 
     * @returns 
     */
    send(text, ...attachments){
        return this.chnl.send({
			content: text || " ",
			files: attachments.map(({file, name}) => new Discord.MessageAttachment(file, name))
		});
    }
}

module.exports = Channel;