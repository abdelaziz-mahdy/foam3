/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */


foam.CLASS({
  package: 'foam.u2',
  name: 'Accordion',
  extends: 'foam.u2.Element',

  requires: [ 'foam.u2.ActionView' ],

  css: `
    ^ {
      width: 100%;
      overflow: hidden;
      background-color: $grey50;
      border: 1px solid $grey50;
      border-bottom-color: $grey100;
    }
    ^:first-child {
      margin-top: 15px;
      border-radius: 5px 5px 0 0;
    }
    ^:last-child {
      margin-bottom: 15px;
      border-radius: 0 0 5px 5px;
      border-bottom-color: $grey50;
    }
    ^toolbar {
      background-color: $grey50;
      padding: 5px;
      display: flex;
      justify-content: space-between;
    }
    ^actions {
      justify-content: center;
      align-items: center;
      display: flex;
      gap: 5px;
    }
    ^actions ^toggle {
      margin: 0;
    }
    ^title {
      padding: 3px;
      font-size: 1.1em;
      cursor: default;
      display: flex;
      align-items: center;
    }
    ^content {
      background: white;
      display: block;
      transition: 0.2s ease-in-out;
      height: 0;
      padding: 0;
      opacity: 0;
    }
    ^.expanded ^content {
      height: auto;
      padding: 5px;
      opacity: 1;
    }
    ^ ^toggle svg {
      width: 12px;
      height: 12px;
      color: $black;
    }
    ^ .foam-u2-ActionView-toggle {
      transition: transform 0.3s;
      background: transparent;
      border-radius: 50%;
      border: none;
      outline: none;
      outline: none;
      padding: 3px;
      width: 30px;
      min-width: 30px;
      height: 30px;
    }
    ^ .foam-u2-ActionView-toggle:hover {
      background: transparent !important;
    }
    ^.expanded .foam-u2-ActionView-toggle {
      transform: rotate(90deg);
      transition: transform 0.3s;
    }
  `,

  properties: [
    'title',
    'actions',
    'toolbar',
    {
      class: 'String',
      name: 'expandIconPosition',
      view: {
        class: 'foam.u2.view.ChoiceView',
        choices: [ 'left', 'right' ]
      },
      value: 'right'
    },
    {
      class: 'Boolean',
      name: 'expanded',
      value: true
    }
  ],

  methods: [
    function init() {

      let self = this;

      this
        .addClass()
        .enableClass('expanded', this.expanded$)
        .callIfElse(this.toolbar, function() {
          this.start('div')
            .addClass(self.myClass('toolbar'))
            .on('click', this.onToggle)
            .add(self.toolbar$)
          .end();
        }, function() {
          this
            .start('div')
              .addClass(self.myClass('toolbar'))
              .on('click', self.onToggle)
              .start('div')
                .addClass(self.myClass('title'))
                .callIf(self.expandIconPosition === 'left', function() {
                  this.start(
                    self.TOGGLE
                  ).addClass(self.myClass('toggle'))
                  .on('click', self.onToggle);
                })
                .start('div')
                  .addClass(self.myClass('title'))
                  .add(self.title$)
                .end()
              .end()
              .start()
                .start('div')
                  .addClass(self.myClass('actions'))
                  .add(self.actions$)
                  .callIf(this.expandIconPosition === 'right', function() {
                    this.start(
                      self.TOGGLE
                    ).addClass(self.myClass('toggle'))
                    .on('click', self.onToggle);
                  });
          })

      this
        .addClass()
        .enableClass('expanded', this.expanded$)

      this.start('div', null, this.content$)
        //.show(this.expanded$)
        .addClass(this.myClass('content'))
      .end();
    }
  ],

  actions: [
    {
      name: 'toggle',
      label: '',
      icon: 'images/cheveron-right.svg',
      code: function() { this.expanded = ! this.expanded; }
    }
  ],

  listeners: [
    function onToggle() { this.toggle(); }
  ]
});
