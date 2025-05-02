/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

const { warning } = require('./buildlib');
const envs = {};

exports.description = 'Capture POM specified environment variables.';

exports.init = function() {
  verbose('[Env] init');

  X.envs && X.envs.split(',').forEach(e => {
    var kv = e.split('=');
    // example: ['name'] = 'APP_NAME'
    envs[kv[1]] = kv[0];
    verbose(`[Env] init ${kv[1]} = ${kv[0]}`);
    if ( globalThis[kv[0]] ) {
      envs[kv[0]] = globalThis[kv[0]];
      console.log(`[Env] not overriding ${kv[0]} = ${envs[kv[0]]}`);
    }
  });
};

exports.visitPOM = function(pom) {
  Object.keys(envs).forEach(k => {
    if ( envs[envs[k]] ) return;

    verbose(`[Env] ${pom.name} testing ${k}`);
    var v = pom[k];
    if ( v && ! envs[envs[k]] ) {
      console.log(`[Env] setting ${envs[k]} = ${v}`);
      // example: envs['APP_NAME'] = 'foam'
      envs[envs[k]] = v;
      // console.log(`[Env] deleting ${k}`);
      delete envs[k];
    }
  });
};

exports.end = function() {
  // clean up and report any variables not set
  X.envs && X.envs.split(',').forEach(e => {
    var kv = e.split('=');
    if ( ! envs[kv[0]] ) {
      warning(`[Env] ${kv[0]} not set`);
      delete envs[kv[1]];
    }
  });
};

exports.envs = envs;
