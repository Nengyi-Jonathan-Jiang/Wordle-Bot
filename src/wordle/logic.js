const Wordle = require("./core");
const Message = require("../better-discord/Message");
const Attachment = require("../better-discord/Attachment");

let WordleModule = new (require('../commands')).Module("Wordle", "wordle");

let wordles = {};

/** @param {Message} msg */
function saveWordle(msg) {
	if (!wordles[msg.channel]) return;

	WordleModule.getChannelData(msg.channel, {}).wordle = wordles[msg.channel].toString();
}

/** @param {Message} msg */
function getWordle(msg) {
	if (wordles[msg.channel]) return wordles[msg.channel];

	if (WordleModule.getChannelData(msg.channel, null)) {
		let newWordle = new Wordle().fromString(WordleModule.getChannelData(msg.channel).wordle);
		wordles[msg.channel] = newWordle;
		return newWordle;
	}
	return null;
}

/** @param {Message} msg */
function deleteWordle(msg) {
	delete WordleModule.getChannelData(msg.channel).wordle;
	delete wordles[msg.channel];
}

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
WordleModule.addCommand("help", help)
WordleModule.setDefaultCommand(msg => {
	help(msg);
});

WordleModule.addCommand("test", (msg) => {
	msg.reply("Hello! I am Wordle Bot!");
});

WordleModule.addCommand("enable", (msg) => {
	if (getWordle(msg)) {
		msg.reply("Wordle is already enabled in this channel.");
	}
	else {
		wordles[msg.channel.toString()] = new Wordle();
		msg.reply("Enabled wordle in this channel");
		saveWordle(msg);
	}
});
WordleModule.addCommand("disable", (msg, _args) => {
	if (getWordle(msg)) {
		deleteWordle(msg);
		msg.reply("Disabled wordle in this channel");
	}
	else {
		msg.reply("Wordle is already disabled in this channel.");
	}
});


WordleModule.addCommand("generate", (msg, _data, length, leniency) => {
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
WordleModule.addCommand("abandon", (msg) => {
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

WordleModule.addCommand("ditch", (msg) => {
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

WordleModule.addCommand("guess", (msg, _data, guess) => {
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

WordleModule.addCommand("history", (msg) => {
	let wordle = getWordle(msg);
	if (!wordle) return void msg.reply("Wordle is currently disabled in this channel! Use \"wordle enable\" to enable it.");

	if (wordle.guesses.length) {
		msg.reply(" ", new Attachment(wordle.getAllResultsAsImage(), "image.png"))
	}
	else {
		msg.reply("No history to show!");
	}
})

WordleModule.addCommand("leniency", (msg, _data, leniency, makeDefault) => {
	let wordle = getWordle(msg);
	if (!wordle) return void msg.reply("Wordle is currently disabled in this channel! Use \"wordle enable\" to enable it.");

	let lenient = leniency == "true";

	if (wordle.lenient == lenient) {
		return void msg.reply(`Leniency is already set to ${lenient}!`);
	}

	wordle.setLeniency(lenient);

	msg.reply(`Set leniency to ${lenient}`);
});

WordleModule.addCommand("length", (msg, _data, length) => {
	let wordle = getWordle(msg);
	if (!wordle) return void msg.reply("Wordle is currently disabled in this channel! Use \"wordle enable\" to enable it.");

	wordle.defaultLength = +length;

	msg.reply(`Set default length to ${+length} (changes will take take effect on the next wordle)`);
});