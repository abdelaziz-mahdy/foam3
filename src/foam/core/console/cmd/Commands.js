/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.core.console.cmd',
  name: 'Command',

  imports: [ 'log' ],

  properties: [
    { class: 'String', name: 'id' },
    { class: 'String', name: 'description' }
  ],

  methods: [
    function execute() {}
  ]
});


foam.CLASS({
  package: 'foam.core.console.cmd',
  name: 'Help',
  extends: 'foam.core.console.cmd.Command',

  imports: [ 'commandDAO' ],

  properties: [
    { name: 'id',          value: 'help' },
    { name: 'description', value: 'Show help text' }
  ],

  methods: [
    function execute() {
      this.log('Help');
      this.commandDAO.select(c => {
        this.log(c.id);
      });
    }
  ]
});


foam.CLASS({
  package: 'foam.core.console.cmd',
  name: 'Bold',
  extends: 'foam.core.console.cmd.Command',

  imports: [ ],

  methods: [
    function execute() {
    }
  ]
});


foam.CLASS({
  package: 'foam.core.console.cmd',
  name: 'Cells',
  extends: 'foam.core.console.cmd.Command',

  imports: [ ],

  methods: [
    function execute() {
    }
  ]
});


foam.CLASS({
  package: 'foam.core.console.cmd',
  name: 'Clear',
  extends: 'foam.core.console.cmd.Command',

  imports: [ ],

  methods: [
    function execute() {
    }
  ]
});


foam.CLASS({
  package: 'foam.core.console.cmd',
  name: 'DAO',
  extends: 'foam.core.console.cmd.Command',

  imports: [ ],

  methods: [
    function execute() {
    }
  ]
});


foam.CLASS({
  package: 'foam.core.console.cmd',
  name: 'DAOCreate',
  extends: 'foam.core.console.cmd.Command',

  imports: [ ],

  methods: [
    function execute() {
    }
  ]
});


foam.CLASS({
  package: 'foam.core.console.cmd',
  name: 'DAOS',
  extends: 'foam.core.console.cmd.Command',

  imports: [ ],

  methods: [
    function execute() {
    }
  ]
});


foam.CLASS({
  package: 'foam.core.console.cmd',
  name: 'Describe',
  extends: 'foam.core.console.cmd.Command',

  imports: [ ],

  methods: [
    function execute() {
    }
  ]
});


foam.CLASS({
  package: 'foam.core.console.cmd',
  name: 'Doc',
  extends: 'foam.core.console.cmd.Command',

  imports: [ ],

  methods: [
    function execute() {
    }
  ]
});


foam.CLASS({
  package: 'foam.core.console.cmd',
  name: 'Flows',
  extends: 'foam.core.console.cmd.Command',

  imports: [ ],

  methods: [
    function execute() {
    }
  ]
});


foam.CLASS({
  package: 'foam.core.console.cmd',
  name: 'H1',
  extends: 'foam.core.console.cmd.Command',

  imports: [ ],

  methods: [
    function execute() {
    }
  ]
});


foam.CLASS({
  package: 'foam.core.console.cmd',
  name: 'H2',
  extends: 'foam.core.console.cmd.Command',

  imports: [ ],

  methods: [
    function execute() {
    }
  ]
});


foam.CLASS({
  package: 'foam.core.console.cmd',
  name: 'H3',
  extends: 'foam.core.console.cmd.Command',

  imports: [ ],

  methods: [
    function execute() {
    }
  ]
});


foam.CLASS({
  package: 'foam.core.console.cmd',
  name: 'History',
  extends: 'foam.core.console.cmd.Command',

  imports: [ ],

  methods: [
    function execute() {
    }
  ]
});


foam.CLASS({
  package: 'foam.core.console.cmd',
  name: 'Italic',
  extends: 'foam.core.console.cmd.Command',

  imports: [ ],

  methods: [
    function execute() {
    }
  ]
});


foam.CLASS({
  package: 'foam.core.console.cmd',
  name: 'Load',
  extends: 'foam.core.console.cmd.Command',

  imports: [ ],

  methods: [
    function execute() {
    }
  ]
});


foam.CLASS({
  package: 'foam.core.console.cmd',
  name: 'MQLHelp',
  extends: 'foam.core.console.cmd.Command',

  imports: [ ],

  methods: [
    function execute() {
    }
  ]
});


foam.CLASS({
  package: 'foam.core.console.cmd',
  name: 'Models',
  extends: 'foam.core.console.cmd.Command',

  imports: [ ],

  methods: [
    function execute() {
    }
  ]
});


foam.CLASS({
  package: 'foam.core.console.cmd',
  name: 'Quote',
  extends: 'foam.core.console.cmd.Command',

  imports: [ ],

  methods: [
    function execute() {
    }
  ]
});


foam.CLASS({
  package: 'foam.core.console.cmd',
  name: 'Save',
  extends: 'foam.core.console.cmd.Command',

  imports: [ ],

  methods: [
    function execute() {
    }
  ]
});


foam.CLASS({
  package: 'foam.core.console.cmd',
  name: 'Services',
  extends: 'foam.core.console.cmd.Command',

  imports: [ ],

  methods: [
    function execute() {
    }
  ]
});
