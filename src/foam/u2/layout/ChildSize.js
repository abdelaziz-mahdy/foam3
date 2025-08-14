/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.ENUM({
  package: 'foam.u2.layout',
  name: 'SizeMode',
  values: [
    { name: 'FLEX',    label: 'Flexible',     documentation: 'Proportional sizing using flex' },
    { name: 'AUTO',    label: 'Auto',         documentation: 'Use natural content size' },
    { name: 'FIXED',   label: 'Fixed',        documentation: 'Fixed pixel width' },
    { name: 'PERCENT', label: 'Percentage',   documentation: 'Percentage of parent width' },
    { name: 'MIN',     label: 'Min Content',  documentation: 'Minimum content size' },
    { name: 'MAX',     label: 'Max Content',  documentation: 'Maximum content size' }
  ]
});

foam.CLASS({
  package: 'foam.u2.layout',
  name: 'ChildSize',
  
  requires: [
    'foam.u2.layout.SizeMode'
  ],
  
  properties: [
    {
      class: 'Enum',
      of: 'foam.u2.layout.SizeMode',
      name: 'mode',
      value: 'FLEX'
    },
    {
      class: 'Float',
      name: 'value',
      value: 1,
      visibility: function(mode) {
        // Value not needed for AUTO, MIN, MAX modes
        return mode === this.SizeMode.AUTO || 
               mode === this.SizeMode.MIN || 
               mode === this.SizeMode.MAX ? 'HIDDEN' : 'RW';
      }
    }
  ],
  
  methods: [
    function init() {
      this.SUPER();
      // If initialized with a string, parse it
      if ( foam.String.isInstance(this.mode) && this.mode.includes('px') ) {
        this.parseString(this.mode);
      }
    },
    
    function parseString(str) {
      if ( str === 'auto' ) {
        this.mode = this.SizeMode.AUTO;
      } else if ( str === 'min-content' ) {
        this.mode = this.SizeMode.MIN;
      } else if ( str === 'max-content' ) {
        this.mode = this.SizeMode.MAX;
      } else if ( str.endsWith('px') ) {
        this.mode = this.SizeMode.FIXED;
        this.value = parseFloat(str);
      } else if ( str.endsWith('%') ) {
        this.mode = this.SizeMode.PERCENT;
        this.value = parseFloat(str);
      } else if ( str.endsWith('fr') ) {
        this.mode = this.SizeMode.FLEX;
        this.value = parseFloat(str) || 1;
      } else {
        // Default to flex with numeric value
        this.mode = this.SizeMode.FLEX;
        this.value = parseFloat(str) || 1;
      }
    },
    
    function toCSSFlex() {
      switch ( this.mode ) {
        case this.SizeMode.FLEX:
          return `${this.value} 1 0`;
        case this.SizeMode.AUTO:
          return '0 0 auto';
        case this.SizeMode.FIXED:
          return `0 0 ${this.value}px`;
        case this.SizeMode.PERCENT:
          return `0 0 ${this.value}%`;
        case this.SizeMode.MIN:
          return '0 0 min-content';
        case this.SizeMode.MAX:
          return '0 0 max-content';
        default:
          return '0 0 auto';
      }
    }
  ],
  
  static: [
    function flex(value) {
      return foam.u2.layout.ChildSize.create({ 
        mode: foam.u2.layout.SizeMode.FLEX, 
        value: value || 1 
      });
    },
    
    function auto() {
      return foam.u2.layout.ChildSize.create({ 
        mode: foam.u2.layout.SizeMode.AUTO 
      });
    },
    
    function fixed(pixels) {
      return foam.u2.layout.ChildSize.create({ 
        mode: foam.u2.layout.SizeMode.FIXED, 
        value: pixels 
      });
    },
    
    function percent(pct) {
      return foam.u2.layout.ChildSize.create({ 
        mode: foam.u2.layout.SizeMode.PERCENT, 
        value: pct 
      });
    },
    
    function min() {
      return foam.u2.layout.ChildSize.create({ 
        mode: foam.u2.layout.SizeMode.MIN 
      });
    },
    
    function max() {
      return foam.u2.layout.ChildSize.create({ 
        mode: foam.u2.layout.SizeMode.MAX 
      });
    },
    
    function fromString(str) {
      const size = foam.u2.layout.ChildSize.create();
      size.parseString(str);
      return size;
    }
  ]
});