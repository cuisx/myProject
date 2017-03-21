/* global Navigation */

'use strict';

(function(exports) {
  const DEBUG = true;
  //container id
  const PANEL_THREAD_SETINGS = 'view-contact-form';
  const PANEL_THREAD_VIDEO = 'video-chat-container';
  const PANEL_THREAD_TEXT = 'text-chat-container';
  //option menu is not a panel, but still keep it's elements
  const OPTION_MENU = 'option-menu';
  const CHANGE_MODE = {
    none: 'none',
    added: 'added',
    removed: 'removed'
  };

  function debug(message) {
    if (DEBUG) {
      console.log('cuisx:: navigation_map.js -> ' + message);
    }
  }

  /*the classes of option menu for navigation:
   'group-menu': softkey_panel.js, softkeybar's options
   'contact-prompt': thread_ui.js,the prompt options of phone number or email
   */
  const OPTION_MENU_CLASSES = ['group-menu', 'contact-prompt'];

  var controls = {};
  var curPanel = null;
  var prevPanel = null;

  var nav_id = 0;
  var _storeFocused = null;
  var _savedId = null;
  var _threadsContainer = document.getElementById('threads-container');

  function navUpdate(elements) {
    var id = nav_id;
    var element = null;
    var len = elements.length;

    for (var i = 0; i < len; i++) {
      element = elements[i];
      element.setAttribute('data-nav-id', id);

      element.style.setProperty('--nav-left', -1); // -1: invalid ID
      element.style.setProperty('--nav-right', -1);
      element.style.setProperty('--nav-down', id + 1);
      element.style.setProperty('--nav-up', id - 1);
      element.setAttribute('tabindex', 0);
      id++;
    }

    elements[0].style.setProperty('--nav-up', id - 1);
    elements[len - 1].style.setProperty('--nav-down', nav_id);
    nav_id = id;
  }

  function navUpdateHorizontal(elements) {
    var id = 0;
    var element = null;
    var len = elements.length;

    var first = elements[0].getAttribute('data-nav-id');
    var last = elements[len - 1].getAttribute('data-nav-id');

    var up = elements[0].style.getPropertyValue('--nav-up');
    var down = elements[len - 1].style.getPropertyValue('--nav-down');

    for (var i = 0; i < len; i++) {
      element = elements[i];
      id = parseInt(element.getAttribute('data-nav-id'));
      element.style.setProperty('--nav-left', id - 1);
      element.style.setProperty('--nav-right', id + 1);
      element.style.setProperty('--nav-down', down);
      element.style.setProperty('--nav-up', up);
    }

    elements[0].style.setProperty('--nav-left', last);
    elements[len - 1].style.setProperty('--nav-right', first);
  }

  function getCurContainerId() {
    var id = null;

    // XXX, use default container, unless it's messages container.
    // _savedId will be set when navSetup.

    //if (_savedId === 'view-contact-form') {
      id = _savedId;
    //}
    debug('getCurContainerId:: id -> ' + id);
    return id;
  }

  function getCurControl() {
    var control = null;
    var id = getCurContainerId();

    if (id) {
      control = controls[id];
    }
    return control;
  }

  function getCurItem() {
    var item = null;
    var curControl = getCurControl();

    if (curControl) {
      if (curControl.index >= 0 &&
          curControl.index < curControl.elements.length) {
        item = curControl.elements[curControl.index];
      }
    }
    return item;
  }

  function sendIndexEvent(panel, index, item) {
    var evt = new CustomEvent('index-changed', {
      detail: {
        panel: panel,
        index: index,
        focusedItem: item
      },
      bubbles: true,
      cancelable: false
    });

    window.dispatchEvent(evt);
  }

  function setCurIndex(index) {
    var curControl = getCurControl();

    if (curControl) {
      if (index >= -1 && index < curControl.elements.length) {
        curControl.index = index;
        /*broadcoast change event*/
        sendIndexEvent(curPanel, index, (index == -1) ? null : curControl.elements[index]);
      }
    }
  }

  function observeChange(id) {
    var config = {
      childList: true,
      subtree: true,
      attributes: true
    };

    var observer = new MutationObserver(function(mutations) {
      var changed = CHANGE_MODE.none;
      var nodes = [];

      mutations.forEach(function(mutation) {
        if (changed == true) {
          return;
        }

        if (mutation.type == 'childList') {
          if (mutation.addedNodes.length > 0) {
            nodes = Array.prototype.slice.call(mutation.addedNodes);
            nodes.forEach(function(node) {
              if (node.classList && node.nodeName === 'LI') {
                debug('mutation: threadlist-item is added, id=' + node.id);
                changed = CHANGE_MODE.added;
              }
            });
          }
          else if (mutation.removedNodes.length > 0) {
            nodes = Array.prototype.slice.call(mutation.removedNodes);
            nodes.forEach(function(node) {
              if (node.classList && node.nodeName === 'LI') {
                debug('mutation: threadlist-item is removed, id=' + node.id);
                changed = CHANGE_MODE.removed;
              }
            });
          }
        }
      });

      if (changed != CHANGE_MODE.none) {
        NavigationMap.reset(id);

        if (changed == CHANGE_MODE.added) {
          onNodesAdded(id);
        }
        else if (changed == CHANGE_MODE.removed) {
          onNodesRemoved(id);
        }
      }
    });

    observer.observe(document.getElementById(id), config);
  }

  function onNodesAdded(containerId) {
    /*thread list is showing, and list is added*/
    debug('onNodesAdded:: curPanel -> ' + curPanel + ' -> containerId -> ' + containerId);
    if (curPanel == PANEL_THREAD_TEXT && containerId == PANEL_THREAD_TEXT) {
      //always focus on the new one
      if (window.option && window.option.menuVisible === false) {
        NavigationMap.setFocus('first');
      } else {
        //option menu is shown, just update index, not change focus
        var control = controls[containerId];
        if (control && control.elements.length > 0) {
          if (_storeFocused) {
            _storeFocused.classList.remove('hasfocused');
          }
          _storeFocused = control.elements[0];
          _storeFocused.classList.add('hasfocused');
        }
        setCurIndex(0);
      }
    }
  }

  function onNodesRemoved(containerId) {
    var control = controls[containerId];
    debug('onNodesRemoved:: curPanel -> ' + curPanel + ' -> containerId:' + containerId);

    if (!control) {
      return;
    }

    var container = document.getElementById(containerId);
    var focused = container ? container.querySelector('.focus') : null;
    var index = 0;

    /*the focused item was not removed, just update index*/
    if (focused) {
      var elements = Array.prototype.slice.call(control.elements);
      index = elements.indexOf(focused);
      if (control.index == -1) {
        debug('onNodesRemoved error: focused item was not removed, but can\'t be found');
      }
      else { /*focus was not changed, but still call setCurIndex to generate 'index-changed' event */
        setCurIndex(index);
      }
    } else { /*focused item was removed, or the background list(not current panel) was changed*/
      if (control.index >= 0 && control.index < control.elements.length) {
        /*reset the focus at the item with same index*/
        index = control.index;
      } else if (control.index >= control.elements.length) {
        /*the removed item was last none, keep focus on last one*/
        index = control.elements.length - 1;
      }

      if (getCurContainerId() == containerId) {
        /*update focus for current panel*/
        NavigationMap.setFocus(index);
      } else {
        /*for the background changed list, only update index*/
        control.index = index;
      }
    }
  }

  function optionMenu() {
    NavigationMap.optionReset();
    document.removeEventListener('transitionend', optionMenu);
  }

  function recoverFocus() {
    if (_storeFocused) {
      _storeFocused.classList.remove('hasfocused');
      _storeFocused.classList.add('focus');
      _storeFocused.focus();
      window.focus();
    }
    document.removeEventListener('transitionend', recoverFocus);
  }

  function observeOption() {
    var config = {
      attributes: true,
      chatacterData: true,
      subtree: true,
    };

    var observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.attributeName == 'class') {
          var contained = false;
          /*check if the classes of option menu is contained*/
          OPTION_MENU_CLASSES.forEach(function(optClass) {
            if (mutation.target.classList.contains(optClass)) {
              contained = true;
            }
          });

          if (!contained) {
            return;
          }

          if (mutation.target.classList.contains('visible')) {
            mutation.target.id = OPTION_MENU;  //assign id to option menu for navSetup
            _storeFocused = document.querySelector('.focus');
            if (_storeFocused) {
              _storeFocused.classList.add('hasfocused');
            }
            document.addEventListener('transitionend', optionMenu);
          }
          else { //menu is closed
            document.addEventListener('transitionend', recoverFocus);
          }
        }
      });
    });

    observer.observe(document.body, config);
  }

  /* yan.ai after input a recipient, set the focus to the end of placeholder*/
  function getRecipientPlaceholderIndex(aControls) {
    var length = aControls.elements.length - 1;

    for(var i = length; i>=0; i--){
      if(aControls.elements[i].classList.contains('recipient')){
        return i;
      }
    }
    return 0;
  }

  var NavigationMap = {
    init: function _init() {
      window.addEventListener('moz-app-loaded', function(e) {
        //NavigationMap.reset(THREAD_CONTAINER);
        NavigationMap.toPanel(PANEL_THREAD_SETINGS);
        debug('init curPanel -> ' + curPanel);
        /*if (curPanel == PANEL_THREAD_SETINGS) {
          NavigationMap.setFocus('first');
        }*/

        observeChange(PANEL_THREAD_SETINGS);
        observeChange(PANEL_THREAD_VIDEO);
        observeChange(PANEL_THREAD_TEXT);
      });

      document.addEventListener('focusChanged', function(e) {
        var focusedItem = e.detail.focusedElement;
        debug('Received event focusChanged: id=' + (focusedItem ? focusedItem.id : null));

        var curControl = getCurControl();
        if (curControl && curControl.elements) {
          /*convert to an array*/
          var elements = Array.prototype.slice.call(curControl.elements);
          /*find the index of focused item in current control*/
          var index = elements.indexOf(focusedItem);
          if (index >= 0) {
            /*update index*/
            setCurIndex(index);
            debug('current.index updated is: ' + index);
          }
        }

        window.dispatchEvent(new CustomEvent('message-focusChanged', {
          bubbles: true,
          cancelable: false
        }));
      });

      observeOption();
    },

    /*set focus for current panel*/
    setFocus: function _setFocus(id) {
      debug('setFocus: curPanel=' + curPanel + ', id=' + id);
      if (!curPanel) {
        return;
      }

      var curControl = getCurControl();
      if (!curControl) {
        debug('setFocus failed!');
        return;
      }

      debug('curIndex=' + curControl.index + ', length=' + curControl.elements.length);

      id = id || 0;
      id = (id == 'first') ? 0 :
           ((id == 'last') ? curControl.elements.length-1 :
             ((id == 'errorEmail') ? curControl.elements.length-3 :
               (id == 'recipientPlaceholder') ? getRecipientPlaceholderIndex(curControl) :id));/*add by yai*/

      if (id >= 0 && id < curControl.elements.length) {
        /*remove current focus, only one element has focus */
        var focused = document.querySelectorAll('.focus');
        for (var i = 0; i < focused.length; i++) {
          focused[i].classList.remove('focus');
        }

        var toFocused = curControl.elements[id];
        toFocused.setAttribute('tabindex', 1);
        toFocused.classList.add('focus');

        debug('setFocus curPanel -> ' + curPanel);
        if(toFocused.querySelector('input')) {
          toFocused.querySelector('input').setAttribute('x-inputmode', 'input-mode-t9');
          var inputLength = toFocused.querySelector('input').value.length;
          toFocused.querySelector('input').setSelectionRange(inputLength, inputLength);
          toFocused.querySelector('input').focus();
        } else {
          toFocused.focus();
        }
        toFocused.scrollIntoView();
      }

      //id may be -1
      setCurIndex(id);
      window.dispatchEvent(new CustomEvent('message-focusChanged', {
        bubbles: true,
        cancelable: false
      }));
    },

    updateFocus: function() {
      document.activeElement.classList.add('focus');
    },

    /*setup navigation for the items that query from a container.
     @paramters:
     containerId: the id of the container element, undefined: coantainer = body
     query: the condition to query the items
     */
    navSetup: function _setup(containerId, query) {

      _savedId = containerId;
      var elements = [];

      var container = (containerId === undefined) ? document.body :
          (document.getElementById(containerId) || document.querySelector(containerId));

      if (containerId == OPTION_MENU) {
        const MAIN_MENU = 'menu#mainmenu';
        container = document.querySelector(MAIN_MENU);
      }

      if (container && query) {
        elements = container.querySelectorAll(query);
        if (elements.length > 0) {
          navUpdate(elements);
        }

        var recipients = container.querySelectorAll(query + '.recipient');
        if (recipients.length > 0) {
          navUpdateHorizontal(recipients, true);
        }
      }

      if (containerId && elements) {
        if (!controls[containerId]) {
          controls[containerId] = {};
          controls[containerId].index = (elements.length > 0) ? 0 : -1;
        }
        controls[containerId].elements = elements;
      }
    },

    reset: function _reset(id) {
      debug('NavigationMap reset: id=' + id);
      var query = '.navigable:not([hidden])';
      if (id === 'messages-container') {
        query = 'li' + query;
      }
      this.navSetup(id, query);
    },

    /*option menu*/
    optionReset: function _reset() {
      debug('optionReset');
      const SUB_MENU = 'menu[data-subtype="submenu"]';
      const MENU_BUTTON = '.menu-button';
      var i = 0;

      this.navSetup(OPTION_MENU, MENU_BUTTON);

      //set navigation for submenu
      var submenu = document.querySelectorAll(SUB_MENU);
      for (i = 0; i < submenu.length; i++) {
        NavigationMap.navSetup('#' + submenu[i].id, MENU_BUTTON);
      }

      /*remove current focus, only one element has focus */
      var focused = document.querySelectorAll('.focus');
      for (i = 0; i < focused.length; i++) {
        focused[i].classList.remove('focus');
      }

      var toFocused = controls[OPTION_MENU].elements[0];
      if (toFocused) {
        toFocused.setAttribute('tabindex', 1);
        toFocused.classList.add('focus');

        toFocused.focus();
        window.focus();
      }
    },

    /*get the focused item (element)*/
    getCurrentItem: function _currentItem() {
      return getCurItem();
    },

    /*return current control(the navigable elements of current shown panel)*/
    getCurrentControl: function _currentControl() {
      return getCurControl();
    },

    onPanelChanged: function _panelChanged(from, to, args) {
      console.log("onPanelChanged: " + from + " --> " + to + ", args:" + args);
      curPanel = to; prevPanel = curPanel;
      debug('toPanel from-to -> ' + from + " -> " + to);
      switch (to) {
        case PANEL_THREAD_SETINGS:
          this.reset(PANEL_THREAD_SETINGS);
          setTimeout(function() {
            var control = getCurControl();
            debug('control.index -> ' + control.index);
            this.setFocus((control && (control.index != -1)) ? control.index : 0);
            //this.setFocus(0);
          }.bind(this), 500);
          break;
        case PANEL_THREAD_VIDEO:
          this.reset(PANEL_THREAD_VIDEO);
          setTimeout(function() {
            var control = getCurControl();
            debug('control.index -> ' + control.index);
            this.setFocus((control && (control.index != -1)) ? control.index : 0);
          }.bind(this), 500);
          break;
        case PANEL_THREAD_TEXT:
          this.reset(PANEL_THREAD_TEXT);
          setTimeout(function() {
            var control = getCurControl();
            debug('control.index -> ' + control.index);
            this.setFocus((control && (control.index != -1)) ? control.index : 0);
          }.bind(this), 500);
          break;
        default:
          setTimeout(function() {
            var control = getCurControl();
            if (control && control.elements.length > 0) {
              this.setFocus((control.index == -1) ? 0 : control.index);
            }
          }.bind(this), 500);
          break;
      }
    },

    toPanel: function _toPanel(panel, args) {
      debug('toPanel:: prevPanel -> ' + prevPanel + '-> panel -> ' + panel);
      var nextPanelMenu = document.getElementById(panel);
      var prePanelMenu = document.getElementById(prevPanel) || null;
      if(prePanelMenu && !prePanelMenu.classList.contains('hide')) {
        document.getElementById(prevPanel).classList.add('hide');
      }
      if(nextPanelMenu && nextPanelMenu.classList.contains('hide')) {
        document.getElementById(panel).classList.remove('hide');
      }
      if(prevPanel == panel) return;
      this.onPanelChanged(prevPanel, panel, args);
    },

    scrollToElement: function _scroll(element, evt) {
      const SUB_HEADER_HEIGHT = 24;
      var alignToTop = false;

      if (evt.key === 'ArrowUp' || element.classList.contains('message') ||
          element.parentElement.classList.contains('message-content-body')) {
        alignToTop = true;
      }
      element.scrollIntoView(alignToTop);

      // adjust scroll top for sticky header, when press 'ArrowUp' in list view
      // we think there's overlap if offset top of element is less than container's
      // scroll top plus 1/2 of element's height.
      if (evt.key === 'ArrowUp' && element.classList.contains('threadlist-item')) {
        if (element.offsetTop <= _threadsContainer.scrollTop + element.offsetHeight / 2) {
          _threadsContainer.scrollTop -= SUB_HEADER_HEIGHT;
        }
      }
    },

    handleClick: function(evt) {
      if (evt.target.id === 'messages-input') {
        var currentFocus = document.querySelector('.focus');
        if (currentFocus.nodeName == 'IFRAME') {
          currentFocus.click();
        }
        return;
      }
      evt.target.click();
      for (var i = 0; i < evt.target.children.length; i++) {
        evt.target.children[i].click();
      }
    },

    lockNav: function(e) {
      // When message list height is 200px or above, we should lock navigation to
      // the list item to show message content completely. And later if we nav
      // to less than 100px left, it's fine to jump to another message.
      function inMessageElement(key) {
        const MIN_IN_ELEMNT_HEIGHT = 200;
        const MAX_BOTTOM_HEIGHT = 100;
        var current = document.activeElement;

        // Not a message li.
        if (current.tagName !== 'LI' || !current.classList.contains('message')) {
          return false;
        }

        var currentOffsetHeight = current.offsetHeight;
        var currentOffsetTop = current.offsetTop;

        var container = document.getElementById('messages-container');
        var containerTop = container.scrollTop;
        var containerClientHeight = container.clientHeight;
        var containerScrollHeight = container.scrollHeight;

        if (currentOffsetHeight > MIN_IN_ELEMNT_HEIGHT) {
          if (key === 'ArrowDown') {
            if (containerTop < currentOffsetHeight + currentOffsetTop - MAX_BOTTOM_HEIGHT &&
                containerTop + containerClientHeight < containerScrollHeight) {
              return true;
            }
          } else if (key === 'ArrowUp') {
            if (containerTop > currentOffsetTop) {
              return true;
            }
          }
        }
        return false;
      }

      if (this.currentActivatedLength > 0 || this.lockNavigation) {
        return true;
      }

      if (document.activeElement.type === 'select-one') {
        return true;
      }

      return (inMessageElement(e.key));
    }
  };

  exports.NavigationMap = NavigationMap;

})(window);
