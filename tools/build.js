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
const { bool, buildEnv, addOptions, comma, copyDir, copyFile, emptyDir, ensureDir, exec, execSync, exportEnvs, findOption, findSimilarOptions, findTask, findSimilarTasks, flag, hyphenate, info, isExcluded, processBuildArgs, processToolingArgs, rmdir, rmfile, spawn, warning, verbose } = require('./buildlib');
const pmake                                       = require('./pmake');
const TASK_SEPERATOR                              = ' ';

process.on('unhandledRejection', e => {
  error("ERROR: Unhandled promise rejection ", e);
});

var depth   = 1;
var running = {};
var summary = [];
var tasks   = [];

function task() {
  var name, gnuopt, desc = '', dep = [], f;
  if ( arguments.length == 1 ) {
    f = arguments[0];
    name = f.name;
    gnuopt = hyphenate(f.name);
  } else if ( arguments.length == 3 ) {
    f = arguments[2];
    name = f.name;
    gnuopt = hyphenate(f.name);
    desc = arguments[0];
    dep = arguments[1];
  } else if ( arguments.length == 4 ) {
    f = arguments[3];
    name = f.name;
    gnuopt = arguments[0];
    desc = arguments[1];
    dep = arguments[2];
  } else if ( arguments.length == 5 ) {
    name = arguments[0];
    gnuopt = arguments[1];
    desc = arguments[2];
    dep = arguments[3];
    f = arguments[4];
  } else {
    var msg = 'task() expecting 1, 3, 4, or 5 arguments\n';
    Object.keys(arguments).forEach(key => {
      msg += key +': ' + arguments[key] + '\n';
    });
    error(msg);
  }

  if ( ! tasks[name] ) {
    tasks[name] = {
      name: name,
      gnuopt: gnuopt,
      desc: desc,
      dep: dep,
      f: f
    };
  } else {
    warning(`[build] ignoring duplicate task -  name: ${name}, gnuopt: ${gnuopt}, desc: ${desc}, dep: ${dep}`);
  }

  var fired = false;
  var rec   = [ ];
  var SUPER = globalThis[name] || function() { };
  globalThis[name] = function(...args) {
    if ( fired ) return;
    fired = true;

    running[name] = (running[name] || 0) + 1;
    if ( running[name] === 1 ) {
      summary.push(rec);
      info(`Starting Task :: ${name}`);
      var start = Date.now();
      rec[0] = ''.padEnd(2*depth) + name;
      rec[2] = start;
      depth++;
    }

    // execute task dependencies
    let task = tasks[name];
    let dep = task.dep;
    dep.forEach(d => {
      if ( d instanceof Function ) {
        d.apply(Object.assign({}, EXPORTS), args);
      } else {
        var f = globalThis[d];
        if ( f )
          f.apply(Object.assign({}, EXPORTS), args);
        else
          error('Task', name, 'dependency not found', d);
      }
    });

    // execute same named pom tasks
    let pomTasks = POM_TASKS && POM_TASKS[name];
    if ( pomTasks ) {
      info(`POM Tasks :: ${name}`);
      if ( ! DRY_RUN ) {
        pomTasks.forEach(k => {
          // FIXME: POM_TASKS has both POM tasks, and extra same named build tasks
          var f = k[3] || k;
          try {
            f.apply(Object.assign({}, EXPORTS), args);
          } catch (e) {
            error(`POM Tasks :: ${k}`, '\n', e);
          }
        });
      }
    }

    // execute tasks
    if ( ! DRY_RUN || name == 'pomEvns' || name == 'all' ) {
      f.apply(Object.assign({ SUPER }, EXPORTS), args);
    }

    running[name] -= 1;
    if ( running[name] === 0 ) {
      depth--;
      var end = Date.now();
      var dur = ((end-start)/1000).toFixed(1);
      info(`Finished Task :: ${name} in ${dur} seconds`);
      rec[1] = dur;
    }
  };
}

