/**
 * @license
 * Copyright 2024 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: "foam.core.menu",
  name: "SeparatorMenu",
  extends: "foam.core.menu.AbstractMenu",

  documentation:
    "Menu handler that renders a horizontal line separator in vertical menus.",

  css: `
    ^separator {
      border-top: 1px solid $grey300 !important;
      margin: 8px 16px !important;
      height: 1px !important;
      width: calc(100% - 32px) !important;
      padding: 0 !important;
      background: none !important;
      border-radius: 0 !important;
      cursor: default !important;
      pointer-events: none !important;
    }
    
    ^separator:hover {
      background: none !important;
      border-top: 1px solid $grey300 !important;
    }
  `,

  methods: [
    function renderMenuItem(element, menu) {
      menu.Style = {
        height: "50px",
        width: "calc(100% - 32px)",
        borderTop: "1px solid $grey300",
        margin: "8px 16px",
        padding: "0",
        background: "none",
        borderRadius: "0",
      };
      element.Style = {
        height: "50px",
        width: "calc(100% - 32px)",
        borderTop: "1px solid $grey300",
        margin: "8px 16px",
        padding: "0",
        background: "none",
        borderRadius: "0",
      };
    },

    function select(X, menu) {
      // Separators are not selectable - do nothing
    },

    function launch(X, menu) {
      // Separators are not launchable - do nothing
    },
  ],
});
