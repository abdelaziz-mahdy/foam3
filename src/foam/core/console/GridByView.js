/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.core.console',
  name: 'GridByView',
  extends: 'foam.u2.View',

  documentation: 'Table View for GridBy mLang.',

  css: `
    /* Base table styling */
    ^table {
      border-collapse: collapse;
      border-spacing: 0;
      border: 1px solid $grey300;
    }

    /* Row styling */
    ^tr {
      border-bottom: 1px solid $grey300;
      transition: background-color 0.2s ease;
    }

    /* Header row */
    ^tr:first-child {
      background-color: $grey200;
    }

    /* Cell styling - both TH and TD */
    ^th, ^td {
      padding: .8rem 1rem;
      transition: background-color 0.15s ease;
      border: 1px solid $grey300;
    }

    /* Header cells */
    ^th {
      background-color: $grey200;
      font-weight: bold;
      text-align: left;
      text-wrap-mode: nowrap;
    }
    
    /* Cell highlighting */
    ^highlighted-cell {
      background-color: $primary100;
    }

    /* Row highlighting */
    ^highlighted-row, ^highlighted-row > th, ^highlighted-row > td {
      background-color: $primary100;
    }
  `,

  properties: [
    { name: 'x' },
    { name: 'y' },
    { name: 'currentHoverCol' },
    { name: 'currentHoverRow' }
  ],

  methods: [
    function render(e) {
      var self = this;
      var data = this.data;

      this.addClass();

      var cols = data.cols.sortedKeys();
      this.start('table').
        addClass(this.myClass('table')).
        start('tr').addClass(this.myClass('tr')).
          start('th').addClass(this.myClass('th')).end().
          forEach(cols, function(c) {
            this.start('th')
              .addClass(this.myClass('th'))
              .add(c.toString())
              .on('click', () => { self.x = c; self.y = undefined; })
              .on('mouseover', () => self.currentHoverCol = c)
              .on('mouseleave', function() { self.currentHoverCol = undefined; self.currentHoverRow = undefined; })
              .enableClass(self.myClass('highlighted-cell'), self.slot((currentHoverCol) => currentHoverCol === c));
          }).
        end().
        forEach(data.rows.sortedKeys(), function(r) {
          var row = data.rows.groups[r];
          this.start('tr')
            .addClass(self.myClass('tr'))
            .on('click', () => self.y = r)
            .on('mouseover', () => self.currentHoverRow = r)
            .on('mouseleave', () => self.currentHoverRow = undefined)
            .enableClass(self.myClass('highlighted-row'), self.slot((currentHoverRow) => currentHoverRow === r))
            .start('th')
              .on('click', () => { self.y = r; self.x = undefined; })
              .on('mouseover', () => self.currentHoverRow = r)
              .addClass(self.myClass('th'))
              .enableClass(self.myClass('highlighted-cell'), self.slot((currentHoverRow) => currentHoverRow === r))
              .add(r)
            .end().
            forEach(cols, function(c) {
              this.start('td')
                .on('click', (e) => { self.x = c; self.y = r; e.stopPropagation(); })
                .on('mouseover', function() { self.currentHoverCol = c; self.currentHoverRow = r; })
                .on('mouseleave', function() { self.currentHoverCol = undefined; self.currentHoverRow = undefined; })
                .enableClass(self.myClass('highlighted-cell'), self.slot((currentHoverCol, currentHoverRow) => currentHoverCol === c || currentHoverRow === r))
                .add(row.groups[c] || '');
            }).
            end();
        });
    }

    /*
    renderCell: function(x, y, value) {
      var str = value ? (value.toHTML ? value.toHTML() : value) : '';
      if ( value && value.toHTML && value.initHTML ) this.children.push(value);
      return '<td>' + str + '</td>';
    },
    sortAxis: function(values, f) { return values.sort(f.compareProperty); },
    sortCols: function(cols, xFunc) { return this.sortAxis(cols, xFunc); },
    sortRows: function(rows, yFunc) { return this.sortAxis(rows, yFunc); },
    sortedCols: function() {
      return this.sortCols(
        this.cols.groupKeys,
        this.xFunc);
    },
    sortedRows: function() {
      return this.sortRows(
        this.rows.groupKeys,
        this.yFunc);
    },
    toHTML_: function() {
      return this;
    },
    toHTML: function() {
      var out;
      this.children = [];
      var cols = this.cols.groups;
      var rows = this.rows.groups;
      var sortedCols = this.sortedCols();
      var sortedRows = this.sortedRows();

      out = '<table border=0 cellspacing=0 class="gridBy"><tr><th></th>';

      for ( var i = 0 ; i < sortedCols.length ; i++ ) {
        var x = sortedCols[i];
        var str = x.toHTML ? x.toHTML() : x;
        out += '<th>' + str + '</th>';
      }
      out += '</tr>';

      for ( var j = 0 ; j < sortedRows.length ; j++ ) {
        var y = sortedRows[j];
        out += '<tr><th>' + y + '</th>';

        for ( var i = 0 ; i < sortedCols.length ; i++ ) {
          var x = sortedCols[i];
          var value = rows[y].groups[x];
          if ( value ) {
            value.x = x;
            value.y = y;
          }
          out += this.renderCell(x, y, value);
        }

        out += '</tr>';
      }
      out += '</table>';

      return out;
    },

    initHTML: function() {
      for ( var i = 0; i < this.children.length; i++ ) {
        this.children[i].initHTML();
      }
      this.children = [];
    }
  */
  ]
});
