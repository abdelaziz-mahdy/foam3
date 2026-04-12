/**
 * @license
 * Copyright 2019 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.dao',
  name: 'FileJournal',
  extends: 'foam.dao.AbstractFileJournal',
  flags: ['java'],

  implements: [
    'foam.dao.Journal'
  ],

  javaImports: [
    'foam.lang.FObject',
    'foam.lib.json.JSONParser',
    'foam.core.pm.PM',
    'foam.util.SafetyUtil',
    'java.io.BufferedReader'
  ],

  properties: [
    {
      class: 'foam.dao.DAOProperty',
      name: 'dao'
    }
  ],

  methods: [
    {
      name: 'replay',
      documentation: 'Replays the journal file',
      args: [
        { name: 'x',   type: 'Context' },
        { name: 'dao', type: 'foam.dao.DAO' }
      ],
      javaCode: `
        // count number of entries successfully read
        int successReading = 0;
        JSONParser parser = getParser();

        // Phase timing accumulators - replay is single-threaded here, so
        // plain longs are sufficient.
        long entryNanos     = 0;
        long parseNanos     = 0;
        long findMergeNanos = 0;
        long daoWriteNanos  = 0;
        long opPut          = 0;
        long opPutMerged    = 0;
        long opRemove       = 0;
        long commentsSkipped = 0;

        // NOTE: explicitly calling PM constructor as create only creates
        // a percentage of PMs, but we want all replay statistics
        PM pm = new PM(((foam.dao.AbstractDAO)dao).getOf(), "replay."+getFilename());

        try ( BufferedReader reader = getReader() ) {
          if ( reader == null ) {
            return;
          }
          for ( ;; ) {
            long entryStart = System.nanoTime();
            String entry = getEntry(reader);
            entryNanos += System.nanoTime() - entryStart;
            if ( entry == null ) break;

            if ( SafetyUtil.isEmpty(entry)        ) continue;
            if ( COMMENT.matcher(entry).matches() ) { commentsSkipped++; continue; }

            try {
              char operation = entry.charAt(0);
              int length = entry.length();
              entry = entry.substring(2, length - 1);

              long p0 = System.nanoTime();
              FObject obj = parser.parseString(entry);
              parseNanos += System.nanoTime() - p0;
              if ( obj == null ) {
                getLogger().error("Parse error", getParsingErrorMessage(entry), "entry:", entry);
                continue;
              }

              switch ( operation ) {
                case 'p': {
                  long f0 = System.nanoTime();
                  foam.lang.FObject old = dao.find(obj.getProperty("id"));
                  foam.lang.FObject toWrite = old != null ? mergeFObject(old.fclone(), obj) : obj;
                  findMergeNanos += System.nanoTime() - f0;
                  long w0 = System.nanoTime();
                  dao.put(toWrite);
                  daoWriteNanos += System.nanoTime() - w0;
                  if ( old != null ) opPutMerged++; else opPut++;
                  break;
                }

                case 'r': {
                  long w0 = System.nanoTime();
                  dao.remove(obj);
                  daoWriteNanos += System.nanoTime() - w0;
                  opRemove++;
                  break;
                }
              }

              successReading++;
            } catch ( Throwable t ) {
              getLogger().error("Error replaying journal entry:", entry, t);
            }
          }
        } catch ( Throwable t) {
          getLogger().error("Failed to read from journal", t);
        } finally {
          pm.log(x);
          logPhasePm_(x, dao, "getEntry",  entryNanos);
          logPhasePm_(x, dao, "parse",     parseNanos);
          logPhasePm_(x, dao, "findMerge", findMergeNanos);
          logPhasePm_(x, dao, "daoWrite",  daoWriteNanos);
          getLogger().log("Successfully read " + successReading + " entries from file: " + getFilename() +
            " in: " + pm.getTime() + "(ms)" +
            " opPut=" + opPut +
            " opPutMerged=" + opPutMerged +
            " opRemove=" + opRemove +
            " commentsSkipped=" + commentsSkipped);
        }
      `
    },
    {
      name: 'logPhasePm_',
      documentation: 'Emits a single PM entry for a named replay phase. Start and end times are synthesized so totalTime reflects the accumulated nanos for the phase across the whole replay.',
      type: 'Void',
      args: 'Context x, foam.dao.DAO dao, String phase, long nanos',
      javaCode: `
        PM p = new PM(((foam.dao.AbstractDAO)dao).getOf(), "replay." + getFilename() + ":" + phase);
        p.setEndTime(p.getStartTime() + nanos / 1_000_000L);
        p.log(x);
      `
    }
  ]
});
