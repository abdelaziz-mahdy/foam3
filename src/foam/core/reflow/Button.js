/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.core.reflow',
  name: 'Button',

  imports: [
    'eval_'
  ],

  properties: [
    {
      class: 'String',
      name: 'label',
      value: 'Button'
    },
    {
      class: 'String',
      name: 'script'
    }
  ],

  methods: [
    function addToE(e) {
      var self = this;
      e.start('button')
        .addClass('foam-u2-ActionView')
        .addClass('foam-u2-ActionView-secondary') 
        .addClass('foam-u2-ActionView-medium')
        .add(this.label$)
        .on('click', function() {
          if (self.script) {
            self.eval_(self.script);
          }
        })
        .end();
    }
  ]
});