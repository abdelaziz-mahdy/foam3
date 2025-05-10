/**
 * @license
 * Copyright 2023 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

// Common library functions for use with build.js and pmake.js

const fs_   = require('fs');
const exec_ = require('child_process');
const path_ = require('path');


function adaptOrCreateArgs(X, args) {
  /**
    If listed arguments are found in X, then adapt their value
    to appropriate type if an adapter based on their class: is available.
    Otherwise, create a binding in X if argument has a factory: or value:.
  **/
  const adapt = {
    'Boolean': function (v) {
      if ( typeof v === 'boolean' ) return v;

      if ( ! v ) return false;

      var s = v.toString().trim().toLowerCase();
      return s === 'true' || s === 't' || s === '1' || s === 'yes' || s === 'y' || s === 'on';
    }
  };

  args.forEach(a => {
    if ( X.hasOwnProperty(a.name) ) {
      if ( a.class && adapt[a.class] ) {
        X[a.name] = adapt[a.class](X[a.name]);
      }
    } else if ( a.factory ) {
      X[a.name] = a.factory();
    } else if ( a.value ) {
      X[a.name] = a.value;
    }
  });
}


function ensureDir(dir) {
  if ( ! fs_.existsSync(dir) ) {
    console.log('Creating directory', dir);
    fs_.mkdirSync(dir, {recursive: true});
    return true;
  }
  return false;
}


function writeFileIfUpdated(file, txt) {
  if ( fs_.existsSync(file) && ( fs_.readFileSync(file).toString() === txt ) )
    return false;

  fs_.writeFileSync(file, txt);
  return true;
}


function execSync(cmd, options) {
  if ( globalThis['VERBOSE'] )
    console.log('\x1b[0;32mExec: ' + cmd + '\x1b[0;0m');
  return exec_.execSync(cmd, options);
}


function isExcluded(pom, f, opt_disableWildcard) {
  var ex = pom.excludes;
  if ( ! ex ) return false;
  for ( var i = 0 ; i < ex.length ; i++ ) {
    var p = ex[i];
    if ( p.endsWith('*') && ! opt_disableWildcard ) p = p.substring(0, p.length-1);

    if ( f.endsWith(p) || ( f.endsWith('.js') && f.substring(0, f.length-3).endsWith(p) ) ) {
      return true;
    }
  }

  return false;
}


function copyDir(src, dst) {
  /** Recursively copy a directory. **/
  ensureDir(dst);
  fs_.readdirSync(src).forEach(f => {
    var srcPath = path_.join(src, f);
    var dstPath = path_.join(dst, f);

    if ( fs_.lstatSync(srcPath).isDirectory() )
      copyDir(srcPath, dstPath);
    else
      copyFile(srcPath, dstPath);
  });
}


function addBuildEnv(key, doc, val) {
  Object.defineProperty(globalThis, key, {
    get: function()  { return typeof val === 'function' ? val() : val; },
    set: function(v) { val = v; }
  });
  if ( val ) {
    globalThis[key] = val;
    if ( ! globalThis['ENV'] ) {
      globalThis['ENV'] = {};
    }
    globalThis.ENV[key] = val;
  }
}

function buildEnv(m) {
  Object.keys(m).forEach(k => {
    let [doc, val] = m[k];
    addBuildEnv(k, doc, val);
  });
}


function addOptions(options, existing = {}) {
  Object.keys(options).forEach(key => {
    if ( existing[key] ) {
      warning(`[Tooling] duplicate option '${key}' ignored'`);
    } else {
      existing[key] = options[key];
      existing[key].key = key;
    }
    let option = existing[key];
    let env = option[2];
    if ( env && ! globalThis[env] ) {
      addBuildEnv(env, option[3], option[4]);
    }
  });
  return existing;
}

function emptyDir(dir) {
  rmdir(dir);
  ensureDir(dir);
}


function rmdir(dir) {
  if ( fs_.existsSync(dir) && fs_.lstatSync(dir).isDirectory() ) {
    fs_.rmSync(dir, {recursive: true, force: true});
  }
}


function rmfile(file) {
  if ( fs_.existsSync(file) && fs_.lstatSync(file).isFile() ) {
    fs_.rmSync(file, {force: true});
  }
}


function copyFile(src, dst) {
  fs_.copyFileSync(src, dst);
}


function spawn(s) {
  exportEnvs();

  console.log('Spawn: ', s);
  var [cmd, ...args] = s.split(' ');
  return exec_.spawn(cmd, args, { stdio: 'ignore' });
}


function exportEnv(name, value) {
 if ( globalThis['VERBOSE'] )
    console.log(`export ${name}="${value}"`);
  process.env[name] = value;
}


function exportEnvs() {
  /** Export environment variables. **/
  Object.keys(ENV).forEach(k => {
    var v = globalThis[k];
    exportEnv(k, v);
  });
}


function exec(s) {
  exportEnvs();
  return execSync(s, { stdio: 'inherit' });
}


function comma(list, value) {
  return list ? list + ',' + value : value;
}

function info(...args) {
  let msg = args.join(' ');
  console.log('\x1b[0;32mINFO ::', msg, '\x1b[0;0m');
  // green: 32m
  // blue: 34m - too dark on black background
  // magenta: 35m
  // cyan: 36m - may be too light on white background
}

