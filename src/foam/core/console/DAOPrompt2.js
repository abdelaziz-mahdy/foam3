/**
 * @license
 * Copyright 2024 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

// TODO:
// MQL help
// orderBy, property help

foam.CLASS({
  package: 'foam.core.console',
  name: 'DAOPrompt2View',
  extends: 'foam.u2.View',

  css: `
  `,

  methods: [
    function render() {
      var self = this;

      this.
        addClass().
        add(this.data.dynamic(function(visible) {
          if ( ! visible ) return;
          this.start('h3').
            add(self.data.label$).
          end().
            //          add(self.data.dao.of.id). // TODO: link to describe
          start().
            add(self.data.dynamic(async function(version, skip) {
              if ( ! version ) return;
              var startTime = Date.now();
              var select = self.data.select;
              await select.execute(this);
              self.data.executionTime = foam.lang.Duration.duration(Date.now() - startTime);
            })).
          end();
        }));
    }
  ],

  listeners: [
    function copyToClipboard() {
      var range = document.createRange();
      range.selectNode(this.content.element_);
      window.getSelection().empty();
      window.getSelection().addRange(range);
    }
  ]
});


foam.CLASS({
  package: 'foam.core.console',
  name: 'DAOPrompt2',

  implements: [
    'foam.mlang.Expressions'
  ],

  requires: [
    'foam.core.console.DAOPrompt2View',
    'foam.parse.QueryParser'
  ],

  imports: [ 'currentBlock', 'eval_' ],

  exports: [
    'block',
    'dao',
    'limitedDAO as sinkDAO',
    'filteredDAO as sinkUnlimitedDAO'
  ],

  properties: [
    {
      name: 'block',
      factory: function() { return this.currentBlock; },
      hidden: true,
      transient: true
    },
    {
      class: 'String',
      name: 'label',
      onKey: true,
      factory: function() {
        return this.dao.of.model_.plural;
      },
      displayWidth: 60
    },
    {
      class: 'Boolean',
      name: 'visible',
      value: true
    },
    {
      class: 'foam.dao.DAOProperty',
      name: 'dao',
      hidden: true,
      transient: true,
      adapt: function(o, n, p) {
        let oldAdapt = foam.dao.DAOProperty.ADAPT;
        if ( foam.String.isInstance(n) ) {
          if ( this.__context__[n + 'DAO'] ) {
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
      name: 'limitedDAO',
      hidden: true,
      transient: true,
      expression: function(skip, limit, filteredDAO) {
        if ( limit ) filteredDAO = filteredDAO.limit(limit);
        if ( skip  ) filteredDAO = filteredDAO.skip(skip);
        return filteredDAO;
      }
    },
    {
      name: 'filteredDAO',
      hidden: true,
      transient: true,
      expression: function(dao, where, order) {
        // Compiled on the Server
        // if ( this.where ) dao = dao.where(this.MQL(this.where));

        // Version which compiles on the Client
        if ( where ) {
          var p = this.QueryParser.create({of: dao.of}).parseString(where);
          dao = dao.where(p);
          // TODO: display syntax error if didn't parse
        }

        if ( order ) {
          // TODO: Move this logic somewhere more reusable (to QueryParser maybe?)
          // QueryParser already knows how to find properties using either the name, shortName, or alias, case-insensitive
          // So just reuse it.
          // TODO: Use PropertyNameParser instead
          var parser = this.QueryParser.create({of: dao.of});

          var c = null; // created compartor
          var s = '';
          order.trim().split(',').reverse().forEach(n => {
            n = n.trim();
            var desc = n.startsWith('-');
            if ( desc ) n = n.substring(1);
            var prop = parser.parseString(n, 'fieldname');
            if ( prop ) {
              if ( s ) s = ',' + s;
              s = prop.name + s;
              if ( desc ) s = '-' + s;
              if ( desc ) prop = this.DESC(prop);
              c = c ? this.THEN_BY(prop, c) : prop;
            }
          });
          if ( c ) dao = dao.orderBy(c);
        }

        return dao;
      }
    },
    {
      class: 'Int',
      name: 'skip',
      displayWidth: 8,
      view: function(_, X) {
        return {
          class: 'foam.u2.view.DualView',
          viewa: { class: 'foam.u2.IntView' },
          viewb: { class: 'foam.u2.RangeView', minValue: 0, maxValue$: X.data.rowCount$.map(c => c-1), onKey: true }
        };
      }
    },
    {
      class: 'Int',
      name: 'limit',
      value: 100,
      placeholder: '',
      displayWidth: 8
    },
    {
      class: 'String',
      name: 'where',
      displayWidth: 60,
      view: { class: 'foam.core.console.PredicateView' }
//      view: { class: 'foam.u2.TextField', type: 'search' } // adds 'x' to clear field
    },
    {
      class: 'String',
      name: 'order',
      displayWidth: 60,
      view: { class: 'foam.u2.TextField', type: 'search' } // adds 'x' to clear field
    },
    {
      class: 'String',
      name: 'columns',
      displayWidth: 60,
      xxxview: function(_, X) {
        return {
          class: 'foam.core.console.PropertyListView',
          of: X.data.dao.of
        };
      }
    },
    {
      name: 'select',
      preSet: function(o, n) { return n.clone(this.__subContext__); },
      view: function(_, X) { return foam.core.console.SinkView.create({sinksOnly: false}, X.data); }
    },
    { class: 'Long', name: 'rowCount', visibility: 'RO' },
    { name: 'executionTime', value: '-', visibility: 'RO' },
    { class: 'Int', name: 'version', hidden: true },
    { class: 'FObjectProperty', name: 'value', transient: true, visibility: 'RO' }
  ],

  methods: [
    async function addToE(e) {
      this.rowCount = (await this.dao.select(this.COUNT())).value;

      // TODO: name current block
      e.tag(this.DAOPrompt2View, {data: this, label: this.label});
//      e.tag(this.DAOPrompt2View.create({data: this, label: this.label}, this));
    }
  ],

  actions: [
    {
      name: 'run',
      code: function() {
        this.version++;
      }
    }
  ],

  listeners: [
    function describe() {
      this.eval_('describe ' + this.dao.of.id);
    },
  ]
});

// Does DAO.orderBy() take vargs? It should.
