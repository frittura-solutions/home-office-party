'use strict';


const debugInfo = () => {
    console.log("=== DEBUG INFO: ===");
    console.log("  peer connections ");
    for (var remoteUser in peerConnections) {
        console.log("peerConnections[" + remoteUser + "]= ", peerConnections[remoteUser]);
    }
    console.log("  media streams ");
    console.log("localVideo.srcObject = ", localVideo.srcObject);
    for (var remoteUser in peerConnections) {
        console.log("remoteVideos[" + remoteUser + "].srcObject= ", remoteVideos[remoteUser].srcObject);
        console.log("remoteVideos[" + remoteUser + "].paused= ", remoteVideos[remoteUser].paused);
    }
}

const addRemoteCaller = remoteUser => {
    console.log("addRemoteCaller " + remoteUser);
    // A remote user has requested to join the conversion so
    // we create a video window for him and initiate a peer connection.

    var videoContainer = remoteVideoContainers[remoteUser];
    if (videoContainer === undefined) {
        videoContainer = videoContainerTemplate.cloneNode(true);
        videoContainer.style.display = "block";
        videoContainer.querySelector("#video-user-name").innerHTML = remoteUser;
        // save handle to video
        remoteVideoContainers[remoteUser] = videoContainer;
        remoteVideos[remoteUser] = videoContainer.querySelector("#remoteVideo");
        // add video to the list
        var videoContainerList = document.getElementById("video-container-list");
        videoContainerList.append(videoContainer);
    }
    // initiate new peer connection
    var pc = new RTCPeerConnection(configuration);

    console.log("[RTC] initiate connection to remote user " + remoteUser);
    // When a remote stream arrives display it in the #remoteVideo element
    pc.ontrack = event => {
        console.log("[RTC] remote stream added, streams = ", event.streams);
        remoteVideos[remoteUser].srcObject = event.streams[0];
        //remoteVideos[remoteUser].play();
    };

    // delivery of ICE messages to other peers
    pc.onicecandidate = event => {
        if (event.candidate) {
            // send the candidate to the remote peer
            console.log("[RTC] send ICE candidate  " + event.candidate);
            sendMessageICE(event.candidate, remoteUser);
        } else {
            // All ICE candidates have been sent
            console.log("[RTC] end of ICE negotiation");
        }
    };

    pc.onnegotiationneeded = () => {
        console.log("[RTC] negotiation needed");
        pc.createOffer()
            .then(desc => {
                return pc.setLocalDescription(desc);
            })
            .then(() => {
                // send the offer to the remote peer through the signaling server
                console.log("[RTC] send offer to remote peer");
                sendMessageSDP(pc.localDescription, remoteUser);
            })
            .catch((err) => {
                console.log("[RTC] error when creating offer : " + err);
            });
    };

    pc.onsignalingstatechange = (event) => {
        console.log("[RTC] signaling state changed to " + pc.signalingState);
    };

    pc.onconnectionstatechange = (event) => {
        console.log("[RTC] connection state changed to " + pc.connectionState);
        switch (pc.connectionState) {
            case "connected":
                // The connection has become fully connected
                break;
            case "disconnected":
            case "failed":
                // One or more transports has terminated unexpectedly or in an error
                break;
            case "closed":
                // The connection has been closed
                break;
        }
    };


    peerConnections[remoteUser] = pc
    // attach local video stream to peer connection

    var stream = localVideo.srcObject;
    console.log("localVide.srcObject = " + stream);
    if (stream) {
        pc.addStream(stream);
    }

    // hide waiting sign
    var waitingSign = document.getElementById("wait-for-others");
    waitingSign.style.display = "none";

    return pc;
}

const handleIceMessage = (ice, remoteUser) => {
    var pc = peerConnections[remoteUser];
    if (pc === undefined) {
        // connection has to be established first by an SDP exchange
        console.log("peer connection for remote user " + remoteUser + " is still undefined");
        return;
    }
    console.log("[RTC] handleIceMessage from user " + remoteUser + " pc= ", pc, " ice= ", ice);
    console.log("[RTC] pc.signalingState = " + pc.signalingState);

    var iceCandidate = new RTCIceCandidate(ice);
    pc.addIceCandidate(iceCandidate)
        .then(() => {
            console.log("[RTC] added ice candidate" + " pc.signalingState = " + pc.signalingState);
        })
        .catch(e => {
            console.log("[RTC] error during addIceCandidate: ", e);
            console.log("ice= ", ice);
        });
}

const handleSdpMessage = (sdp, remoteUser) => {
    var pc = peerConnections[remoteUser];
    if (pc === undefined) {
        console.log("Received call from " + remoteUser);
        pc = addRemoteCaller(remoteUser);
    }
    console.log("[RTC] handleSdpMessage from user " + remoteUser + " pc= ", pc, " sdp= ", sdp);
    console.log("[RTC] pc.signalingState = " + pc.signalingState);
    var sessionDescr = new RTCSessionDescription(sdp);
    pc.setRemoteDescription(sessionDescr)
        .then(() => {
            return pc.createAnswer();
        })
        .then(answer => {
            return pc.setLocalDescription(answer);
        })
        .then(() => {
            sendMessageSDP(pc.localDescription, remoteUser);
        })
        .catch((err) => {
            console.log("[RTC] error when receiving answer : " + err);
        });
}

const removeRemoteCaller = remoteUser => {
    var pc = peerConnections[remoteUser];
    if (pc !== undefined) {
        pc.close();
        delete peerConnections[remoteUser];
    }
    var videoContainer = remoteVideoContainers[remoteUser];
    if (videoContainer !== undefined) {
        videoContainer.remove();
        delete remoteVideoContainers[remoteUser];
    }
    if (Object.keys(peerConnections).length === 0) {
        // show waiting sign
        var waitingSign = document.getElementById("wait-for-others");
        waitingSign.style.display = "block";
    }
}

const sendMessageICE = (ice, remoteUser) => {
    var msg = {
        id: userIDrtc,
        room: rtcRoom,
        // The message is sent from `user` to the recipient `remoteUser``,
        // all other peers should ignore this message
        user: userName,
        type: "message",
        data: {
            ice: ice,
            remoteUser: remoteUser
        }
    };
    console.log("[RTC] send ICE message ", ice);
    wsRTC.send(JSON.stringify(msg));
}

const sendMessageSDP = (sdp, remoteUser) => {
    var msg = {
        id: userIDrtc,
        room: rtcRoom,
        // The message is sent from `user` to the recipient `remoteUser``,
        // all other peers should ignore this message
        user: userName,
        type: "message",
        data: {
            sdp: sdp,
            remoteUser: remoteUser
        }
    };
    console.log("[RTC] send SDP message ", sdp);
    wsRTC.send(JSON.stringify(msg));
}
