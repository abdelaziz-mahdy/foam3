/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */


foam.CLASS({
  package: 'foam.core.reflow',
  name: 'ReflowToolBar',
  extends: 'foam.u2.View',

  requires: [
    'foam.core.reflow.DynamicReflowData',
    'foam.core.reflow.DynamicReflowComponents'
  ],

  css: `
    ^ {
      position: absolute;
      left: 35%;
      bottom: 50;
      z-index: 100;
    }
    ^island-holder {
      display: flex;
      flex-direction: column;
      gap: 10px;
      z-index: 100;
    }
    ^holder {
      padding: 10px;
      background-color: $white;
      border-radius: 4px;
      border: 1px solid $grey200;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      z-index: 100;
    }
    
    ^button-group {
      display: flex;
      gap: 10px;      
      align-items: center;
    }
    ^ .foam-u2-ActionView {
      border: none;
      box-shadow: none;
    }
    ^ .foam-u2-ActionView.selected {
      background-color: $primary500;
      color: $white!important;
    }
    ^ .foam-u2-ActionView.selected:hover {
      background-color: $primary500;
      color: $white!important;
    }
  `,

  properties: [
    {
      name: 'selected',
      value: null
    }
  ],

  methods: [
    function render() {
      var self = this;
      const actions = this.cls_.getAxiomsByClass(foam.lang.Action);
      this.addClass()
      .start().addClass(this.myClass('island-holder'))
        .add(this.dynamic(function(selected) {
          if (selected == 'collections') {
            this.start().addClass(self.myClass('expanded-island'), self.myClass('holder'))
              .start(self.DynamicReflowData, { data: self.data })
            .end();
          }
          if (selected == 'components') {
            this.start().addClass(self.myClass('expanded-island'), self.myClass('holder'))
              .start(self.DynamicReflowComponents, { data: self.data })
            .end();
          }
        }))
        .start().addClass(this.myClass('holder'))
            .add(this.dynamic(function(selected) {
              this.start().addClass(self.myClass('button-group'))
                .startContext({ data: self })
                  .forEach(actions, function(action) {
                    this.start(action).enableClass('selected', selected === action.name).end();
                  })
                .endContext()
              .end();
            }))
        .end()
      .end();
    }
  ],

  actions: [
    {
      name: 'collections',
      label: 'Data',
      buttonStyle: foam.u2.ButtonStyle.SECONDARY,
      size: 'SMALL',
      themeIcon: 'file',
      code: function() {
        if ( this.selected === 'collections' ) {
          this.selected = null;
        } else {
          this.selected = 'collections';
        }
      }
    },
    {
      name: 'components',
      label: 'Components',
      buttonStyle: foam.u2.ButtonStyle.SECONDARY,
      size: 'SMALL',
      themeIcon: 'plus',
      code: function() {
        if ( this.selected === 'components' ) {
          this.selected = null;
        } else {
          this.selected = 'components';
        }
      }
    },
    {
      name: 'utilities',
      label: 'Utilities',
      buttonStyle: foam.u2.ButtonStyle.SECONDARY,
      size: 'SMALL',
      themeIcon: 'star',
      code: function() {
        if ( this.selected === 'utilities' ) {
          this.selected = null;
        } else {
          this.selected = 'utilities';
        }
      }
    },
    {
      name: 'help',
      label: 'Help',
      buttonStyle: foam.u2.ButtonStyle.SECONDARY,
      themeIcon: 'helpIcon',
      size: 'SMALL',
      code: function() {
        if ( this.selected === 'help' ) {
          this.selected = null;
        } else {
          this.selected = 'help';
        }
      }
    }
  ]
});