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

  imports: [ 'dao as referenceDAO', 'sinkDAO as dao', 'sinkUnlimitedDAO as unlimitedDAO' ],

  properties: [
    {
      name: 'of',
      factory: function() { return this.referenceDAO.of; }
    }
  ],

  methods: [
    function createSink() { return foam.dao.ArraySink.create(); },
    function execute(e) { return this.dao.select(this.createSink()).then(s => e.add(s)); },
    function addToE() {}
  ]
});


foam.CLASS({
  package: 'foam.nanos.console',
  name: 'CountDAOAgent',
  extends: 'foam.nanos.console.AbstractDAOAgent',

  methods: [
    function createSink() { return this.COUNT(); }
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
    function createSink() { return foam.u2.mlang.Table.create({}, this); }
  ]
});


foam.CLASS({
  package: 'foam.nanos.console',
  name: 'CSVDAOAgent',
  extends: 'foam.nanos.console.AbstractDAOAgent',

  requires: [ 'foam.dao.CSVSink' ],

  methods: [
    function createSink() { return this.CSVSink.create({of: this.of}); }
  ]
});


foam.CLASS({
  package: 'foam.nanos.console',
  name: 'XMLDAOAgent',
  extends: 'foam.nanos.console.AbstractDAOAgent',

  requires: [ 'foam.nanos.console.XMLSink' ],

  methods: [
    function createSink() { return this.XMLSink.create({of: this.of}); }
  ]
});


foam.CLASS({
  package: 'foam.nanos.console',
  name: 'JSONDAOAgent',
  extends: 'foam.nanos.console.AbstractDAOAgent',

  methods: [
    function execute(e) {
      return this.dao.select(this.createSink()).then(a => {
        e.start('pre').add(foam.json.Pretty.stringify(a.array));
      });
    }
  ]
});


foam.CLASS({
  package: 'foam.nanos.console',
  name: 'GroupByDAOAgent',
  extends: 'foam.nanos.console.AbstractDAOAgent',

  properties: [
    {
      name: 'prop',
      view: function(_, X) {
       return { class: 'foam.nanos.console.PropertyChoiceView', of: X.data.of };
      }
    },
    { name: 'sink', view: 'foam.nanos.console.SinkView' }
  ],

  methods: [
    function createSink() { return this.GROUP_BY(this.prop, this.sink.createSink()); },
    function addToE(e) {
      e.startContext({data: this}).start().style({display: 'flex'}).add(this.PROP, ', ', this.SINK);
    }
  ]
});


foam.CLASS({
  package: 'foam.nanos.console',
  name: 'GridByDAOAgent',
  extends: 'foam.nanos.console.AbstractDAOAgent',

  requires: [ 'foam.nanos.console.PropertyChoiceView' ],

  properties: [
    {
      name: 'prop1',
      view: function(_, X) {
       return { class: 'foam.nanos.console.PropertyChoiceView', of: X.data.of };
      }
    },
    {
      name: 'prop2',
      view: function(_, X) {
       return { class: 'foam.nanos.console.PropertyChoiceView', of: X.data.of };
      }
    },
    { name: 'sink', view: 'foam.nanos.console.SinkView' }
  ],

  methods: [
    function createSink() { return this.GROUP_BY(this.prop1, this.GROUP_BY(this.prop2, this.sink.createSink())); },
    function addToE(e) {
      e.startContext({data: this}).start().style({display: 'flex'}).add(this.PROP1, ', ', this.PROP2, ', ', this.SINK);
    }
  ]
});


foam.CLASS({
  package: 'foam.nanos.console',
  name: 'PieDAOAgent',
  extends: 'foam.nanos.console.GroupByDAOAgent',

  requires: [ 'foam.u2.mlang.Pie' ],

  methods: [
    function createSink() { return this.Pie.create({arg1: this.prop}); },
    function addToE(e) {
      e.startContext({data: this}).start().style({display: 'flex'}).add(this.PROP);
    }
  ]
});


foam.CLASS({
  package: 'foam.nanos.console',
  name: 'ViewDAOAgent',
  extends: 'foam.nanos.console.AbstractDAOAgent',

  methods: [
    function execute(e) {
      // TODO:
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
      // TODO:
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
      e.tag({class: 'foam.comics.v3.DAOView', data: this.unlimitedDAO});
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
      // TODO:
      return this.dao.select(o => e.tag(this.CitationView, {data: o}));
    }
  ]
});



foam.CLASS({
  package: 'foam.nanos.console',
  name: 'CellsDAOAgent',
  extends: 'foam.nanos.console.AbstractDAOAgent',

  requires: [ 'foam.nanos.console.CellsSink' ],

  methods: [
    function createSink() { return this.CellsSink.create({of: this.of}); }
  ]
});


foam.CLASS({
  package: 'foam.nanos.console',
  name: 'AllDAOAgent',
  extends: 'foam.nanos.console.AbstractDAOAgent',

  requires: [ 'foam.u2.CitationView' ],

  methods: [
    function execute(e) {
      foam.nanos.console.SinkView.AGENTS.forEach(a => {
        a = a[0];
        if ( a == 'All' ) return;
        if ( a == 'GroupBy' ) return;
        if ( a == 'GridBy' ) return;
        if ( a == 'Pie' ) return;

        var cls = foam.lookup(this.cls_.package + '.' + a + 'DAOAgent');
        var agent = cls.create({}, this);
        e.start('h2').add(a).end().start().call(function () { agent.execute(this); });
      });
    }
  ]
});
