/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.dao.mongodb',
  name: 'MongoDAO',
  extends: 'foam.dao.AbstractDAO',

  documentation: 'DAO backed by mongoDB.',

  // Notes on 'id'
  // MongoDB automatically generates a unique id with name _id.
  // Uncessful thus far configuing MongoDB to map/use the models' id.
  // One approach is to refine all models with an _id property.
  // But even with an id mapping, there will still be two
  // table ids: id and _id, so no space saved.
  //
  // Future considerations for performance
  // see https://medium.com/mongodb/how-to-efficiently-get-json-from-mongodb-using-spring-data-and-java-1e083f620a44
  // which suggest using collection type JsonObject.class rather
  // than BsonDocument.class will do less processing when building
  // json strings.

  javaImports: [
    'foam.core.logger.Logger',
    'foam.core.logger.Loggers',
    'foam.core.pm.PM',
    'foam.dao.DAO',
    'foam.dao.Sink',
    'foam.dao.Subscription',
    'foam.dao.index.AddIndexCommand',
    'foam.lang.ClassInfo',
    'foam.lang.FObject',
    'foam.lang.PropertyInfo',
    'foam.lang.X',
    'foam.lib.formatter.FObjectFormatter',
    'foam.lib.formatter.JSONFObjectFormatter',
    'foam.lib.json.JSONParser',
    'foam.lib.StoragePropertyPredicate',
    'static foam.mlang.MLang.*',
    'foam.util.SafetyUtil',
    'java.util.ArrayList',
    'java.util.List',

    'com.mongodb.*',
    'com.mongodb.client.model.*',
    'com.mongodb.client.MongoClient',
    'com.mongodb.client.MongoCollection',
    'com.mongodb.client.MongoCursor',
    'com.mongodb.client.MongoDatabase',
    'org.bson.BsonDocument',
    'org.bson.BsonDocumentReader',
    'org.bson.conversions.Bson'
  ],

  properties: [
    {
      documentation: 'Table name',
      name: 'collectionName',
      class: 'String'
    },
    {
      documentation: 'CSpec with db connection settings',
      name: 'mongoDBServiceName',
      class: 'String',
      value: 'mongoDBService'
    },
    {
      documentation: 'PropertyInfos used to build a Filter on ID',
      name: 'iDPInfos',
      class: 'FObjectArray',
      of: 'foam.lang.PropertyInfo'
    },
    {
      name: 'logger',
      class: 'FObjectProperty',
      of: 'foam.core.logger.Logger',
      javaFactory: `
      return Loggers.logger(getX(), this, getCollectionName(), getOf().getId());
      `
    }
  ],

  javaCode: `
    public MongoDAO(X x, ClassInfo of, String collectionName) {
      setX(x);
      setOf(of);
      setCollectionName(collectionName);
      initialize(getX());
    }

    public static ReplaceOptions UPSERT =  new ReplaceOptions().upsert(true);

    protected static ThreadLocal<JSONFObjectFormatter> formatter = new ThreadLocal<JSONFObjectFormatter>() {
      @Override
      protected JSONFObjectFormatter initialValue() {
        JSONFObjectFormatter b = new JSONFObjectFormatter();
        b.setPropertyPredicate(new StoragePropertyPredicate());
        b.setQuoteKeys(true);
        return b;
      }
      @Override
      public JSONFObjectFormatter get() {
        JSONFObjectFormatter b = super.get();
        b.reset();
        return b;
      }
    };

    protected JSONFObjectFormatter getFormatter(X x) {
      JSONFObjectFormatter f = formatter.get();
      f.setX(x);
      return f;
    }

    protected ThreadLocal<JSONParser> parser_ = new ThreadLocal<JSONParser>() {
      @Override
      protected JSONParser initialValue() {
        return getX().create(JSONParser.class);
      }
    };
  `,

  methods: [
    {
      name: 'initialize',
      args: 'X x',
      javaCode: `
      addIDIndex(x);
      `
    },
    {
      name: 'getDatabase',
      args: 'X x',
      javaType: 'MongoDatabase',
      javaCode: `
      return (MongoDatabase) ((MongoDBService) x.get(getMongoDBServiceName())).getDatabase(x, getCollectionName());
      `
    },
    {
      name: 'put_',
      javaCode: `
        PM pm = PM.create(x, getCollectionName(), "put_");
        MongoCollection<BsonDocument> collection = getDatabase(x).getCollection(getCollectionName(), BsonDocument.class);
        try {
          collection.replaceOne(
            buildIDFilter(x, obj),
            toBson(x, obj),
            UPSERT
          );
        } catch ( com.mongodb.MongoWriteException e ) {
          getLogger().error("put_", obj.toSummary(), e.getMessage());
          if ( e.getMessage().contains("duplicate key error") ) {
            try {
              long count = collection.countDocuments(buildIDFilter(x, obj));
              getLogger().error("put_ duplicate count found", count);
            } catch ( Exception ex ) {
              getLogger().error("put_ duplicate count failed", ex.getMessage());
            }
          }
          throw new RuntimeException(e);
        } catch ( Exception e ) {
          pm.error(x);
          getLogger().error("put_", obj.toSummary(), e.getMessage(), e);
          throw new RuntimeException(e);
        }
        pm.log(x);
        return obj;
      `
    },
    {
      name: 'find_',
      javaCode: `
        PM pm = PM.create(x, getCollectionName(), "find_");
        MongoCollection<BsonDocument> collection = getDatabase(x).getCollection(getCollectionName(), BsonDocument.class);
        FObject result = null;
        try {
          var record = collection.find(buildIDFilter(x, id)).first();
          if ( record != null ) {
            result = parser_.get().parseString(record.toJson(), getOf().getObjClass());
          }
        } catch ( Exception e ) {
          pm.error(x);
          getLogger().error("find_", id, e.getMessage(), e);
          throw new RuntimeException(e);
        }
        pm.log(x);
        return result;
      `
    },
    {
      name: 'remove_',
      javaCode: `
        MongoCollection<BsonDocument> collection = getDatabase(x).getCollection(getCollectionName(), BsonDocument.class);
        try {
          collection.deleteOne(buildIDFilter(x, obj));
        } catch ( Exception e ) {
          getLogger().error("remove_", obj.toSummary(), e.getMessage());
          throw new RuntimeException(e);
        }
        return obj;
      `
    },
    {
      name: 'select_',
      javaCode: `
        sink             = prepareSink(sink);
        Sink decorated   = decorateSink_(sink, skip, limit, order, predicate);
        Subscription sub = new Subscription();

        MongoCollection<BsonDocument> collection = getDatabase(x).getCollection(getCollectionName(), BsonDocument.class);

        try ( MongoCursor<BsonDocument> cursor = collection.find().cursor() ) {
          while ( cursor.hasNext() ) {
            if ( sub.getDetached() ) break;

            FObject obj = parser_.get().parseString(cursor.next().toJson(), getOf().getObjClass());

            if ( ( predicate == null ) || predicate.f(obj) ) {
              decorated.put(obj, sub);
            }
          }
        } catch(Exception e) {
          getLogger().error("select_", e.getMessage());
          throw new RuntimeException(e);
        }

        decorated.eof();

        return sink;
      `
    },
    {
      name: 'cmd_',
      javaCode: `
      if ( obj instanceof AddIndexCommand ) {
        List<Bson> indexes = new ArrayList();
        AddIndexCommand cmd = (AddIndexCommand) obj;
        if ( cmd.getIndex() != null ) {
          PropertyInfo[] pInfos = (PropertyInfo[]) cmd.getIndex();
          for ( PropertyInfo pInfo : pInfos ) {
            indexes.add(Indexes.ascending(pInfo.getName()));
          }
        } else {
          Object[] indexers = (Object[]) cmd.getIndexers();
          for ( Object indexer : indexers ) {
            if ( indexer instanceof PropertyInfo ) {
              indexes.add(Indexes.ascending(((PropertyInfo)indexer).getName()));
            } else if ( indexer instanceof foam.lang.Indexer ) {
              // only supported in MDAO
            }
          }
        }
        addIndexes(x, indexes, false);
        return true;
      }
      return false;
      `
    },
    {
      name: 'addIndexes',
      args: 'X x, List indexes, boolean unique',
      javaCode: `
      if ( indexes.size() > 0 ) {
        IndexOptions options = new IndexOptions();
        options.unique(unique);
        if ( indexes.size() == 1 ) {
          getDatabase(x).getCollection(getCollectionName()).createIndex((Bson) indexes.get(0), options);
        } else {
          getDatabase(x).getCollection(getCollectionName()).createIndex(Indexes.compoundIndex((List<Bson>)indexes), options);
        }
      }
      `
    },
    {
      name: 'addIDIndex',
      args: 'X x',
      javaCode: `
      List<PropertyInfo> pInfos = new ArrayList();
      List<Bson> indexes = new ArrayList();
      for ( Object axiom : getOf().getAxioms() ) {
        if ( axiom instanceof PropertyInfo ) {
          PropertyInfo pInfo = (PropertyInfo) axiom;
          if ( pInfo.includeInID() ) {
            indexes.add(Indexes.ascending(pInfo.getName()));
            pInfos.add(pInfo);
          }
        }
      }
      setIDPInfos(pInfos.toArray(new PropertyInfo[0]));
      addIndexes(x, indexes, true);
      `
    },
    {
      documentation: `Create Filter for ID properties.
Future: BsonDocuments can be reused via clear|remove and put. Potentailly
ThreadLocals could be created for each PropertyInfo BsonDocument.
see: https://javadoc.io/doc/org.mongodb/mongo-java-driver/latest/org/bson/BsonDocument.html`,
      name: 'buildIDFilter',
      args: 'X x, Object obj',
      javaType: 'BsonDocument',
      javaCode: `
      PM pm = PM.create(x, getCollectionName(), "buildIDFilter");
      BsonDocument filter = null;
      for ( PropertyInfo pInfo : getIDPInfos() ) {
        Object val = obj;
        if ( obj instanceof FObject ) {
          // Perform PropertyInfo.get with PropertyInfo from argument
          // FObject to handle MultipartIDs.
          // Alternatively, have to determine if FObject is MultipartID
          // which presently is not possible.
          val = ((PropertyInfo)((FObject) obj).getClassInfo().getAxiomByName(pInfo.getName())).get((FObject) obj);
        }
        BsonDocument bson = Filters.eq(pInfo.getName(), val).toBsonDocument(BsonDocument.class, MongoClientSettings.getDefaultCodecRegistry());
        if ( filter == null ) {
          filter = bson;
        } else {
          filter.append(pInfo.getName(), bson.get(pInfo.getName()));
        }
      }
      pm.log(x);
      return filter;
      `
    },
    {
      name: 'toJson',
      args: 'X x, FObject obj',
      type: 'String',
      javaCode: `
      JSONFObjectFormatter fmt = getFormatter(x);
      fmt.output(obj, getOf());
      return fmt.builder().toString();
      `
    },
    {
      name: 'toBson',
      args: 'X x, FObject obj',
      javaType: 'BsonDocument',
      javaCode: `
      return BsonDocument.parse(toJson(x, obj));
      `
    }
  ]
});
