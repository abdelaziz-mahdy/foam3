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

  cssTokens: [
    {
      name: 'backgroundTransition',
      value: 'background-color 0.15s ease'
    },
    {
      name: 'borderSize',
      value: '1px solid #D1D5D8'
    },
    {
      name: 'borderRadius',
      value: '$inputRadius'
    },
    {
      name: 'cellPadding',
      value: '.8rem 1rem'
    },
    {
      name: 'hoverColor',
      value: '#E1EFFE'
    },
    {
      name: 'headerBgColor',
      value: '#EEF2F6'
    },
    {
      name: 'rowHoverColor',
      value: '#F3F4F6'
    }
  ],

  css: `
    /* Base table styling */
    ^table { 
      border-collapse: separate; 
      border-spacing: 0;
      border-radius: $borderRadius;
      width: 100%;
      border: $borderSize;
    }
    
    /* Row styling */
    ^tr {
      border-bottom: $borderSize;
      transition: background-color 0.2s ease;
    }
    
    ^tr:hover {
      background-color: $rowHoverColor;
    }
    
    ^tr:last-child {
      border-bottom: none;
    }

    /* Header row */
    ^tr:first-child {
      background-color: $headerBgColor;
    }
    
    /* Cell styling - both TH and TD */
    ^th, ^td {
      padding: $cellPadding;
      transition: $backgroundTransition;
    }
    
    /* Header cells */
    ^th {
      font-weight: bold;
      background-color: $headerBgColor;
    }
    
    /* Data cells */
    ^td {
      border: none;
    }
    
    /* First column-cells styling */
    ^tr > ^th:first-child {
      border-right: $borderSize;
    }
    
    /* First row cells */
    ^tr:first-child > ^th {
      border-right: $borderSize;
    }
    
    ^tr:first-child > ^th:last-child {
      border-right: none;
    }
    
    /* Hover effects */
    ^th:hover, ^td:hover {
      background-color: $hoverColor;
      z-index: 1;
    }
    
    ^td:hover {
      font-weight: 600;
    }
    
    ^tr > ^th:first-child:hover {
      background-color: $rowHoverColor;
    }
  `,

  properties: [
    { name: 'x', postSet: function(o,n) { console.log('***x', n); } },
    { name: 'y', postSet: function(o,n) { console.log('***y', n); } }
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
            this.start('th').addClass(this.myClass('th')).add(c.toString()).on('click', () => self.x = c);
          }).
        end().
        forEach(data.rows.sortedKeys(), function(r) {
          var row = data.rows.groups[r];
          this.start('tr').addClass(self.myClass('tr')).on('click', () => self.y = r).
            start('th').addClass(self.myClass('th')).add(r).end().
            forEach(cols, function(c) {
              this.start('td').
                on('click', () => self.x = c).
                addClass(self.myClass('td')).
                add(row.groups[c] || '');
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
