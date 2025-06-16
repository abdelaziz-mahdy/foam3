/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.core.reflow',
  name: 'Trigger',

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
      name: 'script'
    },
    {
      class: 'Boolean',
      name: 'executed',
      value: false
    }
  ],

  methods: [
    function addToE() {
      this.checkAndExecute();
      
      // Set up a listener to check condition whenever it might change
      this.condition$.sub(() => this.checkAndExecute());
    },

    function checkAndExecute() {
      if (!this.executed && this.condition && this.script) {
        try {
          var conditionResult = this.eval_(this.condition);
          if (conditionResult) {
            this.eval_(this.script);
            this.executed = true;
          }
        } catch (ex) {
          console.error('Error in trigger:', ex);
        }
      }
    }
  ]
});