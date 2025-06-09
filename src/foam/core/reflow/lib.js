/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.LIB({
  name: 'foam.core.reflow.lib',

  methods: [
    {
      name: 'round',
      code: function (n) {
        /* Round a number to the nearest integer. */
        return Math.round(n);
      }
    },
    {
      name: 'abs',
      code: Math.abs
    },
    {
      name: 'diff',
      code: function(a, b) { return Math.abs(a-b); }
    },
    {
      name: 'fix',
      code: function(num, precision) { return num.valueOf().toFixed(precision); }
    },
    {
      name: 'currency',
      code: function(amt, opt_precision) {
        return amt.toLocaleString(
          foam.locale,
          foam.Undefined.isInstance(opt_precision) ?
            undefined :
            {maximumFractionDigits: opt_precision});
      }
    },
    {
      name: 'lPad',
      code: function(str, len, char) { return str.padStart(len, char || '0'); }
    },
    {
      name: 'rPad',
      code: function(str, len, char) { return str.padEnd(len, char || '0'); }
    },
    {
      name: 'lMask',
      code: function(str, len, char) {
        return this.lPad(str.substring(len), str.length, char || '*');
      }
    },
    {
      name: 'rMask',
      code: function(str, len, char) {
        return this.rPad(str.substring(0, str.length-len), str.length, char || '*');
      }
    },
    {
      name: 'toLowerCase',
      code: function(s) { return s ? s.toString().toLowerCase() : ''; }
    },
    {
      name: 'toUpperCase',
      code: function(s) { return s ? s.toString().toUpperCase() : ''; }
    }
  ]
});
