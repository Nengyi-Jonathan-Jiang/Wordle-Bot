const {registerFont, createCanvas, Canvas} = require("canvas");
const fs = require("fs");
const Path = require("path");

registerFont('./res/Orbitron.ttf', { family: 'Orbitron' });

class Wordle{
	static get DEFAULT_LENGTH(){return 5}
	static get DEFAULT_LENIENCY(){return false}
	static IMAGE_SIZE = 500;

	constructor(){
		this.length = this.defaultLength = Wordle.DEFAULT_LENGTH;
		this.lenient = this.defaultLeniency = Wordle.DEFAULT_LENIENCY;

		/** @type {WordleResult[]} */
		this.guesses = [];

		/** @type {Set<String>} */
		this.dictionary = new Set();
		/** @type {Map<Number, Set<String>>} */
		this.words = new Map();
		
		this.target = this.randomWord();
	}

	reset(){
		this.target = this.randomWord(this.length);
		this.guesses = [];
		console.log(this.target);
	}

	/** @param {String} guess */
	guess(guess){
		if(!/[a-zA-Z]+/.test(guess)){
			throw new WordleError(
				"non-alpha", 
				`Error: your guess (${guess}) contains non-alphabetic characters.`
			);
		}
		if(guess.length != this.target.length){
			throw new WordleError(
				"length mismatch", 
				`Error: expected word of length (${this.target.length}) but \"${guess}\" has ${guess.length} letters`
			);
		}
		if(!this.lenient && !this.exists(guess)){
			throw new WordleError(
				"dictionary error", 
				`Error: could not find word ${guess} in my dictionary. To add new words to my dictionary, use !wordle-dictionary. To add new words to the guessable word list, use !wordle-add. To allow nonexistent words, turn on lenient mode`
			);
		}
	
		this.guesses.push(new WordleResult(this.target.length, this.target, guess));
	}

	/** @param {String} word */
	addWord(word){
		this.words.set(word.length, new Set([...(this.words.get(word.length) || new Set()), word]));
		this.addToDictionary(word);
	}
	/** @param {String} word */
	addToDictionary(word){
		this.dictionary.add(word);
	}

	/** @param {String} word */
	exists(word){
		return Wordle.dictionary.has(word) || this.dictionary.has(word);
	}

	/** @param {Number} length */
	randomWord(length){
		let words = [...(Wordle.words.get(length) || []), ...(this.words.get(length) || [])];
		if(words.length == 0) return "WORDLE";
		return words[~~(words.length * Math.random())];
	}

	/** @param {Boolean} lenient */
	setLeniency(lenient){
		if(lenient == this.lenient){
			throw new WordleError("", "Warning: command had no effect");
		}
		if(this.guesses.length != 0 && this.lenient){
			throw new WordleError("reverting leniency", "Error: cannot revert leniency to false in the middle of a session");
		}
		this.lenient = lenient;
	}

	get lastGuess(){return this.guesses[this.guesses.length - 1]}

	getAllResultsAsImage(){
		const scale = ~~(Wordle.IMAGE_SIZE / this.target.length);
		let canvas = createCanvas(scale * this.target.length, scale * this.guesses.length);
		for(let i = 0; i < this.guesses.length; i++){
			this.guesses[i].drawToCanvas(canvas, scale, i);
		}
		return canvas.toBuffer();
	}

	getLastResultAsImage(){
		const scale = ~~(Wordle.IMAGE_SIZE / this.length);
		return this.guesses[this.guesses.length - 1].toCanvas(scale).toBuffer();
	}

	toString(){
		return JSON.stringify({
			length: this.length,
			defaultLength: this.defaultLength,
			leniency: this.lenient,
			defaultLeniency: this.defaultLeniency,
			guesses: this.guesses.map(i => i.guess),
			target: this.target,
			dictionary: [...this.dictionary],
			words: [...this.words.entries()].map(([length, words])=>({length:length,words:[...words]})),
		})
	}
	/** @param {String} */
	fromString(str){
		let data = JSON.parse(str);

		this.length = data.length;
		this.defaultLength = data.defaultLength;
		this.lenient = data.lenient;
		this.defaultLeniency = data.defaultLeniency;
		this.target = data.target;

		this.dictionary = new Set(data.dictionary);
		this.words = new Map(data.words.map(i=>[i.length, new Set(i.words)]));

		this.guesses = data.guesses.map(guess => new WordleResult(this.length, this.target, guess));

		return this;
	}

	/** @type {Set<String>} */
	static dictionary = new Set();
	/** @type {Map<Number, Set<String>>} */
	static words = new Map();
	