function warning(...args) {
  let msg = args.join(' ');
  console.log('\x1b[0;33mWARNING ::', msg, '\x1b[0;0m');
}

function error(...args) {
  let msg = args.join(' ');
  console.log('\x1b[0;31mERROR ::', msg, '\x1b[0;0m');
  process.exit(1);
}

// Build flag string with global and argument flags
function flag(flgs) {
  var f = globalThis['VERBOSE'] ? 'verbose' : '';
  f = ( f ? f + ',' : '' ) + ( globalThis['TEST'] ? 'test' : '-test');

  if ( globalThis['FLAGS'] )
    f = ( f ? f + ',' : '' ) + FLAGS;

  if ( flgs )
    f = ( f ? f + ',' : '' ) + flgs;

  return f;
}

function findOption(options, o) {
  var result = null;
  Object.keys(options).forEach(key => {
    let option = options[key];
    if ( o === key ||
         o === option[0] ||
         o === option[1] ||
         o === option[2] ) {
      result = option;
      return;
    }
  });
  return result;
}

function findSimilarOptions(options, o) {
  var similar = [];
  Object.keys(options).forEach(key => {
    let option = options[key];
    var gnu = option[1];
    if ( typeof gnu == "string" ) { // see h ?
      gnu = gnu.replaceAll("-","").toLowerCase();
      let target = o.replaceAll("-","").toLowerCase();
      if ( gnu.startsWith(target) ||
           key.toLowerCase().startsWith(target) ) {
        similar.push(option);
        // TODO: add 6 column of common mismatches.
      }
    }
  });
  return similar;
}

function processToolingArgs(ARGS, moreUsage) {
  const args = process.argv.slice(2);
  for ( var i = 0 ; i < args.length ; i++ ) {
    var arg = args[0];
    if ( arg.startsWith('--') ) {
      var a = arg.substring(2);
      var option = findOption(ARGS, a);
      if ( option ) {
        option[5].bind(this, arg.substring(j+1))();
        if ( option.key === 'toolingPoms' ) {
          break;
        }
      }
    } else if ( arg.startsWith('-') ) {
      for ( var j = 1 ; j < arg.length ; j++ ) {
        a = arg.charAt(j);
        option = findOption(ARGS, a);
        if ( option ) {
          option[5].bind(this, arg.substring(j+1))();
          if ( option.key === 'toolingPoms' ) {
            break;
          }
        }
      }
    }
  }
}

function processBuildArgs(ARGS, moreUsage) {
  function usage(f) {
    moreUsage && moreUsage(ARGS);
    if ( f ) {
      if ( f instanceof Function ) f();
      else {
        warning('Unknown argument "'+f+'"');
      }
    }
    process.exit(0);
  }

  var USAGE = [ 'Print usage information.', usage ];
  if ( ! ARGS['h'] ) ARGS['h'] = USAGE;
  if ( ! ARGS['?'] ) ARGS['?'] = USAGE;

  const args = process.argv.slice(2);
  for ( var i = 0 ; i < args.length ; i++ ) {
    var arg = args[i];
    if ( arg === '-h' ||
         arg === '-?' ||
         arg === '-help' ||
         arg === '--help' ) {
      ARGS['h'][1]();
    } else {
      if ( arg.startsWith('--') ) {
        ARGS['tasks'][5](arg.substring(2));
      } else if ( arg.startsWith('-') ) {
        for ( var j = 1 ; j < arg.length ; j++ ) {
          var a = arg.charAt(j);
          var option = findOption(ARGS, a);
          if ( option ) {
            // FIXME: see TestTooling.js:30 and JavaTooling.js:55,
            // this.comma is undefined. EXPORTS.comma works.
            // bind(this, and bind(EXPORTS, did not help - Joel
            // option[5](arg.substring(j+1));
            option[5].bind(this, arg.substring(j+1))();
            if ( a >= 'A' && a <= 'Z' ) break;
          } else {
            let msg = 'Unknown argument "' + a + '"';
            // output warning message after usage as the usage is so long
            // the user will have to scroll pages up to see the issue.
            ARGS['h'][1](() => warning(msg));
          }
        }
      }
    }
  }
}

exports.adaptOrCreateArgs     = adaptOrCreateArgs;
exports.buildEnv              = buildEnv;
exports.addOptions            = addOptions;
exports.comma                 = comma;
exports.copyDir               = copyDir;
exports.copyFile              = copyFile;
exports.emptyDir              = emptyDir;
exports.ensureDir             = ensureDir;
exports.error                 = error;
exports.exec                  = exec;
exports.execSync              = execSync;
exports.exportEnvs            = exportEnvs;
exports.findOption            = findOption;
exports.findSimilarOptions    = findSimilarOptions;
exports.flag                  = flag;
exports.info                  = info;
exports.isExcluded            = isExcluded;
exports.processBuildArgs      = processBuildArgs;
exports.processToolingArgs    = processToolingArgs;
exports.rmdir                 = rmdir;
exports.rmfile                = rmfile;
exports.spawn                 = spawn;
exports.warning               = warning;
exports.writeFileIfUpdated    = writeFileIfUpdated;
