/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
    package: 'foam.core.reflow.control',
    name: 'FlowsControl',
    extends: 'foam.u2.Element',
  
    requires: [ 'foam.core.reflow.DynamicReflowData' ],
    imports: [ 'eval_' ],
  
    css: `
      ^promptHolder {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 10px;
        position: relative;
        max-height: 30px;
      }
      ^expanded-island {
        position: absolute;
        bottom: 100%;
        margin-bottom: 10px;
        background-color: $white;
        border: 1px solid $grey200;
        box-shadow: 0 0 10px 0 $grey200;
        padding: 10px;
        min-width: 300px;
      }
      ^active {
        border-color: $primary500!important;
        color: $primary500!important;
      }
    `,
  
    properties: [
      'data',
      {
        class: 'Boolean',
        name: 'opened',
        value: false
      }
    ],
  
    methods: [
      function init() {
        this.SUPER();
        this.boundHandleClickOutside = this.handleClickOutside.bind(this);
        window.addEventListener('mousedown', this.boundHandleClickOutside);
      },

      function destroy() {
        window.addEventListener('mousedown', this.boundHandleClickOutside);
      },

      function handleClickOutside(e) {
        const islandHolder = document?.querySelector(`.${this.myClass('expanded-island')}`);      if (islandHolder && !islandHolder.contains(e.target)) {
            this.opened = false;
        }
      },
      function render() {
        var self = this;
        this.start().addClass(this.myClass('promptHolder'))
            .add(this.dynamic(function(opened) {
                if (opened) {
                    this.start().addClass(self.myClass('expanded-island'), self.myClass('holder'))
                        .start(self.DynamicReflowData, { data: self.data, header: 'Flows', dataType: 'flows' })
                    .end();
                }
            }))
            .start()
                .startContext({ data: this })
                    .start(this.COLLECTIONS).enableClass(this.myClass('active'), this.opened$).end()
                .endContext()
            .end()
        .end();
      }
    ],

    actions: [
      {
        name: 'collections',
        label: 'Flows',
        themeIcon: 'flow',
        buttonStyle: foam.u2.ButtonStyle.SECONDARY,
        size: 'SMALL',
        code: function() {
            this.opened = !this.opened;
        }
      }
    ]
  });
  