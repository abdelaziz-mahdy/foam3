/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.core.reflow',
  name: 'PivotByView',
  extends: 'foam.u2.View',

  documentation: 'Table View for GridBy mLang.',

  cssTokens: [
    {
      class: 'foam.u2.ColorToken',
      name: 'highlightRowCol',
      value: '$backgroundBrandTertiary'
    },
    {
      class: 'foam.u2.ColorToken',
      name: 'highlightCell',
      value: '$backgroundBrand'
    }
  ],

  css: `
    /* Base table styling */
    ^table {
      border-collapse: collapse;
      border-spacing: 0;
      border: 1px solid $borderStrong;
    }

    /* Row styling */
    ^tr {
      transition: background-color 0.2s ease;
    }

    /* Header row */
    ^tr:first-child {
      background-color: $backgroundDefault;
    }

    /* Cell styling - both TH and TD */
    ^th, ^td {
      padding: .8rem 1rem;
      transition: background-color 0.15s ease;
      border: 1px solid $borderDefault;
    }

    /* Header cells */
    ^th {
      background-color: $backgroundDefault;
      font-weight: bold;
      text-align: center;
      text-wrap-mode: nowrap;
    }
      
    ^ td:hover {
      font-weight: 600;
      background: $highlightCell;
      color: $highlightCell$foreground;
    }
    
    ^highlighted-col {
      background: $highlightRowCol;
      color: $highlightRowCol$foreground;
    }

    /* Row highlighting */
    ^highlighted-row, ^highlighted-row > th, ^highlighted-row > td {
      background: $highlightRowCol;
      color: $highlightRowCol$foreground;
    }
  `,

  properties: [
    { name: 'currentHoverCol' },
    { name: 'currentHoverRow' },
    { name: 'colIndexMap' }
  ],

  methods: [
    function render() {
      this.colIndexMap = [];
      var self = this;
      var rowDepth = this.data.yFunc.length;
      var colDepth = this.data.xFunc.length;
      var rowsDict = this.makeDictionary(this.data.rows);
      var colsDict = colDepth > 0 ? this.getColsFromRows(this.data.rows, 0, {}, rowDepth, this.data.cols) : null;
      var table = this.start('table').addClass(this.myClass('table'));
      this.renderColHeaders(self, table, colsDict, [], 0, rowDepth, colDepth);
      if ( ! this.data.rows ) 
        this.renderColVals(self, table, colsDict);
      else
        this.renderRows(self, table, rowsDict, 0, rowDepth);
      table.end();
    },

    function renderColHeaders(self, table, cols, rows, depth, rowDepth, colDepth, keyPrefix) {
      if ( ! cols ) return;
      if ( ! keyPrefix ) keyPrefix = '';
      var row;
      if ( rows.length < depth + 1 ) {
        row = table.start('tr').addClass(this.myClass('tr'));
        if ( depth == 0 && rowDepth && colDepth ) row.start('th').addClass(this.myClass('th')).attrs({ 'colspan' : rowDepth, 'rowspan' : colDepth }).add('').end();
        rows.push(row);
      }
      row = rows[depth];
      var keys = Object.keys(cols).sort();
      var hasChildren = keys.some(c => cols[c] instanceof Object && Object.keys(cols[c]).length);
      var colSpans = [];
      if ( hasChildren ) {
        keys.forEach(c => {
          childKeysSpan = 
            this.renderColHeaders(self, table, cols[c], rows, depth + 1, rowDepth, colDepth, keyPrefix + c);
          colSpans.push(childKeysSpan);
        });
      }
      for ( var i = 0; i < keys.length; i++ ) {
        var colSpan = hasChildren ? colSpans[i] : 1;
        const key = keyPrefix + keys[i];
        rows[depth].start('th')
          .addClass(this.myClass('th'))
          .attrs({ 'colspan' : colSpan  })
          .on('mouseover', () => self.currentHoverCol = key)
          .on('mouseleave', function() { self.currentHoverCol = undefined; self.currentHoverRow = undefined; })
          .enableClass(self.myClass('highlighted-col'), self.slot((currentHoverCol) => currentHoverCol === key || currentHoverCol?.startsWith(key) || key.startsWith(currentHoverCol)))
          .add(keys[i].toString())
        .end();
        if ( depth == colDepth - 1 ) this.colIndexMap.push(key);

      }
      if ( depth = 0 ) rows.forEach(r => r.end());
      return hasChildren ? 
        colSpans.reduce((x,y) => x + y, 0) :
        keys.length;
    },

    function renderRows(self, table, rows, currDepth, rowDepth, prefix = '') {
      var rowKeys = Object.keys(rows);
      if ( currDepth == rowDepth ) {
        return 1;
      }
      var rowSpans = [];
      var retData = { rowSpan: 1, row: null };
      for ( var i = 0; i < rowKeys.length; i++ ) {
        const key = prefix + rowKeys[i];
        if ( currDepth < rowDepth - 1 ) {
          ret = renderRows(self, table, rows[rowKeys[i]], currDepth + 1, rowDepth, key);
          if ( ret.row ) {
            var el = foam.u2.Element.create({nodeName: 'th'});
            el.attrs({ 'rowspan' : ret.rowSpan })
              .addClass(self.myClass('th'))
              .add(rowKeys[i].toString())
              .on('mouseover', () => self.currentHoverRow = key)
              .on('mouseleave', () => self.currentHoverRow = undefined)
              .enableClass(self.myClass('highlighted-row'), self.slot((currentHoverRow) => currentHoverRow === key || key.startsWith(currentHoverRow) || currentHoverRow?.startsWith(key) ));
            ret.row.insertBefore(el, ret.row.children[0]);
            if ( i == 0 ) retData.row = ret.row;
          }
          rowSpans.push(ret.rowSpan);
        } else {
          var row = table.start('tr').addClass(self.myClass('tr'))
          row.start('th')
            .addClass(self.myClass('th'))
            .on('mouseover', () => self.currentHoverRow = key)
            .on('mouseleave', function() { self.currentHoverCol = undefined; self.currentHoverRow = undefined; })
            .enableClass(self.myClass('highlighted-col'), self.slot((currentHoverRow) => currentHoverRow === key || key.startsWith(currentHoverRow) || currentHoverRow?.startsWith(key) ))
            .add(rowKeys[i].toString())
            .end();
          if ( self.colIndexMap?.length ) {
            var map = self.flattenMap(rows[rowKeys[i]]);
            row.forEach(self.colIndexMap, function(col) {
              const c = col;
              row.start('td')
                .addClass(self.myClass('td'))
                .on('mouseover', function() { self.currentHoverCol = c; self.currentHoverRow = key; })
                .on('mouseleave', function() { self.currentHoverCol = undefined; self.currentHoverRow = undefined; })
                .enableClass(
                  self.myClass('highlighted-col'),
                  self.slot((currentHoverCol, currentHoverRow) => {
                    var ret = currentHoverCol === c || currentHoverRow === key
                      || c.startsWith(currentHoverCol) || key.startsWith(currentHoverRow);
                    return ret;
                  }))
                .add(map[c] || '')
              .end();
            })
          } else {
            row.start('td')
              .addClass(self.myClass('td'))
              .on('mouseover', function() { self.currentHoverRow = key; })
              .on('mouseleave', function() { self.currentHoverCol = undefined; self.currentHoverRow = undefined; })
              .enableClass(
                self.myClass('highlighted-col'),
                self.slot((currentHoverRow) => currentHoverRow === key || key.startsWith(currentHoverRow) ))
              .add(rows[rowKeys[i]])
            .end();
          }
          row.end();
          if ( i == 0 ) retData.row = row;
          rowSpans.push(1);
        } 
      }
      retData.rowSpan = rowSpans.reduce((x, y) => x + y, 0);
      return retData;
    },

    function renderColVals(self, table, cols) {
      cols = this.flattenMap(cols);
      var row = table.start('tr').addClass(self.myClass('tr'));
      for ( const key in cols ) {
        const val = cols[key];
        row.start('td')
          .addClass(self.myClass('td'))
          .on('mouseover', function() { self.currentHoverCol = key; })
          .on('mouseleave', function() { self.currentHoverCol = undefined; self.currentHoverRow = undefined; })
          .enableClass(
            self.myClass('highlighted-col'),
            self.slot((currentHoverCol ) => {
              var ret = currentHoverCol === key || key.startsWith(currentHoverCol);
              return ret;
            }))
          .add(val)
        .end();
      }
      row.end();
    },

    // convert the nested groupbys into a simpler nested dictionary
    function makeDictionary(data) {
      if ( ! foam.mlang.sink.GroupBy.isInstance(data) ) return data?.value || data;
      var ret = {};
      var keys = data.sortedKeys();
      if ( ! keys.length ) return null;
      for ( var i = 0; i < keys.length; i++ ) {
        ret[keys[i]] = makeDictionary(data.groups[keys[i]]);
      }
      return ret;
    },

    // collect the col keys that actually appear in the row data
    function getColsFromRows(rows, currDepth, cols, depth, colData) {
      if ( ! rows ) return this.makeDictionary(colData);
      var keys = rows?.sortedKeys() || [];
      if ( currDepth === depth ) {
        keys.forEach(key => {
          if ( ! cols[key] ) cols[key] = {};
          this.addToColsHelper(cols[key], rows.groups[key]);
        })
      } else {
        keys.forEach(key => {
          this.getColsFromRows(rows.groups[key], currDepth + 1, cols, depth);
        })
      }
      return cols;
    },
    function addToColsHelper(ret, toMerge) {
      if ( ! this.GroupBy.isInstance(toMerge) ) return;
      var keys = toMerge.sortedKeys();
      keys.forEach(key => {
        if ( typeof toMerge.groups[key] === 'object' && toMerge[key] !== null ) {
          if ( ! ret[key] ) ret[key] = {};
          this.addToColsHelper(ret[key], toMerge.groups[key]);
        } else {
          ret[key] = toMerge.groups[key];
        }
      })
    },

    // flatten a nested map into a simple one, where the keys are paths of the nested vals
    function flattenMap(obj, prefix = '') {
      if ( ! Object.keys(obj)?.length ) return null;
      var map = {};
      for (var key in obj) {
        var val = obj[key];
        if (typeof val === 'object' && val !== null) {
          Object.assign(map, flattenMap(val, prefix + key));
        } else {
          map[prefix + key] = val;
        }
      }
      return map;
    }
  ]
});