	/** @param {Number} wordLength @param {String} path */
	static loadWordsFromFile(wordLength, path){
		let text = fs.readFileSync(Path.join(__dirname, path)).toString();
		let words = text.toUpperCase().trim().split(/[\n ]/g).map(i=>i.trim())
		Wordle.loadWords(wordLength, words);
	}
	/** @param {String} path */
	static updateDictionaryFromFile(path){
		let text = fs.readFileSync(Path.join(__dirname, path)).toString();
		let words = text.toUpperCase().trim().split(/[\n ]/g).map(i=>i.trim())
		Wordle.updateDictionary(words);
	}
	/** @param {Number} wordLength @param {String[]} words */
	static loadWords(wordLength, words){
		if(!Wordle.words.has(wordLength)) Wordle.words.set(wordLength, new Set(words));
		else Wordle.words.set(wordLength, new Set([...Wordle.words.get(wordLength), ...words]));
		// We need to update the dictionay as well because all guessable words must also
		// be present in the dictionary
		Wordle.updateDictionary(words);
	}
	/** @param {String[]} words */
	static updateDictionary(words){
		Wordle.dictionary = new Set([...Wordle.dictionary, ...words.filter(i => /^[a-zA-Z]+$/.test(i))]);
	}
}

class WordleResult {
	static CORRECT = 0;
	static MISPLACED = 1;
	static INCORRECT = 2;

	static COLORS = new Map([
		[WordleResult.CORRECT, "#2D2"], 
		[WordleResult.MISPLACED, "#FC0"],
		[WordleResult.INCORRECT, "#888"],
	]);

	/** @param {Number} length @param {String} target @param {String} guess */
	constructor(length, target, guess){
		this.length = length;
		this.guess = guess;

		/** @type {Number[]} */
		this.results = new Array(length).fill(WordleResult.INCORRECT);

		/** @type {Map<String, Number}} */
		let charCounts = new Map();

		// First pass - find correct chars, get char counts
		for(let i = 0; i < length; i++){
			let targetChar = target[i];
			if(guess[i] == targetChar){
				this.results[i] = WordleResult.CORRECT;
			}
			else{
				charCounts.set(targetChar, (charCounts.get(targetChar) || 0) + 1);
			}
		}
		// Second pass - determine misplaced/incorrect chars
		for(let i = 0; i < length; i++){
			if(this.results[i] == WordleResult.CORRECT) continue;

			let guessedChar = guess[i];
			if(charCounts.get(guessedChar) > 0){
				charCounts.set(guessedChar, charCounts.get(guessedChar - 1));
				this.results[i] = WordleResult.MISPLACED;
			}
			else{
				this.results[i] = WordleResult.INCORRECT;
			}
		}
	}

	/** @param {Number} scale */
	toCanvas(scale){
		const canvas = createCanvas(this.length * scale, scale);
		this.drawToCanvas(canvas, scale, 0);
		return canvas;
	}

	/** @param {Canvas} canvas @param {Number} scale @param {Number} offset */
	drawToCanvas(canvas, scale, offset){
		const ctx = canvas.getContext('2d');
		ctx.font = `${scale * .75}px Orbitron`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";

		for(let i = 0; i < this.guess.length; i++){
			ctx.fillStyle = WordleResult.COLORS.get(this.results[i]);
			ctx.fillRect(scale * i, scale * offset, scale, scale);
			ctx.fillStyle = "#FFF";
			ctx.fillText(this.guess[i], scale * (i + .5), scale * (offset + .5));
		}
	}
}

class WordleError extends Error{
	constructor(status, message){
		super(message);
		this.status = status;
	}
}

// Load word lists

Wordle.updateDictionaryFromFile("../../res/dictionary/allWords4.txt");
Wordle.updateDictionaryFromFile("../../res/dictionary/allWords5.txt");
Wordle.updateDictionaryFromFile("../../res/dictionary/allWords6.txt");
Wordle.updateDictionaryFromFile("../../res/dictionary/allWords7.txt");
Wordle.updateDictionaryFromFile("../../res/dictionary/allWords8.txt");

Wordle.loadWordsFromFile(4, "../../res/dictionary/guessableWords4.txt");
Wordle.loadWordsFromFile(5, "../../res/dictionary/guessableWords5.txt");
Wordle.loadWordsFromFile(6, "../../res/dictionary/guessableWords6.txt");
Wordle.loadWordsFromFile(7, "../../res/dictionary/guessableWords7.txt");
Wordle.loadWordsFromFile(8, "../../res/dictionary/guessableWords8.txt");

const staticPrefixFuncs = new Map();
const dynPrefixFuncs = [];
/** @param {string|((msg:string)=>boolean)} prefix @param {(msg:import('discord.js').Message,args:string[])=>any} func */
function setFunc(prefix, func){
	if(func == null) funcs.delete(prefix);
	else switch(typeof prefix){
		case "function":
			dynPrefixFuncs.push([prefix,func]);
			break;
		case "string":
			staticPrefixFuncs.set(prefix, func);
			break;
	}
}

/** @param {import("discord.js").Message} msg */
function processMessage(msg){
	const [prefix, ...args] = msg.content.split(" ");
	if(staticPrefixFuncs.has(prefix.toLowerCase())){
		return staticPrefixFuncs.get(prefix)(msg, args);
	}
	for(let [prefixFunc,func] of dynPrefixFuncs) if(prefixFunc(msg,prefix.toLowerCase())){
		return func(msg, args);
	}
}

module.exports = {Wordle, setFunc, processMessage};