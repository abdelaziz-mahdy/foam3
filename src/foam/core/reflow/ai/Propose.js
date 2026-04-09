/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.core.reflow.ai',
  name: 'Propose',
  extends: 'foam.u2.Controller',

  imports: [ 'eval_', 'block' ],

  css: `
    ^ {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      border-left: 3px solid #1a8fe3;
      background: #f4f8fc;
      border-radius: 0 6px 6px 0;
      margin: 4px 0;
      font-family: monospace;
    }
    ^command {
      flex: 1;
    }
    ^command input {
      width: 100%;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 4px 8px;
      font-family: monospace;
      font-size: 13px;
      background: #fff;
      outline: none;
    }
    ^command input:focus {
      border-color: #1a8fe3;
    }
    ^btn {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      font-weight: bold;
      transition: background 0.15s, transform 0.1s;
    }
    ^btn:hover {
      transform: scale(1.1);
    }
    ^accept {
      background: #e6f4ea;
      color: #1e7e34;
    }
    ^accept:hover {
      background: #c8e6c9;
    }
    ^reject {
      background: #fde8e8;
      color: #c62828;
    }
    ^reject:hover {
      background: #f5c6c6;
    }
  `,

  properties: [
    {
      class: 'String',
      name: 'command'
    }
  ],

  methods: [
    function render() {
      this.addClass().
        start('span').addClass(this.myClass('command')).add(this.COMMAND).end().
        start(this.ACCEPT).
          addClass(this.myClass('btn')).
          addClass(this.myClass('accept')).
        end().
        start(this.REJECT).
          addClass(this.myClass('btn')).
          addClass(this.myClass('reject')).
        end();
    }
  ],

  actions: [
    {
      name: 'accept',
      label: '✓',
      code: function() {
        this.eval_(this.command);
        this.block.del();
      }
    },
    {
      name: 'reject',
      label: '✕',
      code: function() {
        this.block.del();
      }
    }
  ]
});
