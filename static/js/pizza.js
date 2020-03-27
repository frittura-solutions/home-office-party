$(document).ready(() => {

    $('#text-input').keypress(e => {
        if (e.keyCode == 13) {
            $('#send-button').click();
        }
    });
    var urlParams = new URLSearchParams(window.location.search)
    var chatRoom = "default";
    if (urlParams.has("room")) {
        chatRoom = urlParams.get("room");
    }
    $("#room-name").innerHTML = "Room: " + chatRoom + "</br>";

    // determine user name
    var userName;
    while ((userName === undefined) || (userName === "") || (userName === null)) {
        userName = prompt("What's your name?");
    }

    // user ID
    var userIDchat;
    // The signaling server should be running at port 9000 on the same host
    // that serves the web page.
    var host = window.location.hostname;
    console.log("Host", host)
    const ws = new WebSocket("wss://" + host + ":443");

    // Connection opened
    ws.addEventListener('open', function(event) {
        const loginMsg = {
            type: "join",
            room: chatRoom,
            user: userName
        };
        ws.send(JSON.stringify(loginMsg));
    });

    ws.addEventListener("error", function(event) {
        var error = document.getElementById("error-messages");
        error.innerHTML += "<div class='error'>[Chat] Could not connect to websocket. Try to reload the page.</div>";
    });

    // Listen for messages
    ws.addEventListener('message', function(event) {
        try {
            var msg = JSON.parse(event.data);
        } catch (e) {
            console.log(`[Chat] Error ${e}`);
        }
        console.log("[Chat] Received ", msg);
        switch (msg.type) {
            case "message":
                addMessage(msg);
                console.log("[Chat] Received message ", msg);
                break;
            case "notification":
                addNotification(msg);
                console.log("[Chat] Received notification ", msg);
                break;
            case "transcript":
                if (userIDchat) {
                    // This should never happen ???
                    break;
                }
                // set user id (global variable)
                userIDchat = msg.id;
                console.log("[Chat] My user ID is " + userIDchat);
                const transcript = msg.data;
                console.log("[Chat] got transcript from ongoing conversation");
                for (var m of transcript) {
                    console.log("[Chat] Adding message from transcript", m);
                    addMessage(m);
                }
                break;
            case "error":
                var error = document.getElementById("error-messages");
                error.innerHTML = `<div class='error'>[Chat] An error occurred: ${msg.data}</div>`;
                break;
            default:
                console.log(`[Chat] Unknown message type ${msg.type}`);
        }
        //console.log('Message from server ', event.data);
    });


    /*
       Explanations about the signaling in WebRTC can be found at
         https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling
    */

    var userIDrtc;
    // holds active RTCPeerConnections to all remote peers, the keys
    // are the user names of the remote peers
    var peerConnections = {};
    // <video> tags for each remote peer
    var remoteVideos = {};
    // and their containers
    var remoteVideoContainers = {}
    const rtcRoom = chatRoom + "-rtc";

    const wsRTC = new WebSocket("wss://" + host + ":443");

    var localVideo = $("#localVideo");

    // template for remote video box, for every remote user a copy of this
    // window is added
    var videoContainerTemplate = htmlToElement(templates[video]);

    // ask user for permission to use the webcam and display my own video stream
    navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
    }).then(stream => {
        // Display your local video in #localVideo element
        localVideo.srcObject = stream;
        // Add your stream to be sent to the conneting peer
        console.log("[RTC] added local stream : ", stream);
        // add local stream to all
        for (var remoteUser in peerConnections) {
            peerConnections[remoteUser].addStream(stream);
        }
        var videoUserName = document.getElementById("video-user-name-local");
        videoUserName.innerHTML = userName;
        videoUserName.style.display = "block";

    }).catch(err => {
        var error = document.getElementById("error-messages");
        error.innerHTML += "<div class='error'>[RTC] Local video not available. You have to allow access to the camera. Try to reload the page.</div>";
        console.log("ERROR:" + err);
    });

    wsRTC.addEventListener('open', function(event) {
        const loginMsg = {
            type: "join",
            room: rtcRoom,
            user: userName
        };
        wsRTC.send(JSON.stringify(loginMsg));
    });

    wsRTC.addEventListener("error", function(event) {
        var error = document.getElementById("error-messages");
        error.innerHTML += "<div class='error'>[RTC] Could not connect to websocket. Try to reload the page.</div>";
    });

    // The STUN server has to run on the same host.
    const configuration = {
        iceServers: [{
            urls: "stun:" + host + "/stun"
        }]
    };




    wsRTC.addEventListener('message', function(event) {
        try {
            var msg = JSON.parse(event.data);
        } catch (e) {
            console.log(`Error ${e}`);
        }
        console.log("Received ", msg);
        if ((msg.user !== undefined) && (msg.user === userName)) {
            console.log("[RTC] Ignore my own messages.");
            return;
        } else {
            var remoteUser = msg.user;
        }
        switch (msg.type) {
            case "message":
                console.log("[RTC] received message ", msg);
                if (msg.data === undefined) break;

                var rtcType = msg.rtcType;
                var ice = msg.data.ice
                if (ice) {
                    // Clarification: `remoteUser` is the sender of the message,
                    //                while `msg.remoteUser` is the recipient
                    if (msg.data.remoteUser === userName) {
                        handleIceMessage(ice, remoteUser);
                    } else {
                        console.log("[RTC] ignore ICE message addressed to user ", msg.remoteUser);
                    }
                    break;
                }
                var sdp = msg.data.sdp
                if (sdp) {
                    // Clarification: `remoteUser` is the sender of the message,
                    //                while `msg.remoteUser` is the recipient
                    if (msg.data.remoteUser === userName) {
                        handleSdpMessage(sdp, remoteUser);
                    } else {
                        console.log("[RTC] ignore SDP message addressed to user ", msg.remoteUser);
                    }
                    break;
                }
                break;
            case "notification":
                console.log("[RTC] received notification ", msg);
                switch (msg.action) {
                    case "join":
                        // someone wants to initiate a call with me
                        addRemoteCaller(remoteUser);
                        break;
                    case "leave":
                        // someone is leaving the conversation
                        removeRemoteCaller(remoteUser);
                        break;
                    default:
                        console.log("Unhandled notification.action = " + msg.action);
                }
                break;
            case "transcript":
                // set user id (global variable)
                userIDrtc = msg.id;
                console.log("[RTC] My user ID is " + userIDrtc);
                break;
            case "leave":
                console.log("[RTC] remote peer left, restart ICE");
                removeRemoteCaller(remoteUser);
                break;
            case "error":
                var error = document.getElementById("error-messages");
                error.innerHTML = `<div class='error'>An error occurred (RTC): ${msg.data}. Try to reload the page.</div>`;
                break;
            default:
                console.log(`[RTC] Unknown message type ${msg.type}`);
        }
    });: PropTypes.oneOfType([value, value]).isRequired

    window.addEventListener("beforeunload", function(event) {
        // Tell the other users that you are leaving the chat by closing the browser window.
        if (userIDchat) {
            var msg = {
                id: userIDchat,
                user: userName,
                room: chatRoom,
                type: "leave"
            };
            ws.send(JSON.stringify(msg));
        }
        // Tell the other users that you are leaving the video conference
        // Tell the other users that you are leaving the game
        if (userIDrtc) {
            var msg = {
                id: userIDrtc,
                user: userName,
                room: rtcRoom,
                type: "leave"
            };
            wsRTC.send(JSON.stringify(msg));
            // close all connections
            for (var remoteUser in peerConnections) {
                peerConnections[remoteUser].close();
                delete peerConnections[remoteUser];
            }
        }
    }, false);



});