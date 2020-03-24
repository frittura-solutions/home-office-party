'use strict';

const https = require("https");
const WebSocket = require("ws");
const express = require('express');
//const session = require('express-session');
const bodyParser = require('body-parser');
const { getCredentials, log } = require("./utils");

const PORT = 80;
const app = express();
// app.use(session({
//     secret: 'secret',
//     resave: true,
//     saveUninitialized: true
// }));
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies
app.use(express.static(__dirname + '/static'));

app.get('/test', (request, response) => {
    response.send("test")
});


app.listen(PORT, () => console.log(`Server listening on port ${PORT}!`))
// log(credentials)
// const httpsServer = https.createServer(credentials, app);

// try {
//     httpsServer.listen(PORT, () => {
//     console.log(`Secure static web server running on port: ${PORT}`);
//     });
// } catch (err) {
//     console.log("ERROR: " + err);
// }