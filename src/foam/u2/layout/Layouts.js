/**
 * @license
 * Copyright 2019 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.u2.layout',
  name: 'Rows',
  extends: 'foam.u2.Element',
  css: `
    ^ {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: stretch;
    }
  `,
  methods: [
    function render() {
      this.SUPER();
      this.addClass();
    }
  ]
});

foam.CLASS({
  package: 'foam.u2.layout',
  name: 'Cols',
  extends: 'foam.u2.Element',
  css: `
    ^ {
      display: flex;
      justify-content: space-between;
      align-items: stretch;
    }
  `,
  methods: [
    function render() {
      this.SUPER();
      this.addClass();
    }
  ]
});


foam.CLASS({
  package: 'foam.u2.layout',
  name: 'Layout',
  extends: 'foam.u2.Element',
  
  imports: [
    'setTimeout',
    'clearTimeout'
  ],
  
  requires: [
    'foam.u2.layout.ChildSize',
    'foam.u2.layout.SizeMode'
  ],
  
  documentation: 'Element that acts as a wrapper div, can change between flex and grid based on properties',
  css: `
    ^ {
      overflow: auto;
      align-items: stretch;
    }
    ^autoWidth[layoutType="column"] > * {
      width: 100%;
    }
  `,
  properties: [
    {
      name: 'tooltip',
      hidden: true
    },
    {
      class: 'String',
      name: 'layoutType',
      value: 'row',
      view: {
        class: 'foam.u2.view.ChoiceView',
        choices: [['row', 'Horizontal'], ['column', 'Vertical'], 'grid']
      },
      postSet: function(o, n) {
        if ( n === 'grid' ) {
          this.autoGap = false;
          this.align = ['stretch', 'stretch'];
        }
        // Update child styles when layout changes
        if ( o !== n ) {
          this.updateAllChildStyles && this.updateAllChildStyles();
        }
      }
    },
    {
      class: 'String',
      name: 'rows',
      value: 2,
      supportingLabel: 'Set to 0 for dynamic row sizing, rows will be sized by their biggest element',
      visibility: function(layoutType) {
        return layoutType !== 'grid' ? 'HIDDEN' : 'RW';
      }
    },
     {
      class: 'String',
      name: 'columns',
      value: 2,
       visibility: function(layoutType) {
        return layoutType !== 'grid' ? 'HIDDEN' : 'RW';
      }
    },
    {
      class: 'Boolean',
      name: 'autoGap',
      visibility: function(layoutType) {
        return layoutType === 'grid' ? 'HIDDEN' : 'RW' ;
      },
      postSet: function(_,n) {
        this.align = n ? 'flex-start': ['flex-start', 'flex-start'];
      }
    },
    {
      class: 'Boolean',
      name: 'autoWidth',
      value: false,
      documentation: 'When true, automatically distributes width based on layout type. Vertical layouts: children take full width. Horizontal layouts: children share width equally. Ignored when childSizes are specified.',
      visibility: function(layoutType, childSizes) {
        // Hide autoWidth if grid layout or if childSizes are specified for row layout
        if ( layoutType === 'grid' ) return 'HIDDEN';
        if ( layoutType === 'row' && childSizes && childSizes.length > 0 ) return 'HIDDEN';
        return 'RW';
      },
      postSet: function(o, n) {
        if ( o !== n ) {
          this.updateAllChildStyles && this.updateAllChildStyles();
        }
      }
    },
    {
      class: 'FObjectArray',
      of: 'foam.u2.layout.ChildSize',
      name: 'childSizes',
      documentation: 'Array of ChildSize objects defining size for each child element. Only applies to row layouts.',
      factory: function() { return []; },
      visibility: function(layoutType) {
        return layoutType === 'row' ? 'RW' : 'HIDDEN';
      },
      preSet: function(_, n) {
        // Allow string array shorthand
        if ( Array.isArray(n) && n.length > 0 && typeof n[0] === 'string' ) {
          return n.map(s => this.ChildSize.fromString(s));
        }
        // Allow number array shorthand (treated as flex values)
        if ( Array.isArray(n) && n.length > 0 && typeof n[0] === 'number' ) {
          return n.map(v => this.ChildSize.flex(v));
        }
        return n;
      },
      postSet: function(o, n) {
        this.updateAllChildStyles && this.updateAllChildStyles();
      }
    },
    {
      class: 'Int',
      name: 'gap',
      value: 10,
      visibility: function(autoGap) {
        return autoGap ? 'HIDDEN' : 'RW';
      }
    },
    {
      class: 'Array',
      name: 'align',
      // Hide until grid placement is fixed
      visibility: function(layoutType) {
        return layoutType === 'grid' ? 'HIDDEN' : 'RW' ;
      },
      view: function(_, X) {
        return {
          class: 'foam.u2.view.ChoiceView',
          choices$: X.data.slot(function(autoGap, layoutType) {
            if ( layoutType === 'grid' ) {
              return [
                [['stretch', 'stretch'], 'Fill'],
                [['start', 'start'],     'Top Left'],
                [['start', 'center'],    'Top Center'],
                [['start', 'end'],       'Top Right'],
                [['center', 'start'],    'Center Left'],
                [['center', 'center'],   'Center'],
                [['center', 'end'],      'Center Right'],
                [['end', 'start'],       'Bottom Left'],
                [['end', 'center'],      'Bottom Center'],
                [['end', 'end'],         'Bottom Right']
              ]
            }
            if ( autoGap ) {
              return layoutType == 'row' ? [
                ['flex-start', 'Top'], ['center', 'Center'], ['flex-end', 'Bottom']
              ] : [
                ['flex-start', 'Left'], ['center', 'Center'], ['flex-end', 'Right']
              ];
            }
            return [
              [['flex-start', 'flex-start'], 'Top Left'],
              [['flex-start', 'center'],     'Top Center'],
              [['flex-start', 'flex-end'],   'Top Right'],
              [['center', 'flex-start'],     'Center Left'],
              [['center', 'center'],         'Center'],
              [['center', 'flex-end'],       'Center Right'],
              [['flex-end', 'flex-start'],   'Bottom Left'],
              [['flex-end', 'center'],       'Bottom Center'],
              [['flex-end', 'flex-end'],     'Bottom Right']
            ];
          })
        };
      }
    },
    {
      // redefined here to control the property order, to show it last
      name: 'shown',
    }
  ],
  
  methods: [
    function init() {
      this.SUPER();
    },
    
    function add() {
      // Call parent add to actually add the child
      const result = this.SUPER.apply(this, arguments);
      
      // Schedule style update after current execution
      if ( ! this.styleUpdateScheduled_ ) {
        this.styleUpdateScheduled_ = true;
        Promise.resolve().then(() => {
          this.styleUpdateScheduled_ = false;
          this.updateAllChildStyles();
        });
      }
      
      return result;
    },
    
    function render() {
      this.SUPER();
      this.addClass();
      this.enableClass(this.myClass('autoWidth'), this.autoWidth$);
      this.attrs({ layoutType: this.layoutType$ });
      this.style({
        display: this.layoutType$.map(v => v != 'grid' ? 'flex' : v),
        'flex-direction': this.layoutType$.map(v => v != 'grid' ? v : 'unset'),
        'grid-template-rows': this.slot(function(rows, layoutType) {
          return layoutType === 'grid' ? rows <= 0 ? 'max-content' : `repeat(${rows}, minmax(0, 1fr))` : 'unset';
        }),
        'grid-template-columns': this.slot(function(columns, layoutType) {
          return layoutType === 'grid' ? columns <= 0 ? 'max-content' : `repeat(${columns}, minmax(0, 1fr))` : 'unset';
        }),
        gap: this.slot(function(gap, autoGap) {
          return autoGap ? 'initial' : gap + 'px';
        }),
        'justify-content': this.slot(function(align, autoGap, layoutType) {
          if ( layoutType === 'grid' ) return  'unset';
          return autoGap ? 'space-between' : align[(layoutType === 'row' ? 1 : 0)];
        }),
        'justify-items': this.slot(function(align, layoutType) {
          if ( layoutType === 'grid' ) return align[1];
          return 'unset';
        }),
        'align-items': this.slot(function(align, layoutType, autoGap){
          if ( layoutType === 'grid' ) return  align[0];
          return autoGap ? align : align[(layoutType === 'row' ? 0 : 1)];
        })
      });
    },
    
    function applyChildStyle(child, index) {
      console.log('Layout: applyChildStyle called for child', index, 'child:', child);
      
      if ( ! child ) {
        console.log('  -> Child is null/undefined');
        return;
      }
      
      if ( ! child.style ) {
        console.log('  -> Child has no style method, child is:', child.cls_ ? child.cls_.id : typeof child);
        return;
      }
      
      console.log('Layout: Applying style to child', index, 
                  'layoutType:', this.layoutType,
                  'autoWidth:', this.autoWidth,
                  'childSizes.length:', this.childSizes ? this.childSizes.length : 0);
      
      if ( this.layoutType === 'column' && this.autoWidth ) {
        console.log('  -> Setting width: 100%');
        child.style({ width: '100%' });
      } else if ( this.layoutType === 'row' ) {
        console.log('  -> Row layout detected');
        if ( this.childSizes && this.childSizes.length > 0 && this.childSizes[index] ) {
          const size = this.childSizes[index];
          console.log('  -> Found childSize at index', index, ':', size);
          if ( size ) {
            const flexValue = size.toCSSFlex();
            console.log('  -> Setting flex:', flexValue, 'from childSizes[' + index + ']');
            child.style({ flex: flexValue });
          }
        } else if ( this.autoWidth && ( ! this.childSizes || this.childSizes.length === 0 ) ) {
          console.log('  -> Setting flex: 1 1 0 (autoWidth=true, no childSizes)');
          child.style({ flex: '1 1 0' });
        } else {
          console.log('  -> No style applied (autoWidth:', this.autoWidth, ', childSizes:', this.childSizes, ')');
        }
      } else {
        console.log('  -> Not row or column with autoWidth');
      }
    },
    
    function updateAllChildStyles() {
      // Use childNodes which are the actual FOAM elements
      if ( ! this.childNodes || ! this.childNodes.length ) {
        console.log('Layout: No childNodes to style');
        return;
      }
      
      console.log('Layout: Styling', this.childNodes.length, 'children with', 
                  'layoutType:', this.layoutType, 
                  'autoWidth:', this.autoWidth,
                  'childSizes:', this.childSizes);
      
      this.childNodes.forEach((child, index) => {
        this.applyChildStyle(child, index);
      });
    }
  ]
});
