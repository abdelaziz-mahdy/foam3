/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.core.reflow',
  name: 'LayoutBlock',
  extends: 'foam.core.reflow.Block',

  imports: [ 'eval_ as importedEval', 'block', 'data as importedData'],
  exports: ['out', 'eval_'],
  requires: [
    'foam.core.reflow.ReflowToolBar',
    'foam.u2.layout.Layout'
  ],

  properties: [
    {
      __copyFrom__: 'foam.core.reflow.Console.INPUT',
      hidden: true
    },
    {
      name: 'cmdHolder',
      hidden: true
    },
    {
      name: 'out',
      getter: function() {
        return this.cmdHolder;
      }
    },
    { name: 'border', hidden: true },
    { name: 'borderClass', hidden: true }
  ],
  methods: [
    function render() {
      let self = this;
      this.SUPER();
      this.
        addClass(self.myClass()).
        tag(this.ReflowToolBar);
      this.content.tag(this.Layout, { }, this.cmdHolder$);
      let sub = () => {
        this.addValue(this.cmdHolder, true);
      };
      this.cmdHolder$.sub(sub);
      sub();
    },
    function eval_(...args){
      if ( ! args[3] || args[3] == this.flowParent )
        args[3] = this;
      return this.importedEval(...args);
    }
  ],
  listeners: [
    {
      name: 'onInput',
      code: function() {
        var input = this.input;
        this.input = '';
        this.eval_(input);
      }
    }
  ]
});