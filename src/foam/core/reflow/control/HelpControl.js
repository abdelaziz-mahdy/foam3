/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.core.reflow.control',
  name: 'HelpControl',
  extends: 'foam.u2.Element',

  requires: [ 'foam.u2.Link' ],

  imports: [ 'eval_' ],

  css: `
    ^promptHolder {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 10px;
    }
    ^promptLink {
      text-decoration: none !important;
      color: $primary500!important;
    }
    ^input {
      border: none;
    }
  `,

  properties: [
    'data'
  ],

  methods: [
    function render() {
      this.start().addClass(this.myClass('promptHolder'))
        .start(this.Link).addClass(this.myClass('promptLink')).add('Prompt help').on('click', () => this.eval_('help')).end()
        .start().add('>').end()
        .start(this.data.INPUT, null, this.data.input_$)
          .addClass(this.myClass('input'))
          .on('keyup', e => { if ( e.key == 'Enter' || e.keyCode == 13 ) this.data.onInput(); })
        .end()
      .end();
    }
  ]
});
