/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.core.reflow',
  name: 'SinkView',
  extends: 'foam.u2.View',

  exports: [ 'AGENTS' ],

  imports: [ 'dao' ],

  constants: {
    AGENTS: [
      // Value  Label
      [ 'CSV', 'CSV', true ],
      [ 'JSON', 'JSON', true ],
      [ 'XML', 'XML', true ],
      [ 'Table', 'Table', false ],
      [ 'GridBy', 'GridBy', true ],
      [ 'GroupBy', 'GroupBy', true ],
      [ 'Cells', 'Cells', true ],
      [ 'Citation', 'Citation', true ],
      [ 'Controller', 'Controller', false ],
      [ 'Avg', 'AVG', true ],
      [ 'Count', 'COUNT', true ],
      [ 'Duplicate', 'Duplicate', true ],
      [ 'Max', 'MAX', true ],
      [ 'Min', 'MIN', true ],
      [ 'Sum', 'SUM', true ],
      [ 'Pie',   'Pie', true ],
      [ 'Row', 'Row', true ],
      [ 'Column', 'Column', true ],
      [ 'Script', 'Script', true ],
      [ 'View', 'View', true ],
      [ 'Edit', 'Edit', true ],
      [ 'All', 'All', false ]
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
      class: 'Boolean',
      name: 'sinksOnly',
      value: true
    },
    {
      name: 'choice',
      factory: function() { return this.AGENTS[0][0]; },
      postSet: function(o, n) { if ( ! this.feedback_ ) this.data = undefined; },
      view: function(_, X) {
        var choices = X.data.sinksOnly ? X.AGENTS.filter(s => s[2]) : X.AGENTS;
        return { class: 'foam.u2.view.ChoiceView', choices: choices };
      }
    },
    {
      name: 'data',
      expression: function(choice) {
        var cls = foam.lookup(this.choiceToClass(choice));
        return cls.create({}, this);
      },
      postSet: function(o, n) {
        if ( ! n ) return;
        for ( var i = 0 ; i < this.AGENTS.length ; i++ ) {
          if ( this.choiceToClass(this.AGENTS[i][0]) == n.cls_.id ) {
            this.feedback_ = true;
            this.choice = this.AGENTS[i][0];
            this.feedback_ = false;
            return;
          }
        }
      }
    }
  ],

  methods: [
    function choiceToClass(choice) {
      return this.cls_.package + '.' + choice + 'DAOAgent';
    },
    function render() {
      var self = this;
      if ( ! this.data ) { this.data = undefined; }

      this.
        addClass().
        style({'display': 'inline-flex'}).
        startContext({data: this}).
          add(this.CHOICE).
        endContext().
        add(' ', self.dynamic(function (data) {
          if ( ! self.dao ) return;
          data.addToE(this);
        }));
    }
  ]
});
