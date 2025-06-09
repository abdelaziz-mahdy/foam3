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
      [ 'CSV', 'CSV', true, 'format' ],
      [ 'JSON', 'JSON', true, 'format' ],
      [ 'XML', 'XML', true, 'format' ],
      [ 'Table', 'Table', true, 'format' ],
      [ 'GridBy', 'GridBy', true, 'structure' ],
      [ 'GroupBy', 'GroupBy', true, 'structure' ],
      [ 'Cells', 'Cells', true, 'structure' ],
      [ 'Citation', 'Citation', true, 'structure' ],
      [ 'Controller', 'Controller', false, 'structure' ],
      [ 'Avg', 'AVG', true, 'calculation' ],
      [ 'Count', 'COUNT', true, 'calculation' ],
      [ 'Duplicate', 'Duplicate', true, 'calculation' ],
      [ 'Max', 'MAX', true, 'calculation' ],
      [ 'Min', 'MIN', true, 'calculation' ],
      [ 'Sum', 'SUM', true, 'calculation' ],
      [ 'Pie',   'Pie', true, 'structure' ],
      [ 'Row', 'Row', true, 'structure' ],
      [ 'Column', 'Column', true, 'structure' ],
      [ 'Script', 'Script', true, 'structure' ],
      [ 'View', 'View', true, 'structure' ],
      [ 'Edit', 'Edit', true, 'structure' ],
      [ 'All', 'All', false, 'structure' ]
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
      name: 'agentType',
      value: undefined
    },
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
        var agents = X.AGENTS;
        if ( X.data.sinksOnly ) agents = agents.filter(s => s[2]);
        if ( X.data.agentType ) agents = agents.filter(s => s[3] === X.data.agentType);
        return { class: 'foam.u2.view.ChoiceView', choices: agents };
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
