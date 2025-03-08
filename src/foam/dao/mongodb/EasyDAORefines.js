/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.dao.mongo',
  name: 'EasyDAORefinement',
  refines: 'foam.dao.EasyDAO',

  methods: [
    {
      name: 'getJournalDelegate',
      args: 'Context x, foam.dao.DAO delegate',
      type: 'foam.dao.DAO',
      javaCode: `
      if ( getJournalType().equals(JournalType.SINGLE_JOURNAL) ) {
        if ( getInnerDAO() == null &&
             ! getWriteOnly() &&
             ! getReadOnly() ) {
          // replay of .0 journals
          foam.dao.java.JDAO jdao = new foam.dao.java.JDAO();
          jdao.setX(x);
          jdao.setFilename(getJournalName());
          jdao.setCluster(true); // only read .0
            // Setting of delegate must be last as it triggers replay
          jdao.setDelegate(delegate); // mdao

          setInnerDAO(
            new foam.dao.OrDAO(
              new foam.dao.mongodb.MongoDAO(x, getOf(), getJournalName()),
              jdao
            )
          );
          delegate = getInnerDAO();
        } else if ( getWriteOnly() ) {
          delegate = new foam.dao.WriteOnlyJDAO(x, delegate, getOf(), getJournalName());
        } else {
            foam.dao.java.JDAO jdao = new foam.dao.java.JDAO();
            jdao.setX(x);
            jdao.setFilename(getJournalName());
            jdao.setCluster(getCluster() && !getSAF());
            jdao.setWaitReplay(getWaitReplay());
            // Setting of delegate must be last as it triggers replay
            jdao.setDelegate(delegate);
            delegate = jdao;
        }
      }
      return delegate;
      `
    }
  ]
})
