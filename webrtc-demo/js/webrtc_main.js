'use strict';

var selfView;
var remoteView;
var signalingChannel;
var pc;
var peer;
var localStream;
var remoteStream;
var channel;

(function(exports) {
  'use strict';
  var configuration = {
    "iceServers": [
      {
        "url": "stun:mmt-stun.verkstad.net",
        "urls": "stun:mmt-stun.verkstad.net"
      },
      {
        "url": "turn:mmt-turn.verkstad.net",
        "urls": "turn:mmt-turn.verkstad.net",
        "username": "webrtc",
        "credential": "secret"
      }
    ]
  };

  var WebrtcMain = {
    firstStartCamera: false,
    getUserMedia: 'getUserMedia' in navigator ? 'getUserMedia' :
        'webkitGetUserMedia' in navigator ? 'webkitGetUserMedia' :
            'mozGetUserMedia' in navigator ? 'mozGetUserMedia' : 'getUserMedia',
    srcObject: 'srcObject' in document.createElement("VIDEO") ? "srcObject" :
        'mozSrcObject' in document.createElement("VIDEO") ? "mozSrcObject" :
            'webkitSrcObject' in document.createElement("VIDEO") ? "webkitSrcObject" : "srcObject",
    PeerConnection: window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection,
    SessionDescription: window.RTCSessionDescription || window.mozRTCSessionDescription || window.webkitRTCSessionDescription,
    RTCIceCandidate: window.RTCIceCandidate || window.mozRTCIceCandidate,

    init: function _init() {
      selfView = document.getElementById("local");
      remoteView = document.getElementById("remote");
      this.createPeerConnection();
      this.createSignalingChannel();
    },

    // call createPeerConnection() to initiate
    createPeerConnection: function _createPeerConnection() {
      pc = new this.PeerConnection(configuration);
      // send any ice candidates to the other peer
      pc.onicecandidate = function (evt) {
        if (evt.candidate) {
          var s = SDP.parse("m=application 0 NONE\r\na=" + evt.candidate.candidate + "\r\n");
          var candidateDescription = s.mediaDescriptions[0].ice.candidates[0];
          peer.send(JSON.stringify({
            "candidate": {
              "candidateDescription": candidateDescription,
              "sdpMLineIndex": evt.candidate.sdpMLineIndex
            }
          }, null, 2));
          debug("candidate emitted: " + JSON.stringify(candidateDescription, null, 2));
        }
      };

      // once the remote stream arrives, show it in the remote video element
      pc.onaddstream = function (evt) {
        remoteStream = evt.stream;
        remoteView[this.srcObject] = evt.stream;
      }.bind(this);

      pc.ondatachannel = function (evt) {
        channel = evt.channel;
        this.startChat();
      }.bind(this);
    },

    createSignalingChannel: function() {
      signalingChannel = new SignalingChannel();
      // another peer has joined our session
      signalingChannel.onpeer = function (evt) {
        peer = evt.peer;
        peer.onmessage = this.handleMessage.bind(this);
        peer.ondisconnect = function () {
          if (pc) pc.close();
          pc = null;
        };
      }.bind(this);
    },

    openCamera: function _openCamera() {
      return new Promise(function(resolve, reject) {
        if(this.firstStartCamera) return resolve(localStream);
        // video/audio with our without chat, and get a local stream
        navigator[this.getUserMedia]({
          "audio": Preferences.getAudio,
          "video": Preferences.getVideo
        }, function (stream) {
          if(pc) pc.addStream(stream);
          // .. show it in a self-view
          selfView[this.srcObject] = stream;
          // .. and keep it to be sent later
          localStream = stream;
          this.firstStartCamera = true;
          return resolve(stream);
        }.bind(this), this.logError.bind(this));
      }.bind(this));
    },

    /*更新帧率*/
    updateVideoFrameRate: function _updateVideoFrameRate() {
      if(!localStream) return;
      var videotracs = localStream.getVideoTracks();
      this.updateConstriants(videotracs[0], 'frameRate', { ideal: 10, max: 15 });
    },

    /*
     * 例如, 在移动设备上面，如下的例子表示优先使用前置摄像头（如果有的话）：
     * { audio: true, video: { facingMode: "user" } }
     * 强制使用后置摄像头，请用：
     * { audio: true, video: { facingMode: { exact: "environment" } }
     * 帧率在某些情况下，比如WebRTC上使用受限带宽传输时，低帧率可能更适宜。
     * var constraints = { video: { frameRate: { ideal: 10, max: 15 } } };
     *
     * var mediaStream = localStream;
     * var videotracs = mediaStream.getVideoTracks();
     * var audiotracs = mediaStream.getAudioTracks();
     * */
    updateConstriants: function _updateConstriants(mediaStreamTrack, attribute, attributeValue) {
      try {
        if(!mediaStreamTrack.getConstraints) return;
        var constraints = mediaStreamTrack.getConstraints();
        constraints[attribute] = attributeValue;
        mediaStreamTrack.applyConstriants(constraints);
      } catch(e) {
        debug("It can't update constriants[" +attribute+"].");
        WebrtcMenu.showToaster("It can't update constriants[" +attribute+"].", true);
      }
    },

    switchCameraMode: function _switchCameraMode(cameraMode) {
      if(!localStream) return;
      var videotracs = localStream.getVideoTracks();
      var facingMode = 'environment';
      switch(cameraMode) {
        case 'frontCameras':
          facingMode = 'user';
          break;
        case 'backCameras':
          facingMode = 'environment';
          break;
        default:
          facingMode = 'environment';
          break;
      }
      this.updateConstriants(videotracs[0], 'facingMode', facingMode);
    },

    removeMediaStream: function _removeMediaStream(mediaStream) {
      if(pc && pc.removestream) pc.removestream(mediaStream);
    },

    /*
     * MediaStreamTrack接口在User Agent中表示一段媒体源，比如音轨或视频。
     * MediaStreamTrack.enabled
     * 布尔值，为true时表示轨道有效，并且可以被渲染。为false时表示轨道失效，只能被渲染为静音或黑屏。如果该轨道连接中断，该值还是可以被改变但不会有任何效果了。
     *
     * MediaStreamTrack.onmute
     * 这是mute事件在这个对象被触发时调用的事件处理器EventHandler，这时这个流被中断
     *
     * MediaStreamTrack.onunmute
     * 这是unmute事件在这个对象上被触发时调用的事件处理器EventHandler，未实现。
     *
     * MediaStreamTrack.stop()
     * 停止播放轨道对应的源，源与轨道将脱离关联，同时轨道状态将设为“ended”。
     *
     * MediaStreamTrack.readyState 只读
     * 返回枚举类型的值，表示轨道的当前状态。该枚举值为以下中的一个：
     * "live"表示当前输入已经连接并且在尽力提供实时数据。在这种情况下，输出数据可以通过操作MediaStreamTrack.enabled属性进行开关。
     * “ended”表示这个输出连接没有更多的数据了，而且也不会提供更多的数据了
     * */
    muteMediaStream: function(mediaStream) {
      if(!mediaStream) return;
      var mediaStreamsTrack = mediaStream.getTracks();
      mediaStreamsTrack.forEach(function(mediaStreamTrack) {
        debug('mediaStreamTrack -> ' + mediaStreamTrack);
        debug('mediaStreamTrack.kind -> ' + mediaStreamTrack.kind);
        debug('mediaStreamTrack.readyState -> ' + mediaStreamTrack.readyState);
        debug('mediaStreamTrack.enabled -> ' + mediaStreamTrack.enabled);

        var mediaStreamState = mediaStreamTrack.readyState;
        mediaStreamTrack.onmute = function() {
          WebrtcMenu.showToaster('Device ' + mediaStreamTrack + ' has been muted.', true);
          debug('Device ' + mediaStreamTrack + ' has been muted.');
        };

        //if(mediaStreamState == 'live') {
          mediaStreamTrack.enabled = false;
          //mediaStreamTrack.stop();
        //}
      });
      if (mediaStream.removeTrack)
        mediaStream.removeTrack(mediaStreamTrack);
      //mediaStream.stop();
    },

    closeMediaStream: function _closeMediaStream() {
      [remoteStream, localStream].forEach(function(mediaStream) {
        if (!mediaStream) return;
        this.muteMediaStream(mediaStream);
        this.removeMediaStream(mediaStream);
      }.bind(this));
    },

    // handle signaling messages received from the other peer
    handleMessage: function _handleMessage(evt) {
      var message = JSON.parse(evt.data);
      debug('handleMessage:: message -> ' + JSON.stringify(message));
      if(pc) this.answerCall(message);
    },

    startCall: function(isInitiator) {
      debug('startCall:: isInitiator -> ' + isInitiator);
      // start the chat
      if (isInitiator && pc) {
        this.openCamera().then(function() {
          this.updateVideoFrameRate();
          pc.createOffer(this.localDescCreated.bind(this), this.logError.bind(this));
          channel = pc.createDataChannel("chat");
          this.startChat();
        }.bind(this));
      }
    },

    answerCall: function(message) {
      if(!pc) return;
      if (message.sessionDescription) {
        pc.setRemoteDescription(new this.SessionDescription({
          "sdp": SDP.generate(message.sessionDescription),
          "type": message.type
        }), function () {
          // if we received an offer, we need to create an answer
          if (pc.remoteDescription.type == "offer")
            this.openCamera().then(function() {
              this.updateVideoFrameRate();
              pc.createAnswer(this.localDescCreated.bind(this), this.logError.bind(this));
            }.bind(this));
        }.bind(this), this.logError.bind(this));
      } else {
        var d = message.candidate.candidateDescription;
        message.candidate.candidate = "candidate:" + [
              d.foundation,
              d.componentId,
              d.transport,
              d.priority,
              d.address,
              d.port,
              "typ",
              d.type,
              d.relatedAddress && ("raddr " + d.relatedAddress),
              d.relatedPort && ("rport " + d.relatedPort),
              d.tcpType && ("tcptype " + d.tcpType)
            ].filter(function (x) {return x;}).join(" ");

        pc.addIceCandidate(new this.RTCIceCandidate(message.candidate), function() {}, this.logError.bind(this));
      }
    },

    localDescCreated: function _localDescCreated(desc) {
      debug('localDescCreated. ');
      pc.setLocalDescription(desc, function () {
        var sessionDescription = SDP.parse(pc.localDescription.sdp);
        peer.send(JSON.stringify({
          "sessionDescription": sessionDescription,
          "type": pc.localDescription.type
        }, null, 2));
        var logMessage = "localDescription set and sent to peer, type: " + pc.localDescription.type
          + ", sessionDescription:\n" + JSON.stringify(sessionDescription, null, 2);
        debug(logMessage);
      }, this.logError.bind(this));
    },

    logError: function _logError(error) {
      if (error) {
        if (error.name && error.message)
          this.log(error.name + ": " + error.message);
        else
          this.log(error);
      } else
        this.log("Error (no error message)");
    },

    log: function _log(msg) {
      debug('cuisx:: log -> ' + msg);
    },

    // start chat
    startChat:function _startChat() {
      /*channel.onopen = function () {
        //On enter press - send text message.
        chatText.onkeyup = function (event) {
          if (event.keyCode == 13) {
            chatButton.click();
          }
        };

        chatButton.onclick = function () {
          if (chatText.value) {
            postChatMessage(chatText.value, true);
            channel.send(chatText.value);
          }
        };
      };*/

      // recieve data from remote user
      channel.onmessage = function (evt) {
        postChatMessage(evt.data);
        MessageHandler.receiveMsg(evt.data);
      };

      function postChatMessage(msg, author) {
        debug('received peer message -> ' + msg);
        WebrtcMenu.showToaster(msg, true);
      }
    }
  };

  exports.WebrtcMain = WebrtcMain;
}(this));
