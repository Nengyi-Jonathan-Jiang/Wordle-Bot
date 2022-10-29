const Discord = require("discord.js");
const discordEmoji = require('discord-emoji');

/** @type {Map<string, string>} */
const m = new Map();

(function f(obj){
	for(let key in obj){
		if(typeof obj[key] == "string"){
			m.set(key, obj[key]);
		}
		else f(obj[key]);
	}
})(discordEmoji);

module.exports = class Emoji{
    static getEmoji(name){
        return m.get(name) || `:${name}:`;
    }

	static getAllEmojiNames(){
		return m.keys();
	}
}