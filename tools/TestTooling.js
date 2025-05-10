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
                    OPTIONS['benchmark'][5]();
                    BENCHMARKS = args;
                  } ],
    deleteRuntimeJournals: [ 'j', 'delete-runtime-journals', 'DELETE_RUNTIME_JOURNALS', 'Delete runtime journals.', false, () => DELETE_RUNTIME_JOURNALS = true ],
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
               OPTIONS['test'][5]();
               TESTS = args;
             } ]
  },

  tasks: {
    clean: ['Set Java environmental variables specific to running test cases.', [], function clean() {
      if ( TEST || BENCHMARK ) {
        this.rmdir(APP_HOME);
      }
    }],
    runTests: ['Run all or specified test cases. ex: runTests[:Test1,Test2]', ['pomEnvs'], function runTests(args) {
      if ( args ) {
        OPTIONS['tests'][5](args);
      } else {
        OPTIONS['test'][5]();
      }
      if ( CLEAN_ALL ) {
        this.execute('cleanAll');
      } else {
        this.execute('clean');
      }
      this.execute('buildJar');
      this.execute('startCORE');
    }],
    runBenchmarks: ['Run all or specified benchmarks. ex: runBenchmarks[:Benchmark1,Benchmark2]', ['pomEnvs'], function runBenchmarks(args) {
      if ( args ) {
        OPTIONS['benchmarks'][5](args);
      } else {
        OPTIONS['benchmark'][5]();
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
