/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.dao.mongodb.test',
  name: 'MongoMultipartIDTestObject',

  ids: [ 'key', 'name' ],

  properties: [
    {
      name: 'key',
      class: 'String'
    },
    {
      name: 'name',
      class: 'String'
    },
    {
      name: 'longProp',
      class: 'Long'
    },
    {
      name: 'date',
      class: 'Date'
    },
    {
      name: 'dateTime',
      class: 'DateTime'
    }
  ]
});
