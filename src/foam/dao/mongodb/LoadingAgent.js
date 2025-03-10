/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.dao.mongodb',
  name: 'LoadingAgent',
  implements: [ 'foam.lang.ContextAgent',
                'foam.lang.ContextAware' ],

  documentation: `
Requirement:
Load a MongoDB system from an existing runtime journals.
Data residing in individual journals, replayed into MongoDAOs.

Process:
Replay each file journal through a MongoDAO.
For each DAO nspec that has a journal, create a JDAO which delegates to MongoDAO.  This feeds all 'put's from the journal into MongoDAO as any other.
After successful script execution, restart the system.
`,

  javaImports: [
    'foam.lang.X',
    'foam.dao.ArraySink',
    'foam.dao.DAO',
    'foam.dao.EasyDAO',
    'foam.dao.F3FileJournal',
    'foam.dao.JournalType',
    'foam.dao.ProxyDAO',
    'foam.dao.java.JDAO',
    'foam.log.LogLevel',
    'foam.core.boot.CSpec',
    'foam.core.er.EventRecord',
    'foam.core.logger.Loggers',
    'foam.core.logger.Logger',
    'foam.core.pm.PM',
    'foam.util.SafetyUtil',
    'foam.util.concurrent.AbstractAssembly',
    'foam.util.concurrent.AssemblyLine',
    'foam.util.concurrent.AsyncAssemblyLine',
    'foam.util.concurrent.SyncAssemblyLine',
    'java.time.Duration',
    'java.util.HashMap',
    'java.util.List',
    'java.util.Map',
    'java.util.stream.Collectors'
  ],

  methods: [
    {
      name: 'execute',
      args: 'X x',
      javaCode: `
      Logger logger = Loggers.logger(x, this, "execute");

      long startTime = System.currentTimeMillis();
      logger.info("start");
      EventRecord er = (EventRecord) ((DAO) x.get("eventRecordDAO")).put(new EventRecord(x, "MongoDB", "loading", "start")).fclone();
      er.clearId();

      try {
        // system check
        logger.info("health");
        health(x);

        // load
        logger.info("load");
        Map<String, String> report = load(x);

        er.setMessage("complete");
        String message = report.keySet()
          .stream()
          .map(key -> key + " " +report.get(key))
          .collect(Collectors.joining("\\n"));
        er.setResponseMessage(message);
        ((DAO) x.get("eventRecordDAO")).put(er);
        logger.info("report", message);
      } catch (Throwable t) {
        er.setMessage(t.getMessage());
        er.setSeverity(LogLevel.ERROR);
        ((DAO) x.get("eventRecordDAO")).put(er);
        throw t;
      } finally {
        logger.info("end", "duration", Duration.ofMillis(System.currentTimeMillis() - startTime));
      }
      `
    },
    {
      documentation: 'System check - make sure system is in appropriate state',
      name: 'health',
      args: 'X x',
      javaCode: `
      Logger logger = Loggers.logger(x, this, "health");
      `
    },
    {
      name: 'load',
      args: 'X x',
      type: 'Map',
      javaCode: `
      final Logger logger = Loggers.logger(x, this, "loading");
      final HashMap report = new HashMap();
      logger.info("start");
      final long startTime = System.currentTimeMillis();

      // NOTE: to use AsyncAssemblyLine, we have to manually determine
      // when all have been processed, as the JDAO replay is itself a
      // AsyncAssemblyLine, so it returns immediately.
      // AssemblyLine line = new AsyncAssemblyLine(x, null, support.getThreadPoolName());
      AssemblyLine line = new SyncAssemblyLine(x);
      DAO serviceDAO = new JDAO(x, new foam.dao.MDAO(CSpec.getOwnClassInfo()), "services", false);
      List<CSpec> services = (List) ((ArraySink) serviceDAO.select(new ArraySink())).getArray();
      for ( CSpec service : services ) {
        line.enqueue(new AbstractAssembly() {
          public void executeJob() {
            logger.info("load", "start", service.getId());
            EasyDAO easyDAO = null;
            try {
              easyDAO = getEasyDAO(x, service);
              if ( easyDAO == null ) return;
            } catch (Throwable e) {
              logger.info(service.getId(), "skipped", e.getMessage());
              report.put(service.getId(), e.getMessage());
              return;
            }
            DAO delegate = new MongoDAO(x, easyDAO.getOf(), easyDAO.getDatabaseTableName());
            JDAO jdao = new JDAO();
            jdao.setX(x);
            jdao.setFilename(easyDAO.getJournalName());
            jdao.setReadOnly(true);
            jdao.setRuntimeOnly(true);

            // this will trigger replay
            long loadStartTime = System.currentTimeMillis();
            try {
              jdao.setDelegate(delegate);
              F3FileJournal journal = (F3FileJournal) jdao.getJournal();
              if ( journal.getPassCount() + journal.getFailCount() > 0 ) {
                report.put(service.getId(), "processed "+journal.getPassCount()+" of "+(journal.getFailCount()+journal.getPassCount()));
              } else {
                logger.info(service.getId(), "skipped", "empty journal");
              }
              logger.info("load", "end", service.getId());
            } catch (Throwable t) {
              logger.error("load", "end", service.getId(), t);
              report.put(service.getId(), t.getMessage());
            }
          }
        });
      }
      line.shutdown();
      logger.info("end");
      return report;
      `
    },
    {
      name: 'getEasyDAO',
      args: 'X x, CSpec service',
      type: 'foam.dao.EasyDAO',
      javaThrows: ['Throwable'],
      javaCode: `
      if ( SafetyUtil.isEmpty(service.getServiceScript()) ) {
        Loggers.logger(x, this).info("getEasyDAO", service.getId(), "no service script");
        return null;
      }
      if ( ! service.getServiceScript().contains("EasyDAO") ) {
        Loggers.logger(x, this).info("getEasyDAO", service.getId(), "not EasyDAO script");
        return null;
      }
      if ( ! ( x.get(service.getId()) instanceof DAO ) ) {
        Loggers.logger(x, this).info("getEasyDAO", service.getId(), "service not DAO");
        return null;
      }
      DAO dao = (DAO) x.get(service.getId());
      while ( dao != null ) {
        if ( dao instanceof EasyDAO ) {
          EasyDAO easyDAO = (EasyDAO) dao;
          if ( easyDAO.getJournalType().equals(JournalType.SINGLE_JOURNAL) &&
               easyDAO.getInnerDAO() == null &&
               ! easyDAO.getWriteOnly() &&
               ! easyDAO.getReadOnly() &&
               ! easyDAO.getNullify() ) {
            return easyDAO;
          }
        }
        if ( dao instanceof ProxyDAO ) {
          dao = ((ProxyDAO) dao).getDelegate();
        } else {
          Loggers.logger(x, this).warning("getEasyDAO", service.getId(), "not found");
          break;
        }
      }
      return null;
      `
    }
  ]
})
