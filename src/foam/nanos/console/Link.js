/**
 * @license
 * Copyright 2024 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.nanos.console',
  name: 'Link',
  extends: 'foam.u2.View',

  css: `^ {
    color: -webkit-link;
    cursor: pointer;
    text-decoration: underline;
  }`,

  properties: [
    [ 'nodeName', 'a' ]
  ],

  methods: [
    function render() {
      this.SUPER();
      this.addClass();
    }
  ]
});
