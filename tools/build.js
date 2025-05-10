#!/usr/bin/env node
/**
 * @license
 * Copyright 2024 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */
// Build and Deploy a FOAM Application
//
// Tools
//   tools/JSMaker.js
//     - collects and minifies .js files into a single foam-bin.js file
//     - uses the UglifyJS library to minimize the size of the packaged .js files
//   tools/JavaMaker.js
//     - generates .java files from .js models
//     - create /build/javacfiles file containing list of modified or static .java files
//     - build pom.xml from accumulated javaDependencies
//     - call maven to update dependencies if pom.xml updated
//     - call javac to compile files in javacfiles
//     - create a Maven pom.xml file with accumulated POM javaDependencies information
//   tools/JournalMaker.js
//     - copies .jrl files into /build/journals
//   tools/DocMaker.js
//     - copies .flow files into /build/documents
//
// Directory Structure:
//   /deployment    - deployment specific journals
//   /build
//     /src         - java source files created by genJava
//     /classes     - compiled java class files created with javac (called by genJava)
//     /classes
//       /documents
//       /images
//       /journals
//     /documents    - All .flow documents are copied here by genJava
//     /journals     - All journal.0 files created by genJava
//     /package      - Designation for .tar.gz files
//     /javacfiles   - A list of all java files to be compiled by javac, created by genJava
//     /lib          - 3rd party java .jar library files created by gradle (or maven)
//     /webroot      - jetty resource base directory for jar build
//   /opt/<pom.name>
//     /bin
//     /etc
//     /logs
//     /documents
//     /journals
//     /lib
//     /saf
//     /var
//
// TODO:
//   - should Makers be responsible for building target directories?

/*
diskutil erasevolume HFS+ RAM_Disk $(hdiutil attach -nomount ram://1000000)
ln -s /Volumes/RAM_DISK /path/to/project/build2

diskutil erasevolume HFS+ 'RAMDisk' `hdiutil attach -nomount ram://848000`
mkdir /Volumes/RamDisk/build
rm -rf ~/foam3/build
ln -s /Volumes/RamDisk/build ~/foam3/build
*/

const { existsSync,  readdirSync, writeFileSync } = require('fs');
const { hostname }                                = require('os');
const { join }                                    = require('path');
const { buildEnv, addOptions, comma, copyDir, copyFile, emptyDir, ensureDir, exec, execSync, exportEnvs, findOption, findSimilarOptions, flag, info, isExcluded, processBuildArgs, processToolingArgs, rmdir, rmfile, spawn, warning, error } = require('./buildlib');
const pmake                                       = require('./pmake');

process.on('unhandledRejection', e => {
  console.error("ERROR: Unhandled promise rejection ", e);
  process.exit(1);
});

var depth   = 1;
var running = {};
var summary = [];
var tasks   = [];

function task(desc, dep, f) {
  if ( arguments.length == 1 ) {
    f    = desc;
    desc = '';
    dep  = [];
  }

  if ( ! tasks[f.name] ) {
    tasks[f.name] = [desc, dep];
  }

  var fired = false;
  var rec   = [ ];
  var SUPER = globalThis[f.name] || function() { };
  globalThis[f.name] = function(...args) {
    if ( fired ) return;
    fired = true;

    running[f.name] = (running[f.name] || 0) + 1;
    if ( running[f.name] === 1 ) {
      summary.push(rec);
      info(`Starting Task :: ${f.name}`);
      var start = Date.now();
      rec[0] = ''.padEnd(2*depth) + f.name;
      rec[2] = start;
      depth++;
    }

    // execute task dependencies
    let task = tasks[f.name];
    let dep = task[1];
    dep.forEach(d => {
      if ( d instanceof Function ) {
        d();
      } else {
        var f = globalThis[d];
        if ( f )
          f(...d.slice(1));
      }
    });

    // execute same named pom tasks
    let pomTasks = POM_TASKS && POM_TASKS[f.name];
    if ( pomTasks ) {
      info(`POM Tasks :: ${f.name}`);
      if ( ! DRY_RUN ) {
        pomTasks.forEach(k => {
          try {
            k.bind(Object.assign({}, EXPORTS))(...args);
          } catch (e) {
            warning(e);
            console.log(`POM Tasks :: f.name: ${f.name}, k: ${k} typeof ${typeof k}`);
          }
        });
      }
    }

    // execute tasks
    if ( ! DRY_RUN || f.name == 'pomEvns' || f.name == 'all' ) {
      f.bind(Object.assign({ SUPER }, EXPORTS))(...args);
    }

    running[f.name] -= 1;
    if ( running[f.name] === 0 ) {
      depth--;
      var end = Date.now();
      var dur = ((end-start)/1000).toFixed(1);
      info(`Finished Task :: ${f.name} in ${dur} seconds`);
      rec[1] = dur;
    }
  };
}

