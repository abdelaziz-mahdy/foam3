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
  documentation: 'Element that acts as a wrapper div, can change between flex and grid based on properties',
  css: `
    ^ {
      overflow: auto;
      align-items: stretch;
    }
    ^autoWidth[layoutType="column"] > * {
      width: 100%;
    }
    ^autoWidth[layoutType="row"] > * {
      flex: 1 1 auto;
      min-width: 0;
      overflow: auto;
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
      postSet: function(_,n) {
        if ( n === 'grid' ) {
          this.autoGap = false;
          this.align = ['stretch', 'stretch'];
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
      value: true,
      documentation: 'When true, automatically distributes width based on layout type. Vertical layouts: children take full width. Horizontal layouts: children share width equally.',
      visibility: function(layoutType) {
        return layoutType === 'grid' ? 'HIDDEN' : 'RW';
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
    },
  ],
  methods: [
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
    }
  ]
});
