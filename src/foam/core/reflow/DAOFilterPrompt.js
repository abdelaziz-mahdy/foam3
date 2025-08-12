/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.core.reflow',
  name: 'DAOFilterPromptView',
  extends: 'foam.u2.View',

  css: `
  `,

  methods: [
    function render() {
      var self = this;

      this.
        addClass().
        show(this.data.visible$).
        start('h3').
          add(self.data.label$).
        end().
        br().
        start().
          add(self.data.filterView$).
        end();
    }
  ]
});


foam.CLASS({
  package: 'foam.core.reflow',
  name: 'DAOFilterPrompt',

  requires: [
    'foam.u2.filter.FilterView',
    'foam.core.reflow.DAOFilterPromptView',
    'foam.mlang.predicate.True'
  ],

  imports: [ 'block', 'scope' ],

  exports: [ 'dao', 'filteredDAO' ],

  properties: [
    {
      class: 'String',
      name: 'label',
      factory: function() {
        return this.dao ? this.dao.of.model_.plural + ' Filter' : 'DAO Filter';
      }
    },
    {
      class: 'Boolean',
      name: 'visible',
      value: false
    },
    {
      class: 'foam.dao.DAOProperty',
      name: 'dao',
      adapt: function(o, n, p) {
        let oldAdapt = foam.dao.DAOProperty.ADAPT;
        if ( foam.String.isInstance(n) ) {
          if ( this.scope[n] ) {
            this.daoKey = n;
            n = this.scope[n];
          } else if ( this.scope[n + 'DAO'] ) {
            this.daoKey = n + 'DAO';
            n = this.scope[n + 'DAO'];
          } else if ( this.__context__[n + 'DAO'] ) {
            n =  n + 'DAO';
          } else if ( n.endsWith('s') ) {
            this.daoKey = n;
            n = n.substring(0, n.length-1) + 'DAO';
          }
        }
        return oldAdapt.value.call(this, o, n, p);
      }
    },
    {
      name: 'predicate',
      factory: function() {
        return this.True.create();
      }
    },
    {
      class: 'foam.dao.DAOProperty',
      name: 'filteredDAO',
      expression: function(dao, predicate) {
        if ( ! dao ) return null;
        return predicate ? dao.where(predicate) : dao;
      }
    },
    {
      name: 'filterView',
      expression: function(dao) {
        if ( ! dao ) return null;
        return this.FilterView.create({
          dao: dao,
          data$: this.predicate$
        }, this.__subContext__.createSubContext({
          controllerMode: foam.u2.ControllerMode.EDIT
        }));
      }
    }
  ],

  methods: [
    async function addToE(e) {
      e.tag(this.DAOFilterPromptView, {data: this, label: this.label});
    }
  ]
});