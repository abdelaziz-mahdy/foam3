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
  name: 'MinDAOAgent',
  extends: 'foam.nanos.console.AbstractDAOAgent',

  properties: [
    {
      name: 'prop',
      view: function(_, X) {
       return { class: 'foam.nanos.console.PropertyChoiceView', of: X.data.of };
      }
    }
  ],

  methods: [
    function createSink() { return this.MIN(this.prop); },
    function addToE(e) {
      e.startContext({data: this}).start().style({display: 'flex'}).add(this.PROP);
    }
  ]
});


foam.CLASS({
  package: 'foam.nanos.console',
  name: 'MaxDAOAgent',
  extends: 'foam.nanos.console.MinDAOAgent',
  methods: [ function createSink() { return this.MAX(this.prop); } ]
});


foam.CLASS({
  package: 'foam.nanos.console',
  name: 'AvgDAOAgent',
  extends: 'foam.nanos.console.MinDAOAgent',
  methods: [ function createSink() { return this.AVG(this.prop); } ]
});


foam.CLASS({
  package: 'foam.nanos.console',
  name: 'SumDAOAgent',
  extends: 'foam.nanos.console.MinDAOAgent',
  methods: [ function createSink() { return this.SUM(this.prop); } ]
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

  requires: [ 'foam.nanos.console.JSONSink' ],

  methods: [
    function createSink() { return this.JSONSink.create({of: this.of}); }
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

  requires: [ 'foam.nanos.console.GridBy' ],

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
    { name: 'sink', view: { class: 'foam.nanos.console.SinkView', choice: 'Count' } }
  ],

  methods: [
    function createSink() { return this.GridBy.create({
      yFunc: this.prop1,
      xFunc: this.prop2,
      acc:   this.sink.createSink()
    }); },
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

  properties: [ { class: 'Int', name: 'radius', value: 50 } ],

  methods: [
    function createSink() {
      return this.Pie.create({arg1: this.prop, radius: this.radius});
    },
    function addToE(e) {
      e.startContext({data: this}).start().style({display: 'flex'}).
        add(' r:', this.RADIUS,' ', this.PROP);
    }
  ]
});


foam.CLASS({
  package: 'foam.nanos.console',
  name: 'ViewDAOAgent',
  extends: 'foam.nanos.console.AbstractDAOAgent',

  requires: [ 'foam.nanos.console.ViewSink' ],

  methods: [
    function createSink() { return this.ViewSink.create({arg1: this.prop}); },
  ]
});


foam.CLASS({
  package: 'foam.nanos.console',
  name: 'EditDAOAgent',
  extends: 'foam.nanos.console.AbstractDAOAgent',

  requires: [ 'foam.nanos.console.EditSink' ],

  methods: [
    function createSink() { return this.EditSink.create({arg1: this.prop}); },
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

  requires: [ 'foam.nanos.console.CitationSink' ],

  methods: [
    function createSink() { return this.CitationSink.create({of: this.of}); }
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
        if ( a == 'Min' ) return;
        if ( a == 'Max' ) return;
        if ( a == 'Sum' ) return;
        if ( a == 'Avg' ) return;

        var cls = foam.lookup(this.cls_.package + '.' + a + 'DAOAgent');
        var agent = cls.create({}, this);
        e.start('h2').add(a).end().start().call(function () { agent.execute(this); });
      });
    }
  ]
});
