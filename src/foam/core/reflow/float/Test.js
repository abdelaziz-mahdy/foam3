/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.core.reflow.float',
  name: 'PassFailView',
  extends: 'foam.u2.View',

  methods: [
    function render() {
      this.SUPER();
      this.add(this.dynamic(function(data) {
        if ( data ) {
          this.start('span').style({color: 'green'}).add('PASSED');
        } else {
          this.start('span').style({color: 'red'}).add('FAILED');
        }
      }));
    }
  ]
});


foam.CLASS({
  package: 'foam.core.reflow.float',
  name: 'Test',

  properties: [
    {
      class: 'String',
      name: 'description',
    },
    {
      class: 'String',
      name: 'notes',
      width: 80,
      view: { class: 'foam.u2.tag.TextArea', rows: 3, cols: 78 }
    },
    {
      class: 'String',
      name: 'received',
      transient: true,
      visibility: 'RO',
      width: 80,
      view: { class: 'foam.u2.tag.TextArea', rows: 6, cols: 78 }
    },
    {
      class: 'String',
      name: 'expected',
      visibility: 'RO',
      width: 80,
      view: { class: 'foam.u2.tag.TextArea', rows: 6, cols: 78 }
    },
    {
      class: 'Boolean',
      name: 'status',
      visibility: 'RO',
      view: 'foam.core.reflow.float.PassFailView',
      xxxview: {
        class: 'foam.u2.view.ChoiceView',
        choices: [ [ false, '<span style="color:red">FAILED</span>' ], [ true, 'PASSED' ] ]
      },
      expression: function(received, expected) {
        return received === expected;
      }
    }
  ],

  actions: [
    {
      name: 'accept',
      isEnabled: function(status) { return ! status; },
      code: function() {
        this.expected = this.received;
      }
    }
  ]
});
