'use strict';

(function (exports) {
  var WebrtcMenu = {
    skSend: {
      name: 'Send',
      l10nId: 'send',
      priority: 1,
      method: function () {
        exports.option.hide();
        MessageHandler.sendMsg();
      }
    },

    webrtcVideoChat: {
      header: {
        l10nId: 'tcl-options'
      },
      items: [
        {
          name: 'Connect',
          l10nId: 'connect',
          priority: 1,
          method: function () {
            if(!document.getElementById('quickTip-container-background').classList.contains('hide'))
              document.getElementById('quickTip-container-background').classList.add('hide');
            if(document.getElementById('video-container-background').classList.contains('hide'))
              document.getElementById('video-container-background').classList.remove('hide');
            WebrtcMain.init();
          }
        },
        {
          name: 'Start Chat',
          l10nId: 'startChat',
          priority: 3,
          method: function () {
            WebrtcMain.startCall(true);
          }
        },
        {
          name: 'Disconnect',
          l10nId: 'disconnect',
          priority: 4,
          method: function () {
            if(Constant.eventSource != null) {
              exports.option.hide();
              WebrtcMain.closeMediaStream();
              Constant.eventSource.close();
              NavigationMap.toPanel('view-contact-form');
              WebrtcMenu.updateSKs(WebrtcMenu.saveWebRTCPerfences);
              WebrtcMenu.showToaster('Disconnection server success.', true);
            }
          }
        },
        {
          name: 'Switch Front Camera',
          l10nId: 'switch-front-Camera',
          priority: 5,
          method: function () {
            WebrtcMain.switchCameraMode('frontCameras');
          }
        },
        {
          name: 'Switch Back Camera',
          l10nId: 'switch-back-Camera',
          priority: 6,
          method: function () {
            WebrtcMain.switchCameraMode('backCameras');
          }
        },
        {
          name: 'Settings',
          l10nId: 'tcl-settings',
          priority: 7,
          method: function () {
            exports.option.hide();
            NavigationMap.toPanel('view-contact-form');
            WebrtcMenu.updateSKs(WebrtcMenu.saveWebRTCPerfences);
          }
        },
        {
          name: 'Exit',
          l10nId: 'exit',
          priority: 8,
          method: function () {
            WebrtcMain.closeMediaStream();
            window.close();
          }
        }
      ]
    },

    submitTextMessage: {
      header: {
        l10nId: 'tcl-options'
      },
      items: [
        {
          name: 'Enter',
          l10nId: 'enter',
          priority: 2,
          method: function () {
          }
        },
        {
          name: 'Start chat',
          l10nId: 'startChat',
          priority: 3,
          method: function () {
            WebrtcMain.startCall(true);
          }
        },
        {
          name: 'Disconnect',
          l10nId: 'disconnect',
          priority: 4,
          method: function () {
            if(Constant.eventSource != null) {
              exports.option.hide();
              WebrtcMain.closeMediaStream();
              Constant.eventSource.close();
              NavigationMap.toPanel('view-contact-form');
              WebrtcMenu.updateSKs(WebrtcMenu.saveWebRTCPerfences);
              WebrtcMenu.showToaster('Disconnection server success.', true);
            }
          }
        },
        {
          name: 'Settings',
          l10nId: 'tcl-settings',
          priority: 5,
          method: function () {
            exports.option.hide();
            NavigationMap.toPanel('view-contact-form');
            WebrtcMenu.updateSKs(WebrtcMenu.saveWebRTCPerfences);
          }
        },
        {
          name: 'Exit',
          l10nId: 'exit',
          priority: 6,
          method: function () {
            WebrtcMain.closeMediaStream();
            window.close();
          }
        }
      ]
    },

    saveWebRTCPerfences: {
      header: 'Select',
      items: [{
        name: 'Save',
        l10nId: 'save',
        priority: 3,
        method: function() {
          exports.option.hide();
          Preferences.savePerfences();
          NavigationMap.toPanel('video-chat-container');
          WebrtcMenu.updateSKs(WebrtcMenu.webrtcVideoChat);
        }
      }]
    },

    showToaster: function _showNotification(data, isMsg) {
      var id = null, msg = null;
      if(isMsg && !!isMsg) {
        msg = data;
      } else {
        id = data;
      }
      debug("showToaster message id -> " + id + ' msg -> ' + msg);
      var toast = {
        message: msg,
        messageL10nId: id,
        latency: 5000,
        useTransition: true
      };
      Toaster.showToast(toast);
    },

    updateSKs: function(params) {
      if (!params) {
        params = {
          header: { l10nId: 'tcl-options' },
          items: []
        };
      }

      params.items.sort(function(a, b) {
        return a.priority - b.priority;
      });

      if (exports.option) {
        exports.option.initSoftKeyPanel(params);
      } else {
        exports.option = new SoftkeyPanel(params);
      }
      exports.option.show();
    },

    init: function () {
      OptionHelper.optionParams['submit-message'] = this.submitTextMessage;
      OptionHelper.optionParams['save-preferences'] = this.saveWebRTCPerfences;
    }
  };

  exports.WebrtcMenu = WebrtcMenu;
})(window);

/*window.addEventListener('load', function () {
  WebrtcMenu.init();
});*/
