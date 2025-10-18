/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.core.http.csp',
  name: 'CSP',

  documentation: 'Content-Security-Policy',

  properties: [
    {
      name: 'id',
      class: 'String'
    },
    {
      name: 'description',
      class: 'String'
    },
    {
      // TODO: for now just a large string block, breakdown later
      name: 'policy',
      class: 'String',
      view: { class: 'foam.u2.tag.TextArea', rows: 10, cols: 60 }
    }
  ]
});
