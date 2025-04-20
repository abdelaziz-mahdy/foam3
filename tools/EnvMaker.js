/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

const { warning } = require('./buildlib');

exports.description = 'Capture POM specified environment variables.';

exports.init = function() {
  verbose('[Env] init');

  X.pomenvs = {};

  X.envs && X.envs.split(',').forEach(e => {
    var kv = e.split('=');
    // example: ['name'] = 'APP_NAME'
    verbose(`[Env] init ${kv[1]} = ${kv[0]}`);
    X.pomenvs[kv[1]] = kv[0];
  });
};

exports.visitPOM = function(pom) {
  Object.keys(X.pomenvs).forEach(k => {
    if ( X.pomenvs[X.pomenvs[k]] ) return;

    verbose(`[Env] ${pom.name} testing ${k}`);
    var v = pom[k];
    if ( v && ! X.pomenvs[X.pomenvs[k]] ) {
      console.log(`[Env] setting ${X.pomenvs[k]} = ${v}`);
      // example: X.pomenvs['APP_NAME'] = 'foam'
      X.pomenvs[X.pomenvs[k]] = v;
      // console.log(`[Env] deleting ${k}`);
      delete X.pomenvs[k];
    }
  });
};

exports.end = function() {
  // clean up and report any variables not set
  X.envs && X.envs.split(',').forEach(e => {
    var kv = e.split('=');
    if ( ! X.pomenvs[kv[0]] ) {
      warning(`[Env] ${kv[0]} not set`);
      delete X.pomenvs[kv[1]];
    }
  });
};
