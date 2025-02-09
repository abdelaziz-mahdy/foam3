/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.nanos.pii',
  name: 'AddressRefines',
  refines: 'foam.nanos.auth.Address',

  implements: [
    'foam.nanos.pii.PIIAware'
  ],

  methods: [
    {
      name: 'piiSummary',
      code: function() { this.toSummary(); },
      javaCode: 'return toSummary();'
    }
  ]
});