// Execute task by name
function execute(t, ...args) {
  // console.log(`execute t: ${t} args: ${args}`);
  var f = globalThis[t];
  if ( ! f ) {
    let task = findTask(tasks, t);
    if ( task ) {
      f = globalThis[task.name];
      if ( ! f && task.f ) {
        f = task.f;
      }
    }
  }
  if ( ! f ) {
    let option = findOption(OPTIONS, t);
    if ( option ) {
      f = globalThis[option.name];
      if ( ! f && option.f ) {
        f = option.f;
      }
    }
  }
  if ( f ) {
    f.apply(Object.assign({}, EXPORTS), args);
  } else {
    var extra = '';
    if ( t.length > 1 ) {
      let similar = findSimilarTasks(tasks, t);
      if ( similar.length > 0 ) {
        extra += '\n  Possible Task matches: \n';
      }
      similar.forEach(task => {
        extra += '    ' + task.name + ' ' + task.gnuopt + ' - ' + task.desc + '\n';
      });
      similar = findSimilarOptions(OPTIONS, t);
      if ( similar.length > 0 ) {
        extra += '\n  Possible Option matches: \n';
      }
      similar.forEach(option => {
        extra += '    ' + option.name + ' ' + option.opt + ' ' + option.gnuopt + ' - ' + option.desc + '\n';
      });
    }
    error('Task not found - ', t, extra);
  }
}

