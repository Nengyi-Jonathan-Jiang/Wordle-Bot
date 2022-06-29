const express = require("express");
const fs = require("fs");
const path = require("path");

const server = express()

server.all("/", (req, res) => {
	res.send("<a href='https://discord.com/oauth2/authorize?client_id=937031679023910962&scope=identify bot applications.commands&permissions=2146958591'>Add Bot</a>");	
})

server.all("/dictionary/*", (req,res)=>{
	res.sendFile(path.join(__dirname, "../res/", req.url));
})

server.all("/helper", (req,res)=>{
	res.sendFile(path.join(__dirname, "/helper/index.html"));
});

server.listen(3000, () => {
	console.log("Server is ready.")
})