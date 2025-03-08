/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.dao.mongodb.test',
  name: 'MongoDAOTest',
  extends: 'foam.core.test.Test',

  javaImports: [
    'foam.dao.DAO',
    'foam.dao.ArraySink',
    'foam.dao.Sink',
    'foam.util.SafetyUtil',
    'java.util.List'
  ],

  methods: [
    {
      name: 'runTest',
      javaCode: `
      DAO dao = (DAO) x.get("mongoTestObjectDAO");
      dao.removeAll();
      List elements = (List) ((ArraySink) dao.select(new ArraySink())).getArray();
      test ( elements.size() == 0, "Select count 0 to start. "+elements.size());

      var obj1 = new MongoTestObject();

      obj1 = (MongoTestObject) dao.put(obj1);
      test( obj1 != null, "Object put");
      test( ! SafetyUtil.isEmpty(obj1.getId()), "ID set. "+obj1.getId());

      var obj = (MongoTestObject) dao.find(obj1.getId());
      test ( obj != null, "find id");
      test ( obj1.getId().equals(obj.getId()), "ID match");

      var obj2 = new MongoTestObject();
      obj2 = (MongoTestObject) dao.put(obj2);

      elements = (List) ((ArraySink) dao.select(new ArraySink())).getArray();
      test ( elements.size() == 2, "Select count 2. "+elements.size());

      dao.remove(obj1);
      elements = (List) ((ArraySink) dao.select(new ArraySink())).getArray();
      test ( elements.size() == 1, "Select count 1 after remove. "+elements.size());

      obj2 = (MongoTestObject) obj2.fclone();
      obj2.setLongProp(42L);

      obj2 = (MongoTestObject) dao.put(obj2);
      test ( obj2.getLongProp() == 42, "Long save/load");

      obj1 = new MongoTestObject();
      var date = new java.util.Date();
      obj1.setDate(date);
      obj1 = (MongoTestObject) dao.put(obj1);
      test ( obj1 != null, "Date save/load");
      obj1 = (MongoTestObject) dao.find(obj1.getId());
      test ( obj1.getDate().getTime() == date.getTime(), "Date match");

      obj1 = (MongoTestObject) obj1.fclone();
      var datetime = new java.util.Date();
      obj1.setDateTime(new java.util.Date());
      obj1 = (MongoTestObject) dao.put(obj1);
      test ( obj1 != null, "DateTime save/load");
      obj1 = (MongoTestObject) dao.find(obj1.getId());
      test ( obj1.getDateTime().getTime() == datetime.getTime(), "DateTime match");

      obj = (MongoTestObject) obj1.fclone();
      obj1 = (MongoTestObject) dao.find(obj1);
      test ( obj1 != null && obj1.getId().equals(obj.getId()), "Find by FObject");

      // MultipartID tests
      dao = (DAO) x.get("mongoMultipartIDTestObjectDAO");

      var obj3 = new MongoMultipartIDTestObject();
      obj3.setKey("key1");
      obj3.setName("name1");
      obj3 = (MongoMultipartIDTestObject) dao.put(obj3);
      test( obj3 != null, "IDs put");

      var id3 = new MongoMultipartIDTestObjectId("key1", "name1");
      obj3 = (MongoMultipartIDTestObject) dao.find(id3);
      test (obj3 != null, "IDs ID find");

      obj3 = (MongoMultipartIDTestObject) dao.find(obj3);
      test (obj3 != null, "IDs FObject find");

      dao.removeAll();
      elements = (List) ((ArraySink) dao.select(new ArraySink())).getArray();
      test ( elements.size() == 0, "Select count 0 to end. "+elements.size());
    `
    }
  ]
})
