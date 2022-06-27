/** @typedef {(msg:import("discord.js").Message,data:any,...args:String[])=>any} Command */

class Module{
    /** @type {Map<String, Module>} */
    static modules = new Map();
    /** @type {Set<String, Module>} */
    static moduleNames = new Set();

    /** @param {String} name @param {String} prefix */
    constructor(name, prefix){
        prefix ||= name;
        if(Module.moduleNames.has(name))
            throw new Error(`Module already exists with name "${name}"`);
        if(prefix.split(/\s/g).length != 1)
            throw new Error(`Prefix may not contain spaces or newlines`);
        if(Module.modules.has(prefix))
            throw new Error(`Prefix "${prefix}" already taken`);
        
        Module.moduleNames.add(name);
        Module.modules.set(prefix, this);

        this.name = name;
        this.prefix = prefix;

        /** @private @type {Map<String, Command>} */
        this.commands = new Map();
        /** @private @type {Command} */
        this.defaultCommand = null;

        /** @private @type {any} */
        this.data = {}
    }

    /** @param {String} name @param {Command} func */
    addCommand(name, func){
        if(this.commands.has(name))
            throw new Error(`Command "${name}" already exists in module "${this.name}"`);
        this.commands.set(name, func);
    }

    /** @param {Command} func */
    setDefaultCommand(func){
        if(this.defaultCommand !== null)
            throw new Error(`Default command already exists in module "${this.name}"`);
        this.defaultCommand = func;
    }

    /** @param {String} command @param {String} alias */
    setAlias(command, alias){
        this.commands.set(alias, this.commands.get(command));
    }

    /** @param {String} command */
    setDefaultCommandAsAlias(command){
        this.defaultCommand = this.commands.get(command);
    }

    /** @param {String} command */
    removeCommand(command){
        this.commands.delete(command);
    }

    /** @param {String} name */
    hasCommand(name){
        return name === undefined ? this.defaultCommand !== null : this.commands.has(name);
    }

    /** @param {String} name @param {import("discord.js").Message} msg @param {String[]} args */
    execute(name, msg, args){
        let command = name === undefined ? this.defaultCommand : this.commands.get(name);
        command.call({}, msg, this.data, ...args);
    }
}

/** @param {import("discord.js").Message} msg */
function process(msg){
    const lines = msg.content.split(/\n/g).filter(i=>i!="").map(i => i.split(/\s+/g).join(" "));
    if(lines.length == 0) return;
    let line;
    try{
        line = lines[0];
        //Only interpret this message as a list of commands if the first non-empty line is a valid command
        if(!execute(msg, line)) return;
        //Execute the rest of the lines as commands
        for(let i = 1; i < lines.length; i++){
            line = lines[i];
            if(!execute(msg, line)) {
                msg.reply(`Unknown command: "${line}"`);
                return;
            }
        }
    }
    catch(e){
        console.log(`Error executing command "${line}" in channel ${msg.channel.name} of server ${msg.guild.name}: ${e.stack}`);
        msg.reply(`Error executing command "${line}": ${e.message}`)
    }
}

/** @param {import("discord.js").Message} msg @param {String} line */
function execute(msg, line){
    // split the line into the arguments
    const [prefix, command, ...args] = line.split(/ /);

    // Make sure the command exists
    if(!prefix || !Module.modules.has(prefix)){
        return false;
    }
    let module = Module.modules.get(prefix)
    if(!module.hasCommand(command)){
        throw new Error(`Unknown command for prefix "${prefix}"`);
    }

    // Execute the command
    module.execute(command, msg, args);
    return true;
}

module.exports = {Module, process};