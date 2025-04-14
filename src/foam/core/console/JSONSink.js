/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.core.console',
  name: 'JSONSink',
  extends: 'foam.dao.ArraySink',

  methods: [
    function addToE(e) {
      var json = foam.json.Outputter.create({
        pretty: true,
        strict: true,
        propertyPredicate: function(o, p) { return ! p.networkTransient; }
      });
      e.start('pre').add(json.stringify(this.array));
    }
  ]
});
