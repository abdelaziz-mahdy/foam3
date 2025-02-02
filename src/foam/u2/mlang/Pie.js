/**
 * @license
 * Copyright 2019 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.u2.mlang',
  name: 'Pie',
  extends: 'foam.mlang.sink.GroupBy',

  requires: [
    'foam.graphics.DataSource',
    'foam.graphics.PieGraph'
  ],

  properties: [
    // TODO: When these defaults are no longer necessary, move these args into
    // their own class and add them as a trait to this model so any new args
    // used by PieGraph are automatically picked up by this model.
    [ 'graphColors', [ '#d81e05', '$black', '#59a5d5', '#2cab70' ] ],
    { name: 'width',  factory: function() { return this.radius * 3.5; }, transient: true },
    { name: 'height', factory: function() { return this.radius * 3.5; }, transient: true },
    [ 'margin', 1.5 ],
    { class: 'Int', name: 'radius', value: 50 },
    { name: 'x', factory: function() { return this.radius * 0.75; }, transient: true },
    { name: 'y', factory: function() { return this.radius * 0.75; }, transient: true },
    {
      name: 'graph_',
      expression: function(groups) {
        var seriesValues = Object.values(groups).map(function(sink) {
          return sink.value;
        });
        if ( ! seriesValues.length ) seriesValues = [0];
        var p = this.PieGraph.create(this);
        p.seriesValues = seriesValues;
        return p;
      }
    }
  ],

  methods: [
    function toE(_, x) { return x.E().add(this.graph_$); },
    function addToE(e) { e.add(this.graph_$); }
  ]
});
