/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.dao.mongo',
  name: 'DDAORefines',
  refines: 'foam.dao.DDAO',

  methods: [
    {
      name: 'getMongoDAO',
      args: 'X x',
      type: 'DAO',
      javaCode: `
      return new foam.dao.mongodb.MongoDAO(x, getDelegate().getOf(), getDatabaseTableName());
      `
    }
  ]
})
