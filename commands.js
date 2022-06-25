const funcs = new Map();
function on(prefix, func){
    if(func == null) funcs.delete(prefix);
    funcs.set(prefix, func);
}
/** @param {import("discord.js").Message} msg */
function process(msg){
    const lines = msg.content.split(/[\n]/g).map(i => i.split(/\s+/g).join(" "));
    //Only interpret this message as a list of commands if the first non-empty line is a valid command
    //While the first line is not empty
    while(lines.length > 0){
        let line = lines.shift();
        if(line.length == 0) continue;
        // split the line into the arguments
        const [prefix, command, ...args] = line.split(/ /g);
        // If the command doesn't exist, we know this message should not be interpreted as a list of commands
        if(!prefix || !Module.modules.has(prefix)) return;
        // Otherwise execute the command and break out of the while
        let module = Module.modules.get(prefix)
        module.executeCommand(command, msg, args);
        break;
    }
    //Then execute the rest of the commands
    for(let line of lines){
        if(!execute(line)) return;
    }
}
/** @param {import("discord.js").Message} msg @param {String} line */
function execute(msg, line){
    // split the line into the arguments
    const [prefix, command, ...args] = line.split(/ /);
    // If the command doesn't exist, stop and error
    if(!prefix || !Module.modules.has(prefix)){
        msg.reply();
        return;
    }
    let module = Module.modules.get(prefix)
    //Try to execute the command
    try{
        //If the command did not successfully execute
        if(!module.executeCommand(command, msg, args)){

        }
    }
    catch(e){ //Error! tell the user that the command failed
        msg.reply(`Error executing command \"${line}\" unsuccessful. Error message:\n\n${e.message}`);
        //and stop
        return;
    }
    //Error
    msg.reply("Error: ");
    return;
}

/** @typedef {(msg:import("discord.js").Message,data:any,...args:String[])=>any} Command */

class Module{
    /** @type {Map<String, Module>} */
    static modules = new Map();
    /** @type {Set<String>} */
    static moduleNames = new Set();

    /** @param {String} name @param {String} prefix */
    constructor(name, prefix){
        prefix ||= name;
        if(Module.moduleNames.has(name))
            throw new Error(`Error: Module already exists with name "${name}"`);
        if(prefix.split(/\s/g).length != 1)
            throw new Error(`Error: Prefix may not contain spaces or newlines`);
        if(Module.modules.has(prefix))
            throw new Error(`Error: Prefix "${prefix}" already taken`);
        Module.modules.set(prefix, this);
        this.name = name;

        /** @type {Map<String, Command>} */
        this.commands = new Map();
        /** @type {Command} */
        this.defaultCommand = null;

        /** @type {any} */
        this.data = {}
    }

    /** @param {String} name @param {Command} func */
    addCommand(name, func){
        if(this.commands.has(name))
            throw new Error(`Error: Command "${name}" already exists in module "${this.name}"`);
        this.commands.set(name, func);
    }

    /** @param {Command} func */
    setDefaultCommand(func){
        if(this.defaultCommand !== null)
            throw new Error(`Error: Default command already exists in module ${this.name}`);
        this.defaultCommand = func;
    }

    /** @param {String} name @param {import("discord.js").Message} msg @param {String[]} args */
    executeCommand(name, msg, args){
        let command = name === undefined ? this.defaultCommand : this.commands.get(name);
        if(command) command.apply(null, msg, this.data, ...args);
    }
}

module.exports = {Module: Module, process: process};