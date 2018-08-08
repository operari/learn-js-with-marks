/**
 * @license
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * A component handler interface using the revealing module design pattern.
 * More details on this design pattern here:
 * https://github.com/jasonmayes/mdl-component-design-pattern
 *
 * @author Jason Mayes
 */
/* exported componentHandler */

// Pre-defining the componentHandler interface, for closure documentation and
// static verification.
var componentHandler = {
  /**
   * Searches existing DOM for elements of our component type and upgrades them
   * if they have not already been upgraded.
   *
   * @param {string=} optJsClass the programatic name of the element class we
   * need to create a new instance of.
   * @param {string=} optCssClass the name of the CSS class elements of this
   * type will have.
   */
  upgradeDom: function(optJsClass, optCssClass) {},
  /**
   * Upgrades a specific element rather than all in the DOM.
   *
   * @param {!Element} element The element we wish to upgrade.
   * @param {string=} optJsClass Optional name of the class we want to upgrade
   * the element to.
   */
  upgradeElement: function(element, optJsClass) {},
  /**
   * Upgrades a specific list of elements rather than all in the DOM.
   *
   * @param {!Element|!Array<!Element>|!NodeList|!HTMLCollection} elements
   * The elements we wish to upgrade.
   */
  upgradeElements: function(elements) {},
  /**
   * Upgrades all registered components found in the current DOM. This is
   * automatically called on window load.
   */
  upgradeAllRegistered: function() {},
  /**
   * Allows user to be alerted to any upgrades that are performed for a given
   * component type
   *
   * @param {string} jsClass The class name of the MDL component we wish
   * to hook into for any upgrades performed.
   * @param {function(!HTMLElement)} callback The function to call upon an
   * upgrade. This function should expect 1 parameter - the HTMLElement which
   * got upgraded.
   */
  registerUpgradedCallback: function(jsClass, callback) {},
  /**
   * Registers a class for future use and attempts to upgrade existing DOM.
   *
   * @param {componentHandler.ComponentConfigPublic} config the registration configuration
   */
  register: function(config) {},
  /**
   * Downgrade either a given node, an array of nodes, or a NodeList.
   *
   * @param {!Node|!Array<!Node>|!NodeList} nodes
   */
  downgradeElements: function(nodes) {}
};