// Execute task by name
function execute(t, args) {
  var f = globalThis[t];
  if ( ! f ) {
    let option = findOption(OPTIONS, t);
    if ( option ) {
      f = globalThis[option.key];
      if ( ! f && option[5] ) {
        // non task
        f = option[5];
      }
    }
  }
  if ( f ) {
    f(args);
  } else {
    var extra = '';
    if ( t.length > 1 ) {
      let similar = findSimilarOptions(OPTIONS, t);
      if ( similar.length > 0 ) {
        extra += '\n  Possible matches: \n';
      }
      similar.forEach(option => {
        extra += '    ' + option[0] + ' ' + option.key + ' ' + option[1] + '\n';
      });
    }
    error('Task not found - ', t, extra);
  }
}

function showSummary() {
   var s = '';
   summary.forEach(e => {
     if ( e[1] === undefined ) {
       var end = Date.now();
       var dur = ((end-e[2])/1000).toFixed(1);
       e[1] = dur;
     }
     s += e[0].padEnd(25) + ' ' + e[1].padStart(15) + 's\n';
   });
   if ( s ) {
     info('Execution Summary:\n', s);
   }
 }

 function quit(code) {
   showSummary();
   if ( code ) {
     console.trace();
   }
   process.exit(code);
 }

 // build pom map and ensure the POMS list is viable
 function pom() {
   var poms   = [];
   function addPom(fn) {
     if ( ! existsSync(fn + '.js') )
       error('File not found ' + fn + '.js');
     else
       poms.push(fn);
   };

   if ( ! POMS ) {
     POMS = 'pom';
   }

   var root = false;
   POMS.split(',').forEach(c => {
     addPom(c && `${PROJECT_HOME}/${c}`);
     root = root || c == 'pom';
   });
   // backward compatibility - hithertoo, only the root directory pom
   // was 'require(pom)' to start the build process.  Now, the initial
   // pom can be specified. When not explicitly specified, the first
   // pom will most likely be set to a deployment pom via -J. The build
   // will fail if the foam pom is not specified.
   if ( ! root ) {
     poms.unshift('pom');
     POMS = comma('pom', POMS);
     warning('Added /pom');
   }

   if ( globalThis['JOURNALS'] )
     JOURNALS.split(',').forEach(c => addPom(c && `${PROJECT_HOME}/deployment/${c}/pom`));

   POMS = poms.join(',');
   info('poms', POMS);
   return POMS;
 }

 // Environment Variables which are exported when updated
 var ENVS = {
   BUILD_DIR:         ['Build directory, relative to project root','build'],
   EXPORTS:           ['Build environment variables which will be exported to pom tasks.', {}],
   FLAGS:             ['Flags passed to pmake. ex. verbose, test, ... '],
   HOST_NAME:         ['Hostname set in JVM', () => hostname()],
   OPTIONS:           ['Build options determined during tooling which can be configured to by CLI and POM arguments to control the build', {}],
   POM_TASKS:         ['Map of named tasks captured from build POMs. Will be executed when same named build task is executed.', []],
   POM_ENVS:          ['Environment variables expected to be set from POMs', 'APP_NAME=name,JAVA_RELEASE=java,VERSION=version,VENDOR=vendor,VENDOR_ID=vendorId'],
   PROJECT:           ['Top-Level Loaded POM Object, not be be confused with POMS, which is the name of POM(s) to be loaded'],
   PROJECT_HOME:      ['Project directory',process.cwd()],
   TOOLING_OPTIONS:   ['Options which control the tooling phase of the build', {}],
   VERBOSE:           ['Enable VerboseMaker to log additional info during build',false],
 };

 // Configure build variables
 buildEnv(ENVS);

