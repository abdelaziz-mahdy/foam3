/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.core.menu',
  name: 'SeparatorMenu',
  extends: 'foam.core.menu.AbstractMenu',

  documentation: 'A menu item that renders as a horizontal line separator.',

  classes: [
    {
      name: 'SeparatorView',
      extends: 'foam.u2.View',

      css: `
        ^ {
          height: 1px;
          width: 100%;
          background: #e0e0e0;
          margin: 8px 0;
          pointer-events: none;
        }
      `,

      methods: [
        function render() {
          this.addClass(this.myClass());
        }
      ]
    }
  ],

  methods: [
    function createRowView(X, menu) {
      return { class: 'foam.core.menu.SeparatorMenu.SeparatorView' };
    }
  ]
});
