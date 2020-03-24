#!/usr/bin/env node

'use strict';
const fs = require("fs");
const path = require("path");
const https = require("https");
const WebSocket = require("ws");
const uuid = require("uuid");
const { getCredentials, log } = require("./utils");

// remove rooms after 1 week
const ROOM_MAX_LIVETIME_HRS = 7 * 24.0;
// remove rooms if they have not been used for 2 days
const ROOM_INACTIVE_LIVETIME_HRS = 2 * 24.0;

const STATS_INTERVAL_MINS = 1.0;
const CLEAN_INTERVAL_MINS = 10.0;
const PORT = 3033;

class Hub {
    constructor() {
        this.rooms = {}
    }

    printStats() {
        log("number of clients of webserver: ", wss.clients.length);
        log("Number of rooms: ", Object.keys(this.rooms).length);
        log(" == Rooms: ==");
        for (const [name, room] of Object.entries(this.rooms)) {
            log(" name: ", room.name);
            log("   created on: ", room.dateCreated.toString());
            log("   number of users: ", Object.keys(room.users).length);
            log("   users: ", Object.values(room.users));
        }
    }

    cleanUp() {
        // remove empty rooms that are too old
        for (const [name, room] of Object.entries(this.rooms)) {
            const now = Date.now();
            const create = Date.parse(room.dateCreated);
            const access = Date.parse(room.dateLastAccess);
            if (
                ((now - create) > 1000.0 * 60.0 * 60.0 * ROOM_MAX_LIVETIME_HRS) ||
                ((now - access) > 1000.0 * 60.0 * 60.0 * ROOM_INACTIVE_LIVETIME_HRS)) {
                console.log("[Cleanup] remove room ", name);
                delete this.rooms[name];
            }
        }
    }

}

class Room {
    constructor(name) {
        this.dateCreated = Date();
        this.dateLastAccess = Date();
        // name of the chat room
        this.name = name;
        // map user IDs to names of users
        this.users = {};
        // map users' IDs to websockets associated with each user
        this.connections = {};
        // list of messages in the chat, each message is an object
        //  { user: '<The user name>', data: '<some text>', date: '<time when the message was sent>' }
        this.transcript = [];
    }
}

const sendTo = (connection, message) => {
    var msg = JSON.stringify(message);
    connection.send(msg);
    if (connection.readyState === WebSocket.OPEN) {
        connection.send(msg);
    }
}

// broadcast a message to all connected users in the same room
const sendToAll = (message) => {
    var room = hub.rooms[message.room];
    room.dateLastAccess = Date();
    var msg = JSON.stringify(message);
    for (var userID in room.connections) {
        var connection = room.connections[userID];
        if (connection.readyState === WebSocket.OPEN) {
            connection.send(msg);
        }
    }
};

const credentials = getCredentials();
const httpsServer = https.createServer(credentials);
var hub = new Hub();
// print statistics every few minute
const intervalStats = setInterval(hub.printStats, STATS_INTERVAL_MINS * 60 * 1000);

// clean-up dead rooms
const intervalClean = setInterval(hub.cleanUp, CLEAN_INTERVAL_MINS * 60 * 1000);
// initialize the WebSocket server instance
const wss = new WebSocket.Server({
    server: httpsServer
});

wss.on("connection", ws => {
    ws.on("message", str => {
        let data;
        // accepting only JSON messages
        try {
            var msg = JSON.parse(str);
        } catch (e) {
            console.log(str);
            console.log(`Invalid JSON: $str`);
            return;
        }
        switch (msg.type) {
            case 'join':
                handleJoin(ws, msg)
                break;
            case 'leave':
                handleLeave(msg)
                break;
            case 'message':
                handleMessage(msg)
                break;
            default:
                log(`Unknown message type ${msg.type}`);
        }
    });
});

const handleJoin = (ws, msg) => {
    // User requests to join the conversion in a room by sending a JSON string:
    //   {"type": "join", "user": "<real name of user>", "room": "<name of room to join>"}
    // A unique ID is generated which the user has to send to identify himself
    // in future calls.
    console.log("join");
    if ((msg.user !== undefined) && (msg.room !== undefined)) {
        var roomName = msg.room;
        if (hub.rooms[roomName] === undefined) {
            // add new room
            hub.rooms[roomName] = new Room(roomName);
            console.log("add new room " + roomName);
        }
        var room = hub.rooms[roomName];

        // save connection
        const id = uuid.v4();
        room.users[id] = msg.user;
        room.connections[id] = ws;
        sendToAll({
            type: "notification",
            room: msg.room,
            user: msg.user,
            action: "join",
            data: `${msg.user} joined the conversation.`
        });
        // send new user the transcript of the conversation
        // and tell him his ID and the names of the other connected users
        let userNames = [];
        for (var userID in room.users) {
            userNames.push(room.users[userID]);
        }
        sendTo(ws, {
            id: id,
            type: "transcript",
            data: room.transcript,
            users: userNames
        });
    }
}

const handleLeave = msg => {
    // User sent a JSON string to signal that she wants to leave the chat:
    //   {"type": "leave", "room": "<name of room to leave>", "user": "<real name of user>", "id": "<The user ID obtained during login>"}
    console.log("leave room " + msg.room);
    var room = hub.rooms[msg.room];
    if ((room !== undefined) && (room.connections[msg.id] !== undefined)) {
        console.log("  send signal that user " + msg.user + " leaves to everyone");
        sendToAll({
            type: "notification",
            room: msg.room,
            user: msg.user,
            action: "leave",
            data: `${msg.user} left the conversation.`
        });
        delete room.connections[msg.id];
        delete room.users[msg.id];
    }
}

const handleMessage = msg => {
    // User sent a JSON string with a message to all other users:
    //   {"type": "message", "user": "<real name of user>", "id": "<The user ID obtained during login>", "data": "<The message sent to the group>"}
    console.log("message " + msg);
    console.log("Room room = " + msg.room);
    var room = hub.rooms[msg.room];
    if ((room === undefined) || (room.connections[msg.id] === undefined)) {
        sendTo(ws, {
            type: "error",
            data: "You have to send a login request \"{type: \"join\", room: \"name of room\", user: \"Your name\"}\" first."
        });
        return;
    }
    if (msg.data !== undefined) {
        room.transcript.push({
            user: msg.user,
            room: msg.room,
            data: msg.data,
            date: Date()
        });
        // only keep the last 100 messages
        if (room.transcript.length > 100) {
            // remove the first item
            room.transcript.shift();
        }
        // broadcast message to all connected users
        sendToAll({
            type: "message",
            room: msg.room,
            user: msg.user,
            data: msg.data,
            date: Date()
        });
    }
}




// start our server
try {
    httpsServer.listen(PORT, () => {
        console.log(`Signaling server running on port: ${PORT}`);
    });
} catch (err) {
    console.log("ERROR: " + err);
}