// Export functions for Tooling and Build POM tasks
EXPORTS = Object.assign(EXPORTS, {
  comma,
  copyDir,
  copyFile,
  emptyDir,
  ensureDir,
  error,
  exec,
  execute,
  execSync,
  existsSync,
  flag,
  info,
  isExcluded,
  join,
  pmake,
  readdirSync,
  rmdir,
  rmfile,
  showSummary,
  warning,
  writeFileSync
});

TOOLING_OPTIONS = addOptions({
   toolingPoms: [ 'O', 'tooling-poms', 'TOOLING_POMS', 'CSV list of tooling poms', 'Standard,Example,Java,JS,Maven,Npm,Test', '', args => TOOLING_POMS = args ]
}, TOOLING_OPTIONS);

OPTIONS = addOptions({
  dryRun: [ '', 'dry-run', 'DRY_RUN', 'Run build in dry-run mode which just lists tasks that would have run.', false, () => DRY_RUN = true ],
  envs: [ 'E', 'envs', '', 'Set environment variables. Example: -EJAVA_OPTS:-Xmx8g,APP_NAME:demo or -EJAVA_OPTS:"-Xms12g -Xmx12g"', '',
          args => {
            args.split(',').forEach(b => {
              var c = b.split(':');
              if ( ! ( c[0] in globalThis ) ) {
                error('Unknown environment variable:', c[0]);
              } else if ( c.length > 1 ) {
                globalThis[c[0]] = c.slice(1).join(':');
              }
            });
          }
        ],
  topic: [ 'H', 'topic-help', '', 'Help on a particular topic', '',
           args => {
             var a = args;
             if ( a.startsWith(':') ||
                  a.startsWith('=') ) {
               a = a.substring(1);
             }
             var option = findOption(OPTIONS, a);
             if ( option ) {
               console.log(a, ':', option[3]);
             } else {
               let t = tasks[a] || ENVS[a];
               if ( t ) {
                 console.log(a,':',t[0]);
               } else {
                 var similar = findSimilarOptions(OPTIONS, a);
                 var extra = '';
                 if ( similar.length > 0 ) {
                   extra += '\n  Possible matches: \n';
                 }
                 similar.forEach(option => {
                   extra += '    ' + option[0] + ' ' + option.key + ' ' + option[1] + '\n';
                 });
                 error('Topic not found - ', a, extra);
               }
             }
             quit(0);
           }
         ],
  poms: [ 'P', 'poms', 'POMS', "comma seperated list of pom files. Defaults to 'pom' at the root of the project.", '',
          args => { POMS = args; } ],
  tasks: [ 'X', 'tasks', 'TASKS', 'Explicitly execute tasks. Comma seperated list of task names. Parameters to each demarcated with : symbol. Ex: -XcheckDeps:9', 'all',
           args => {
             if ( TASKS === 'all' )
               TASKS = '';
             TASKS = comma(TASKS, args);
           } ]
}, OPTIONS);

function moreUsage(options) {
  info('Usage: build.js [OPTIONS] (see --usage for examples)');
  console.log('\nOptions are:');
  Object.keys(options).forEach(key => {
    let option = options[key];
    var msg = '';
    if ( option[0] ) {
      msg = ' -'+option[0];
    }
    msg += (msg ? ' or ' : '');
    msg += '--'+key;
    if ( option[4] ) {
      msg += ' ('+option[4]+')';
    }
    msg += ': ' + option[3];
    console.log(msg);
  });

  console.log('\n');
  info('Tasks: (invoke with -XtaskName)');
  var ts = { ...tasks };
  var depth = 1;
  function printTask(t) {
    if ( ! ts[t] ) return;
    delete ts[t];
    var [ desc, dep ] = tasks[t];
    var dep2 = dep.filter(d => ! ts[d]); // list of dependencies which appear elsewhere in tree
    var dstr = dep2.length ? ' [ ' + dep2.join(', ') + ' ]': '';
    console.log(''.padEnd(depth*2) + t.padEnd(27-depth*2) + desc + dstr);
    depth++;
    dep.forEach(printTask);
    depth--;
  }
  Object.keys(ts).sort().forEach(t => {
    printTask(t);
  });

  console.log('\n');
  info('Environment variables: (set with -E)');
  depth = 1;
  Object.keys(ENVS).sort().forEach(k => {
    var [ desc, val ] = ENVS[k];
    var v = val;
    if ( val instanceof Function)
       v = val();
    v = v && v + ' ' || 'undefined';
    console.log(''.padStart(1), k+':', ''.padStart(22-k.length), v, ''.padStart(22-v.length), desc);
  });
  console.log('\n');
  info('Execute \'./build.sh --usage\' for examples)');
}


