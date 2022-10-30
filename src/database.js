const { Client } = require('discord.js');
const fs = require('fs');

const atob = a => Buffer.from(a, 'base64').toString('binary')
const btoa = b => Buffer.from(b).toString('base64')

if(!fs.existsSync("db.txt")){ fs.writeFileSync("db.txt", btoa("{}"))}
let data = JSON.parse(atob(fs.readFileSync("db.txt").toString()));

function saveData(){
    fs.writeFileSync("db.txt", btoa(JSON.stringify(data)));
}

/** @param {Client} client */
function onExit(client){
    function exitHandler(options, exitCode) {
        if (options.cleanup){
            console.log("Saving data...");
            client.destroy();
            saveData();
        }
        if (exitCode || exitCode === 0)
            console.log("Process exited with exit code " + exitCode);
        if (options.exit) process.exit();
    }

    //do something when app is closing
    process.on('exit', exitHandler.bind(null,{cleanup:true}));
    //catches ctrl+c event
    process.on('SIGINT', exitHandler.bind(null, {exit:true}));
    // catches "kill pid" (for example: nodemon restart)
    process.on('SIGUSR1', exitHandler.bind(null, {exit:true}));
    process.on('SIGUSR2', exitHandler.bind(null, {exit:true}));
    //catches uncaught exceptions
    process.on('uncaughtException', exitHandler.bind(null, {exit:true}));

    //other
    process.on('SIGTERM', exitHandler.bind(null, {exit:true}));
    process.on('SIGBREAK', exitHandler.bind(null, {exit:true}));
    process.on('disconnect', exitHandler.bind(null, {exit:true}));
};

module.exports = {
    saveData: saveData,
    get data(){return data} ,
    onExit: onExit
}