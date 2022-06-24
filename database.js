const fs = require('fs');

if(!fs.existsSync("db.txt")){ fs.writeFileSync("db.txt", "{}") }
let data = JSON.parse(fs.readFileSync("db.txt").toString());

function saveData(){
    fs.writeFileSync("db.txt", JSON.stringify(data));
}

module.exports = {
    saveData: saveData,
    get data(){return data} 
}