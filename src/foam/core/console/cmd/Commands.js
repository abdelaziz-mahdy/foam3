/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.core.console.cmd',
  name: 'Command',

  imports: [ 'log', 'out', 'outputLink' ],

  tableColumns: [ 'id', 'description' /*, 'execute_' */ ],

  properties: [
    { class: 'String',  name: 'id' },
    { class: 'String',  name: 'description' },
    { class: 'Boolean', name: 'linkable', value: true }
  ],

  methods: [
    function execute() {}
  ],

  actions: [
    {
      name: 'execute_',
      label: 'execute',
      isAvailable: function() { return this.linkable; },
      code: function() { this.execute(); }
    }
  ]
});


foam.CLASS({
  package: 'foam.core.console.cmd',
  name: 'Help',
  extends: 'foam.core.console.cmd.Command',

  imports: [ 'commandDAO', 'eval_' ],

  properties: [
    { name: 'id', value: 'help' },
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
                self.outputLink(c.id, () => self.eval_(c.id), this);
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
            this.start('tr').
              start('th').attr('width', '250').attr('align', 'left').add(c[0]).end().
              start('td').add(c[1]);
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
    function execute(t) { this.out.start('b').add(t); }
  ]
});


foam.CLASS({
  package: 'foam.core.console.cmd',
  name: 'Cells',
  extends: 'foam.core.console.cmd.Command',

  requires: [
    'foam.demos.sevenguis.Cells'
  ],

  imports: [ ],

  properties: [
    [ 'description', 'Embed spreadsheet' ]
  ],

  methods: [
    function execute(rows, cols) {
      this.out.tag(this.Cells, rows && cols && { rows: rows, columns: cols});
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
      // TODO: also clear flowChildren
      this.out.removeAllChildren();
    }
  ]
});


foam.CLASS({
  package: 'foam.core.console.cmd',
  name: 'DAO',
  extends: 'foam.core.console.cmd.Command',

  requires: [
    'foam.core.console.DAOPrompt'
  ],

  imports: [ ],

  properties: [
    [ 'description', 'Perform DAO operation' ]
  ],

  methods: [
    function execute(daoKey) {
      this.out.tag(this.DAOPrompt.create({daoKey: daoKey}));
    }
  ]
});


foam.CLASS({
  package: 'foam.core.console.cmd',
  name: 'DAOCreate',
  extends: 'foam.core.console.cmd.Command',

  requires: [ 'foam.core.console.DAOCreate' ],

  properties: [
    [ 'description', 'Add an object to a DAO' ]
  ],

  methods: [
    function execute(daoKey) {
      this.out.tag(this.DAOCreate.create({daoKey: daoKey}));
    }
  ]
});


foam.CLASS({
  package: 'foam.core.console.cmd',
  name: 'DAOS',
  extends: 'foam.core.console.cmd.Command',

  requires: [ 'foam.core.boot.CSpec' ],

  imports: [ 'cSpecDAO' ],

  properties: [
    [ 'description', 'Display avaiable DAO services' ]
  ],

  methods: [
    function execute(opt_query, opt_nameQuery) {
      var self = this;
      var dao  = this.cSpecDAO.where(this.CSpec.SERVED_DAOS);
      if ( opt_query ) dao = dao.where(opt_query);
      if ( opt_nameQuery ) dao = dao.where(
        this.OR(
          this.CONTAINS_IC(this.CSpec.NAME,     opt_nameQuery),
          this.CONTAINS_IC(this.CSpec.KEYWORDS, opt_nameQuery)
        ));
      this.out.tag('br');
      this.out.start('table').attr('width', '100%').
        select(dao, function(n) {
          var sdao = self.__context__[n.name];
          this.start('tr').
            start('th').attr('align', 'left').call(function() {
              self.outputLink(n.name, () => self.eval_('dao("' + n.name + '")'), this);
            }).end().
            start('td').attr('align', 'left').call(function() {
              var of = sdao.of;
              self.outputLink('create', () => self.eval_('daoCreate("' + n.name + '")'), this);
            }).end().
            start('td').attr('align', 'left').call(function() {
              var of = sdao.of;
              self.outputLink(of.id, () => self.eval_('describe(' + of.id + ')'), this);
            }).end().
            start('td').attr('align', 'left').add(n.description);
        });
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

  requires: [
    'foam.core.console.DocumentReadWriteView',
  ],

  imports: [ ],

  properties: [
    [ 'description', 'Embed document text' ]
  ],

  methods: [
    function execute() {
      this.out.tag(this.DocumentReadWriteView.create({data: '<i>insert text here</i>'}));
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
    function execute(t) { this.out.start('h1').add(t); }
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
    function execute(t) { this.out.start('h2').add(t); }
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
    function execute(t) { this.out.start('h3').add(t); }
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
    function execute(t) { this.out.start('i').add(t); }
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

  properties: [
    [ 'description', 'Display MQL Help' ]
  ],

  methods: [
    function execute() {
      this.out.start('pre').style({'font-family': 'monospace'}).add(`
key:value                  key contains "value"
key=value                  key exactly matches "value"
key:value1,value2          key contains "value1" OR "value2"
key:(value1|value2)        "
key1:value key2:value      key1 contains value AND key2 contains "value"
key1:value AND key2:value  "
key1:value and key2:value  "
key1:value OR key2:value   key1 contains value OR key2 contains "value"
key1:value or key2:value   "
key:(-value)               key does not contain "value"
(expr)                     groups expression
-expr                      not expression, ie. -pri:1
NOT expr                   not expression, ie. NOT pri:1
has:key                    key has a value
is:key                     key is a boolean TRUE value
key>value                  key is greater than value
key-after:value            "
key<value                  key is less than value
key-before:value           "
date:YY/MM/DD              date specified
date:today                 date of today
date-after:today-7         date newer than 7 days ago
date:d1..d2                date within range d1 to d2, inclusive
key:me                     key is the current user

Date formats:
YYYY-MM
YYYY-MM-DD
YYYY-MM-DDTHH
YYYY-MM-DDTHH:MM
`);
    }
  ]
});


foam.CLASS({
  package: 'foam.core.console.cmd',
  name: 'Models',
  extends: 'foam.core.console.cmd.Command',

  requires: [
    'foam.demos.sevenguis.Cells'
  ],

  imports: [ ],

  properties: [
    [ 'description', 'Browse Models' ]
  ],

  methods: [
    function execute() {
      this.out.tag(foam.doc.DocBrowser);
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
    function execute(t) { this.out.start('blockquote').add(t); }
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

  requires: [ 'foam.core.boot.CSpec' ],

  imports: [ 'cSpecDAO' ],


  properties: [
    [ 'description', 'Display available services' ]
  ],

  methods: [
    function execute(opt_query, opt_nameQuery) {
      var self = this;
      var dao  = this.cSpecDAO.where(this.CSpec.SERVED_SERVICES);
      if ( opt_query ) dao = dao.where(opt_query);
      if ( opt_nameQuery ) dao = dao.where(
        this.OR(
          this.CONTAINS_IC(this.CSpec.NAME,     opt_nameQuery),
          this.CONTAINS_IC(this.CSpec.KEYWORDS, opt_nameQuery)
        ));
      this.out.tag('br');
      this.out.start('table').attr('width', '100%').
        select(dao, function(n) {
          var sdao = self.__context__[n.name];
          this.start('tr').
            start('th').attr('align', 'left').call(function() {
              this.add(n.name);
            }).end().
            start('td').attr('align', 'left').add(n.description);
        });
    }
  ]
});