componentHandler = (function() {
  'use strict';

  /** @type {!Array<componentHandler.ComponentConfig>} */
  var registeredComponents_ = [];

  /** @type {!Array<componentHandler.Component>} */
  var createdComponents_ = [];

  var componentConfigProperty_ = 'mdlComponentConfigInternal_';

  /**
   * Searches registered components for a class we are interested in using.
   * Optionally replaces a match with passed object if specified.
   *
   * @param {string} name The name of a class we want to use.
   * @param {componentHandler.ComponentConfig=} optReplace Optional object to replace match with.
   * @return {!Object|boolean}
   * @private
   */
  function findRegisteredClass_(name, optReplace) {
    for (var i = 0; i < registeredComponents_.length; i++) {
      if (registeredComponents_[i].className === name) {
        if (typeof optReplace !== 'undefined') {
          registeredComponents_[i] = optReplace;
        }
        return registeredComponents_[i];
      }
    }
    return false;
  }

  /**
   * Returns an array of the classNames of the upgraded classes on the element.
   *
   * @param {!Element} element The element to fetch data from.
   * @return {!Array<string>}
   * @private
   */
  function getUpgradedListOfElement_(element) {
    var dataUpgraded = element.getAttribute('data-upgraded');
    // Use `['']` as default value to conform the `,name,name...` style.
    return dataUpgraded === null ? [''] : dataUpgraded.split(',');
  }

  /**
   * Returns true if the given element has already been upgraded for the given
   * class.
   *
   * @param {!Element} element The element we want to check.
   * @param {string} jsClass The class to check for.
   * @returns {boolean}
   * @private
   */
  function isElementUpgraded_(element, jsClass) {
    var upgradedList = getUpgradedListOfElement_(element);
    return upgradedList.indexOf(jsClass) !== -1;
  }

  /**
   * Create an event object.
   *
   * @param {string} eventType The type name of the event.
   * @param {boolean} bubbles Whether the event should bubble up the DOM.
   * @param {boolean} cancelable Whether the event can be canceled.
   * @returns {!Event}
   */
  function createEvent_(eventType, bubbles, cancelable) {
    if ('CustomEvent' in window && typeof window.CustomEvent === 'function') {
      return new CustomEvent(eventType, {
        bubbles: bubbles,
        cancelable: cancelable
      });
    } else {
      var ev = document.createEvent('Events');
      ev.initEvent(eventType, bubbles, cancelable);
      return ev;
    }
  }

  /**
   * Searches existing DOM for elements of our component type and upgrades them
   * if they have not already been upgraded.
   *
   * @param {string=} optJsClass the programatic name of the element class we
   * need to create a new instance of.
   * @param {string=} optCssClass the name of the CSS class elements of this
   * type will have.
   */
  function upgradeDomInternal(optJsClass, optCssClass) {
    if (typeof optJsClass === 'undefined' &&
        typeof optCssClass === 'undefined') {
      for (var i = 0; i < registeredComponents_.length; i++) {
        upgradeDomInternal(registeredComponents_[i].className,
            registeredComponents_[i].cssClass);
      }
    } else {
      var jsClass = /** @type {string} */ (optJsClass);
      if (typeof optCssClass === 'undefined') {
        var registeredClass = findRegisteredClass_(jsClass);
        if (registeredClass) {
          optCssClass = registeredClass.cssClass;
        }
      }

      var elements = document.querySelectorAll('.' + optCssClass);
      for (var n = 0; n < elements.length; n++) {
        upgradeElementInternal(elements[n], jsClass);
      }
    }
  }

  /**
   * Upgrades a specific element rather than all in the DOM.
   *
   * @param {!Element} element The element we wish to upgrade.
   * @param {string=} optJsClass Optional name of the class we want to upgrade
   * the element to.
   */
  function upgradeElementInternal(element, optJsClass) {
    // Verify argument type.
    if (!(typeof element === 'object' && element instanceof Element)) {
      throw new Error('Invalid argument provided to upgrade MDL element.');
    }
    // Allow upgrade to be canceled by canceling emitted event.
    var upgradingEv = createEvent_('mdl-componentupgrading', true, true);
    element.dispatchEvent(upgradingEv);
    if (upgradingEv.defaultPrevented) {
      return;
    }

    var upgradedList = getUpgradedListOfElement_(element);
    var classesToUpgrade = [];
    // If jsClass is not provided scan the registered components to find the
    // ones matching the element's CSS classList.
    if (!optJsClass) {
      var classList = element.classList;
      registeredComponents_.forEach(function(component) {
        // Match CSS & Not to be upgraded & Not upgraded.
        if (classList.contains(component.cssClass) &&
            classesToUpgrade.indexOf(component) === -1 &&
            !isElementUpgraded_(element, component.className)) {
          classesToUpgrade.push(component);
        }
      });
    } else if (!isElementUpgraded_(element, optJsClass)) {
      classesToUpgrade.push(findRegisteredClass_(optJsClass));
    }

    // Upgrade the element for each classes.
    for (var i = 0, n = classesToUpgrade.length, registeredClass; i < n; i++) {
      registeredClass = classesToUpgrade[i];
      if (registeredClass) {
        // Mark element as upgraded.
        upgradedList.push(registeredClass.className);
        element.setAttribute('data-upgraded', upgradedList.join(','));
        var instance = new registeredClass.classConstructor(element);
        instance[componentConfigProperty_] = registeredClass;
        createdComponents_.push(instance);
        // Call any callbacks the user has registered with this component type.
        for (var j = 0, m = registeredClass.callbacks.length; j < m; j++) {
          registeredClass.callbacks[j](element);
        }

        if (registeredClass.widget) {
          // Assign per element instance for control over API
          element[registeredClass.className] = instance;
        }
      } else {
        throw new Error(
          'Unable to find a registered component for the given class.');
      }

      var upgradedEv = createEvent_('mdl-componentupgraded', true, false);
      element.dispatchEvent(upgradedEv);
    }
  }

  /**
   * Upgrades a specific list of elements rather than all in the DOM.
   *
   * @param {!Element|!Array<!Element>|!NodeList|!HTMLCollection} elements
   * The elements we wish to upgrade.
   */
  function upgradeElementsInternal(elements) {
    if (!Array.isArray(elements)) {
      if (elements instanceof Element) {
        elements = [elements];
      } else {
        elements = Array.prototype.slice.call(elements);
      }
    }
    for (var i = 0, n = elements.length, element; i < n; i++) {
      element = elements[i];
      if (element instanceof HTMLElement) {
        upgradeElementInternal(element);
        if (element.children.length > 0) {
          upgradeElementsInternal(element.children);
        }
      }
    }
  }

  /**
   * Registers a class for future use and attempts to upgrade existing DOM.
   *
   * @param {componentHandler.ComponentConfigPublic} config
   */
  function registerInternal(config) {
    // In order to support both Closure-compiled and uncompiled code accessing
    // this method, we need to allow for both the dot and array syntax for
    // property access. You'll therefore see the `foo.bar || foo['bar']`
    // pattern repeated across this method.
    var widgetMissing = (typeof config.widget === 'undefined' &&
        typeof config['widget'] === 'undefined');
    var widget = true;

    if (!widgetMissing) {
      widget = config.widget || config['widget'];
    }

    var newConfig = /** @type {componentHandler.ComponentConfig} */ ({
      classConstructor: config.constructor || config['constructor'],
      className: config.classAsString || config['classAsString'],
      cssClass: config.cssClass || config['cssClass'],
      widget: widget,
      callbacks: []
    });

    registeredComponents_.forEach(function(item) {
      if (item.cssClass === newConfig.cssClass) {
        throw new Error('The provided cssClass has already been registered: ' + item.cssClass);
      }
      if (item.className === newConfig.className) {
        throw new Error('The provided className has already been registered');
      }
    });

    if (config.constructor.prototype
        .hasOwnProperty(componentConfigProperty_)) {
      throw new Error(
          'MDL component classes must not have ' + componentConfigProperty_ +
          ' defined as a property.');
    }

    var found = findRegisteredClass_(config.classAsString, newConfig);

    if (!found) {
      registeredComponents_.push(newConfig);
    }
  }

  /**
   * Allows user to be alerted to any upgrades that are performed for a given
   * component type
   *
   * @param {string} jsClass The class name of the MDL component we wish
   * to hook into for any upgrades performed.
   * @param {function(!HTMLElement)} callback The function to call upon an
   * upgrade. This function should expect 1 parameter - the HTMLElement which
   * got upgraded.
   */
  function registerUpgradedCallbackInternal(jsClass, callback) {
    var regClass = findRegisteredClass_(jsClass);
    if (regClass) {
      regClass.callbacks.push(callback);
    }
  }

  /**
   * Upgrades all registered components found in the current DOM. This is
   * automatically called on window load.
   */
  function upgradeAllRegisteredInternal() {
    for (var n = 0; n < registeredComponents_.length; n++) {
      upgradeDomInternal(registeredComponents_[n].className);
    }
  }

  /**
   * Check the component for the downgrade method.
   * Execute if found.
   * Remove component from createdComponents list.
   *
   * @param {?componentHandler.Component} component
   */
  function deconstructComponentInternal(component) {
    if (component) {
      var componentIndex = createdComponents_.indexOf(component);
      createdComponents_.splice(componentIndex, 1);

      var upgrades = component.element_.getAttribute('data-upgraded').split(',');
      var componentPlace = upgrades.indexOf(component[componentConfigProperty_].classAsString);
      upgrades.splice(componentPlace, 1);
      component.element_.setAttribute('data-upgraded', upgrades.join(','));

      var ev = createEvent_('mdl-componentdowngraded', true, false);
      component.element_.dispatchEvent(ev);
    }
  }

  /**
   * Downgrade either a given node, an array of nodes, or a NodeList.
   *
   * @param {!Node|!Array<!Node>|!NodeList} nodes
   */
  function downgradeNodesInternal(nodes) {
    /**
     * Auxiliary function to downgrade a single node.
     * @param  {!Node} node the node to be downgraded
     */
    var downgradeNode = function(node) {
      createdComponents_.filter(function(item) {
        return item.element_ === node;
      }).forEach(deconstructComponentInternal);
    };
    if (nodes instanceof Array || nodes instanceof NodeList) {
      for (var n = 0; n < nodes.length; n++) {
        downgradeNode(nodes[n]);
      }
    } else if (nodes instanceof Node) {
      downgradeNode(nodes);
    } else {
      throw new Error('Invalid argument provided to downgrade MDL nodes.');
    }
  }

  // Now return the functions that should be made public with their publicly
  // facing names...
  return {
    upgradeDom: upgradeDomInternal,
    upgradeElement: upgradeElementInternal,
    upgradeElements: upgradeElementsInternal,
    upgradeAllRegistered: upgradeAllRegisteredInternal,
    registerUpgradedCallback: registerUpgradedCallbackInternal,
    register: registerInternal,
    downgradeElements: downgradeNodesInternal
  };
})();