function showSummary() {
  if ( HELP ) return;

  if ( SHOW_REPORT ) {
    moreUsage();
  }

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
task('show-summary', 'Display build statistics', [], showSummary);

function quit(code) {
  showSummary();
  if ( code ) {
    console.trace();
  }
  process.exit(code);
}

function error(...args) {
  showSummary();
  let msg = args.join(' ');
  console.log('\x1b[0;31mERROR ::', msg, '\x1b[0;0m');
  process.exit(1);
}

// arg === report is used internally to output the envs report,
// regarless of user selecting --show-report
function moreUsage(arg) {
  let report = SHOW_REPORT ||
      ( arg && arg === 'report' );

  if ( ! report ) {
    info('Usage: build.js [OPTIONS] (see --usage for examples)');
    if( ! arg || arg === 'options' ) {
      info('\nOptions are:');
      Object.keys(OPTIONS).forEach(key => {
        let option = OPTIONS[key];
        var opts = '';
        if ( option.opt ) {
          opts = '-'+option.opt;
        }
        opts += (opts ? ', ' : '');
        opts += '--'+option.name;
        if( option.gnuopt !== key ) {
          opts += ', --'+option.gnuopt;
        }
        if ( option.env ) {
          opts += ', '+option.env;
        }
        var def = option.env && globalThis[option.env] && globalThis[option.env].toString();
        if ( ! def ) {
          def = option.def ? option.def : '';
          if ( def instanceof Function ) {
            def = def();
          }
        }
        console.log(''.padStart(0), opts+':', ''.padStart(41-opts.length), '\x1b[0;35m', def,'\x1b[0;0m');
        console.log(''.padStart(3), option.desc);
      });
    }

    if ( ! arg || arg === 'tasks' ) {
      info('\nTasks: (invoke with -XtaskName or --task-name)');
      var ts = { ...tasks };
      var depth = 1;
      function printTask(t) {
        if ( ! ts[t] ) return;
        delete ts[t];
        var task = findTask(tasks, t);
        var dep2 = task.dep.filter(d => ! ts[d]); // list of dependencies which appear elsewhere in tree
        var dstr = dep2.length ? ' [ ' + dep2.join(', ') + ' ]': '';
        let desc = report ? '' : task.desc;
        console.log(''.padEnd(depth*2) + t.padEnd(27-depth*2) + desc + dstr);
        depth++;
        task.dep.forEach(printTask);
        depth--;
      }
      Object.keys(ts).sort().forEach(t => {
        printTask(t);
      });
    }
  }
  if ( report ||
       ! arg ||
       arg === 'envs' ) {
    if ( report ) {
      info('Build report');
    } else {
      info('\nEnvironment variables: (set with -E)');
    }
    depth = 1;

    Object.keys(ENVS).sort().forEach(k => {
      if ( NO_REPORT_ENVS[k] ) {
        // console.log(`moreUsage skipping ${k}`);
        return;
      }
      var [ desc, _ ] = ENVS[k];
      var v = globalThis[k];
      if ( v === null || v === undefined )
        v = '';
      else
        v = v.toString();
      console.log(''.padStart(0), k+':', ''.padStart(20-k.length), '\x1b[0;35m', v, '\x1b[0;0m',);
      if ( ! report && desc ) {
        console.log(''.padStart(3), desc);
      }
    });
  }
  console.log('');
  if ( ! report ) {
    info('See --usage for examples, and documentation #flowdoc/Build.)');
  }
}

// Internal environment variables of build.js and buildlib.js
var ENVS = {
  EXPORTS:           ['Build environment variables which will be exported to pom tasks.', {}],
  OPTIONS:           ['Build options determined during tooling which can be configured to by CLI and POM arguments to control the build', {}],
  POM_ENVS:          ['Supports translating top level POM parameters to build parameters, such as pom.name -> APP_NAME, pom.version -> VERSION.  Also provides legacy support to POMs still using top level POM parametes for Java Manifest and Javac Parameters. Java Manifest property \'vendor\' should be set in POM task \'javaManifest\' and \'java\' should be set in POM task \'javacParameters\'.', 'APP_NAME=name,VERSION=version,JAVA_RELEASE=java,JAVA_MANIFEST_VENDOR=vendor'],
  POM_TASKS:         ['Map of named tasks captured from build POMs. Will be executed when same named build task is executed.', []],
  PROJECT:           ['Top-Level Loaded POM Object, not be be confused with variable \'POMS\', which is the name of the POM(s) to be processed by the build'],
  TOOLING_OPTIONS:   ['Options which control the tooling phase of the build', {}],
};
let NO_REPORT_ENVS = Object.assign({}, ENVS);
globalThis['ENVS'] = ENVS;

// Configure build variables
buildEnv(ENVS);

// Export functions for Tooling and Build POM tasks
EXPORTS = Object.assign(EXPORTS, {
  addJournal,
  bool,
  buildEnv,
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
  hostname,
  info,
  isExcluded,
  join,
  pmake,
  readdirSync,
  rmdir,
  rmfile,
  showSummary,
  warning,
  writeFileSync,
  verbose
});

TOOLING_OPTIONS = addOptions({
  toolingPoms: [ 'O', 'tooling-poms', 'TOOLING_POMS', 'CSV list of tooling poms', 'Standard,Java,JS,Maven,Npm', arg => TOOLING_POMS = arg ]
}, TOOLING_OPTIONS);

OPTIONS = addOptions({
  buildDir: [ '', 'build-dir', 'BUILD_DIR', 'Build directory, relative to project root','build', arg => BUILD_DIR = arg ],
  dryRun: [ '', 'dry-run', 'DRY_RUN', 'Run build in dry-run mode which just lists tasks that would have run.', false, function(arg) { DRY_RUN = arg ? bool(arg) : true; } ],
  envs: [ 'E', 'envs', '', 'Set environment variables. Example: -EJAVA_OPTS:-Xmx8g,APP_NAME:demo or -EJAVA_OPTS:"-Xms12g -Xmx12g"', '',
          arg => {
            arg.split(',').forEach(b => {
              var c = b.split(':');
              if ( ! ( c[0] in globalThis ) ) {
                error('Unknown environment variable:', c[0]);
              } else if ( c.length > 1 ) {
                globalThis[c[0]] = c.slice(1).join(':');
              }
            });
          }
        ],
  flags: ['f', 'flags', 'FLAGS', 'Flags passed to pmake. Explicitly set with --flags:test, for example.', '', arg => FLAGS = arg ],
  help: [ 'h', 'help', 'HELP', 'Print usage information for environment variables (envs), options, and tasks.  Narrow output with --help:tasks, for example. Or show help for a particular topic with --help:foo where foo is the name of an option or task.', '', arg => {
    HELP = true;
    if ( ! arg ) {
      moreUsage(arg);
    } else if ( typeof arg === "string" ) {
      if ( arg === 'envs' ||
           arg === 'options' ||
           arg === 'tasks' ) {
        moreUsage(arg);
      } else {
        execute('topic', arg);
      }
    } else if ( arg instanceof Function ) {
      moreUsage();
      arg();
    }
    process.exit(0);
  }],
  hostname: ['', 'hostname', 'HOST_NAME', 'Hostname to set in JVM', hostname(), args => HOST_NAME = args ],
  poms: [ 'P', 'poms', 'POMS', "comma seperated list of pom files. Defaults to 'pom' at the root of the project.", '', arg => POMS = arg ],
  projectHome: ['', 'project-home', 'PROJECT_HOME', 'Project directory', process.cwd(), arg => PROJECT_HOME = arg ],
  showReport: [ '', 'show-report', 'SHOW_REPORT', 'Report final build information for environment variables (envs), options, and tasks.  Narrow output with --dump:tasks, for example.', false, function(arg) { SHOW_REPORT = arg ? bool(arg) : true; }],
  tasks: [ 'X', 'tasks', 'TASKS', 'Explicitly execute tasks. Comma seperated list of task names. Parameters to each demarcated with : symbol. Ex: -XcheckDeps:9', 'all',
           arg => {
             if ( TASKS === 'all' )
               TASKS = '';
             TASKS = TASKS ? TASKS + TASK_SEPERATOR + arg : arg;
           } ],
  timestamp: [ '', 'timestamp', 'TIMESTAMP', 'Build date, used to timestamp generated files', Date.now(), arg => TIMESTAMP = arg ],
  topic: [ 'H', 'topic-help', '', 'Help on a particular environment variable, option, or task', '', arg => {
    HELP = true;
    if ( arg.startsWith(':') ||
         arg.startsWith('=') ) {
      arg = arg.substring(1);
    }
    info(`Help for \'${arg}\'`);
    var option = findOption(OPTIONS, arg);
    if ( option ) {
      let opts = option.opt ? '-'+option.opt+', ' : '';
      opts += '--'+option.name;
      if ( option.name !== option.gnuopt ) {
        opts += ', --'+option.gnuopt;
      }
      var def = option.env && globalThis[option.env];
      if ( ! def ) {
        def = option.def ? option.def : '';
        if ( def instanceof Function ) {
          def = def();
        }
      }
      let desc = option.desc;
      console.log('(OPTION)', ''.padStart(0), opts+':', '\x1b[0;35m', def,'\x1b[0;0m', desc);
    } else {
      let t = findTask(tasks, arg);
      if ( t ) {
        var msg = arg;
        if ( arg !== t.name ) msg += ' '+t.name;
        console.log('(TASK)', msg, t.desc);
      } else {
        let e = ENVS[arg];
        if ( e ) {
          console.log('(ENV)', arg,': ',e[0]);
        } else {
          var extra = '';
          let similar = findSimilarTasks(tasks, arg);
          if ( similar.length > 0 ) {
            extra += '\n  Possible Task matches: \n';
          }
          similar.forEach(task => {
            extra += '    ' + task.name + ' ' + task.gnuopt + ' - ' + task.desc + '\n';
          });
          similar = findSimilarOptions(OPTIONS, arg);
          if ( similar.length > 0 ) {
            extra += '\n  Possible Option matches: \n';
          }
          similar.forEach(option => {
            extra += '    ' + option.name + ' ' + option.opt + ' ' + option.gnuopt + ' - ' + option.desc + '\n';
          });
          error('Topic not found - ', arg, extra);
        }
      }
    }
    process.exit(0);
  } ],
  verbose: ['', 'verbose', 'VERBOSE', 'Enable VerboseMaker to log additional info during build',false, function(arg) { VERBOSE = arg ? bool(arg) : true; } ],

}, OPTIONS);

function addPOM(pom) {
    if ( ! existsSync(pom + '.js') )
      error('File not found ' + pom + '.js');
    else
      POMS = comma(POMS, pom);
}

function addJournal(name) {
  addPOM(`${PROJECT_HOME}/deployment/${name}/pom`);
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
    JOURNALS.split(',').forEach(c => addJournal(c));
                                //addPom(c && `${PROJECT_HOME}/deployment/${c}/pom`));

  POMS = poms.join(',');
}

// ############################
// # Build tasks
// ############################

task('tooling', 'Prepare build environment', [], function tooling() {
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
  let maker = pmake.bind(Object.assign({}, EXPORTS), `-makers=Tooling -pom=${tps}`)();
  buildEnv(maker.envs);

  addOptions(maker.options, OPTIONS);

  Object.keys(maker.tasks || {}).forEach(name => {
    let list = maker.tasks[name];
    list.forEach(t => {
      var [gnuopt, desc, dep, f] = t;
      if ( ! f || ! f.name ) {
        error(`[build] task missing function ${name} ${t}`);
      }
      if ( f.name !== name ) {
        warning(`[build] tooling name: ${name} != f.name ${f.name}`);
      }
      // TODO: refactor to register against top level and also run dependencies
      if ( ! tasks[name] ) {
        task(name, gnuopt, desc, dep, f);
      } else {
        let pomList = POM_TASKS[name] || [];
        pomList.push(t);
        POM_TASKS[name] = pomList;
      }
    });
  });
  // copy tooling options to build options so command line doesn't complain
  // REVIEW - remove tooling option f - so no side effects?
  OPTIONS = Object.assign(OPTIONS, TOOLING_OPTIONS);
});

task('pom-envs', 'Capture POM arguments to environment values or options, and register POM tasks for later execution when the corresponding build tasks is executed.', [], function pomEnvs() {
  let makers = pmake.bind(Object.assign({}, EXPORTS), `-makers=Env,Task -flags=${flag()} -pom=${POMS} -builddir=${BUILD_DIR} -envs=${POM_ENVS}`)();

  let envMaker = makers.get('Env');
  Object.keys(envMaker.envs).forEach(e => {
    let option = findOption(OPTIONS, e);
    if ( option ) {
      // console.log(`[build] envMaker def ${option.def}, global: ${globalThis[option.env]}`);
      if ( ! globalThis[option.env] ||
           option.def &&
           globalThis[option.env] === option.def ) {
        console.log(`[build] setting ${e} with ${envMaker.envs[e]}`);
        option.f.bind(this, envMaker.envs[e])();
      } else {
        // console.log(`[build] NOT replacing ${e} ${globalThis[option.env]} with ${envMaker.envs[e]}`);
      }
      return;
    }
    if ( ENVS[e] ) {
      if ( globalThis[e] ) {
        console.log(`[build] replacing ${e} ${globalThis[e]} with ${envMaker.envs[e]}`);
      } else {
        console.log(`[build] setting ${e} with ${envMaker.envs[e]}`);
      }
      globalThis[e] = envMaker.envs[e];
      return;
    }
    warning(`[build] environment variable or option not found: ${e}`);
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

task('copy', 'Run pom copy[] tasks.', [], function copy() {
  pmake.bind(Object.assign({}, EXPORTS), `-makers=Copy -flags=${flag()} -pom=${POMS} -builddir=${BUILD_DIR}`)();
});

task('show-poms', 'Show POM structure.', [], function showPOMs() {
  pmake.bind(Object.assign({}, EXPORTS), `-makers=Verbose -flags=${flag('web,java')} -pom=${POMS} -builddir=${BUILD_DIR}`)();
});

// Phase I - process tooling poms
processToolingArgs.bind(Object.assign({}, EXPORTS), TOOLING_OPTIONS, moreUsage)();
execute('tooling');

// Phase II - process command line args,
processBuildArgs.bind(Object.assign({}, EXPORTS), OPTIONS, moreUsage)();

// build pom map for POM_TASKS, and ensure POMS list is viable
pom();

// process build pom for envs and task registration
// execute('pomEnvs');

// Phase III - execute build tasks
// if ( SHOW_REPORT ) {
//   moreUsage('report');
// }

TASKS.split(TASK_SEPERATOR).forEach(t => {
  var s = t.split(':');
  execute(s[0], s[1]);
});

quit(0);
