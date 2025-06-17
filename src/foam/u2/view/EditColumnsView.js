/**
 * @license
 * Copyright 2019 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.u2.view',
  name: 'EditColumnsView',
  extends: 'foam.u2.View',

  requires: [
    'foam.u2.DetailView',
    'foam.u2.view.ColumnConfigPropView',
    'foam.u2.view.SubColumnSelectConfig',
    'foam.u2.md.OverlayDropdown'
  ],

  imports: [
    'window',
    'table?',
    'ctrl?'
  ],

  css: `
    ^ .foam-u2-ActionView-closeButton {
      width: 24px;
      height: 35px;
      margin: 0;
      cursor: pointer;
      display: inline-block;
      float: right;
      outline: 0;
      border: none;
      background: transparent;
      box-shadow: none;
      padding-top: 15px;
      margin-right: 15px;
    }
    ^ .foam-u2-ActionView-closeButton:hover {
      outline: none;
      border: none;
      background: transparent;
    }
    ^container {
      align-items: flex-start;
      display: flex;
      flex-direction: column;
      max-width: clamp(300px, 20vw, 600px);
      padding: 16px 8px;
      max-height: 60vh;
    }
  `,

  properties: [
    {
      name: 'selectColumnsExpanded',
      class: 'Boolean'
    },
    'columnConfigPropView',
    {
      class: 'Boolean',
      name: 'hasBeenOpenedYet_',
      documentation: 'Used internally to keep track of whether the dropdown has been opened yet or not.'
    },
    {
      class: 'FObjectProperty',
      of: 'foam.u2.Element',
      name: 'dropdown_',
      factory: function() {
        return this.OverlayDropdown.create({
          closeOnLeave: false,
          styled: true,
          parentEdgePadding: 8
        });
      }
    }
  ],

  methods: [
    function closeDropDown(e) {
      if ( e ) e.stopPropagation();
      if ( this.columnConfigPropView ) {
        this.columnConfigPropView.onClose();
      }
      this.dropdown_.close();
    },
    function openDropDown(parentEl, x, y) {
      this.dropdown_.parentEl = parentEl;
      if ( ! this.hasBeenOpenedYet_ ) this.hasBeenOpenedYet_ = true;
      this.dropdown_.open(x, y);
    },
    function init() {
      this.SUPER();
      this.initDropdown();
    },
    function initDropdown() {
      var self = this;
      
      // Sync selectColumnsExpanded with dropdown opened state
      this.dropdown_.opened$.sub((_, __, ___, opened) => {
        this.selectColumnsExpanded = opened;
      });
      
      // Use lazy loading pattern like RichChoiceView
      self.dropdown_.add(self.slot(function(hasBeenOpenedYet_) {
        if ( ! hasBeenOpenedYet_ ) return this.E();
        return this.E()
          .addClass(self.myClass('container'))
          .start({ class: 'foam.u2.view.ColumnConfigPropView', data: self.data }, {}, self.columnConfigPropView$)
          .end();
      }));
      
      // Add dropdown to document
      if ( this.ctrl ) {
        this.ctrl.add(this.dropdown_);
      } else {
        this.dropdown_.write();
      }
    }
  ],
  listeners: [
  ],
  actions: [
    {
      name: 'closeButton',
      label: '',
      icon: 'images/ic-cancelwhite.svg',
      code: function() {
        this.closeDropDown();
      }
    }
  ]
});
