/**
 * @license
 * Copyright 2024 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.core.reflow',
  name: 'FlowableTree',
  extends: 'foam.u2.View',

  css: `
    ^ {
      width: 100%;
    }
    ^ table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 10px;
    }
    ^ table td {
      display: flex;
      justify-content: space-between;
      padding: 10px 8px;
      align-items: center;
      cursor: pointer;
      border: 1px solid $borderLight;
      border-radius: 4px;
    }

    ^ table td .close button {
      padding: 4px;
    }

    ^selected {
      background: $backgroundTertiary;
      font-weight: 500;
    }
    ^error {
      background: $backgroundDestructiveTertiary;
      color: $textDestructive;
    }
    ^left-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px;
      border-bottom: 1px solid $borderLight;
      font-weight: bold;
      font-size: 16px;
    }

    ^icon-holder {
      display: flex;
      justify-content: center;
      align-items: center;
    }
    ^element-row {
      padding: 10px;
    }
    ^element-row-content {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    ^element-row-icon {
      color: $primary500;
    }
  `,

  properties: [
    'selected',
    {
      class: 'Boolean',
      name: 'isMenuOpen',
      value: true
    }
  ],

  methods: [
    function renderClosed(e) {
      var self = this;
      e.start().addClass(this.myClass('icon-holder'))
        .startContext({ data: this })
          .tag(this.MENU_CONTROL)
        .endContext()
      .end();
    },

    function renderOpened(e) {
      e.start().addClass(this.myClass('left-container'))
        .start().addClass(this.myClass('left-header'))
          .start('span').add('Contents').end()
          .startContext({ data: this })
            .tag(this.MENU_CONTROL)
          .endContext()
        .end()
        .start('table')
          .attr('cellpadding', '4')
          .call(this.branch, [this, this.data, 0])
        .end();
    },

    function render() {
      var self = this;
      this.addClass();
      this.add(this.dynamic(function(isMenuOpen) {
        if ( isMenuOpen ) {
          self.renderOpened(this);
        } else {
          self.renderClosed(this);
        }
      }))
    },

    function branch(self, data, depth) {
      this.add(data.dynamic(function (flowName) {
        this.start('tr').
          on('click',    () => self.selected = data).
          on('dblclick', () => data.expanded = ! data.expanded).
          start('td').
            addClass(self.myClass('element-row')).
            enableClass(self.myClass('error'), flowName.startsWith('error')).
            style({'marginLeft': (depth * 12) + 'px'}).
            enableClass(self.myClass('selected'), self.selected$.map(s => s === data)).
            start().
              addClass(self.myClass('element-row-content')).
              // TODO: let the Flowable provide its own Image
              callIfElse(data.cmd && data?.cmd?.includes('dao'), function() {
                this.start(foam.u2.tag.Image, {
                  glyph: 'grid',
                  embedSVG: true
                }).addClass(self.myClass('element-row-icon')).end()
              }, function() {
                this.start(foam.u2.tag.Image, {
                  glyph: 'rectangle',
                  embedSVG: true
                }).addClass(self.myClass('element-row-icon')).end()
              }).
              call(function() {
                data.treeRowRenderer(this);
              }).
            end().
            callIf(data.flowParent, function() {
              this.start().
                addClass('close').
                startContext({ data: data }).tag(self.CLOSE).endContext().
              end();
            }).
          end();
      }));

      this.add(data.dynamic(function (flowChildren) {
        this.forEach(flowChildren, d => {
          this.call(self.branch, [self, d, depth+1]);
        });
      }))
    }
  ],

  actions: [
    {
      name: 'close',
      label: '',
      themeIcon: 'close',
      buttonStyle: 'TERTIARY',
      size: 'SMALL',
      code: function() { this.flowParent.removeFlowChild(this); }
    },
    {
      name: 'menuControl',
      label: '',
      ariaLabel: 'Open/Close Menu',
      themeIcon: 'sidebar',
      buttonStyle: 'TERTIARY',
      size: 'SMALL',
      code: function() {
        this.isMenuOpen = ! this.isMenuOpen;
      }
    }
  ]
});
