const Wordle = require("./core");
const Discord = require("discord.js");
const Commands = require('../commands');
const database = require("../database");
const Message = require("../better-discord/Message");
const Attachment = require("../better-discord/Attachment");

/** @type {Map<string, Wordle>} */
let wordles = new Map();

/** @param {Message} msg */
function saveWordle(msg) {
	let channelStr = msg.channel.toString();
	if (!wordles.get(channelStr)) return;

	database.data[channelStr] = wordles.get(channelStr).toString();

	database.saveData();
}

/** @param {Message} msg */
function getWordle(msg) {
	let channelStr = msg.channel.toString();

	if (wordles.has(channelStr)) return wordles.get(channelStr);
	if (database.data[channelStr]) {
		let newWordle = new Wordle().fromString(database.data[channelStr]);
		wordles.set(channelStr, newWordle);
		return newWordle;
	}
	return null;
}

/** @param {Message} msg */
function deleteWordle(msg) {
	delete database.data[msg.channel.toString()];
	wordles.delete(msg.channel.toString());

	database.saveData();
}

let wordleHandler = new Commands.Module("Wordle", "wordle");

/**
 * @param {Message} msg 
 */
function help(msg) {
	msg.reply([
		"Wordle Bot Commands",
		"-----------------------------",
		"help: gets help (you just used this)",
		"enable: enable wordle in a channel (disabled by default)",
		"disable: disable wordle in a channel",
		"",
		"guess <string> : Guess a word.",
		"abandon: Abandon the wordle and generates a new word",
		"ditch: Abandon the wordle without generating a new word",
		"",
		"leniency <boolean> : If leniency is true, then you may guess words that are not in the dictionary",
		"length <number> : Sets following wordles' length, there must be words of that length in the dictionary",
		"",
		"history : Shows all previous guesses for this word",
		"-----------------------------",
	].join('\n'));
}
wordleHandler.addCommand("help", help)
wordleHandler.setDefaultCommand(msg => {
	help(msg);
});

wordleHandler.addCommand("test", (msg) => {
	msg.reply("Hello! I am Wordle Bot!");
});

wordleHandler.addCommand("enable", (msg) => {
	if (getWordle(msg)) {
		msg.reply("Wordle is already enabled in this channel.");
	}
	else {
		wordles.set(msg.channel.toString(), new Wordle());
		msg.reply("Enabled wordle in this channel");
		saveWordle(msg);
	}
});
wordleHandler.addCommand("disable", (msg, _args) => {
	if (getWordle(msg)) {
		deleteWordle(msg);
		msg.reply("Disabled wordle in this channel");
	}
	else {
		msg.reply("Wordle is already disabled in this channel.");
	}
});


wordleHandler.addCommand("generate", (msg, _data, length, leniency) => {
	let wordle = getWordle(msg);
	if (!wordle) return void msg.reply("Wordle is currently disabled in this channel! Use \"wordle enable\" to enable it.");

	if (!wordle.abandoned) {
		msg.reply("You must ditch the current wordle before generating a new one!");
	}
	else {
		wordle.generate(+length, leniency === undefined ? undefined : leniency == "true");
		saveWordle(msg);

		msg.reply(`Generated new ${wordle.lenient ? "lenient " : ""}wordle with length ${wordle.target.length}`);
	}
})
wordleHandler.addCommand("abandon", (msg) => {
	let wordle = getWordle(msg);
	if (!wordle) return void msg.reply("Wordle is currently disabled in this channel! Use \"wordle enable\" to enable it.");

	if (wordle.abandoned) {
		return void msg.reply("You already ditched this wordle.");
	}

	let answer = wordle.target;
	wordle.abandon();
	wordle.generate();
	saveWordle(msg);

	msg.reply(`You abandoned the wordle. The answer was ${answer}`).then(_ => {
		msg.channel.send(`Generated new ${wordle.lenient ? "lenient " : ""}wordle with length ${wordle.target.length}`);
	})
});

wordleHandler.addCommand("ditch", (msg) => {
	let wordle = getWordle(msg);
	if (!wordle) return void msg.reply("Wordle is currently disabled in this channel! Use \"wordle enable\" to enable it.");

	if (wordle.abandoned) {
		return void msg.reply("You already ditched this wordle.");
	}

	let answer = wordle.target;
	wordle.abandon();
	saveWordle(msg);

	msg.reply(`You ditched the wordle. The answer was ${answer}`)
});

wordleHandler.addCommand("guess", (msg, _data, guess) => {
	if (!guess) throw new Error("Please provide a word.");

	let wordle = getWordle(msg);
	if (!wordle) return void msg.reply("Wordle is currently disabled in this channel! Use \"wordle enable\" to enable it.");

	let success = wordle.guess(guess);
	let image = success ? wordle.getAllResultsAsImage() : wordle.getLastResultAsImage();
	if (success) wordle.generate();
	saveWordle(msg);

	msg.reply(
		success ? "You guessed the wordle!" : " ",
		new Attachment(image, "image.png")
	).then(_ => {
		if (success) {
			msg.channel.send(`Generated new ${wordle.lenient ? "lenient " : ""}wordle with length ${wordle.target.length}`);
		}
	})
});

wordleHandler.addCommand("history", (msg) => {
	let wordle = getWordle(msg);
	if (!wordle) return void msg.reply("Wordle is currently disabled in this channel! Use \"wordle enable\" to enable it.");

	if (wordle.guesses.length) {
		msg.reply(" ", new Attachment(wordle.getAllResultsAsImage(), "image.png"))
	}
	else {
		msg.reply("No history to show!");
	}
})

wordleHandler.addCommand("leniency", (msg, _data, leniency, makeDefault) => {
	let wordle = getWordle(msg);
	if (!wordle) return void msg.reply("Wordle is currently disabled in this channel! Use \"wordle enable\" to enable it.");

	let lenient = leniency == "true";

	if (wordle.lenient == lenient) {
		return void msg.reply(`Leniency is already set to ${lenient}!`);
	}

	wordle.setLeniency(lenient);

	msg.reply(`Set leniency to ${lenient}`);
});

wordleHandler.addCommand("length", (msg, _data, length) => {
	let wordle = getWordle(msg);
	if (!wordle) return void msg.reply("Wordle is currently disabled in this channel! Use \"wordle enable\" to enable it.");

	wordle.defaultLength = +length;

	msg.reply(`Set default length to ${+length} (changes will take take effect on the next wordle)`);
});