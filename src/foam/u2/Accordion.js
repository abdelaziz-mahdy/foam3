/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */


foam.CLASS({
  package: 'foam.u2',
  name: 'Accordion',
  extends: 'foam.u2.Controller',
  requires: [ 'foam.u2.ActionView' ],

  css: `
    ^ {
      width: 100%;
      overflow: hidden;
      background-color: $grey50;
      border: 1px solid $grey50;
      border-bottom-color: $grey200;
    }
    ^:first-child {
      border-radius: 4px 4px 0 0;
    }
    ^:last-child {
      border-radius: 0 0 4px 4px;
      border-bottom-color: $grey50;
    }
    ^toolbar {
      background-color: $grey50;
      padding: 4px;
      display: flex;
      justify-content: space-between;
    }
    ^actions {
      justify-content: center;
      align-items: center;
      display: flex;
      gap: 4px;
    }
    ^actions ^toggle {
      margin: 0;
      color: $black;
    }
    ^title {
      padding: 4px;
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
      padding: 4px;
      opacity: 1;
    }
    ^ ^toggle svg {
      width: 1.2rem;
      height: 1.2rem;
      fill: $black;
    }
    ^ .foam-u2-ActionView-toggle {
      transition: transform 0.3s;
      border-radius: 50%;
      padding: 4px;
      width: 2.8rem;
      min-width: 2.8rem;
      height: 2.8rem;
    }
    ^.expanded .foam-u2-ActionView-toggle {
      transform: rotate(90deg);
      transition: transform 0.3s;
    }
  `,

  properties: [
    {
      name: 'title',
      documentation: `
        Title of the accordion, you can pass foam.ui.Element objects as well for more flexibility.

        USAGE:
          this.tag(foam.u2.Accordion, {
            title: foam.u2.Element.create()
              .tag({
                class: 'foam.u2.tag.Image',
                data: 'images/success.svg'
              })
              .add('Success'),
            }
          )
      `
    },
    {
      name: 'actions',
      documentation: `
        Actions section content. Can be a list of actions, a counter, ...etc

        USAGE:
          this.tag(foam.u2.Accordion, {
            title: "User"
            actions: foam.u2.Element.create()
              .addClass(self.myClass('actions'))
              .add(self.UPDATE_ACTION)
              .add(self.DELETE_ACTION)
            }
          )
      `
    },
    {
      name: 'toolbar',
      documentation: `
        This attribute overrides the entire toolbar area.
        Setting this attribute will ignore both title, and actions attributes.

        USAGE:
          this.tag(foam.u2.Accordion, {
            toolbar: foam.u2.Element.create()
              .addClass(self.myClass('my-custom-toolbar'))
              .start()
                .addClass('some-custom-class')
                .tag({
                  class: 'foam.u2.tag.Image',
                  data: 'images/success.svg'
                })
                .start('h4')
                  .add("My title")
                .end()
            }
          )
      `
    },
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
        .start('div')
          .addClass(self.myClass('toolbar'))
          .on('click', self.toggle.bind(self))
          .callIfElse(this.toolbar, function() {
            this.add(self.toolbar$)
          }, function() {
            this
              .start('div')
                .addClass(self.myClass('title'))
                .callIf(self.expandIconPosition === 'left', function() {
                  this.start(self.TOGGLE)
                    .addClass(self.myClass('toggle'));
                })
                .start('div')
                  .addClass(self.myClass('title'))
                  .add(self.title$)
                .end()
              .end()
              .start()
                .addClass(self.myClass('actions'))
                .add(self.actions$)
                .callIf(self.expandIconPosition === 'right', function() {
                  this.start(self.TOGGLE)
                    .addClass(self.myClass('toggle'));
                });
          })

      this.start('div', null, this.content$)
        .addClass(this.myClass('content'))
      .end();
    }
  ],

  actions: [
    {
      name: 'toggle',
      label: '',
      buttonStyle: 'UNSTYLED',
      themeIcon: 'next',
      code: function() { this.expanded = ! this.expanded; }
    }
  ]
});
