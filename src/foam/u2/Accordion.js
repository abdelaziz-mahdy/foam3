/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */


foam.CLASS({
  package: 'foam.u2',
  name: 'Accordion',
  extends: 'foam.u2.Controller',
  requires: [
    'foam.u2.ActionView',
    'foam.u2.tag.Image'
  ],

  css: `
    ^ {
      position: relative;
      padding: 0.8rem;
      display: flex;
      flex-direction: column;
    }
    ^control {
      display: inline;
      position: relative;
      width: 30px;
    }
    ^toolbar {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      left: 1.5vmin;
      top: max(-12px, -2vmin);
      color: $grey900;
      cursor: pointer;
      width: 100%;
      border: none;
      background: none;
      padding: 0;
    }
    ^.expanded > ^toolbar {
      padding: 0 0 0.8rem 0;
    }
    ^control {
      transition: transform 0.3s;
    }
    ^.expanded ^control {
      transform: rotate(90deg);
    }
    ^control svg {
      max-height: 1em;
      fill: $black;
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
      name: 'controlGlyph',
      value: 'next'
    },
    {
      class: 'String',
      name: 'togglerPosition',
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
                .callIf(self.togglerPosition === 'left', function() {
                  this.start(self.TOGGLE, { themeIcon: self.controlGlyph })
                    .addClass(self.myClass('control'));
                })
                .start('div')
                  .addClass(self.myClass('title'))
                  .addClass('p-bold')
                  .add(self.title$)
                .end()
              .end()
              .start()
                .addClass(self.myClass('actions'))
                .add(self.actions$)
                .callIf(self.togglerPosition === 'right', function() {
                  this.start(self.TOGGLE, { themeIcon: self.controlGlyph })
                    .addClass(self.myClass('control'));
                });
          });

      this.start('div', null, this.content$)
        .show(this.expanded$)
        .addClass(this.myClass('content'))
      .end();
    }
  ],

  actions: [
    {
      name: 'toggle',
      label: '',
      buttonStyle: 'UNSTYLED',
      code: function() { this.expanded = ! this.expanded; }
    }
  ]
});
