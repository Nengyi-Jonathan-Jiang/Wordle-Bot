console.log("Tryna connect....");

require('dotenv').config();

const Discord = require("discord.js");
const database = require("./database");
const {Wordle, processMessage, setFunc} = require("./wordle");
const Commands = require('./commands');

let w = new Wordle();	//Hack to make JSDoc know what a wordle is

/** @type {Map<string, w>} */
let wordles = new Map();

/** @param {Discord.Message} msg */
function getChannelString(msg){return `${msg.guild.id}-${msg.channel.id}`}

/** @param {Discord.Message} msg */
function saveWordle(msg){
	let channelStr = getChannelString(msg);
	if(!wordles.get(channelStr)) return;
	
	database.data[channelStr] = wordles.get(channelStr).toString();

	database.saveData();
}
function saveWordles(){
	for(let [channelStr, wordle] of wordles){
		database.data[channelStr] = wordle.toString();
	}
	database.saveData();
}
/** @param {Discord.Message} msg */
function getWordle(msg){
	let channelStr = getChannelString(msg);
	if(wordles.has(channelStr)) return wordles.get(channelStr);
	if(database.data[channelStr]){
		let newWordle = new Wordle().fromString(database.data[channelStr]);
		wordles.set(channelStr, newWordle);
		return newWordle;
	}
	return null;
}
/** @param {Discord.Message} msg */
function deleteWordle(msg){
	delete database.data[getChannelString(msg)];
	database.saveData();
}

//Save data to database every minute
setInterval(_=>database.saveData(),60000);

//Discord client (controls the bot)
const client = new Discord.Client({intents: 32767});
//Log message to console after successful login
client.on("ready", ()=>{console.log(`Logged in as ${client.user.tag}.`)})
//Process messages
client.on("messageCreate",msg=>{
	processMessage(msg);
	Commands.process(msg);
})

let wordleHandler = new Commands.Module("Wordle", "wordle");
wordleHandler.addCommand("help", (msg, data, ...args)=>{
	msg.reply([
		"Wordle Bot Commands",
		"-----------------------------",
		"!wordle-help: gets help (you just used this)",
		"!wordle-enable: enable wordle in a channel (disabled by default)",
		"!wordle-disable: disable wordle in a channel",
		"",
		"!wordle-guess <guess> : Guess a word",
		"!wordle-giveup: Give up (generates a new word)",
		"",
		"!wordle-shortcut <name> : Sets the shortcut for \"!wordle-guess\" to <name>. For example, if you use \"!wordle-shortcut wguess\", typing \"wguess <word>\" would do the same as typing \"!wordle-guess <word>\"",
		"",
		"!wordle-difficulty < lenient | classic > : Sets wordle difficulty.",
		"\t\t lenient: You are allowed to guess any combination of letters, not just valid words in the english language",
		"\t\t classic (default): You can only guess words in the english language",
		"",
		"!wordle-length <number> : Sets following wordles' word length, must be a number between 4 and 8 inclusive",
		"",
		"!wordle-request <word> : Puts a word into the wordle queue, can be of any length from 4-8. When guessing words in the wordle queue, users will be warned that this is a requested word and wordle temporarily use lenient mode",
		"!wordle-clearqueue : Clears the wordle queue",
		"",
		"Note: commands prefixes are case-insensitive (Yay!)",
		"-----------------------------",
	].join('\n'))
})
wordleHandler.setDefaultCommandAsAlias("help");

wordleHandler.addCommand("test", (msg)=>{
	msg.reply("Hello! I am Wordle Bot!");
})

setFunc("!wordle-enable",(msg,_args)=>{
	if(getWordle(msg)){
		msg.reply("Wordle is already enabled in this channel!");
	}
	else{
		wordles.set(getChannelString(msg), new Wordle());
		msg.reply("Enabled wordle in this channel");
		saveWordle(msg);
	}
});
setFunc("!wordle-reset",(msg,_args)=>{
	let wordle = getWordle(msg);
	if(!wordle){
		msg.reply("Wordle is currently disabled in this channel! Use \"!wordle-enable\" to enable it!");
	}
	else{
		wordle.reset();
		msg.reply("Generating new word");
		saveWordle(msg);
	}
});

