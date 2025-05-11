/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.core.console',
  name: 'PredicateView',
  extends: 'foam.u2.View',

  requires: [
    'foam.u2.tag.CircleIndicator',
    'foam.u2.TextField'
  ],

  imports: [
    'eval_'
  ],

  css: `
    ^helper-icon svg { fill: currentColor; }
    ^helper-icon { vertical-align: sub; padding: 6px; }
  `,

  properties: [
    [ 'type', 'search' ]
  ],

  methods: [
    function render() {
      this.
        start('span').
          style({display: 'flex'}).
          tag(this.TextField, {data$: this.data$}).
          start(this.CircleIndicator, {glyph: 'helpIcon', icon: '/images/question-icon.svg', size:20}).
            addClass(this.myClass('helper-icon')).
            on('click', this.mqlHelp).
          end();
    }
  ],

  listeners: [
    function mqlHelp() {
      this.eval_('mqlhelp', true);
    }
  ],

});
