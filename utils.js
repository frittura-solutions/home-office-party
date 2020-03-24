const fs = require("fs");
const path = require("path");

const getCredentials = (keyDir = "./certificates") => {
    // load SSL certificate
    var privateKey, certificate;
    try {
        privateKey = fs.readFileSync(path.join(keyDir, "localhost.key"), "utf8");
        certificate = fs.readFileSync(path.join(keyDir, "localhost.crt"), "utf8");

    } catch (err) {
        console.log("Could not load private key and certificate from dictory " + keyDir + "!");
        console.log(err);
    }
    return {
        privateKey: privateKey,
        certificate: certificate
    }

}

const log = txt => {
    	const tag = "[Stats " + Date() + "] ";
        // additional argument are appended to string
        for (var i = 1; i < arguments.length; i++) {
            txt += "  " + arguments[i];
        }
        console.log(tag + txt);
    }

module.exports = {
    getCredentials,
    log
}