/* global NavigationManager */

(function (exports) {
  'use strict';
  var TabNavigation = function () {

    var tablistSelector = 'gaia-tabs',
      tabpanelSelector = '[role="tabpanel"]',
      tablist,
      tabs,
      tabpanels,
      current = -1,
      tabEnabled = true; //default tab navigation is enabled

    if (!(tablist = document.querySelector(tablistSelector)) ||
      !document.querySelector(tabpanelSelector)) {
      console.warn('Tab control is not found');
      return;
    }

    tabs = tablist.querySelectorAll('button');
    tabpanels = document.querySelectorAll(tabpanelSelector);

    if (!tabs.length || !tabpanels.length || tabs.length != tabpanels.length) {
      console.warn('Invalid tab structure');
      return;
    }

    var resetSelection = function () {
      Array.prototype.forEach.call(tabs, item => item.setAttribute('aria-selected', false));
      Array.prototype.forEach.call(tabpanels, item => item.hidden = true);
    };

    var searchSelected = function () {
      return Array.prototype.find.call(tabs, item => item.getAttribute('aria-selected'));
    };

    var getCurrentTab = function () {
      return tabpanels[current].dataset.tabname;
    };

    var getIndexOfTab = function (name) {
      for (var i = 0; i < tabpanels.length; i++) {
        if (tabpanels[i].dataset.tabname === name) {
          return i;
        }
      }
      return -1;
    };

    var hideTab = function (name) {
      var ind = getIndexOfTab(name);

      if (ind >= 0) {
        tabs[ind].hidden = true;
        tabs[ind].parentElement && (tabs[ind].parentElement.hidden = true);
        if (current == ind) {
          findNextNotHiddenTab(current + 1);
        }
      }
    };

    var showTab = function (name) {
      var ind = getIndexOfTab(name);
      showTabByIndex(ind);
    };

    var showAllTabs = function () {
      for (var i = 0; i < tabs.length; i++) {
        showTabByIndex(i);
      }
    };

    function showTabByIndex(ind) {
      if (ind >= 0) {
        tabs[ind].hidden = false;
        tabs[ind].parentElement && (tabs[ind].parentElement.hidden = false);
      }
    }

    var findNextNotHiddenTab = function (index) {
      index = index % tabs.length;
      var old = index;
      while (tabs[index].hidden) {
        index = (index + 1) % tabs.length;
        if (old == index) {
          return;
        }
      }
      selectTabByIndex(index);
    };

    var findPrevNotHiddenTab = function (index) {
      index = (tabs.length + index) % tabs.length;
      var old = index;
      while (tabs[index].hidden) {
        index = (tabs.length + index - 1) % tabs.length;
        if (old == index) {
          return;
        }
      }
      selectTabByIndex(index);
    };

    var selectTab = function (name) {
      var ind = getIndexOfTab(name);

      if (ind >= 0) {
        selectTabByIndex(ind);
      }
    };

    var selectTabByIndex = function (index) {
      if (index == current) {
        return;
      }

      if (index >= tabs.length) {
        index = 0;
      } else if (index < 0) {
        index = tabs.length - 1;
      }

      if (current >= 0) {
        tabs[current].setAttribute('aria-selected', false);
        tabpanels[current].hidden = true;
      }

      tabs[index].setAttribute('aria-selected', true);
      tabpanels[index].hidden = false;
      tablist.select(index);
      current = index;

      dispatchEvent();
    };

    var keyHandler = event => {
      if (tablist.classList.contains('disabled') ||
          !~current ||
          !tabEnabled) {
        if (event.key == 'ArrowLeft' || event.key == 'ArrowRight') {
          event.preventDefault();
        }
        return;
      }
      switch (event.key) {
      case 'ArrowLeft':
        findPrevNotHiddenTab(current - 1);
        event.preventDefault();
        break;

      case 'ArrowRight':
        findNextNotHiddenTab(current + 1);
        event.preventDefault();
        break;
      }
    };

    var dispatchEvent = function () {
      window.dispatchEvent(new CustomEvent('tabChanged', {
        detail: {
          tabIndex: current,
          tabName: tabpanels[current].dataset.tabname
        }
      }));
    };

    var subscribe = function () {
      window.addEventListener('keydown', keyHandler);
    };

    var unsubscribe = function () {
      window.removeEventListener('keydown', keyHandler);
    };

    resetSelection();
    selectTabByIndex(0);
    subscribe();

    var doDisabled = function tab_doDisabled(view) {
      tabEnabled = false;
      tablist.classList.add('disabled');
    };

    var doEnabled = function tab_doEnabled(view) {
      tabEnabled = true;
      tablist.classList.remove('disabled');
    };

    return {
      'selectTab': selectTab,
      'selectTabByIndex': selectTabByIndex,
      'searchSelected': searchSelected,
      'subscribe': subscribe,
      'unsubscribe': unsubscribe,
      'getCurrentTab': getCurrentTab,
      'hideTab': hideTab,
      'showTab': showTab,
      'showAllTabs': showAllTabs,
      'disabled': doDisabled,
      'enabled': doEnabled
    };

  };

  exports.TabNavigation = TabNavigation();

})(window);
