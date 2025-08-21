/**
 * @license
 * Copyright 2017 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.mlang.sink',
  name: 'Min',
  extends: 'foam.mlang.sink.AbstractUnarySink',
  implements: [ 'foam.mlang.sink.Reducible' ],

  documentation: 'A Sink which remembers the minimum value put().',

  properties: [
    {
      class: 'Object',
      name: 'value'
    }
  ],

  methods: [
    {
      name: 'put',
      code: function put(obj, s) {
        if ( ! this.hasOwnProperty('value') || foam.util.compare(this.value, this.arg1.f(obj) ) > 0) {
          this.value = this.arg1.f(obj);
        }
      },
      javaCode: `if ( getValue() == null || ((Comparable)getArg1().f(obj)).compareTo(getValue()) < 0 ) {
  setValue(getArg1().f(obj));
}`
    },
    {
      name: 'reduce',
      args: 'foam.mlang.sink.Reducible other',
      code: function reduce(other) {
        if ( ! other || ! foam.mlang.sink.Min.isInstance(other) ) return;
        
        if ( ! this.hasOwnProperty('value') || foam.util.compare(other.value, this.value) < 0 ) {
          this.value = other.value;
        }
        
      },
      javaCode: `
if (other == null) return;
if (other instanceof foam.mlang.sink.Min) {
  foam.mlang.sink.Min min = (foam.mlang.sink.Min) other;
  if (min.getValue() == null) return;
  
  if (getValue() == null) {
    setValue(min.getValue());
    return;
  }
  
  if (((Comparable) min.getValue()).compareTo(getValue()) < 0) {
    setValue(min.getValue());
  }
}
      `
    },
    function toSummary() { return this.value; },
    function addToE(e) { e.add(this.value); }
  ]
});
