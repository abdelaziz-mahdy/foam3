/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.dao.mongo',
  name: 'EasyDAORefines',
  refines: 'foam.dao.EasyDAO',

  properties: [
    {
      name: 'databaseType',
      value: 'MONGODB'
    }
  ]
})
