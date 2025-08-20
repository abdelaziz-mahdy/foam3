/**
 * @license
 * Copyright 2017 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.mlang.sink',
  name: 'Count',
  extends: 'foam.dao.AbstractSink',
  implements: [ 'foam.lang.Serializable' ],

  documentation: 'Sink which counts number of objects put().',

  properties: [
    {
      class: 'Long',
      name: 'value',
      shortName: 'v'
    }
  ],

  methods: [
    {
      name: 'put',
      code: function() { this.value++; },
      swiftCode: 'value+=1',
      javaCode: 'setValue(this.getValue() + 1);'
    },
    {
      name: 'remove',
      code: function() { this.value--; },
      swiftCode: 'value-=1'
    },
    {
      name: 'reset',
      code: function() { this.value = 0; },
      swiftCode: 'value = 0'
    },
    {
      name: 'reduce',
      args: 'foam.mlang.sink.Count sink',
      code: function reduce(sink) {
        if ( ! sink ) return;
        this.value += sink.value;
      },
      javaCode: `
if (sink == null) return;
setValue(getValue() + sink.getValue());
      `
    },
    function toString() { return 'COUNT()'; },
    function toSummary() { return this.value; },
    function addToE(e) { e.add(this.value); },

    function toProperties() {
      return [ { class: 'Long', name: 'count', label: 'count' } ]
    },
    function setPropertyValues(o, sink, ps) {
      ps[0].set(o, sink.value);
    }
  ]
});
