/* global LazyLoader, NavigationMap */

(function() {
  'use strict';
  var loader = LazyLoader;
  loader.load('js/navigation_map.js', function() {
    NavigationMap.init();
    if (NavigationMap.scrollVar) {
      scrollVar = NavigationMap.scrollVar;
    }
    window.dispatchEvent(new CustomEvent('moz-app-loaded'));
  });

  window.addEventListener('keydown', function(e) {
    handleKeydown(e);
  });

  var scrollVar = {
    block: 'start',
    behavior: 'smooth'
  };

  window.addEventListener('menuEvent', function(e) {
    NavigationMap && (NavigationMap.optionMenuVisible = e.detail.menuVisible);
  });

  function handleKeydown(e) {
    var el = e.target,
        next;

    if (NavigationMap && NavigationMap.lockNav(e)) {
      return;
    }

    if (e.key === 'Enter' || e.key === 'Accept') {
      handleClick(e);
    } else {
      if (!e.target.classList) {
        return;
      }
      if (!e.target.classList.contains('focus')) {
        console.warn('e.target does not have focus');
        el = document.querySelector('.focus');
      }

      next = findElementFromNavProp(el, e);
      if (next) {
        var prevFocused = document.querySelectorAll('.focus');
        if (next == prevFocused[0]) {
          return;
        }

        if (prevFocused.length > 0) {
          prevFocused[0].classList.remove('focus');
        }
        if (!NavigationMap.scrollToElement) {
          next.scrollIntoView(scrollVar);
        } else {
          NavigationMap.scrollToElement(next, e);
        }
        next.classList.add('focus');
        if (NavigationMap.ignoreFocus === null || !NavigationMap.ignoreFocus) {
          if(next.querySelector('input')) {
            next.querySelector('input').setAttribute('x-inputmode', 'input-mode-t9');
            var inputLength = next.querySelector('input').value.length;
            next.querySelector('input').setSelectionRange(inputLength, inputLength);
            next.querySelector('input').focus();
          } else {
            next.focus();
          }
        }

        document.dispatchEvent(new CustomEvent('focusChanged', {
          detail: {
            focusedElement: next
          }
        }));
      }
    }
  }

  function findElementFromNavProp(current, e) {
    if (!current || NavigationMap && NavigationMap.disableNav) {
      return null;
    }

    var style = current.style;
    var id = null;
    var handled = true;
    /*Begin: yai-3304058*/
    /*yai: when focus is on the recipient placeholder, ArrowLeft and ArrowRight is undefined, which is not right
     * create the patch for temporary*/
    if(current.classList.contains('recipient') && current.textContent.length === 0){
      if(e.key === 'ArrowLeft' || e.keyCode === e.DOM_VK_LEFT){
        id = style.getPropertyValue('--nav-left');
      }else if(e.key === 'ArrowRight' || e.keyCode === e.DOM_VK_RIGHT){
        id = style.getPropertyValue('--nav-right');
      }else if(e.key === 'ArrowUp' || e.keyCode === e.DOM_VK_UP){
        id = style.getPropertyValue('--nav-up');
      }else if(e.key === 'ArrowDown' || e.keyCode === e.DOM_VK_DOWN){
        id = style.getPropertyValue('--nav-down');
      }else if(e.key === 'Home' || e.key === 'MozHomeScree'){
        id = style.getPropertyValue('--nav-home');
      }else{
        handled = false;
      }
    }else{
      switch (e.key) {
        case 'ArrowLeft':
          id = style.getPropertyValue('--nav-left');
          break;
        case 'ArrowRight':
          id = style.getPropertyValue('--nav-right');
          break;
        case 'ArrowUp':
          id = style.getPropertyValue('--nav-up');
          break;
        case 'ArrowDown':
          id = style.getPropertyValue('--nav-down');
          break;
        case 'Home':
        case 'MozHomeScree':
          id = style.getPropertyValue('--nav-home');
          break;
        default:
          handled = false;
          break;
      }
    }
    /*End: yai-3304058*/
    if (!id) {
      return null;
    }
    if (handled) {
      e.preventDefault();
    }

    return document.querySelector('[data-nav-id="' + id + '"]');
  }

  function handleClick(e) {
    var el = document.querySelector('.focus');
    el && el.focus();

    if (NavigationMap && NavigationMap.optionMenuVisible && !e.target.classList.contains('menu-button')) {
      // workaround for case of quick click just right after option menu opening start
      var selectedMenuElement = document.querySelector('menu button.menu-button');
      selectedMenuElement && selectedMenuElement.click && selectedMenuElement.click();
    } else if (NavigationMap && NavigationMap.handleClick) {
      //costimization of click action.
      NavigationMap.handleClick(e);
    } else {
      e.target.click();
      for (var i = 0; i < e.target.children.length; i++) {
        e.target.children[i].click();
      }
    }
  }
})();
