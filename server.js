const express = require("express");

const server = express()

server.use(express.static('testing-page'))

server.use(express.static("dictionary"));

server.all("/", (req, res) => {
	res.send("<a href='https://discord.com/oauth2/authorize?client_id=937031679023910962&scope=identify bot applications.commands&permissions=2146958591'>Add Bot</a>");	
})

function keepAlive() {
  	server.listen(3000, () => {
    	console.log("Server is ready.")
  	})
}

module.exports = keepAlive;