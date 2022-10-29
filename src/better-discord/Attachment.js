const {MessageAttachment, BufferResolvable} = require('discord.js');
const internal = require('stream');

class Attachment{
    /**
     * 
     * @param {BufferResolvable|internal.Stream} file
     * @param {String} name 
     */
    constructor(file, name){
        this.file = file;
        this.name = name;
    }
}

module.exports = Attachment;