/**
 * Describes the type of a registered component type managed by
 * componentHandler. Provided for benefit of the Closure compiler.
 *
 * @typedef {{
 *   constructor: Function,
 *   classAsString: string,
 *   cssClass: string,
 *   widget: (string|boolean|undefined)
 * }}
 */
componentHandler.ComponentConfigPublic;  // jshint ignore:line

/**
 * Describes the type of a registered component type managed by
 * componentHandler. Provided for benefit of the Closure compiler.
 *
 * @typedef {{
 *   constructor: !Function,
 *   className: string,
 *   cssClass: string,
 *   widget: (string|boolean),
 *   callbacks: !Array<function(!HTMLElement)>
 * }}
 */
componentHandler.ComponentConfig;  // jshint ignore:line

/**
 * Created component (i.e., upgraded element) type as managed by
 * componentHandler. Provided for benefit of the Closure compiler.
 *
 * @typedef {{
 *   element_: !HTMLElement,
 *   className: string,
 *   classAsString: string,
 *   cssClass: string,
 *   widget: string
 * }}
 */
componentHandler.Component;  // jshint ignore:line

// Export all symbols, for the benefit of Closure compiler.
// No effect on uncompiled code.
componentHandler['upgradeDom'] = componentHandler.upgradeDom;
componentHandler['upgradeElement'] = componentHandler.upgradeElement;
componentHandler['upgradeElements'] = componentHandler.upgradeElements;
componentHandler['upgradeAllRegistered'] =
    componentHandler.upgradeAllRegistered;
componentHandler['registerUpgradedCallback'] =
    componentHandler.registerUpgradedCallback;
componentHandler['register'] = componentHandler.register;
componentHandler['downgradeElements'] = componentHandler.downgradeElements;
window.componentHandler = componentHandler;
window['componentHandler'] = componentHandler;

window.addEventListener('load', function() {
  'use strict';

  /**
   * Performs a "Cutting the mustard" test. If the browser supports the features
   * tested, adds a mdl-js class to the <html> element. It then upgrades all MDL
   * components requiring JavaScript.
   */
  if ('classList' in document.createElement('div') &&
      'querySelector' in document &&
      'addEventListener' in window && Array.prototype.forEach) {
    document.documentElement.classList.add('mdl-js');
    componentHandler.upgradeAllRegistered();
  } else {
    /**
     * Dummy function to avoid JS errors.
     */
    componentHandler.upgradeElement = function() {};
    /**
     * Dummy function to avoid JS errors.
     */
    componentHandler.register = function() {};
  }
});

