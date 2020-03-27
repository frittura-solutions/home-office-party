'use strict';

const addMessage = msg => {
    if (msg.room !== chatRoom) {
        return;
    }
    let messageBox = msg.user === userName ? htmlToElement(templates[msgRight]) : htmlToElement(templates[msgLeft]);
    messageBox.querySelector("#message-user-name").innerHTML = msg.user;

    let txt = msg.data;
    // replace links with <link> tags
    txt = txt.replace(/(https*:\/\/[a-zA-Z0-9\-]+\.[a-zA-Z0-9\.\-]+\/\S+)/g, '<a href="$1" target="_blank">$1</a>');
    messageBox.querySelector("#message-text").innerHTML = txt + "<span style=\"float:right\"><i><small>(" + formatDate(msg.date) + ")</small></i></span>";

    $("#transcript-box").prepend(messageBox);
};


const addNotification = (msg) => {
    if (msg.room !== chatRoom) {
        return;
    }
    const notificationTemplate = htmlToElement(templates[notification]);
    notification.innerHTML = msg.data;

    $("#transcript-box").prepend(notification);
};

const sendMessage = () => {
    let message = $("#text-input").value;
    if (message === "") return;
    let msg = {
        id: userIDchat,
        room: chatRoom,
        user: userName,
        type: "message",
        data: message
    };
    ws.send(JSON.stringify(msg));
    // clean input field
    input.value = "";
}
