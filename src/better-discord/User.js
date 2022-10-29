const Attachment = require("./Attachment");
const Discord = require('discord.js');

class User{
    /**
     * @param {Discord.User} user
     */
    constructor(user){
        this.name = user.username;
        this.number = user.discriminator;
        this.id = user.id;
        
        this.usr = user;
    }

    toString(){
        return `${this.name}#${this.number}`
    }

    /**
     * @param {String} text 
     * @param  {Attachment[]} attachments 
     */
    dm(text, ...attachments){
        return this.usr.dmChannel.send({
			content: text || " ",
			files: attachments.map(({file, name}) => new Discord.MessageAttachment(file, name))
		});
    }
}

module.exports = User;