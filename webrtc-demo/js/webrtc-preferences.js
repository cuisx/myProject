/**
 * Created by tclxa on 17-2-28.
 */
'use strict';

(function (exports) {
  var Preferences = {
    serverIP: 'http://60.205.226.32:8081',
    roomID: '2017f',
    userName: 'John',
    audioChecked: true,
    videoChecked: true,

    createId: function createId() {
      return Math.random().toString(16).substr(2);
    },

    setServerIP: function (value) {
      if(!value) value = document.getElementById("serverIp").value;
      this.serverIP = value;
    },

    get getServerIP() {
      return this.serverIP;
    },

    setRoomId: function (value) {
      if(!value) value = document.getElementById("roomId").value;
      this.roomID = value;
    },

    get getRoomId() {
      return this.roomID;
    },

    setUserName: function (value) {
      if(!value) value = document.getElementById("userName").value;
      this.userName = value + "-" + this.createId();
      document.getElementById('letter-counter').textContent = this.userName;
    },

    get getUserNAme() {
      return this.userName;
    },

    setAudio: function(value) {
      if(!value) value = document.getElementById("audio_cb").checked;
      this.audioChecked = value;
    },

    get getAudio() {
      return this.audioChecked;
    },

    setVideo: function(value) {
      if(!value) value = document.getElementById("video_cb").checked;
      this.videoChecked = value;
    },

    get getVideo() {
      return this.audioChecked;
    },

    setDefaultPerfences: function() {
      //Preferences.init();
      var sessionId = '2017f' || Math.random().toString(16).substr(10);
      document.getElementById("serverIp").value = 'http://60.205.226.32:8081'; //'http://192.168.4.116:8081';
      document.getElementById("roomId").value = sessionId;
      document.getElementById("userName").value = 'John';
    },

    savePerfences: function() {
      this.setServerIP();
      this.setRoomId();
      this.setUserName();
      this.setAudio();
      this.setVideo();
    },

    init: function() {
      document.getElementById("audio_cb").addEventListener('click', function(evt) {
        var audioSwitch = evt.target.checked;
        this.audioChecked = audioSwitch;
        debug('Preferences::init audioSwitch -> ' + audioSwitch);
      });

      document.getElementById("video_cb").addEventListener('click', function(evt) {
        var videoSwitch = evt.target.checked;
        this.videoChecked = videoSwitch;
        debug('Preferences::init videoSwitch -> ' + videoSwitch);
      });
    }
  };

  exports.Preferences = Preferences;
})(window);
