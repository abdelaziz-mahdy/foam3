/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.mlang.sink',
  name: 'GroupByView',
  extends: 'foam.u2.View',

  css: `
    ^td { text-align: right; }
    ^ table { border-collapse: collapse; }
  `,

  properties: [
    { name: 'selection' }
  ],

  methods: [
    function render(e) {
      var self = this;
      var data = this.data;

      this.addClass();

      var groups = data.groups;
      this.start('table').start('tbody').
        forEach(data.sortedKeys(), function(g) {
          this.start('tr').
            on('click', () => self.selection = g).
            start('td').add(g.toString()).end().
            start('td').add(groups[g]);
        });
    }
  ]
});
