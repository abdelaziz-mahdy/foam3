/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.POM({
  name: 'test',

  options: {
    benchmark: [ 'b', 'benchmarks', 'BENCHMARK', 'Run all benchmarks.', false,
                 () => {
                   BENCHMARK = true;
                   DELETE_RUNTIME_JOURNALS = true;
                   APP_ROOT = '/tmp';
                 } ],
    benchmarks: [ 'B', 'benchmarks', 'BENCHMARKS', 'Run listed benchmarks - benchmarkId1,benchmarkId2,...', '',
                  args => {
                    OPTIONS['benchmark'].f();
                    BENCHMARKS = args;
                  } ],
    logLevel: ['l', 'log-level', 'LOG_LEVEL', 'Set JVM Log level for TEST cases. Defaults to ERROR. example: --log-level:INFO',null, arg => LOG_LEVEL = arg ],
    test: [ 't', 'test', 'TEST', 'Run All tests.', false,
            args => {
              TEST = true;
              // DELETE_RUNTIME_JOURNALS = true;
              // FIXME: this.comma undefined, see buildlib.js:281
              // JOURNALS = this.comma(JOURNALS, 'test');
              JOURNALS = EXPORTS.comma(JOURNALS, 'test');
              APP_ROOT='/tmp';
            } ],
    tests: [ 'T', 'tests', 'TESTS', 'Run listed tests - testId1,testId2,...', '',
             args => {
               OPTIONS['test'].f();
               TESTS = args;
             } ]
  },

  tasks: {
    clean: ['clean', 'Set Java environmental variables specific to running test cases.', [], function clean() {
      if ( TEST || BENCHMARK ) {
        this.rmdir(APP_HOME);
      }
    }],
    runTests: ['run-tests', 'Run all or specified test cases. ex: runTests[:Test1,Test2]', ['pomEnvs'], function runTests(args) {
      if ( args ) {
        OPTIONS['tests'].f(args);
      } else {
        OPTIONS['test'].f();
      }
      if ( CLEAN_ALL ) {
        this.execute('cleanAll');
      } else {
        this.execute('clean');
      }
      this.execute('buildJar');
      this.execute('startCORE');
    }],
    runBenchmarks: ['run-benchmarks', 'Run all or specified benchmarks. ex: runBenchmarks[:Benchmark1,Benchmark2]', ['pomEnvs'], function runBenchmarks(args) {
      if ( args ) {
        OPTIONS['benchmarks'].f(args);
      } else {
        OPTIONS['benchmark'].f();
      }
      if ( CLEAN_ALL ) {
        this.execute('cleanAll');
      } else {
        this.execute('clean');
      }
      this.execute('buildJar');
      this.execute('startCORE');
    }]
  }
});
