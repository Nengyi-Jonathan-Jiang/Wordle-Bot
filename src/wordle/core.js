const {registerFont, createCanvas, Canvas} = require("canvas");
const fs = require("fs");
const Path = require("path");

registerFont('./res/Orbitron.ttf', { family: 'Orbitron' });

class Wordle{
	static get DEFAULT_LENGTH(){return 5}
	static get DEFAULT_LENIENCY(){return false}
	static IMAGE_SIZE = 500;

	constructor(){
		this.defaultLength = Wordle.DEFAULT_LENGTH;
		this.lenient = Wordle.DEFAULT_LENIENCY;

		/** @type {WordleResult[]} */
		this.guesses = [];

		/** @type {Set<String>} */
		this.dictionary = new Set();
		/** @type {Map<Number, Set<String>>} */
		this.words = new Map();
		
		this.target = this.randomWord();
	}

	generate(length){
		if(length === undefined) length = this.defaultLength;

		this.target = this.randomWord(length);
		this.guesses = [];
	}

	abandon(){
		this.target = "";
	}

	get abandoned(){
		return this.target == "";
	}

	/** @param {String} guess */
	guess(guess){
		if(this.abandoned){
			throw new Error(`No wordle generated`);
		}
		if(!/[a-zA-Z]+/.test(guess)){
			throw new Error(`"${guess}" contains non-alphabetic characters.`);
		}
		if(guess.length != this.target.length){
			throw new Error(`expected word of length (${this.target.length}) but got "${guess}" which has ${guess.length} letters`);
		}
		guess = guess.toUpperCase();
		if(!this.lenient && !this.exists(guess)){
			throw new Error(`could not find word "${guess}" in dictionary`);
		}
	
		let result = new WordleResult(this.target.length, this.target, guess);
		this.guesses.push(result);
		return result.success;
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
	removeWord(word){
		if(Wordle.dictionary.has(word)) throw new Error("Could not remove built in word");
		if(!this.dictionary.has(word)) throw new Error("Word not in dictionary");
		this.words.get(word.length).delete(word);
		this.dictionary.delete(word);
	}

	/** @param {String} word */
	exists(word){
		return Wordle.dictionary.has(word) || this.dictionary.has(word);
	}

	/** @param {Number} length */
	randomWord(length){
		length ||= this.defaultLength;
		let words = [...(Wordle.words.get(length) || []), ...(this.words.get(length) || [])];
		if(words.length == 0) throw new Error("No words with this length exist in my word bank!");
		return words[~~(words.length * Math.random())];
	}

	/** @param {Boolean} lenient */
	setLeniency(lenient){
		this.lenient = lenient;
	}

	set length(length){
		if(!Wordle.words.has(length) && !this.words.has(length)){
			throw new Error("Invalid length - no words with this length exist in my word bank.");
		}
	}

	get lastGuess(){return this.guesses[this.guesses.length - 1]}

	get success(){return this.lastGuess?.success || false}

	getAllResultsAsImage(){
		const scale = ~~(Wordle.IMAGE_SIZE / this.target.length);
		let canvas = createCanvas(scale * this.target.length, scale * this.guesses.length);
		for(let i = 0; i < this.guesses.length; i++){
			this.guesses[i].drawToCanvas(canvas, scale, i);
		}
		return canvas.toBuffer();
	}

	getLastResultAsImage(){
		const scale = ~~(Wordle.IMAGE_SIZE / this.target.length);
		return this.guesses[this.guesses.length - 1].toCanvas(scale).toBuffer();
	}

	toString(){
		return JSON.stringify({
			defaultLength: this.defaultLength,
			lenient: this.lenient,
			guesses: this.guesses.map(i => i.guess),
			target: this.target,
			dictionary: [...this.dictionary],
			words: [...this.words.entries()].map(([length, words])=>({length:length,words:[...words]})),
		})
	}
	/** @param {String} */
	fromString(str){
		let data = JSON.parse(str);

		this.defaultLength = data.defaultLength;
		this.lenient = data.lenient;
		this.target = data.target;

		this.dictionary = new Set(data.dictionary);
		this.words = new Map(data.words.map(i=>[i.length, new Set(i.words)]));

		this.guesses = data.guesses.map(guess => new WordleResult(this.target.length, this.target, guess));

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
		this.target = target;

		/** @type {Number[]} */
		this.results = new Array(length).fill(WordleResult.INCORRECT);

		this.success = guess == target;

		if(this.success) this.results.fill(WordleResult.CORRECT);
		else this.generateResults();
	}

	/** @private */
	generateResults(){
		/** @type {Map<String, Number}} */
		let charCounts = new Map();

		// First pass - find correct chars, get char counts
		for(let i = 0; i < this.length; i++){
			let targetChar = this.target[i];
			if(this.guess[i] == targetChar){
				this.results[i] = WordleResult.CORRECT;
			}
			else{
				charCounts.set(targetChar, (charCounts.get(targetChar) || 0) + 1);
			}
		}
		// Second pass - determine misplaced/incorrect chars
		for(let i = 0; i < this.length; i++){
			if(this.results[i] == WordleResult.CORRECT) continue;

			let guessedChar = this.guess[i];
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

module.exports = Wordle;