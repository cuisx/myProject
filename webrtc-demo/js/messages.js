/**
 * Created by tclxa on 17-2-20.
 */
var MessageHandler = (function() {
  var MessageHandler = {

    /**
     * Inserts DOM node to the container respecting 'timestamp' data attribute of
     * the node to insert and sibling nodes in ascending order.
     * @param {Node} nodeToInsert DOM node to insert.
     * @param {Node} container Container DOM node to insert to.
     * @private
     */
    _insertTimestampedNodeToContainer: function(nodeToInsert, container) {
      var currentNode = container.firstElementChild,
          nodeTimestamp = nodeToInsert.dataset.timestamp;

      while (currentNode && nodeTimestamp > +currentNode.dataset.timestamp) {
        currentNode = currentNode.nextElementSibling;
      }

      // With this function, "inserting before 'null'" means "appending"
      container.insertBefore(nodeToInsert, currentNode || null);
    },

    getContentFromDOM: function getContentFromDOM(domElement) {
      var content = [];
      var node;

      for (node = domElement.firstChild; node; node = node.nextSibling) {
        // hunt for an attachment in the Map and append it
        /*var attachment = attachments.get(node);
        if (attachment) {
          content.push(attachment);
          continue;
        }*/

        var last = content.length - 1;
        var text = node.textContent;

        // Bug 877141 - contenteditable wil insert non-break spaces when
        // multiple consecutive spaces are entered, we don't want them.
        if (text) {
          text = text.replace(/\u00A0/g, ' ');
        }

        if (node.nodeName == 'BR') {
          if (node === domElement.lastChild) {
            continue;
        }
          text = '\n';
        }

        // append (if possible) text to the last entry
        if (text.length) {
          if (typeof content[last] === 'string') {
            content[last] += text;
          } else {
            content.push(text);
          }
        }
      }

      return content;
    },

    clear: function() {
      this.input.innerHTML = '<br>';
    },

    getContent: function () {
      return this.getContentFromDOM(this.input)[0];
    },

    // Adds a new grouping header if necessary (today, tomorrow, ...)
    getMessageContainer: function thui_getMessageContainer(messageTimestamp, hidden) {
      var startOfDayTimestamp = Utils.getDayDate(messageTimestamp);
      var messageDateGroup = document.getElementById('mc_' + startOfDayTimestamp);

      var header,
        messageContainer;
      if (messageDateGroup) {
        header = messageDateGroup.firstElementChild;
        messageContainer = messageDateGroup.lastElementChild;
        if (messageTimestamp < header.dataset.time) {
          header.dataset.time = messageTimestamp;
        }
        return messageContainer;
      }

      // If there is no messageContainer we have to create it
      messageDateGroup = this.tmpl.dateGroup.prepare({
        id: 'mc_' + startOfDayTimestamp,
        timestamp: startOfDayTimestamp.toString(),
        headerTimeUpdate: 'repeat',
        headerTime: messageTimestamp.toString(),
        headerDateOnly: 'true'
      }).toDocumentFragment().firstElementChild;

      header = messageDateGroup.firstElementChild;
      messageContainer = messageDateGroup.lastElementChild;

      if (hidden) {
        header.classList.add('hidden');
      } else {
        TimeHeaders.update(header);
      }

      this._insertTimestampedNodeToContainer(messageDateGroup, this.container);

      return messageContainer;
    },

    removeMessageDOM: function thui_removeMessageDOM(messageDOM) {
      var messagesContainer = messageDOM.parentNode;

      messageDOM.remove();

      // If we don't have any other messages in the list, then we remove entire
      // date group (date header + messages container).
      if (messagesContainer &&!messagesContainer.firstElementChild) {
        messagesContainer.parentNode.remove();
      }
    },

    scrollViewToBottom: function thui_scrollViewToBottom() {
      if (this.container.lastElementChild) {
        this.container.lastElementChild.scrollIntoView(false);
      }
    },

    appendMessage: function thui_appendMessage(message, hidden) {
      var timestamp = +message.timestamp;
      // look for an old message and remove it first - prevent anything from ever
      // double rendering for now
      var messageDOM = document.getElementById('message-' + message.id);

      if (messageDOM) {
        this.removeMessageDOM(messageDOM);
      }

      // build messageDOM adding the links
      return this.buildMessageDOM(message, hidden).then((messageDOM) => {
        /*if (this._stopRenderingNextStep) {
          return;
        }*/

        messageDOM.dataset.timestamp = timestamp;

        // Add to the right position
        var messageContainer = this.getMessageContainer(timestamp, hidden);
        this._insertTimestampedNodeToContainer(messageDOM, messageContainer);

        /*if (this.inEditMode) {
          this.checkInputs();
        }*/

        if (!hidden) {
          // Go to Bottom
          this.scrollViewToBottom();
        }
      });
    },

    getMessageStatusMarkup: function(status) {
      return ['read', 'delivered', 'sending', 'error'].indexOf(status) >= 0 ?
        this.tmpl.messageStatus.prepare({
          statusL10nId: 'message-delivery-status-' + status
        }) : '';
    },

    buildMessageDOM: function thui_buildMessageDOM(message, hidden) {
      var messageDOM = document.createElement('li'), bodyHTML = '';
      var messageStatus = message.delivery,
      isNotDownloaded = messageStatus === 'not-downloaded',
      isIncoming = messageStatus === 'received' || isNotDownloaded;

      // If the MMS has invalid empty content(message without attachment and
      // subject) or contains only subject, we will display corresponding message
      // and layout type in the message bubble.
      //
      // Returning attachments would be different based on gecko version:
      // null in b2g18 / empty array in master.
      var noAttachment = (message.type === 'mms' && !isNotDownloaded &&
      (message.attachments === null || message.attachments.length === 0));
      var invalidEmptyContent = (noAttachment && !message.subject);

      /*if (this.shouldShowReadStatus(message)) {
        messageStatus = 'read';
      } else if (this.shouldShowDeliveryStatus(message)) {*/
        messageStatus = 'delivered';
      //}

      var classNames = [
        'navigable', 'message', message.type, messageStatus,
        isIncoming ? 'incoming' : 'outgoing'
      ];

      if (message.type && message.type === 'mms' && message.subject) {
        classNames.push('has-subject');
      }

      if (message.type && message.type === 'sms') {
        var escapedBody = Template.escape(message.body || '');
        bodyHTML = LinkHelper.searchAndLinkClickableData(escapedBody);
      }

      if (isNotDownloaded) {
        bodyHTML = this._createNotDownloadedHTML(message, classNames);
      }

      if (invalidEmptyContent) {
        classNames = classNames.concat(['error', 'invalid-empty-content']);
      } else if (noAttachment) {
        classNames.push('no-attachment');
      }

      if (classNames.indexOf('error') >= 0) {
        messageStatus = 'error';
      } else if (classNames.indexOf('pending') >= 0) {
        messageStatus = 'pending';
      }

      messageDOM.className = classNames.join(' ');
      messageDOM.id = 'message-' + message.id;
      messageDOM.dataset.messageId = message.id;
      //messageDOM.dataset.iccId = message.iccId;
      messageDOM.setAttribute('role', 'menuitem');
      /*var simServiceId = Settings.getServiceIdByIccId(message.iccId);
      var showSimInformation = Settings.hasSeveralSim() && simServiceId !== null;*/
      var simInformationHTML = '';
      /*if (showSimInformation) {
        simInformationHTML = this.tmpl.messageSimInformation.interpolate({
          simNumberL10nArgs: JSON.stringify({ id: simServiceId + 1 })
        });
      }*/

      messageDOM.innerHTML = this.tmpl.message.interpolate({
        id: String(message.id),
        bodyHTML: bodyHTML,
        timestamp: String(message.timestamp),
        subject: String(message.subject),
        simInformationHTML: simInformationHTML,
        messageStatusHTML: ''/*this.getMessageStatusMarkup(messageStatus).toString()*/
      }, {
        safe: ['bodyHTML', 'simInformationHTML', 'messageStatusHTML']
      });

      TimeHeaders.update(messageDOM.querySelector('time'));

      var pElement = messageDOM.querySelector('p');
      if (invalidEmptyContent) {
        pElement.setAttribute('data-l10n-id', 'no-attachment-text');
      }

      return Promise.resolve(messageDOM);
    },

    // Function for handling when a new message (sent/received)
    // is detected
    onMessage: function onMessage(messageContext, state) {
      var message = {
        id: Date.now(),
        /*iccId: '4561345779',*/
        type: 'sms',
        body: messageContext,
        timestamp: Date.now(),
        delivery: state, //'received', 'sending'
        subject: 'Webrtc Test'
      };
      this.appendMessage(message);
      TimeHeaders.updateAll('header[data-time-update]');
    },

    sendMsg: function() {
      var inputBoxContext = this.getContent();
      debug('sendMessage -> ' + inputBoxContext);
      if(!Startup.isEmpty() && channel) {
        channel.send(inputBoxContext);
        this.onMessage(inputBoxContext, 'sending');
        this.clear();
      } else {
        WebrtcMenu.showToaster('channel is undefined, send message failed.', true);
      }
      Startup.onContentChanged();
    },

    receiveMsg: function(msg) {
      if(!msg) return;
      this.onMessage(msg, 'received');
      Startup.onContentChanged();
    },

    init: function () {
      // Fields with 'messages' label
      ['container', 'input'].forEach(function(id) {
        this[Utils.camelCase(id)] = document.getElementById('messages-' + id);
      }, this);

      var templateIds = [
        'message',
        'message-status',
        'date-group'
      ];
      this.tmpl = templateIds.reduce(function(tmpls, name) {
        tmpls[Utils.camelCase(name)] =
          Template('messages-' + name + '-tmpl');
        return tmpls;
      }.bind(this), {});
    }
  };
  MessageHandler.init();

  return MessageHandler;
})(window);