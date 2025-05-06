/**
 * @license
 * Copyright 2019 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.u2.mlang',
  name: 'Table',
  extends: 'foam.dao.ArraySink',

  requires: [
    'foam.dao.MDAO',
    'foam.u2.table.TableView'
  ],

  properties: [
    {
      class: 'StringArray',
      name: 'columns'
    }
  ],

  methods: [
    function toE(_, x) { return this.addToE(x.E()); },

    function addToE(e) {
      var self = this;
      var of   = this.array[0].cls_;
      var dao  = this.MDAO.create({of: of});

      this.array.forEach(a => dao.put(a));

      e.add(this.dynamic(function(columns) {
        if ( ! self.array.length ) {
          e.add('No results');
          return;
        }

        var view = self.TableView.create({ data: dao });

        if ( columns.length ) {
          view.columns = columns.map(function(c) { return of.getAxiomByName(c) });
        }

        e.tag(view).style({width: '100%'});
      }));
    }
  ]
});
