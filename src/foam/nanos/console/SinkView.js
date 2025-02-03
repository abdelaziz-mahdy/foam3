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

  imports: [ 'dao' ],

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
      [ 'Min', 'MIN' ],
      [ 'Max', 'MAX' ],
      [ 'Avg', 'AVG' ],
      [ 'Sum', 'SUM' ],
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
      view: function(_, X) {
        return { class: 'foam.u2.view.ChoiceView', choices: X.AGENTS };
      }
    },
    {
      name: 'data',
      expression: function(choice) {
        var cls = foam.lookup(this.cls_.package + '.' + choice + 'DAOAgent');
        return cls.create({}, this);
      }
    }
  ],

  methods: [
    function render() {
      var self = this;

      this.
        addClass().
        style({'display': 'inline-flex'}).
        startContext({data: this}).
        add(this.CHOICE).
        start(). // TODO: This line needed for U2, remove when U3
        add(' ', self.dynamic(function (data) {
          if ( ! self.dao ) return;
          data.addToE(this);
        }));
    }
  ]
});
