console.log("Tryna connect....");

require('dotenv').config();

const Discord = require("discord.js");
const database = require("./database");
const Commands = require('./commands');

//Discord client (controls the bot)
const client = new Discord.Client({intents: 32767});
//Log message to console after successful login
client.on("ready", ()=>{console.log(`Logged in as ${client.user.tag}.`)})
//Process messages
client.on("messageCreate",msg=>{
	Commands.process(msg);
})

// Set up wordle logic
require("./wordle/logic");

//Set up a server to be pinged by uptime robot, to keep this repl alive
require("./server");

//Login as the bot
client.login(process.env.TOKEN)