(function() {
  'use strict';

  /**
   * Class constructor for Select field MDL component.
   * Implements custom MDL component design pattern not defined yet.
   *
   * @constructor
   * @param {HTMLElement} element The element that will be upgraded.
   */
  var MaterialSelectfield = function MaterialSelectfield(element) {
    this.element_ = element;
    // Initialize instance.
    this.init();
  };
  window['MaterialSelectfield'] = MaterialSelectfield;

  MaterialSelectfield.prototype.Constant_ = {
    // None for now
  };

  MaterialSelectfield.prototype.CssClasses_ = {
    LABEL: 'mdl-selectfield__label',
    SELECT: 'mdl-selectfield__select',
    IS_DIRTY: 'is-dirty',
    IS_FOCUSED: 'is-focused',
    IS_DISABLED: 'is-disabled',
    IS_INVALID: 'is-invalid',
    IS_UPGRADED: 'is-upgraded'
  };

  /**
   * Handle focus.
   *
   * @param {Event} event The event that fired.
   * @private
   */
  MaterialSelectfield.prototype.onFocus_ = function(event) {
    this.element_.classList.add(this.CssClasses_.IS_FOCUSED);
  };

  /**
   * Handle lost focus.
   *
   * @param {Event} event The event that fired.
   * @private
   */
  MaterialSelectfield.prototype.onBlur_ = function(event) {
    this.element_.classList.remove(this.CssClasses_.IS_FOCUSED);
  };

  /**
   * Handle reset event from outside.
   *
   * @param {Event} event The event that fired.
   * @private
   */
  MaterialSelectfield.prototype.onReset_ = function(event) {
    this.updateClasses_();
  };

  /**
   * Handle class updates.
   *
   * @private
   */
  MaterialSelectfield.prototype.updateClasses_ = function() {
    this.checkDisabled();
    this.checkValidity();
    this.checkDirty();
  };

  // Public methods.

  /**
   * Check the disabled state and update field accordingly.
   *
   * @public
   */
  MaterialSelectfield.prototype.checkDisabled = function() {
    if (this.select_.disabled) {
      this.element_.classList.add(this.CssClasses_.IS_DISABLED);
    } else {
      this.element_.classList.remove(this.CssClasses_.IS_DISABLED);
    }
  };
  MaterialSelectfield.prototype['checkDisabled'] = MaterialSelectfield.prototype.checkDisabled;

  /**
   * Check the validity state and update field accordingly.
   *
   * @public
   */
  MaterialSelectfield.prototype.checkValidity = function() {
    if (this.select_.validity.valid) {
      this.element_.classList.remove(this.CssClasses_.IS_INVALID);
    } else {
      this.element_.classList.add(this.CssClasses_.IS_INVALID);
    }
  };
  MaterialSelectfield.prototype['checkValidity'] = MaterialSelectfield.prototype.checkValidity;

  /**
   * Check the dirty state and update field accordingly.
   *
   * @public
   */
  MaterialSelectfield.prototype.checkDirty = function() {
    if (this.select_.value && this.select_.value.length > 0) {
      this.element_.classList.add(this.CssClasses_.IS_DIRTY);
    } else {
      this.element_.classList.remove(this.CssClasses_.IS_DIRTY);
    }
  };
  MaterialSelectfield.prototype['checkDirty'] = MaterialSelectfield.prototype.checkDirty;

  /**
   * Enable select field.
   *
   * @public
   */
  MaterialSelectfield.prototype.disable = function() {
    this.select_.disabled = true;
    this.updateClasses_();
  };
  MaterialSelectfield.prototype['disable'] = MaterialSelectfield.prototype.disable;

  /**
   * Enable select field.
   *
   * @public
   */
  MaterialSelectfield.prototype.enable = function() {
    this.select_.disabled = false;
    this.updateClasses_();
  };
  MaterialSelectfield.prototype['enable'] = MaterialSelectfield.prototype.enable;

  /**
   * Update select field value.
   *
   * @param {string} value The value to which to set the control (optional).
   * @public
   */
  MaterialSelectfield.prototype.change = function(value) {
    if (value) {
      this.select_.value = value;
    }
    this.updateClasses_();
  };
  MaterialSelectfield.prototype['change'] = MaterialSelectfield.prototype.change;

  /**
   * Initialize element.
   */
  MaterialSelectfield.prototype.init = function() {
    if (this.element_) {
      this.label_ = this.element_.querySelector('.' + this.CssClasses_.LABEL);
      this.select_ = this.element_.querySelector('.' + this.CssClasses_.SELECT);

      if (this.select_) {
        this.boundUpdateClassesHandler = this.updateClasses_.bind(this);
        this.boundFocusHandler = this.onFocus_.bind(this);
        this.boundBlurHandler = this.onBlur_.bind(this);
        this.boundResetHandler = this.onReset_.bind(this);
        this.select_.addEventListener('change', this.boundUpdateClassesHandler);
        this.select_.addEventListener('focus', this.boundFocusHandler);
        this.select_.addEventListener('blur', this.boundBlurHandler);
        this.select_.addEventListener('reset', this.boundResetHandler);

        var invalid = this.element_.classList
          .contains(this.CssClasses_.IS_INVALID);
        this.updateClasses_();
        this.element_.classList.add(this.CssClasses_.IS_UPGRADED);
        if (invalid) {
          this.element_.classList.add(this.CssClasses_.IS_INVALID);
        }
      }
    }
  };

  /**
   * Downgrade the component
   *
   * @private
   */
  MaterialSelectfield.prototype.mdlDowngrade_ = function() {
    this.select_.removeEventListener('change', this.boundUpdateClassesHandler);
    this.select_.removeEventListener('focus', this.boundFocusHandler);
    this.select_.removeEventListener('blur', this.boundBlurHandler);
    this.select_.removeEventListener('reset', this.boundResetHandler);
  };

  // The component registers itself. It can assume componentHandler is available
  // in the global scope.
  componentHandler.register({
    constructor: MaterialSelectfield,
    classAsString: 'MaterialSelectfield',
    cssClass: 'mdl-js-selectfield',
    widget: true
  });
})();