setFunc("!wordle-disable",(msg,_args)=>{
	deleteWordle(msg);
	msg.reply("Disabled wordle in this channel");
});
setFunc("tell", (msg)=>{
	msg.reply("it was " + getWordle(msg).target);
});
setFunc("wguess",(msg,args) => {
	if(!args[0]){
		return;
	}

	let wordle = getWordle(msg);
	let guess = args[0].toUpperCase();

	if(!wordle){
		msg.reply("Wordle is currently disabled in this channel! Use \"!wordle-enable\" to enable it!");
		return;
	}

	try{
		wordle.guess(guess);
	}
	catch(e){
		msg.reply("***ERROR***!!! " + e.message)
		return;
	}

	msg.reply({
		content: "-",
		files: [new Discord.MessageAttachment(wordle.getLastResultAsImage(), "image.png")]
	})
	
	saveWordle(msg);
});

setFunc("wordle-history", (msg)=>{
	let wordle = getWordle(msg);

	if(!wordle){
		msg.reply("Wordle is currently disabled in this channel! Use \"!wordle-enable\" to enable it!");
		return;
	}

	if(!wordle.guesses.length){
		msg.reply("No history to show!");
		return;
	}

	msg.reply({
		content: " ",
		files: [new Discord.MessageAttachment(wordle.getAllResultsAsImage(), "image.png")]
	})
})

setFunc("!wordle-giveup",(msg,args)=>{
	let wordle = getWordle(msg);
	//This command doesn't work in disabled channels
	if(!wordle){
		msg.reply("Wordle is currently disabled in this channel! Use \"!wordle-enable\" to enable it so that you can use this command!");
		return;
	}

	//Give up, fetch new word
	msg.reply(`You gave up on the wordle! Shame on you! The word was ${wordle.target}`).then(_=>{
		msg.channel.send("Fetched new wordle");
	});
	
	wordle.reset();
	saveWordle(msg);
});
setFunc("!wordle-leniency",(msg,args)=>{
	let wordle = getWordle(msg);
	if(!wordle){
		msg.reply("Wordle is currently disabled in this channel! Use \"!wordle-enable\" to enable it so that you can use this command!");
		return;
	}
	
	try{
		wordle.setLeniency(args[0] == "true");
		msg.reply("Set leniency to " + (args[0] == "true"));
	}
	catch(e){
		msg.reply(e.message);
	}
});
setFunc("!wordle-length",(msg,args)=>{
	let wordle = getWordle(msg), length = args[0];
	if(!wordle){
		msg.reply("Wordle is currently disabled in this channel! Use \"!wordle-enable\" to enable it so that you can use this command!");
		return;
	}

	if(!length){
		msg.reply("Please specify a length.");
		return;
	}

	switch(length){
		case "4":
		case "5":
		case "6":
		case "7":
		case "8":
			wordle.length = +args[0];
			wordle.reset();
			msg.channel.send(`Set wordle length to ${args[0]}.`);
			saveWordle(msg);
			break;
		default:
			msg.reply("Invalid word length! Must be between 4 and 8 inclusive");
			break;
	}
});
setFunc("!encourage",(msg,args)=>{
	let name = args[0];
	msg.channel.send(`${name} ${name} 你最棒，${name} ${name} 你最强!\n你最棒，你最强，你最棒，你最强，耶!!!!\n-- ${msg.author.username} ${args[1] ? ` told ${args[1]} to say` : ""}`);
})

//Set up a server to be pinged by uptime robot, to keep this repl alive
require("./server")();

//Login as the bot
client.login(process.env.TOKEN)