/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.core.reflow',
  name: 'SinkView',
  extends: 'foam.u2.View',

  requires: [
    'foam.core.reflow.SinkAgent'
  ],

  exports: [ 'AGENTS' ],

  imports: [ 'dao', 'agentDAO' ],

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
      factory: function() { 
        return this.agentDAO.select().then((agents) => {
          const entities = agents.array;
          return entities[0]?.value;
        });
      },
      postSet: function(o, n) { 
        if ( ! this.feedback_ ) this.data = undefined; 
      },
      view: function(_, X) {
        var E = foam.mlang.Expressions.create();
        return {
          class: 'foam.u2.view.RichChoiceView',
          search: true,
          idProperty: 'value',
          sections: [
            {
              heading: 'Format',
              dao: X.agentDAO.where(E.EQ(foam.core.reflow.SinkAgent.TYPE, 'format'))
            },
            {
              heading: 'Structure',
              dao: X.agentDAO.where(E.EQ(foam.core.reflow.SinkAgent.TYPE, 'structure'))
            },
            {
              heading: 'Calculations',
              dao: X.agentDAO.where(E.EQ(foam.core.reflow.SinkAgent.TYPE, 'calculation'))
            },
          ]
        }
        // var agents = X.AGENTS;
        // if ( X.data.sinksOnly ) agents = agents.filter(s => s[2]);
        // if ( X.data.agentType ) agents = agents.filter(s => s[3] === X.data.agentType);
        // return { class: 'foam.u2.view.ChoiceView', choices: agents };
      }
    },
    {
      name: 'data',
      expression: function(choice) {
        if ( ! choice ) return undefined;
        if ( choice instanceof Promise ) {
          return choice.then(value => {
            if ( ! value ) return undefined;
            var cls = foam.lookup(this.choiceToClass(value));
            return cls ? cls.create({}, this) : undefined;
          });
        }
        var cls = foam.lookup(this.choiceToClass(choice));
        return cls ? cls.create({}, this) : undefined;
      },
      postSet: async function(o, n) {
        if ( ! n ) return;
        await this.agentDAO.select().then(agents => {
          const results = agents.array;
          for ( var i = 0 ; i < results.length ; i++ ) {
            if ( this.choiceToClass(results[i].value) == n.cls_.id ) {
              this.feedback_ = true;
              this.choice = results[i].value;
              this.feedback_ = false;
              return;
            }
          }
        });
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
          if ( data instanceof Promise ) {
            data.then(d => d.addToE(this));
          } else {
            data.addToE(this);
          }
        }));
    }
  ]
});
