const msgBoxLeftTemplate = `<div id="message-box-left-template" class="row message-box">
    <div id="inor8g" class="cell">
        <div id="message-user-name" class="message-user-name">
            User 1
        </div>
    </div>
    <div id="i51w91" class="cell">
        <div id="message-text" class="message-text">
            <div>some message.
                <br />
            </div>
        </div>
    </div>
</div>`

const msgBoxRightTemplate = `<div id="message-box-right-template" class="row message-box">
    <div id="irzxav" class="cell">
        <div id="message-text" class="message-text">
            Some other message
        </div>
    </div>
    <div id="ib403h" class="cell">
        <div id="message-user-name" class="message-user-name">
            User 2
        </div>
    </div>
</div>`

const notificationTemplate = `<div id="notification-template" class="notification">
    Notification
</div>`

const videoTemplate = `<div id="video-container-remote-template" class="video-container popup" style="display: none" draggable="true">
    <div id="video-box-remote" class="video-box-remote">
        <div id="video-user-name" class="video-user-name-remote popup-header"></div>
        <video id="remoteVideo" autoplay="autoplay" playsinline height="300px" width="400px"></video>
    </div>
    <div class="vertical-spacer"></div>
</div>`

const templates = {
    msgLeft: msgBoxLeftTemplate,
    msgRight: msgBoxRightTemplate,
    notification: notificationTemplate,
    video: videoTemplate
}