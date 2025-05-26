/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.core.menu',
  name: 'SeparatorRowView',
  extends: 'foam.u2.View',

  documentation: 'A row view that renders as a horizontal line separator for use with TreeView rowConfig.',

  cssTokens: [
    {
      name: 'separatorColor',
      value: '$grey300',
      fallback: '#e0e0e0'
    },
    {
      name: 'separatorMargin',
      value: '8px',
      fallback: '8px'
    },
    {
      name: 'separatorHeight',
      value: '1px',
      fallback: '1px'
    },
    {
      name: 'separatorWidth',
      value: '100%',
      fallback: '100%'
    }
  ],

  css: `
    ^ {
      height: $separatorHeight;
      width: $separatorWidth;
      background: $separatorColor;
      margin: $separatorMargin 0;
      pointer-events: none;
    }
  `,

  methods: [
    function render() {
      this.addClass(this.myClass());
    }
  ]
});

foam.CLASS({
  package: 'foam.core.menu',
  name: 'SeparatorMenu',
  extends: 'foam.core.menu.AbstractMenu',

  documentation: 'A menu item that renders as a horizontal line separator.',

  methods: [
    function select(X, menu) {
      // Separators are not selectable - do nothing
    },
    
    function launch(X, menu) {
      // Separators are not launchable - do nothing
    }
  ]
});
