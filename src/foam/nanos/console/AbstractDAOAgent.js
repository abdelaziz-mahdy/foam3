/**
 * @license
 * Copyright 2024 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.nanos.console',
  name: 'AbstractDAOAgent',

  implements: [
    'foam.mlang.Expressions'
  ],

  properties: [
    'dao',
    'unlimitedDAO',
    {
      name: 'of',
      factory: function() { return this.dao.of; }
    }
  ],

  methods: [
    function addToE() {},
    function execute() {}
  ]
});


foam.CLASS({
  package: 'foam.nanos.console',
  name: 'CountDAOAgent',
  extends: 'foam.nanos.console.AbstractDAOAgent',

  methods: [
    function execute(e) {
      return this.dao.select(this.COUNT()).then(c => {
        e.start('b').add('Count: ').end().add(c.value).br();
      });
    }
  ]
});


foam.CLASS({
  package: 'foam.nanos.console',
  name: 'ScrollTableDAOAgent',
  extends: 'foam.nanos.console.AbstractDAOAgent',

  methods: [
    function execute(e) {
      e.tag({class: 'foam.u2.table.TableView', data: this.unlimitedDAO});
    }
  ]
});


foam.CLASS({
  package: 'foam.nanos.console',
  name: 'TableDAOAgent',
  extends: 'foam.nanos.console.AbstractDAOAgent',

  methods: [
    function execute(e) {
      return this.dao.select(foam.u2.mlang.Table.create({}, this)).then(t => {
        e.add(t);
      });
    }
  ]
});


foam.CLASS({
  package: 'foam.nanos.console',
  name: 'CSVDAOAgent',
  extends: 'foam.nanos.console.AbstractDAOAgent',

  requires: [ 'foam.dao.CSVSink' ],

  methods: [
    function execute(e) {
      var csv = this.CSVSink.create({of: this.of});
      return this.dao.select(csv).then(c => {
        e.start('pre').add(c.csv);
      });
    }
  ]
});


foam.CLASS({
  package: 'foam.nanos.console',
  name: 'XMLDAOAgent',
  extends: 'foam.nanos.console.AbstractDAOAgent',

  methods: [
    function execute(e) {
      return this.dao.select().then(a => {
        e.start('pre').add(foam.xml.Pretty.stringify(a.array));
      });
    }
  ]
});


foam.CLASS({
  package: 'foam.nanos.console',
  name: 'JSONDAOAgent',
  extends: 'foam.nanos.console.AbstractDAOAgent',

  methods: [
    function execute(e) {
      return this.dao.select().then(a => {
        e.start('pre').add(foam.json.Pretty.stringify(a.array));
      });
    }
  ]
});


foam.CLASS({
  package: 'foam.nanos.console',
  name: 'GroupByDAOAgent',
  extends: 'foam.nanos.console.AbstractDAOAgent',

  requires: [ 'foam.nanos.console.PropertyChoiceView' ],

  properties: [
    {
      name: 'prop'
    }
  ],

  methods: [
    function execute(e) {
      return this.dao.select(this.GROUP_BY(foam.demos.olympics.Medal.COLOR, this.COUNT())).then(s => {
        e.add(s);
      });
    },

    function addToE(e) {
      e.tag(this.PropertyChoiceView, { of: this.of });
    }
  ]
});


foam.CLASS({
  package: 'foam.nanos.console',
  name: 'GridByDAOAgent',
  extends: 'foam.nanos.console.AbstractDAOAgent',

  methods: [
    function execute(e) {
      return this.dao.select(this.GROUP_BY(foam.demos.olympics.Medal.GENDER, this.GROUP_BY(foam.demos.olympics.Medal.COLOR, this.COUNT()))).then(s => {
//      return this.dao.select(this.GROUP_BY(foam.demos.olympics.Medal.COLOR, foam.demos.olympics.Medal.GENDER, this.COUNT())).then(s => {
        e.add(s);
      });
    }
  ]
});


foam.CLASS({
  package: 'foam.nanos.console',
  name: 'PieDAOAgent',
  extends: 'foam.nanos.console.AbstractDAOAgent',

  requires: [ 'foam.u2.mlang.Pie' ],

  methods: [
    function execute(e) {
      return this.dao.select(this.Pie.create({
        arg1: foam.demos.olympics.Medal.COLOR,
        arg2: this.COUNT()
      })).then(s => {
        e.add(s);
      });
    }
  ]
});


foam.CLASS({
  package: 'foam.nanos.console',
  name: 'ViewDAOAgent',
  extends: 'foam.nanos.console.AbstractDAOAgent',

  methods: [
    function execute(e) {
      e = e.startContext({controllerMode: foam.u2.ControllerMode.VIEW});
      return this.dao.select(o => e.add(o));
    }
  ]
});


foam.CLASS({
  package: 'foam.nanos.console',
  name: 'EditDAOAgent',
  extends: 'foam.nanos.console.AbstractDAOAgent',

  methods: [
    function execute(e) {
      return this.dao.select(o => {
        var data = foam.comics.DAOUpdateController.create({data: o, dao: this.dao}, this);
        e.tag({class: 'foam.comics.DAOUpdateControllerView', controllerMode: foam.u2.ControllerMode.EDIT, detailView: 'foam.u2.DetailView', dao: this.dao, data: data });
      });
    }
  ]
});


foam.CLASS({
  package: 'foam.nanos.console',
  name: 'ControllerDAOAgent',
  extends: 'foam.nanos.console.AbstractDAOAgent',

  methods: [
    function execute(e) {
      return this.dao.select(o => {
        e.tag({class: 'foam.comics.v3.DAOView', data: this.unlimitedDAO});
      });
    }
  ]
});


foam.CLASS({
  package: 'foam.nanos.console',
  name: 'CitationDAOAgent',
  extends: 'foam.nanos.console.AbstractDAOAgent',

  requires: [ 'foam.u2.CitationView' ],

  methods: [
    function execute(e) {
      return this.dao.select(o => e.tag(this.CitationView, {data: o}));
    }
  ]
});



foam.CLASS({
  package: 'foam.nanos.console',
  name: 'CellsDAOAgent',
  extends: 'foam.nanos.console.AbstractDAOAgent',

  requires: [ 'foam.demos.sevenguis.Cells' ],

  methods: [
    function execute(e) {
      var ps  = this.of.getAxiomsByClass(foam.core.Property).
          filter(p => ! p.networkTransient && ! p.hidden);
      var cs  = {};
      var row = 1;
      for ( var i = 0 ; i < ps.length ; i++ ) {
        cs[String.fromCharCode(65+i) + 0] = '<b>' + ps[i].label + '</b';
      }
      // TODO: limit to 30k until Cells can handle more
      this.dao.limit(30000).select(o => {
        for ( var i = 0 ; i < ps.length ; i++ ) {
          cs[String.fromCharCode(65+i) + row] = ps[i].get(o);
        }
        row++;
      }).then(() => {
        var cells = this.Cells.create({rows: row+2, columns: ps.length+2}, this);
        cells.loadCells(cs);
        e.tag(cells);
      });
    }
  ]
});


foam.CLASS({
  package: 'foam.nanos.console',
  name: 'AllDAOAgent',
  extends: 'foam.nanos.console.AbstractDAOAgent',

  requires: [ 'foam.u2.CitationView' ],

  methods: [
    function execute(e) {
      foam.nanos.console.DAOPrompt.AGENTS.forEach(a => {
        a = a[0];
        if ( a == 'All' ) return;

        var cls = foam.lookup(this.cls_.package + '.' + a + 'DAOAgent');
        var agent = cls.create({dao: this.dao, unlimitedDAO: this.unlimitedDAO});
        e.start('h2').add(a).end().start().call(function () { agent.execute(this); });
      });
    }
  ]
});
