/*
 * Simple signaling channel for WebRTC (use with channel_server.js).
 */

function SignalingChannel(sessionId) {
    //var domain = 'http://192.168.4.116:8081'; //'http://60.205.226.32:8081'; //'https://demo.openwebrtc.org';
    var domain = Preferences.getServerIP;
    if (!sessionId) sessionId = Preferences.getRoomId || createId();
    var userId = Preferences.getUserNAme || createId();
    var channels = {};

    var listeners = {
        "onpeer": null,
        "onsessionfull": null
    };
    for (var name in listeners)
        Object.defineProperty(this, name, createEventListenerDescriptor(name, listeners));

    function createId() {
        return Math.random().toString(16).substr(2);
    }

    var es = new EventSource(domain + "/stoc/" + sessionId + "/" + userId, {withCredentials: true});
    //var es = new EventSource('http://www.w3school.com.cn/example/html5/demo_sse.php', {withCredentials: true});
    Constant.eventSource = es;

    es.onopen = function() {
        debug('es onopen. ');
        WebrtcMenu.showToaster('Connection server success.', true);
    };

    es.onmessage=function(event) {
        debug('es onmessage -> ' + event.data);
    };

    es.onerror = function () {
        debug("es error. ");
        WebrtcMenu.showToaster('Connection server failed.', true);
        es.close();
    };

    es.addEventListener("join", function (evt) {
        var peerUserId = evt.data;
        debug("es join: " + peerUserId);
        var channel = new PeerChannel(peerUserId);
        channels[peerUserId] = channel;

        es.addEventListener("user-" + peerUserId, userDataHandler, false);
        fireEvent({ "type": "peer", "peer": channel }, listeners);
        WebrtcMenu.showToaster('Users( ' +peerUserId+ ' ) have join group chat.', true);
    }, false);

    function userDataHandler(evt) {
        var peerUserId = evt.type.substr(5); // discard "user-" part
        var channel = channels[peerUserId];
        if (channel)
            channel.didGetData(evt.data);
    }

    es.addEventListener("leave", function (evt) {
        var peerUserId = evt.data;
        debug("es leave: " + peerUserId);
        es.removeEventListener("user-" + peerUserId, userDataHandler, false);

        channels[peerUserId].didLeave();
        delete channels[peerUserId];
        WebrtcMenu.showToaster('Users( ' +peerUserId+ ' ) have quit group chat.', true);
        NavigationMap.toPanel('view-contact-form');
        WebrtcMenu.updateSKs(WebrtcMenu.saveWebRTCPerfences);
    }, false);

    es.addEventListener("sessionfull", function () {
        debug("es sessionfull. ");
        fireEvent({"type": "sessionfull"}, listeners);
        WebrtcMenu.showToaster('room has full.', true);
        es.close();
    }, false);

    function PeerChannel(peerUserId) {
        var listeners = {
            "onmessage": null,
            "ondisconnect": null
        };
        for (var name in listeners)
            Object.defineProperty(this, name, createEventListenerDescriptor(name, listeners));

        this.didGetData = function (data) {
            fireEvent({"type": "message", "data": data }, listeners);
        };

        this.didLeave = function () {
            fireEvent({"type": "disconnect" }, listeners);
        };

        var sendQueue = [];

        function processSendQueue() {
            var xhr = new XMLHttpRequest({mozSystem: true});
            xhr.open("POST",  domain + "/ctos/" + sessionId + "/" + userId + "/" + peerUserId);
            xhr.setRequestHeader("Content-Type", "text/plain");
            xhr.send(sendQueue[0]);
            xhr.onreadystatechange = function () {
                if (xhr.readyState == xhr.DONE) {
                    sendQueue.shift();
                    if (sendQueue.length > 0)
                        processSendQueue();
                }
            };
        }

        this.send = function(message) {
            if (sendQueue.push(message) == 1)
                processSendQueue();
        };
    }

    function createEventListenerDescriptor(name, listeners) {
        return {
            "get": function () { return listeners[name]; },
            "set": function (cb) { listeners[name] = cb instanceof Function ? cb : null; },
            "enumerable": true
        };
    }

    function fireEvent(evt, listeners) {
        var listener = listeners["on" + evt.type];
        if (listener)
            listener(evt);
    }
}
