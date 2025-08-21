/**
 * @license
 * Copyright 2019 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.core.test',
  name: 'TestRunnerScript',
  extends: 'foam.core.script.Script',

  javaImports: [
    'foam.core.logger.LogLevelFilterLogger',
    'foam.core.logger.Logger',
    'foam.core.script.Language',
    'foam.core.script.TestRunnerConfig',
    'foam.core.test.Test',
    'foam.core.test.TestRun',
    'foam.dao.DAO',
    'foam.dao.ArraySink',
    'foam.log.LogLevel',
    'static foam.mlang.MLang.AND',
    'static foam.mlang.MLang.EQ',
    'static foam.mlang.MLang.IN',
    'static foam.mlang.MLang.OR',
    'foam.util.SafetyUtil',
    'java.util.*',
  ],

  constants: [
    {
      name: 'CHECK_MARK',
      type: 'String',
      value: '\u2713'
    },
    {
      name: 'CROSS_MARK',
      type: 'String',
      value: '\u2718'
    },
    {
      name: 'GREEN_COLOR',
      type: 'String',
      value: '\u001B[32m'
    },
    {
      name: 'RED_COLOR',
      type: 'String',
      value: '\u001B[31m'
    },
    {
      name: 'RESET_COLOR',
      type: 'String',
      value: '\u001B[0m'
    }
  ],

  methods: [
    {
      name: 'runScript',
      args: 'Context x',
      javaCode: `
      TestRun testRun = runJavaTests(x);
      if ( testRun.getFailed() > 0 ) {
        System.exit(1);
      }
      if ( ! testRun.getTests().equals("all") &&
           testRun.getTotal() == 0 ) {
        StringBuilder sb = new StringBuilder();
        sb.append("ERROR :: Test(s) not found - ");
        if ( ! SafetyUtil.isEmpty(testRun.getSuite()) ) {
          sb.append("(Suite: ");
          sb.append(testRun.getSuite());
          sb.append(") ");
        }
        if ( ! SafetyUtil.isEmpty(testRun.getTests()) ) {
          sb.append(testRun.getTests());
        }
        printBold(RED_COLOR + " " + sb.toString() + " " + RESET_COLOR);
        System.exit(1);
      }
      System.exit(0);
      // runJSTests(x);
      `
    },
    {
      name: 'runJavaTests',
      args: 'Context x',
      type: 'foam.core.test.TestRun',
      javaCode: `
        // Control logging level with JVM parameter -Dlog.level=INFO
        // set through the build with --log-level:INFO

        LogLevelFilterLogger loggerFilter = (LogLevelFilterLogger) x.get("logger");
        LogLevel logLevel = LogLevel.valueOf(System.getProperty("log.level", "ERROR"));
        loggerFilter.setLogDebug(logLevel.getOrdinal() <= LogLevel.DEBUG.getOrdinal());
        loggerFilter.setLogInfo(logLevel.getOrdinal() <= LogLevel.INFO.getOrdinal());
        loggerFilter.setLogWarning(logLevel.getOrdinal() <= LogLevel.WARN.getOrdinal());

        DAO testRunDAO = (DAO) x.get("testRunDAO");
        TestRun testRun = new TestRun();
        // testRun.setSomeIdentifier
        testRun.setLanguage(Language.BEANSHELL);

        DAO testDAO = (DAO) x.get("testDAO");
        testDAO = testDAO.where(
          AND(
            EQ(Test.ENABLED, true),
            OR(
              EQ(Test.LANGUAGE, Language.BEANSHELL),
              EQ(Test.LANGUAGE, Language.JSHELL)
            )));

        String testSuite = System.getProperty("foam.test.suite");
        if ( ! SafetyUtil.isEmpty(testSuite) ) {
          testRun.setSuite(testSuite);
          testDAO = testDAO.where(foam.mlang.MLang.EQ(Test.TEST_SUITE, testSuite));
        }

        String requestedTests = System.getProperty("foam.tests");
        if ( ! SafetyUtil.isEmpty(requestedTests) ) {
          List<String> explicitTests = Arrays.asList(requestedTests.split(","));
          if ( explicitTests.size() > 0 ) {
            testRun.setTests(requestedTests);
            testDAO = testDAO.where(IN(Test.ID, explicitTests));
          }
        }

        List<Test> tests = (List) ((ArraySink) testDAO.select(new ArraySink())).getArray();

        if ( tests.size() == 0 ) {
          return testRun;
        }

        testRun = (TestRun) testRunDAO.put(testRun).fclone();

        int passed = 0;
        int failed = 0;
        List<Test> failedTests = new ArrayList();

        for ( Test test : tests ) {
          test = (Test) test.fclone();

          printBold(test.getId());
          try {
            test.runScript(x);
            passed += test.getPassed();
            failed += test.getFailed();
            if ( (int) test.getFailed() > 0) {
              failedTests.add(test);
            }
            printOutput(test);
          }
          catch ( Exception e ) {
            Logger logger = (Logger) x.get("logger");
            logger.error(e);
            failed += 1;
            failedTests.add(test);
          }
        }

        testRun.setUnits(tests.size());
        testRun.setPassed(passed);
        testRun.setFailed(failed);
        testRun.setTotal(passed + failed);
        testRun.setCompleted(true);

        System.out.println("DONE RUNNING " + testRun.getUnits() + " UNITS containing " + testRun.getTotal() + " TESTS");
        System.out.println("TEST SUITE: " + (testSuite == null ? "all" : testSuite));

        printBold(GREEN_COLOR + " " +  "PASSED: " + Integer.toString(passed) + " " + RESET_COLOR);
        printBold(RED_COLOR + " " + "FAILED: " + Integer.toString(failed) + " " + RESET_COLOR);

        // Exit with the appropriate output.
        if ( failedTests.size() > 0 ) {
          StringBuffer sb = new StringBuffer();
          System.out.println(RED_COLOR + " FAILED TESTS: " + RESET_COLOR);
          for (Test test: failedTests ) {
            System.out.println(test.getId());
            String outputs[] = test.getOutput().split("\\n");
            for( String output: outputs ) {
              if ( output.startsWith("FAILURE") ) {
                System.out.println("\\t" + RED_COLOR + " "+ CROSS_MARK + " " + output + " " + RESET_COLOR);
                sb.append(output);
                sb.append("\\n");
              }
            }
          }
          testRun.setFailures(sb.toString());
        }
        testRun = (TestRun) testRunDAO.put(testRun);
        return testRun;
      `
    },
    // {
    //   name: 'runClientSideTest',
    //   args: 'Context x, foam.core.test.Test test',
    //   javaCode: `
    //     printBold(test.getId());
    //     try {
    //       // test.runScript(x);
    //       setPassedTests(getPassedTests() + (int) test.getPassed());
    //       setFailedTests(getFailedTests() + (int) test.getFailed());
    //       if ( (int) test.getFailed() > 0) {
    //         addToFailedTestsList(test);
    //       }
    //       printOutput(test);
    //     }
    //     catch ( Exception e ) {
    //       Logger logger = (Logger) x.get("logger");
    //       logger.error(e);
    //       setFailedTests(getFailedTests() + 1);
    //       addToFailedTestsList(test);
    //     }
    //   `
    // },
    {
      name: 'printBold',
      args: 'String message',
      javaCode: 'System.out.println("\\033[0;1m" + message + RESET_COLOR);'
    },
    {
      name: 'printOutput',
      args: 'Test test',
      javaCode: `
        String outputs[] = test.getOutput().split("\\n");
        for( String output: outputs ) {
          if ( output.startsWith("SUCCESS") ) {
            System.out.println("\\t" + GREEN_COLOR + " " + CHECK_MARK + " " + output + " " + RESET_COLOR);
          }
          else if ( output.startsWith("FAILURE") ) {
            System.out.println("\\t" + RED_COLOR + " "+ CROSS_MARK + " " + output + " " + RESET_COLOR);
          }
        }
      `
    }
  ]
});
