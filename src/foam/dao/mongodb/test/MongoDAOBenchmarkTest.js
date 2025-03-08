/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.dao.mongodb.test',
  name: 'MongoDAOBenchmarkTest',
  extends: 'foam.core.test.Test',

  documentation: 'Quick and simple reporting of duration of CRUD operations',

  javaImports: [
    'foam.dao.DAO',
    'foam.dao.ArraySink',
    'foam.dao.Sink',
    'java.time.Duration',
    'foam.util.SafetyUtil',
    'java.util.List',
    'java.util.Date'
  ],

  properties: [
    {
      documentation: 'Number of records to create',
      name: 'numRecords',
      class: 'Long',
      value: 10000
    }
  ],

  methods: [
    {
      name: 'runTest',
      javaCode: `
      DAO dao = (DAO) x.get("mongoTestObjectDAO");
      dao.removeAll();
      List elements = (List) ((ArraySink) dao.select(new ArraySink())).getArray();
      test ( elements.size() == 0, "Select count 0 to start. "+elements.size());

      long bound = 10000L;
      long start = System.currentTimeMillis();
      Date date = new Date();
      for ( long i = 1; i <= getNumRecords(); i++ ) {
        var obj = new MongoTestObject();
        obj = new MongoTestObject();
        obj.setId(String.valueOf(i));
        obj.setLongProp(i);
        obj.setDate(date);
        obj = (MongoTestObject) dao.put(obj);
      }
      long end = System.currentTimeMillis();
      test ( true, "Put "+getNumRecords()+" "+Duration.ofMillis(end-start));

      start = System.currentTimeMillis();
      for ( long i = 1; i <= getNumRecords(); i++ ) {
        var obj = new MongoTestObject();
        obj = (MongoTestObject) dao.find(String.valueOf(i));
      }
      end = System.currentTimeMillis();
      test ( true, "Find "+getNumRecords()+" "+Duration.ofMillis(end-start));

      start = System.currentTimeMillis();
      List records = (List) ((ArraySink) dao.select(new ArraySink())).getArray();
      end = System.currentTimeMillis();
      test ( true, "Select "+getNumRecords()+" "+Duration.ofMillis(end-start));

      start = System.currentTimeMillis();
      dao.removeAll();
      end = System.currentTimeMillis();
      test ( true, "RemoveAll "+getNumRecords()+" "+Duration.ofMillis(end-start));
    `
    }
  ]
})
