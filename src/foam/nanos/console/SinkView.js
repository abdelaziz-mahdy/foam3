/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.nanos.console',
  name: 'SinkView',
  extends: 'foam.u2.View',

  exports: [ 'AGENTS' ],

  constants: {
    AGENTS: [
      // Value  Label
      [ 'CSV', 'CSV' ],
      [ 'XML', 'XML' ],
      [ 'JSON', 'JSON' ],
      [ 'Citation', 'Citation' ],
      [ 'View', 'View' ],
      [ 'Edit', 'Edit' ],
      [ 'Controller', 'Controller' ],
      [ 'Table', 'Table' ],
      [ 'ScrollTable', 'ScrollTable' ],
      [ 'Cells', 'Cells' ],
      [ 'GroupBy', 'GroupBy' ],
      [ 'GridBy', 'GridBy' ],
      [ 'Pie',   'Pie' ],
      [ 'Count', 'COUNT' ],
      [ 'All', 'All' ]
    ]
        /*
        'SEQUENCE',
        'TEMPLATE',
        'FUNCTION',
        'JS',
        'TREE'
        'Cost'
        // A..Z Grid
        // PROJECTION ? Same as Sequence?
        // Array (store in variable?
        */
  },

  properties: [
    {
      name: 'choice',
      factory: function() { return this.AGENTS[0][0]; },
      postSet: function(o, n) {
        var cls = foam.lookup(this.cls_.package + '.' + n + 'DAOAgent');
        this.data = cls.create({dao: this.dao});
      },
      view: function(_, X) {
        return { class: 'foam.u2.view.ChoiceView', choices: X.AGENTS };
      }
    }
  ],

  methods: [
    function render() {
      this.choice = this.choice;
      this.
        addClass().
        style({'display': 'inline-flex'}).
        startContext({data: this}).add(this.CHOICE);
    }
  ]
});
