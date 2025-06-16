/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.core.reflow',
  name: 'Buttons',

  properties: [
    {
      class: 'FObjectArray',
      of: 'foam.core.reflow.Button',
      name: 'buttons'
    }
  ],

  methods: [
    function addToE(e) {
      var self = this;
      this.buttons$.sub(function() {
        self.updateButtons(e);
      });
      this.updateButtons(e);
    },

    function updateButtons(e) {
      // Clear existing buttons
      e.removeAllChildren();
      
      // Add all buttons
      if (this.buttons && this.buttons.length > 0) {
        this.buttons.forEach(button => {
          if (button.addToE) {
            button.addToE(e);
          }
        });
      }
    }
  ]
});