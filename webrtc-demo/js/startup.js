/**
 * Created by tclxa on 16-3-17.
 */
'use strict';

function debug(s) {
  dump('-*- cuisx:: WebRTC Demo Application -*-' + s + '\n');
}

var Startup = {
  empty: true,

  clone: function clone(obj) {
    // Handle the 3 simple types, and null or undefined
    if (null == obj || "object" != typeof obj) return obj;

    // Handle Date
    if (obj instanceof Date) {
      var copy = new Date();
      copy.setTime(obj.getTime());
      return copy;
    }

    // Handle Array
    if (obj instanceof Array) {
      var copy = [];
      for (var i = 0; i < obj.length; ++i) {
        copy[i] = clone(obj[i]);
      }
      return copy;
    }

    // Handle Object
    if (obj instanceof Object) {
      var copy = {};
      for (var attr in obj) {
        if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr]);
      }
      return copy;
    }

    throw new Error("Unable to copy obj! Its type isn't supported.");
  },

  init_app: function() {
    window.addEventListener('keydown', this.handleKeydown);
    Constant.cpuLock = navigator.requestWakeLock('cpu');
    Constant.mainScreenLock = navigator.requestWakeLock('screen');
    Constant.highPriorityLock = navigator.requestWakeLock('high-priority');
  },

  handleKeydown: function(event) {
    var currentNode = document.activeElement;
    debug('keycode-------->' + event.key);
    switch(event.key) {
      case 'Up':
      case 'ArrowUp':

        break;
      case "Down":
      case "ArrowDown":

        break;
      case 'Enter':

        break;
      case 'BrowserBack':
      case 'Backspace':
        var focusedEl = NavigationManager.getFocusedEl();

        //window.close();
        break;
    }
  },

  tabChangedHandler: function (evt) {
    var tabName = evt.detail.tabName;
    //var selector = navigation.getNavigationSelector('view-contacts-list');
    //var selector = '#article-view';
    debug('tabeName -> ' + tabName);
    switch (tabName) {
      case 'webrtc-text-chat':
        document.getElementById('text-chat-container').setAttribute('role', 'heading');
        document.getElementById('video-chat-container').removeAttribute('role');
        NavigationMap.toPanel('text-chat-container');
        //OptionHelper.show('submit-message');
        WebrtcMenu.updateSKs(WebrtcMenu.submitTextMessage);
        //var focusedEl = NavigationManager.getFocusedEl();
        //NavigationManager.setFocus(focusedEl);
        //NavigationManager.setFocus(this.inputBox);
        //window.NavigationManager.switchContext(selector);
        break;

      case 'webrtc-video-chat':
        document.getElementById('video-chat-container').setAttribute('role', 'heading');
        document.getElementById('text-chat-container').removeAttribute('role');
        NavigationMap.toPanel('video-chat-container');
        WebrtcMenu.updateSKs(WebrtcMenu.webrtcVideoChat);
        //window.NavigationManager.switchContext(selector);
        break;
    }
  },

  isEmpty: function() {
    return this.empty;
  },

  getItemIndex: function(elements, id) {
    var index, length = elements.length;
    for (var i = 0; i < length; i++) {
      if (elements[i].id === id) {
        index = i;
        break;
      }
    }
    return index;
  },

  onContentChanged: function (evt) {
    var placeholderClass = 'placeholder';
    var target = evt ? evt.target : this.inputBox;
    var isEmptyMessage = !target.textContent.length;

    if (isEmptyMessage) {
      var brs = target.getElementsByTagName('br');
      // firefox will keep an extra <br> in there
      if (brs.length > 1) {
        isEmptyMessage = false;
      }
    }

    // Placeholder management
    var placeholding = target.classList.contains(placeholderClass);
    if (placeholding && !isEmptyMessage) {
      target.classList.remove(placeholderClass);
    }
    if (!placeholding && isEmptyMessage) {
      target.classList.add(placeholderClass);
    }

    debug('onContentChanged:: isEmptyMessage -> ' + isEmptyMessage);
    this.empty = isEmptyMessage;
    var sksPanel = this.clone(WebrtcMenu.submitTextMessage);
    if (!this.isEmpty()) {
      sksPanel.items.push(WebrtcMenu.skSend);
    }
    WebrtcMenu.updateSKs(sksPanel);
  },

  onMessageInputFocusChange: function thui_onMessageInputFocusChange(e) {
    this.messagesComposeForm.classList.toggle('item-focus', e.type === 'focus');
  },

  init: function () {
    navigator.mozL10n.once(function() {
      this.init_app();
      Preferences.setDefaultPerfences();
      window.addEventListener('tabChanged', this.tabChangedHandler.bind(this));
      this.messagesComposeForm = document.getElementById('messages-compose-form');
      this.inputBox = document.getElementById('messages-input');
      //NavigationManager.setFocus(this.inputBox);
      this.inputBox.addEventListener('input', this.onContentChanged.bind(this));
      this.inputBox.addEventListener('click', this.onContentChanged.bind(this));
      this.inputBox.addEventListener('focus', this.onMessageInputFocusChange.bind(this));
      this.inputBox.addEventListener('blur', this.onMessageInputFocusChange.bind(this));
      //var index = this.getItemIndex(NavigationMap.getCurrentControl().elements, 'subject-composer-input');
      //NavigationMap.setFocus(index);
      WebrtcMenu.updateSKs(WebrtcMenu.saveWebRTCPerfences);
    }.bind(this));
  }
};

window.onload = Startup.init();
