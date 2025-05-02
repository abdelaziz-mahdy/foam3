/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

const { comma, copyDir, copyFile, emptyDir, ensureDir, exec, execSync, exportEnvs, info, rmdir, rmfile, warning } = require('./buildlib');

foam.POM({
  name: 'test',
  envs: {
    BENCHMARK:         ['Run benchmarks when true',false],
    BENCHMARKS:        ['Set of benchmarks to run, run all when empty'],
    DELETE_RUNTIME_JOURNALS: ['Delete application journals',false],
    TEST:              ['Run test cases',false],
    TESTS:             ['Set of test cases to run. Run all when empty']
  },

  args: {
    b: [ 'run all benchmarks.',
         () => {
           BENCHMARK = true;
           DELETE_RUNTIME_JOURNALS = true;
           APP_ROOT = '/tmp';
         } ],
    B: [ 'benchmarkId1,benchmarkId2,... : Run listed benchmarks.',
         args => { ARGS.b[1](); BENCHMARKS = args; } ],
    t: [ 'Run All tests.',
         () => {
           TEST = true;
           DELETE_RUNTIME_JOURNALS = true;
           JOURNALS = comma(JOURNALS, 'test');
           APP_ROOT='/tmp';
         } ],
    T: [ 'testId1,testId2,... : Run listed tests.',
         args => {
           ARGS.t[1]();
           TESTS = args;
         } ]
  },

  tasks: {
    clean: ['Set Java environmental variables specific to running test cases.', [], function clean() {
      if ( TEST || BENCHMARK ) {
        rmdir(APP_HOME);
      }
    }]
  }
});
