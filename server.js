'use strict';

const https = require("https");
const {Hub} = require('./hub')
const express = require('express');
//const session = require('express-session');
//const bodyParser = require('body-parser');

const httpProxy = require('http-proxy');
const { getCredentials, log } = require("./utils");
const port = process.env.PORT || 443;



const app = express();


app.get('/status', (req, res) => {
    res.json({ status: 'All good Alexander!' });
});
app.use(express.static('static'));
const apiProxy = httpProxy.createProxyServer();
const stunServer = 'https://localhost:3478';
 
app.all("/stun/*", (req, res) => {
    console.log('redirecting to stun server');
    apiProxy.web(req, res, {target: stunServer});
});


const credentials = getCredentials();
const httpsServer = https.createServer(credentials, app);
const server = httpsServer.listen(port, () => {
    console.log('node.js static server listening on port: ' + port + ", with websockets listener")
})
var hub = new Hub(server);


