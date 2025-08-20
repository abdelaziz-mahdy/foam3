/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.core.reflow',
  name: 'PivotByView',
  extends: 'foam.u2.View',

  documentation: 'Table View for PivotBy',

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
      text-align: center;
      padding: .8rem 1rem;
      transition: background-color 0.15s ease;
      border: 1px solid $borderDefault;
    }

    /* Header cells */
    ^th {
      background-color: $backgroundDefault;
      font-weight: bold;
      text-wrap-mode: nowrap;
    }
      
    ^td:hover {
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
      // get rows/cols as simple nested dictionary instead of groupbys
      var rowsDict = this.makeDictionary(this.data.rows);
      // get cols from rows only returns the cols which actually have corresponding row data instead of using data cols
      var colsDict = colDepth > 0 ? this.getColsFromRows(this.data.rows, 0, {}, rowDepth, this.data.cols) : null;

      var table = this.start('table').addClass(this.myClass('table'));
      this.renderColHeaders(table, colsDict, [], 0, rowDepth, colDepth);
      if ( ! this.data.rows ) 
        this.renderColVals(table, colsDict);
      else
        this.renderRows(table, rowsDict, 0, rowDepth);
      table.end();
    },

    function renderColHeaders(table, cols, rows, depth, rowDepth, colDepth, keyPrefix) {
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
          var childKeysSpan = 
            this.renderColHeaders(table, cols[c], rows, depth + 1, rowDepth, colDepth, keyPrefix + c);
          colSpans.push(childKeysSpan);
        });
      }
      for ( var i = 0; i < keys.length; i++ ) {
        var colSpan = hasChildren ? colSpans[i] : 1;
        const key = keyPrefix + keys[i];
        rows[depth].start('th')
          .addClass(this.myClass('th'))
          .attrs({ 'colspan' : colSpan  })
          .on('mouseover', () => this.onCellMouseOver(key, null))
          .on('mouseleave', () => this.onCellMouseLeave())
          .enableClass(this.myClass('highlighted-col'), this.slot((currentHoverCol) => currentHoverCol === key || currentHoverCol?.startsWith(key) || key.startsWith(currentHoverCol)))
          .add(keys[i])
        .end();
        if ( depth == colDepth - 1 ) this.colIndexMap.push(key);

      }
      if ( depth === 0 ) rows.forEach(r => r.end());
      return hasChildren ? 
        colSpans.reduce((x,y) => x + y, 0) :
        keys.length;
    },

    function renderRows(table, rows, currDepth, rowDepth, prefix = '') {
      var rowKeys = Object.keys(rows);
      if ( currDepth == rowDepth ) {
        return 1;
      }
      var rowSpans = [];
      var retData = { rowSpan: 1, row: null };
      for ( var i = 0; i < rowKeys.length; i++ ) {
        const key = prefix + rowKeys[i];
        if ( currDepth < rowDepth - 1 ) {
          var ret = this.renderRows(table, rows[rowKeys[i]], currDepth + 1, rowDepth, key);
          if ( ret.row ) {
            var el = foam.u2.Element.create({nodeName: 'th'});
            el.attrs({ 'rowspan' : ret.rowSpan })
              .addClass(this.myClass('th'))
              .add(rowKeys[i])
              .on('mouseover', () => this.onCellMouseOver(null, key))
              .on('mouseleave', () => this.onCellMouseLeave())
              .enableClass(this.myClass('highlighted-row'), this.slot((currentHoverRow) => currentHoverRow === key || key.startsWith(currentHoverRow) || currentHoverRow?.startsWith(key) ));
            ret.row.insertBefore(el, ret.row.children[0]);
            if ( i == 0 ) retData.row = ret.row;
          }
          rowSpans.push(ret.rowSpan);
        } else {
          var row = table.start('tr').addClass(this.myClass('tr'))
          row.start('th')
            .addClass(this.myClass('th'))
            .on('mouseover', () => this.onCellMouseOver(null, key))
            .on('mouseleave', () => this.onCellMouseLeave())
            .enableClass(this.myClass('highlighted-col'), this.slot((currentHoverRow) => currentHoverRow === key || key.startsWith(currentHoverRow) || currentHoverRow?.startsWith(key) ))
            .add(rowKeys[i])
            .end();
          if ( this.colIndexMap?.length ) {
            var map = this.flattenMap(rows[rowKeys[i]], this.data.xFunc.length);
            row.forEach(this.colIndexMap, col => {
              const c = col;
              row.start('td')
                .addClass(this.myClass('td'))
                .on('mouseover', () => this.onCellMouseOver(c, key))
                .on('mouseleave', () => this.onCellMouseLeave())
                .enableClass(
                  this.myClass('highlighted-col'),
                  this.slot((currentHoverCol, currentHoverRow) => {
                    var ret = currentHoverCol === c || currentHoverRow === key
                      || c.startsWith(currentHoverCol) || key.startsWith(currentHoverRow);
                    return ret;
                  }))
                .add(map[c] || '')
              .end();
            })
          } else {
            row.start('td')
              .addClass(this.myClass('td'))
              .on('mouseover', () => this.onCellMouseOver(null, key))
              .on('mouseleave', () => this.onCellMouseLeave())
              .enableClass(
                this.myClass('highlighted-col'),
                this.slot((currentHoverRow) => currentHoverRow === key || key.startsWith(currentHoverRow) ))
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

    function renderColVals(table, cols) {
      cols = this.flattenMap(cols, this.data.xFunc.length);
      var row = table.start('tr').addClass(this.myClass('tr'));
      for ( const key in cols ) {
        const val = cols[key];
        row.start('td')
          .addClass(this.myClass('td'))
          .on('mouseover', () => this.onCellMouseOver(key, null))
          .on('mouseleave', () => this.onCellMouseLeave())
          .enableClass(
            this.myClass('highlighted-col'),
            this.slot((currentHoverCol ) => {
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
      for ( var i = 0; i < keys.length; i++ ) {
        ret[keys[i]] = this.makeDictionary(data.groups[keys[i]]);
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
    function flattenMap(obj, colDepth, prefix = '') {
      var map = {};
      for (var key in obj) {
        var val = obj[key];
        if ( colDepth > 1 && typeof val === 'object' && val !== null ) {
          Object.assign(map, this.flattenMap(val, colDepth - 1, prefix + key));
        } else {
          map[prefix + key] = val;
        }
      }
      return map;
    },

    function onCellMouseOver(col, row) {
      if ( col ) this.currentHoverCol = col;
      if ( row ) this.currentHoverRow = row;
    },
    
    function onCellMouseLeave() {
      this.currentHoverCol = undefined;
      this.currentHoverRow = undefined;
    }
  ]
});
