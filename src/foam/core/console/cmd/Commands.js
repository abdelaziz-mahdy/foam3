/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.core.console.cmd',
  name: 'Command',

  imports: [ 'log', 'out' ],

  properties: [
    { class: 'String',  name: 'id' },
    { class: 'String',  name: 'description' },
    { class: 'Boolean', name: 'linkable', value: true }
  ],

  methods: [
    function execute() {}
  ]
});


foam.CLASS({
  package: 'foam.core.console.cmd',
  name: 'Help',
  extends: 'foam.core.console.cmd.Command',

  imports: [ 'commandDAO', 'outputLink' ],

  properties: [
    { name: 'id',          value: 'help' },
    [ 'description', 'Display help' ]
  ],

  methods: [
    function execute() {
      var self = this;
      var shortcuts = [
        [ 'F1',      'Help' ],
        [ 'ESC',     'Toggle prompt display' ],
        [ 'Up',      'Previous from history' ],
        [ 'Down',    'Next from history' ],
        [ 'CMD + k / CTRL + k',  'Clear console' ],
        [ 'CTRL + `', 'Focus input' ]
      ];

      this.out.start('h3').add('Commands').end().
      start('table').style({width: 'max-content'}).
        select(this.commandDAO, function(c) {
          this.start('tr').
            start('th').attr('width', '250').attr('align', 'left').call(function() {
              if ( c.linkable ) {
                self.outputLink(c.id, () => self.eval_(cid), this);
              } else {
                this.add(c.id);
              }
            }).end().
            start('td').attr('align', 'left').add(c.description);
        }).
        end().
        br().
        start('h3').add('Keyboard Shortcuts').end().
        start('table').style({width: 'max-content'}).
          forEach(shortcuts, function(c) {
            this.start('tr').start('th').attr('width', '250').attr('align', 'left').add(c[0]).end().start('td').add(c[1]);
          }).
        end();
    }
  ]
});


foam.CLASS({
  package: 'foam.core.console.cmd',
  name: 'Bold',
  extends: 'foam.core.console.cmd.Command',

  imports: [ ],

  properties: [
    [ 'description', 'Bold' ]
  ],

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

  properties: [
    [ 'description', 'Embed spreadsheet' ]
  ],

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

  properties: [
    [ 'description', 'Clear console output' ]
  ],

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

  properties: [
    [ 'description', 'Perform DAO operation' ]
  ],

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

  properties: [
    [ 'description', 'Add an object to a DAO' ]
  ],

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

  properties: [
    [ 'description', 'Display avaiable DAO services' ]
  ],

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

  properties: [
    [ 'description', 'Describe a class' ]
  ],

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

  properties: [
    [ 'description', 'Embed document text' ]
  ],

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

  properties: [
    [ 'description', 'Display saved flows' ]
  ],

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

  properties: [
    [ 'description', 'Header 1' ]
  ],

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

  properties: [
    [ 'description', 'Header 2' ]
  ],

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

  properties: [
    [ 'description', 'Header 3' ]
  ],

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

  properties: [
    [ 'description', 'Display previously executed commands' ]
  ],

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

  properties: [
    [ 'description', 'Italic' ]
  ],

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

  properties: [
    [ 'description', 'Load a specified flow' ]
  ],

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

  properties: [
    [ 'description', 'Display MQL Help' ]
  ],

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

  properties: [
    [ 'description', 'Browse Models' ]
  ],

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

  properties: [
    [ 'description', 'Blockquote' ]
  ],

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

  properties: [
    [ 'description', 'Save the current flow to a specified name' ]
  ],

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

  properties: [
    [ 'description', 'Display available services' ]
  ],

  methods: [
    function execute() {
    }
  ]
});