// ############################
// # Build tasks
// ############################

task('Prepare build environment', [], function tooling() {
  var tps = '';
  (TOOLING_POMS || '').split(',').forEach(name => {
    var fn = join(__dirname,`${name}Tooling`);
    if ( existsSync(fn + '.js') ) {
      tps = comma(tps, fn);
    }
    fn = join(process.cwd(),`tools/${name}Tooling`);

    if ( existsSync(fn + '.js') ) {
      tps = comma(tps, fn);
    }
  });
  let maker = pmake.bind(Object.assign({}, EXPORTS), `-makers=Tooling -pom=${tps} -envs=${ENVS} -args=${OPTIONS}`)();
  Object.assign(ENVS, maker.envs);
  buildEnv(maker.envs);

  OPTIONS = addOptions(maker.options, OPTIONS);

  Object.keys(maker.tasks || {}).forEach(name => {
    let list = maker.tasks[name];
    list.forEach(t => {
      let [desc, dep, f] = t;
      if ( f.name !== name ) {
        warning(`[build] tooling name: ${name} != f.name ${f.name}`);
      }
      // TODO: refactor to register against top level and also run dependencies
      if ( ! tasks[name] ) {
        task(desc, dep, f);
      } else {
        let pomList = POM_TASKS[name] || [];
        pomList.push(f);
        POM_TASKS[name] = pomList;
      }
    });
  });
});

task('Capture POM specified environment values and register POM tasks for later execution when the corresponding build tasks is executed.', [], function pomEnvs() {
  let makers = pmake.bind(Object.assign({}, EXPORTS), `-makers=Env,Task -flags=${flag()} -pom=${POMS} -builddir=${BUILD_DIR} -envs=${POM_ENVS}`)();

  let envMaker = makers.get('Env');
  Object.keys(envMaker.envs || {}).forEach(k => {
    globalThis[k] = envMaker.envs[k];
  });

  let taskMaker = makers.get('Task');
  Object.keys(taskMaker.tasks || {}).forEach(name => {
    let list = taskMaker.tasks[name];
    list.forEach(t => {
      let pomList = POM_TASKS[name] || [];
      pomList.push(t);
      POM_TASKS[name] = pomList;
    });
  });
});

task('Run pom copy[] tasks.', [], function copy() {
  pmake.bind(Object.assign({}, EXPORTS), `-makers=Copy -flags=${flag()} -pom=${POMS} -builddir=${BUILD_DIR}`)();
});

task('Show POM structure.', [], function showPOMs() {
  pmake.bind(Object.assign({}, EXPORTS), `-makers=Verbose -flags=${flag('web,java')} -pom=${POMS} -builddir=${BUILD_DIR}`)();
});

// processToolingArgs.bind(Object.assign({}, EXPORTS), TOOLING_OPTIONS, moreUsage)();
processToolingArgs.bind(Object.assign({}, EXPORTS), TOOLING_OPTIONS, moreUsage)();
execute('tooling');

// Process command line arguments
processBuildArgs.bind(Object.assign({}, EXPORTS), OPTIONS, moreUsage)();

// build pom map for POM_TASKS, and ensure POMS list is viable
pom();

// start the build
TASKS.split(',').forEach(t => {
  var s = t.split(':');
  execute(s[0], s[1]);
});

quit(0);
