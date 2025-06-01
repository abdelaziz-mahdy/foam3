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
    /* Base table styling */
    ^table { 
      border-collapse: separate; 
      border-spacing: 0;
      width: 100%;
      border: 1px solid $grey300;
    }
    
    /* Row styling */
    ^tr {
      border-bottom: 1px solid $grey300;
      transition: background-color 0.2s ease;
    }
    
    ^tr:hover {
      background-color: $primary200;
    }
    
    ^tr:last-child {
      border-bottom: none;
    }
    
    /* Cell styling - both TH and TD */
    ^td {
      border: none;
      padding: .8rem 1rem;
      transition: background-color 0.15s ease;
    }
    
    /* First column-cells styling */
    ^tr > ^td:first-child {
      font-weight: bold;
      border-right: 1px solid $grey300;
      background-color: $grey200;
    }
    
    /* Hover effects */
    ^td:hover {
      background-color: $primary100;
      z-index: 1;
    }
    
    ^tr > ^td:first-child:hover {
      background-color: $primary200;
    }
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
      this.start('table').addClass(this.myClass('table')).start('tbody').
        forEach(data.sortedKeys(), function(g) {
          this.start('tr').addClass(self.myClass('tr')).
            on('click', () => self.selection = g).
            start('td').addClass(self.myClass('td')).add(g.toString()).end().
            start('td').addClass(self.myClass('td')).add(groups[g]);
        });
    }
  ]
});
