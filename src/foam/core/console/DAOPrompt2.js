/**
 * @license
 * Copyright 2024 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.core.console',
  name: 'DAOPrompt2View',
  extends: 'foam.u2.View',

  imports: [ 'executionTime' ],

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
          start().
            add(self.data.dynamic(async function(version, skip) {
              if ( ! version ) return;

              var startTime = Date.now();
              await self.data.select.execute(this);
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
    /*
    'foam.u2.DetailView',
    'foam.u2.Link',
    'foam.u2.tag.CircleIndicator'
    */
  ],

  imports: [ 'eval_', 'scrollToBottom' ],

  exports: [
    'executionTime',
    'block',
    'dao',
    'limitedDAO as sinkDAO',
    'filteredDAO as sinkUnlimitedDAO'
  ],

  /*
  css: `
    ^ .foam-u2-TextInputCSS {
      width: auto;
      height: 22px;
    }
    ^ .foam-u2-TextInputCSS,.foam-u2-TextArea {
      height: auto;
    }
    ^ select[name="selectChoice"] {
      width: 130px;
    }
    ^ .property-skip { display: inline-flex; }
    ^helper-icon svg { fill: currentColor; }
    ^helper-icon { vertical-align: sub; }
    ^content:has(div) {
      max-height: 700px;
      overflow-y: auto;
      border: 1px solid gray;
    }
    `,
    */

  properties: [
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
      expression: function(skip, limit, filteredDAO) {
        if ( limit ) filteredDAO = filteredDAO.limit(limit);
        if ( skip  ) filteredDAO = filteredDAO.skip(skip);
        return filteredDAO;
      }
    },
    {
      name: 'filteredDAO',
      hidden: true,
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
      displayWidth: 5,
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
      size: 5
    },
    {
      class: 'String',
      name: 'where',
      displayWidth: 55,
      view: { class: 'foam.u2.TextField', type: 'search' } // adds 'x' to clear field
    },
    {
      class: 'String',
      name: 'order',
      displayWidth: 60,
      view: { class: 'foam.u2.TextField', type: 'search' } // adds 'x' to clear field
    },
    /*
    {
      class: 'String',
      name: 'columns',
      view: function(_, X) {
        return {
          class: 'foam.core.console.PropertyListView',
          of: X.data.dao.of
        };
      }
      },
      */
    {
      name: 'select',
      // Create with a function so we can set the proper context
      view: function(_, X) { return foam.core.console.SinkView.create({sinksOnly: false}, X.data); }
    },
    { class: 'Long', name: 'rowCount', visibility: 'RO' },
    { name: 'executionTime', value: '-', visibility: 'RO' },
    { class: 'Int', name: 'version', hidden: true, transient: true }
  ],

  methods: [
    /*
    async function render() {
      this.SUPER();

      this.block = this.__context__.currentBlock;

      this.addClass();

      // We await for the rowCount so we know how to size the slider for the limit
      this.rowCount = (await this.dao.select(this.COUNT())).value;

      this.
        start(this.Link).add(this.daoLabel$, '.').on('click', this.describe).end().
        start('div').style({'margin-top': '0', 'margin-left': '20px', 'margin-bottom': '6px', 'line-height': '26px'}).
        add('skip(',    this.SKIP,  ').').br().
        add('limit(',   this.LIMIT, ').').br().
        add('where(').
        start(this.WHERE_CHOICE).
          style({'display': 'inline-flex'}).
        end().
        add(' ', this.WHERE, ' ').
        start(this.PROPERTY_CHOICE).style({'display': 'inline-flex'}).end().
        add('). ').
        start(this.CircleIndicator, {glyph: 'helpIcon', icon: '/images/question-icon.svg', size:20}).addClass(this.myClass('helper-icon')).on('click', () => this.eval_('mqlhelp')).end().
        br().
        add('orderBy(', this.ORDER, ' ').start(this.ORDER_CHOICE).style({'display': 'inline-flex'}).end().add(').').br().
        add('select(').add(this.SELECT, ')').br().
        add('columns: ', this.COLUMNS).
      end().
      add(this.RUN, ' ', this.CLEAR).br().
      start().
        style({'padding-top': '10px'}).
        // show(this.rowCount$.map(c=>c !== undefined)).
        add('Count: ', this.rowCount$, ', Execution time: ', this.executionTime$).
      end().br().
      start('div').style({fontSize: 'smaller', textDecoration: 'underline'}).on('click', this.copyToClipboard).add('copy').end().
      start('div', {}, this.content$).addClass(this.myClass('content')).style({fontSize: 'smaller'}).end();
      }
      */
    async function addToE(e) {
      this.rowCount = (await this.dao.select(this.COUNT())).value;

      e.tag(this.DAOPrompt2View, {data: this, label: this.label});
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