/**
 * @license
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
(function() {
  'use strict';

  /**
   * Class constructor for Tooltip MDL component.
   * Implements MDL component design pattern defined at:
   * https://github.com/jasonmayes/mdl-component-design-pattern
   *
   * @constructor
   * @param {HTMLElement} element The element that will be upgraded.
   */
  var MaterialTooltip = function MaterialTooltip(element) {
    this.element_ = element;

    // Initialize instance.
    this.init();
  };
  window['MaterialTooltip'] = MaterialTooltip;

  /**
   * Store constants in one place so they can be updated easily.
   *
   * @enum {string | number}
   * @private
   */
  MaterialTooltip.prototype.Constant_ = {
    // None for now.
  };

  /**
   * Store strings for class names defined by this component that are used in
   * JavaScript. This allows us to simply change it in one place should we
   * decide to modify at a later date.
   *
   * @enum {string}
   * @private
   */
  MaterialTooltip.prototype.CssClasses_ = {
    IS_ACTIVE: 'is-active',
    BOTTOM: 'mdl-tooltip--bottom',
    LEFT: 'mdl-tooltip--left',
    RIGHT: 'mdl-tooltip--right',
    TOP: 'mdl-tooltip--top'
  };

  /**
   * Handle mouseenter for tooltip.
   *
   * @param {Event} event The event that fired.
   * @private
   */
  MaterialTooltip.prototype.handleMouseEnter_ = function(event) {
    var props = event.target.getBoundingClientRect();
    var left = props.left + (props.width / 2);
    var top = props.top + (props.height / 2);
    var marginLeft = -1 * (this.element_.offsetWidth / 2);
    var marginTop = -1 * (this.element_.offsetHeight / 2);

    if (this.element_.classList.contains(this.CssClasses_.LEFT) || this.element_.classList.contains(this.CssClasses_.RIGHT)) {
      left = (props.width / 2);
      if (top + marginTop < 0) {
        this.element_.style.top = '0';
        this.element_.style.marginTop = '0';
      } else {
        this.element_.style.top = top + 'px';
        this.element_.style.marginTop = marginTop + 'px';
      }
    } else {
      if (left + marginLeft < 0) {
        this.element_.style.left = '0';
        this.element_.style.marginLeft = '0';
      } else {
        this.element_.style.left = left + 'px';
        this.element_.style.marginLeft = marginLeft + 'px';
      }
    }

    if (this.element_.classList.contains(this.CssClasses_.TOP)) {
      this.element_.style.top = props.top - this.element_.offsetHeight - 10 + 'px';
    } else if (this.element_.classList.contains(this.CssClasses_.RIGHT)) {
      this.element_.style.left = props.left + props.width + 10 + 'px';
    } else if (this.element_.classList.contains(this.CssClasses_.LEFT)) {
      this.element_.style.left = props.left - this.element_.offsetWidth - 10 + 'px';
    } else {
      this.element_.style.top = props.top + props.height + 10 + 'px';
    }

    this.element_.classList.add(this.CssClasses_.IS_ACTIVE);
  };

  /**
   * Hide tooltip on mouseleave or scroll
   *
   * @private
   */
  MaterialTooltip.prototype.hideTooltip_ = function() {
    this.element_.classList.remove(this.CssClasses_.IS_ACTIVE);
  };

  /**
   * Initialize element.
   */
  MaterialTooltip.prototype.init = function() {

    if (this.element_) {
      var forElId = this.element_.getAttribute('for') ||
          this.element_.getAttribute('data-mdl-for');

      if (forElId) {
        this.forElement_ = document.getElementById(forElId);
      }

      if (this.forElement_) {
        // It's left here because it prevents accidental text selection on Android
        if (!this.forElement_.hasAttribute('tabindex')) {
          this.forElement_.setAttribute('tabindex', '0');
        }

        this.boundMouseEnterHandler = this.handleMouseEnter_.bind(this);
        this.boundMouseLeaveAndScrollHandler = this.hideTooltip_.bind(this);
        this.forElement_.addEventListener('mouseenter', this.boundMouseEnterHandler, false);
        this.forElement_.addEventListener('touchend', this.boundMouseEnterHandler, false);
        this.forElement_.addEventListener('mouseleave', this.boundMouseLeaveAndScrollHandler, false);
        window.addEventListener('scroll', this.boundMouseLeaveAndScrollHandler, true);
        window.addEventListener('touchstart', this.boundMouseLeaveAndScrollHandler);
      }
    }
  };

  // The component registers itself. It can assume componentHandler is available
  // in the global scope.
  componentHandler.register({
    constructor: MaterialTooltip,
    classAsString: 'MaterialTooltip',
    cssClass: 'mdl-tooltip'
  });
})();

/**
 * @license
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

(function() {
  'use strict';

  /**
   * Class constructor for Progress MDL component.
   * Implements MDL component design pattern defined at:
   * https://github.com/jasonmayes/mdl-component-design-pattern
   *
   * @constructor
   * @param {HTMLElement} element The element that will be upgraded.
   */
  var MaterialProgress = function MaterialProgress(element) {
    this.element_ = element;

    // Initialize instance.
    this.init();
  };
  window['MaterialProgress'] = MaterialProgress;

  /**
   * Store constants in one place so they can be updated easily.
   *
   * @enum {string | number}
   * @private
   */
  MaterialProgress.prototype.Constant_ = {
  };

  /**
   * Store strings for class names defined by this component that are used in
   * JavaScript. This allows us to simply change it in one place should we
   * decide to modify at a later date.
   *
   * @enum {string}
   * @private
   */
  MaterialProgress.prototype.CssClasses_ = {
    INDETERMINATE_CLASS: 'mdl-progress__indeterminate'
  };

  /**
   * Set the current progress of the progressbar.
   *
   * @param {number} p Percentage of the progress (0-100)
   * @public
   */
  MaterialProgress.prototype.setProgress = function(p) {
    if (this.element_.classList.contains(this.CssClasses_.INDETERMINATE_CLASS)) {
      return;
    }

    this.progressbar_.style.width = p + '%';
  };
  MaterialProgress.prototype['setProgress'] =
      MaterialProgress.prototype.setProgress;

  /**
   * Set the current progress of the buffer.
   *
   * @param {number} p Percentage of the buffer (0-100)
   * @public
   */
  MaterialProgress.prototype.setBuffer = function(p) {
    this.bufferbar_.style.width = p + '%';
    this.auxbar_.style.width = (100 - p) + '%';
  };
  MaterialProgress.prototype['setBuffer'] =
      MaterialProgress.prototype.setBuffer;

  /**
   * Initialize element.
   */
  MaterialProgress.prototype.init = function() {
    if (this.element_) {
      var el = document.createElement('div');
      el.className = 'progressbar bar bar1';
      this.element_.appendChild(el);
      this.progressbar_ = el;

      el = document.createElement('div');
      el.className = 'bufferbar bar bar2';
      this.element_.appendChild(el);
      this.bufferbar_ = el;

      el = document.createElement('div');
      el.className = 'auxbar bar bar3';
      this.element_.appendChild(el);
      this.auxbar_ = el;

      this.progressbar_.style.width = '0%';
      this.bufferbar_.style.width = '100%';
      this.auxbar_.style.width = '0%';

      this.element_.classList.add('is-upgraded');
    }
  };

  // The component registers itself. It can assume componentHandler is available
  // in the global scope.
  componentHandler.register({
    constructor: MaterialProgress,
    classAsString: 'MaterialProgress',
    cssClass: 'mdl-js-progress',
    widget: true
  });
})();

/**
 *
 * ContentScript
 *
 */

