/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.core.reflow',
  name: 'If',

  imports: [
    'eval_'
  ],

  properties: [
    {
      class: 'String',
      name: 'condition'
    },
    {
      class: 'String',
      name: 'ifBlock'
    },
    {
      class: 'String',
      name: 'elseBlock'
    }
  ],

  methods: [
    function addToE() {
      var conditionResult = this.eval_(this.condition);
      var scriptToExecute = conditionResult ? this.ifBlock : this.elseBlock;
      
      if (scriptToExecute) {
        this.eval_(scriptToExecute);
      }
    }
  ]
});