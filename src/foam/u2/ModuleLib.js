/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.u2',
  name: 'ModuleLib',
  extends: 'foam.u2.JsLib',

  documentation: 'Extension of JsLib to support ES modules (.mjs files) using dynamic imports',

  properties: [
    {
      name: 'globalName',
      class: 'String',
      documentation: 'Optional global variable name to assign the module to (e.g., "pdfjsLib", "myModule")'
    }
  ],

  methods: [
    function installLib() {
      if ( ! document ) return;
      if ( ! this.LOADED[this.name] ) {
        var self = this;
        this.LOADED[this.name] = new Promise(function(resolve) {
          // Use dynamic import for ES modules
          import(self.src).then(function(module) {
            // Make the module available globally if globalName is specified
            if ( self.globalName ) {
              window[self.globalName] = module;
            }
            resolve(module);
          }).catch(function(error) {
            console.error('Failed to load ES module:', self.src, error);
            // Still resolve to allow object creation
            resolve(null);
          });
        });
      }
      return this.LOADED[this.name];
    }
  ]
});