;(function() {
	/**
	 * Инициализация программы.
	 * @param  {object}   window          - объект окна
	 * @param  {object}   document        - объект документа
	 * @param  {string}   selectors       - селектор родительского списка (li)
	 * @param  {string}   progress_prev   - селектор заголовка карты учебника
	 * @param  {array}    button          - массив селекторов о определяющих кнопку карты учебника
	 * @param  {string}   content_article - селектор статьи
	 * @param  {Function} callback        - возвращает управление в точку вызова; передает модуль, псевдомассив элементов списка, элемент статьи; при клике на кнопку "карта учебника" передает модуль и псевдомассив элементов списка.
	 * @param  {[type]}   click_delay     - задежка перед вызовом основного функционала
	 */
	var init = function(window, document, selectors, progress_prev, button, content_article, callback, click_delay) {

		var parents = null; // массив элементов - родительские списки (li)
		var article = null; // обертка основного текста статьи

		/**
		 * Приватная функция получает элементы и присвает их приватным переменным.
		 */
		function getElements() {
			parents = document.querySelectorAll(selectors);
			article = document.querySelector(content_article);
		}

		/**
		 * Регистрирует на документе событие клика. Отлавливает кнопку при клике на которую возвращает управление с модулем.
		 */
		function clickInit() {
			document.addEventListener('click', function(e) {
				if (e.target.classList.contains(button[0]) ||
						e.target.classList.contains(button[1])) {
					setTimeout(function() {
						getElements();
						callback(module, parents);
					}, click_delay);
				}
			});
		}

		/**
		 * [module description]
		 * @type {Object}
		 */
		var module = {
			items: {}, // объект с метками и доп. данными
			indx: {},
			time: 0, // время unix
			count_learned: 0,

			/**
			 * Обновляет время unix и todo
			 * @param  {boolean} reset - Флаг для записи времени в объект.
			 */
			resetData: function(reset) {
				if (reset) {
					this.time = this.getAndSetTime(true);
					this.count_learned = 0;
				}
			},

			/**
			 * Проверяет наличие записи в локальном хранилище "chrome". При отсутствии объекта записывает в хранилище сериализованный объект меток; объект с метками присваивает св-ву модуля items. При наличии объекта в хранилище, обновляет объект в переменной marks (переданный в функцию) и присваивает св-ву модуля items.
			 * @param  {array}   marks     - Объект с метками и другими данными.
			 * @param  {Function} callback - Возвращает управление.
			 */
			getAndSetMarks: function(marks, callback) {
				var that = this;
				// console.log(marks);

				chrome.storage.local.get('learnjavascriptmarks', function(items) {

					if (!items.learnjavascriptmarks)
						chrome.storage.local.set({'learnjavascriptmarks': JSON.stringify(marks)});
					else
						marks = JSON.parse(items.learnjavascriptmarks);
					console.log(marks);
					that.items = marks;
					callback();
				});

			},

			/**
			 * Пишет в св-во объекта кол-во миллисекунд прошедших по времени unix и возвращет число миллисекунд.
			 * @param  {boolean} set - Флаг для записи времени в свойство объекта.
			 * @return {number} Миллисекунды.
			 */
			getAndSetTime: function(set) {
				var d = new Date();
				d = Date.parse(d);

				if (set)
					this.time = d;

				return d;
			},

			/**
			 * Получает индекс объекта соответствующий урлу страницы.
			 * @param  {Function} callback - Возвращает управление в точку вызова передавая объект с метками и индекс объекта в массиве progress.
			 */
			getAssocObjectOnPage: function(callback) {
				var url = window.location.pathname.replace(/^\/{1,}/, '');
				this.getAndSetTime(true);
				// console.log(this.time);
				chrome.storage.local.get('learnjavascriptmarks', function(items) {
					items = JSON.parse(items.learnjavascriptmarks);
					var indx = -1;
					// пишет индекс объекта для возвращения
					items.progress.some(function(o, i) {
						if (o.url && o.url == url) {
							indx = i;
							return true;
						}
					});
					callback(items, indx);
				});
			},

			/**
			 * Пишет в св-во must_scroll ассоциативного объекта из массива progress величину необходимую прокрутить и ширину экрана. Обновляет объект с метками и пишет индекс ассоциативного объекта.
			 * @param {object} items - Объект с метками и доп. информацией.
			 * @param {number} indx  - Индекс объекта из массива progress соответствующий странице.
			 */
			setAssocObjectMustScroll: function(items, indx) {
				var o = items.progress[indx];
				o.must_scroll[0] = article ? (article.offsetTop + article.offsetHeight - window.innerHeight) : 0;
				o.must_scroll[1] = window.innerWidth;
				this.items = items;
				this.indx = indx;
				console.log(o);
			},

			/**
			 * Устанавливает в ассоциативный странице объект прокрутку, если значение больше текущего.
			 * @param {number} scrolled - Прокрутка от начала страницы.
			 */
			setObjectScrolled: function(scrolled) {
				var val = this.items.progress[this.indx].scrolled;
				this.items.progress[this.indx].scrolled = scrolled > val ? scrolled : val;
				// console.log(scrolled);
				// console.log(this.items.progress[this.indx]);
			},

			/**
			 * Сохраняет в хранилище объект меток.
			 */
			saveAssocObject: function() {
				// console.log(this.items.progress[this.indx]);
				chrome.storage.local.set({'learnjavascriptmarks': JSON.stringify(this.items)});
			},

			/**
			 * Устанавливает в ассоциативный странице объект время затраченное на чтение.
			 */
			setTimeSpent: function() {
				var time_start = this.time;
				// console.log('Время загрузки страницы: ' + time_start);
				var time_end = this.getAndSetTime();
				// console.log('Время клика на кнопку карты: ' + time_end);
				this.items.progress[this.indx].time_spent += time_end - time_start;
				// console.log('Затрачено времени на прочтение: ' + this.items.progress[this.indx].time_spent);
				// console.log(this.items.progress[this.indx]);
			},

			/**
			 * Устанавливает изучен материал или нет.
			 */
			setIsLearn: function() {

				// прокрутка больше, равна необходимой прокрутки и затраченное время больше равно необходимого времени
				if (this.items.progress[this.indx].scrolled >= this.items.progress[this.indx].must_scroll[0] &&
						this.items.progress[this.indx].time_spent >= this.items.progress[this.indx].time_must_spend)
					this.items.progress[this.indx].learned = true;

			},

			/**
			 * Регистрирует обработчики событий на объект документа, на карте учебника.
			 */
			mapListeners: function() {

				var handlerClick = function(e) {
					var target = e.target;
					if (/\bclose-button\b/.test(target.className)) {
						this.resetData(true);
					}
				};

				var handlerKeyUp = function(e) {
					var key = e.keyCode;

					// esc
					if (key == 27) {
						this.resetData(true);
					}

				};

				document.addEventListener('click', handlerClick.bind(this));
				document.addEventListener('keyup', handlerKeyUp.bind(this));

			},

			/**
			 * Регистрирует обработчики событий на объект окна и документа, на странице со статьей.
			 */
			pageListeners: function() {

				var handlerResize = function() {
					this.setAssocObjectMustScroll(this.items, this.indx);
					// console.log(this.items.progress[this.indx]);
				};

				var handlerScroll = function() {
					this.setObjectScrolled(window.pageYOffset);
					// console.log('scroll');
				};

				var handlerClick = function(e) {
					var target = e.target;

					// клик на кнопку карты
					if (/^map/.test(target.className)) {
						this.setTimeSpent();
						this.setIsLearn();
						this.saveAssocObject();
					}
				};

				var handlerUnload = function(e) {
					this.setTimeSpent();
					this.setIsLearn();
					this.saveAssocObject();
				};

				window.addEventListener('resize', handlerResize.bind(this));
				window.addEventListener('scroll', handlerScroll.bind(this));
				document.addEventListener('click', handlerClick.bind(this));
				window.addEventListener('beforeunload', handlerUnload.bind(this));

			},

			/**
			 * Создает раскрывающиеся списки и добавляет их в карту для перед заголовком каждого урока. Сохраняет в хранилище объект с метками.
			 * @param {array} t - Массив с временем для каждоый статьи.
			 */
			addControls: function(t) {
				var that = this;
				var progress = this.items.progress[0] ? true : false;

				[].forEach.call(parents, function(parent, indx, array) {
					var get_id = that.items.mark_id[indx];
					var wrap =  document.createElement('div');
					var select = document.createElement('select'), option = null, id = 'parent_'+indx;
					var label  = document.createElement('label');
					wrap.className = 'mdl-selectfield mdl-selectfield--mini mdl-js-selectfield mdl-selectfield--floating-label';
					var tooltip = that.addTooltip('s_' + indx);
					select.id = 's_' + indx;
					select.className = 'mdl-selectfield__select';
					label.className = 'mdl-selectfield__label';
					label.for = 's_' + indx;

					that.items.marks.forEach(function(v, i) {
						option = document.createElement('option');
						option.value = i;
						option.innerHTML = v;
						select.appendChild(option);
					});

					wrap.appendChild(select);
					wrap.appendChild(label);
					wrap.appendChild(tooltip);
					componentHandler.upgradeElement(wrap);
					var fe = parent.firstElementChild;
					fe.insertAdjacentElement('beforebegin', wrap);
					parent.style.display = 'flex';
					parent.style.alignItems = 'baseline';
					parent.style.flexWrap = 'wrap';
					parent.children[1].style.width = 'calc(100% - 77px)';
					parent.querySelector('ul').style.width = '100%';
					parent.querySelector('ul').style.padding = '7px 0';
					wrap.style.marginRight = '10px';
					parent.id = id;

					that.selectMark(select, get_id, progress, parent, t[indx], indx);
					that.setSelectTooltipText(select, get_id, tooltip);
					// if (!indx)
					// 	console.log(that.items.progress[indx]);

				});
				console.log('Кол-во изученных уроков: ' + this.count_learned);
				this.addProgress(progress_prev);
				chrome.storage.local.set({'learnjavascriptmarks': JSON.stringify(this.items)});
			},

			/**
			 * Создает объект с со значением членов по-умолчанию и добавляет в массив progress.
			 * @param  {object} link - Элемент ссылки.
			 * @param  {number} t    - Отрезок времени для изучения материала.
			 */
			initProgressHash: function(link, t) {
				var obj = {
					'url': link.href ? link.href.replace(/.+\.ru\//, '') : '',
					'learned': false,
					'scrolled': 0,
					'must_scroll': [],
					'time_spent': 0,
					'time_must_spend': t || 0
				};
				this.items.progress.push(obj);
			},

			/**
			 * Находит первое соответствие из массива words слову усвоено или его синониму в массиве desc. Если передан идентификатор метки, то вырезает из массива desc элемент по идентификатору и изменяет исходный массив.
			 * @param  {number} n - Идентификатор выбранной метки.
			 * @return {number} Индекс метки усвоено или его синонима.
			 */
			getIndexMarkComplete: function(n) {
				var desc = this.items.desc.map(function(v,i) { return v.toLowerCase(); });
				var words = ['усвоено', 'изучено', 'выполнено'];
				var add_word = ['важно'];
				var complete = -1;

				if (isFinite(n))
					desc = desc.splice(n, 1);

				words.concat(n ? add_word : []).some(function(v, i) {
					complete = desc.indexOf(v);
					if (~complete)
						return true;
				});

				return complete;
			},

			/**
			 * Выбирает метку. Подсчитывает кол-во изученных уроков.
			 * @param  {object} select - Выпадающий список.
			 * @param  {number} id     - Идентификатор метки.
			 * @param  {boolean} p     - Наличие или отсутствие элементов в массиве progress.
			 * @param  {object} l      - Элемент родительского списка.
			 * @param  {number} t      - Отрезок времени для изучения материала.
			 * @param  {number} i      - Индекс родительско элемента списка.
			 */
			selectMark: function(select, id, p, l, t, i) {
				var link = l.querySelector('.tutorial-map-list-three__link');
				if (!p) {
					this.initProgressHash(link, t);
				} else {
					var t_spend = this.items.progress[i].time_must_spend;
					if (!t_spend) {
						this.items.progress[i].time_must_spend = t;
					}
				}
				var learned = this.items.progress[i].learned;

				// проверяет или индекс отметки больше нуля
				if (id && (+id) !== 0) {

					// проверяет если в селекте существует опция с переданным id
					if (select.options[id]) {
						select.options.selectedIndex = id;
						select.setAttribute('style', this.items.pallete[id]);

						// проверяет или материал изучен
						if (learned) {
							if (~this.getIndexMarkComplete(id))
								this.count_learned++;
						}

					} else {
						select.options.selectedIndex = 0;
					}

				// проверяет или индекс отметки нулевой
				} else {

					// проверяет или материал изучен
					if (learned) {
						select.options.selectedIndex = this.getIndexMarkComplete();
						select.setAttribute('style', this.items.pallete[select.options.selectedIndex]);
						this.count_learned++;
					}

				}

			},

			addTooltip: function(attr) {
				var tooltip = document.createElement('div');
				tooltip.className = 'mdl-tooltip';
				tooltip.setAttribute('data-mdl-for', attr);
				setTimeout(function() { componentHandler.upgradeElement(tooltip); }, 0);

				return tooltip;
			},

			/**
			 * Пишет текст в тултип.
			 * @param  {object} select  - Выпадающий список.
			 * @param  {number} id      - Идентификатор метки.
			 * @param  {object} tooltip - Html элемент подсказки.
			 */
			setSelectTooltipText: function(select, id, tooltip) {

				if (!id) {
					tooltip.textContent = this.items.desc[0];
				} else if (id > select.options.length-1) {
					this.items.mark_id[indx] = 0;
					tooltip.textContent = this.items.desc[0];
				} else {
					tooltip.textContent = this.items.desc[id];
				}

			},

			count: function() {

			},

			/**
			 * Регистрирует на объект документа событие изменения и отлавливает его всплытие с элемента "select". При наступлении события заменяет идентификатор выбранной метки в массиве, пересохраняет объект меток...
			 */
			selectChange: function() {
				var that = this;
				var mark_complete;
				document.addEventListener('change', function(e) {
					var target = e.target;
					if (target.tagName == 'SELECT') {
						var lesson_id = target.parentNode.parentNode.id.replace(/\D+/g, '');
						var mark_id = target.value;
						that.items.mark_id[lesson_id] = mark_id;
						chrome.storage.local.set({'learnjavascriptmarks': JSON.stringify(that.items)});
						target.setAttribute('style', that.items.pallete[target.value]);
						target.parentNode.querySelector('.mdl-tooltip').textContent = that.items.desc[target.value];

						that.setProgress(document.getElementById('p1'));

					}
				});
			},

			/**
			 * Добавляет компонент "progress" в карту учебника.
			 * @param {string} target - Селектор заголовка карты учебника.
			 */
			addProgress: function(target) {
				var that = this;
				target = document.querySelectorAll(target)[0];
				if (!target) return;
				var p1 = document.createElement('div');
				p1.id = 'p1';
				p1.className = 'mdl-progress mdl-js-progress';
				componentHandler.upgradeElement(p1);
				target.insertAdjacentElement('afterend', p1);

				var tooltip = this.addTooltip('p1');
				p1.appendChild(tooltip);

				setTimeout(function() {
					that.setProgress(p1);
				}, 800);
			},

			/**
			 * Устанавливает процент изученного материала.
			 * @param {object} el - Html элемент компонента progress.
			 */
			setProgress: function(el) {
				var n = this.count_learned / 217 * 100;
				el.firstElementChild.style.width = n + '%';
				el.querySelector('.mdl-tooltip').textContent = 'Кол-во изученных уроков: ' + this.count_learned + ' Прогресс: ' + n.toFixed(2) + '%';
			}

		};

		getElements();
		callback(module, parents, article);

		clickInit();

	};

	/**
	 * Получает массив с метками и массив с дополнительными данными для меток из синхронизированного хранилища "chrome". При наличии записей в хранилище, копирует в новый объект массив меток и массив дом. данных.
	 * @param  {Function} callback - Возвращает объект с массивом marks, options, пустыми массивами: markd_id, progress; либо передает управление с ложным аргументом.
	 */
	function checkAndClearSyncStorage(callback) {
		var obj = {};
		chrome.storage.sync.get(null, function(items) {
			// console.log(items);
			var marks = items.learnjavascriptmarks;
			var options = items.learnjavascriptoptions;
				if (marks && options) {
					obj.marks = JSON.parse(marks);
					obj.mark_id = obj.mark_id ? obj.mark_id : [];
					obj.progress = obj.progress ? obj.progress : [];
					options = JSON.parse(options);
					// копирует члены объекта опшэнс в объект obj
					for (var prop in options)
						obj[prop] = options[prop];
					delete items.learnjavascriptmarks;
					delete items.learnjavascriptoptions;
					for (var prop1 in items) {
						items[prop1.replace(/\D+/g,'')] = items[prop1];
						delete items[prop1];
					}
					// копирует идентификаторы в массив
					for (var prop2 in items)
							obj.mark_id.push(items[prop2]);
					callback(false);
				}
				else {
					callback(false);
				}
		});
	}

	// chrome.storage.local.clear();

	checkAndClearSyncStorage(function(obj) {

		var marks = obj || {
			'marks': ['S','?', '!', '&#10003;', '&#9733;'],
			'pallete': ['color: #000; background-color: #fff','color: #fff; background-color: #2196F3', 'color: #fff; background-color: #f44336', 'color: #fff; background-color: #4caf50', 'color: #ffffff; background-color: #ffc107'],
			'desc': ['Выбрать', 'Не все ясно', 'Важно', 'Усвоено', 'Прочитано'],
			'mark_id': [],
			'progress': []
		};
		var click_delay = 1000; // задежка передв вызовов основного функционала
		var time_must_spend = [300000, 60000, 60000, 60000];

		setTimeout(function() {
			init(window, document,
			 '.tutorial-map-list-three__item',
			 '.tutorial-map-list__title',
			 ['map', 'map__text'],
			 '.content article', function(mod, parents, article) {
			 	// записывает метки в объект
				mod.getAndSetMarks(marks, function() {
					// определяет страницу со статьей
					if (!parents.length && window.location.pathname != '/' && article) {
						mod.getAssocObjectOnPage(function(items, indx) {
							// передает индекс объекта для страницы со статьей
							mod.setAssocObjectMustScroll(items, indx);
							setTimeout(function() {
								mod.pageListeners();
							}, 1000);
						});
						return;
					}
					mod.mapListeners();
					mod.addControls(time_must_spend);
					mod.selectChange();
				});
			}, click_delay);
		}, click_delay);

	});


})();