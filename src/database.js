const fs = require('fs');

const atob = a => Buffer.from(a, 'base64').toString('binary')
const btoa = b => Buffer.from(b).toString('base64')

if(!fs.existsSync("db.txt")){ fs.writeFileSync("db.txt", btoa("{}"))}
let data = JSON.parse(atob(fs.readFileSync("db.txt").toString()));

function saveData(){
    fs.writeFileSync("db.txt", btoa(JSON.stringify(data)));
}

module.exports = {
    saveData: saveData,
    get data(){return data} 
}