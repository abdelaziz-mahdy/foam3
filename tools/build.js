#!/usr/bin/env node
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

const fs       = require('fs');
const { join } = require('path');
const { buildEnv, comma, copyDir, copyFile, emptyDir, ensureDir, exec, execSync, exportEnvs, processSingleCharArgs, rmdir, rmfile, spawn } = require('./buildlib');

const PWD      = process.cwd();

var EXPORTS; // Build variables which will be exported to pom tasks.
var POM_TASKS; // NOTE: not working as an environment variable.

globalThis.foam = {
  POM: function (pom) {
    PROJECT   = pom;
    VERSION   = pom.version;
    POM_TASKS = pom.tasks;
    JAVA_RELEASE = pom.java;
    APP_NAME  = pom.name;
    VENDOR    = pom.vendor;
    VENDOR_ID = pom.vendorId;
  }
};

require(PWD + '/pom.js');

process.on('unhandledRejection', e => {
  console.error("ERROR: Unhandled promise rejection ", e);
  process.exit(1);
});


var summary = [];
var depth   = 1;
var tasks   = [];
var running = {};


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

    f.bind(Object.assign({ SUPER }, EXPORTS))(...args);

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

function showSummary() {
  var s = 'Execution Summary:\n';
  summary.forEach(e => {
    if ( e[1] === undefined ) {
      var end = Date.now();
      var dur = ((end-e[2])/1000).toFixed(1);
      e[1] = dur;
    }
    s += e[0].padEnd(25) + ' ' + e[1].padStart(15) + 's\n';
  });
  info(s);
}

function quit(code) {
  showSummary();
  process.exit(code);
}

function info(...args) {
  let msg = args.join(' ');
  console.log('\x1b[0;34mINFO ::', msg, '\x1b[0;0m');
}

function warning(...args) {
  let msg = args.join(' ');
  console.log('\x1b[0;33mWARNING ::', msg, '\x1b[0;0m');
}

function error(...args) {
  let msg = args.join(' ');
  console.log('\x1b[0;31mERROR ::', msg, '\x1b[0;0m');
  quit(1);
}

function manifest() {
  versions();
  var jars = execSync(`find ${BUILD_DIR}/lib -type f -name "*.jar"`).toString()
      .replaceAll(`${BUILD_DIR}/lib/`, '  ').trim();
  var m = `
Manifest-Version: 1.0
Main-Class: foam.core.boot.Boot
Class-Path: ${jars}
Implementation-Title: ${APP_NAME}
Implementation-Version: ${foamBinVersion()}
Specification-Version: ${PROJECT_REVISION}
Implementation-Timestamp: ${TIMESTAMP}
${APP_NAME}-Revision: ${PROJECT_REVISION}
FOAM-Revision: ${FOAM_REVISION}
Implementation-Vendor: ${VENDOR}
`.trim() + '\n';

  if ( VENDOR_ID ) {
    m += `Implementation-Vendor-Id: ${VENDOR_ID}\n`;
  }

  return m;
};

function pom() {
  var poms    = {};
  var addPom = fn => {
    if ( ! fs.existsSync(fn + '.js') )
      error('File not found ' + fn + '.js');
    else
      poms[fn] = true;
  };

  if ( POMS )
    POMS.split(',').forEach(c => addPom(c && `${PROJECT_HOME}/${c}`));

  if ( JOURNALS )
    JOURNALS.split(',').forEach(c => addPom(c && `${PROJECT_HOME}/deployment/${c}/pom`));

  return Object.keys(poms).join(',');
}


task('Build web root directory for inclusion in JAR.', [], function jarWebroot() {
  JAR_INCLUDES += ` -C ${BUILD_DIR} webroot `;

  var webroot = BUILD_DIR + '/webroot';
  ensureDir(webroot);

  execSync(__dirname + `/pmake.js -makers=Webroot -pom=${pom()} -builddir=${BUILD_DIR}`, {stdio: 'inherit'});

  if ( TAR || JAR ) {
    execSync(`cp ${BUILD_DIR}/js/foam-bin-* ${webroot + '/'}`, {stdio: 'inherit'});
  }
});

task('Build web root directory for inclusion in JAR.', [], function copy() {
  execSync(__dirname + `/pmake.js -makers=Copy -pom=${pom()} -builddir=${BUILD_DIR}`, {stdio: 'inherit'});
});

task('Copy images from src sub directories to BUILD_DIR/images.', [], function jarImages() {
  JAR_INCLUDES += ` -C ${BUILD_DIR} images `;

  execSync(__dirname + `/pmake.js -makers=Image -pom=${pom()} -builddir=${BUILD_DIR}`, {stdio: 'inherit'});
});

task('Include journals in jar.', [], function jarJournals() {
  JAR_INCLUDES += ` -C ${BUILD_DIR} journals `;
});

task('Display generated JAR manifest file.', [], function showManifest() {
  console.log('Manifest:', manifest());
});


task('Show POM structure.', [], function showPOMs() {
  execSync(__dirname + `/pmake.js -flags=web,java -makers=Verbose -pom=${pom()}`, {stdio: 'inherit'});
});


task('Install npm tools that foam and the build use.', [], function install() {
  process.chdir(PROJECT_HOME);
  execSync('npm install');
  ensureDir(join(APP_HOME, 'logs'));
});


task('Deploy documents from DOCUMENT_OUT to DOCUMENT_HOME.', [], function deployDocuments() {
  copyDir(DOCUMENT_OUT, DOCUMENT_HOME);
});


task('Deploy journal files from JOURNAL_OUT to JOURNAL_HOME.', [], function deployJournals() {
  if ( DELETE_RUNTIME_JOURNALS ) deleteRuntimeJournals();

  ensureDir(JOURNAL_HOME);
  copyDir(JOURNAL_OUT, JOURNAL_HOME);
});


task('Delete runtime journals.', [], function deleteRuntimeJournals() {
  info('Runtime journals deleted.');
  emptyDir(JOURNAL_HOME);
});


task('Remove pom.xml and java lib directory.', [ ], function cleanLib() {
  rmfile('pom.xml');
  emptyDir(BUILD_DIR + '/lib');
});


task('Cause regeneration of pom.xml and java lib directory.', [ 'cleanLib', 'genJava' ], function regenLib() {
  cleanLib();
  genJava();
});


task('Clean build files, include pom.xml and java libraries. Cleaner than clean.', [ 'cleanLib', 'clean' ], function cleanAll() {
  cleanLib();
  clean();
});


task('Remove generated files.', [], function clean() {
  if ( JAR || TEST || BENCHMARK ) {
    emptyDir(`${APP_HOME}/bin`);
    emptyDir(`${APP_HOME}/lib`);
  }

  if ( fs.existsSync(BUILD_DIR) ) {
    var files = fs.readdirSync(BUILD_DIR, {withFileTypes: true});
    files.forEach(f => {
      // Don't remove java libs under ./target/lib
      if ( f.name === 'lib' ) return;

      var fn = BUILD_DIR + '/' + f.name;
      if ( f.isDirectory() ) rmdir(fn);
      if ( f.isFile()      ) rmfile(fn);
    });
  }
});


task("Call pmake with JS Maker to build 'foam-bin.js'.", [], function genJS() {
  execSync(`rm -f ${BUILD_DIR}/js/foam-bin-* >/dev/null 2>&1`);
  var version = foamBinVersion();
  if ( STAGE_JS ) {
    execSync(__dirname + `/pmake.js -flags=web,-java -makers=JS -version=${version} -pom=${pom()} -builddir=${BUILD_DIR} -stage=0`, { stdio: 'inherit' });
    execSync(__dirname + `/pmake.js -flags=web,-java -makers=JS -version=${version} -pom=${pom()} -builddir=${BUILD_DIR} -stage=1`, { stdio: 'inherit' });
    execSync(__dirname + `/pmake.js -flags=web,-java -makers=JS -version=${version} -pom=${pom()} -builddir=${BUILD_DIR} -stage=2`, { stdio: 'inherit' });
  } else {
    execSync(__dirname + `/pmake.js -flags=web,-java -makers=JS -version=${version} -pom=${pom()} -builddir=${BUILD_DIR}`, { stdio: 'inherit' });
  }
});


task('Generate Java and JS packages.', [ 'genJava', 'genJS' ], function packageFOAM() {
  genJava();
  if ( TAR || JAR ) {
    genJS();
  }
});


task('Call pmake to generate & compile java, collect journals, call Maven and copy documents.', [], function genJava() {
  //   commandLine 'bash', './gen.sh', "${project.genJavaDir}", "${project.findProperty("pom")?:"pom" }"
  var flags = VERBOSE ? 'verbose' : '';
  var makers = VERBOSE ? 'Verbose,' : '';
  makers += GEN_JAVA ? 'Java,Maven,Javac' : 'Maven' ;
  makers += ',Journal,Doc';
  execSync(__dirname + `/pmake.js -makers=${makers} -flags=${flags} -d=${BUILD_DIR}/classes -builddir=${BUILD_DIR} -outdir=${BUILD_DIR}/src/java -javacParams='--release ${JAVA_RELEASE} -proc:none' -pom=${pom()}`, { stdio: 'inherit' });
});

task('Check Java dependencies for known vulnerabilities (via maven). -XcheckDeps:score where score in range [0..11].  CVSS score (LOW:0..5 ,MEDIUM:5..7 ,HIGH:7..9 ,CRITICAL:9..10,IGNORE:11)', [], function checkDeps(score) {
  score = score || 9;
  execSync(__dirname + `/pmake.js -makers=Maven -pom=${pom()}`, { stdio: 'inherit' });
  try {
    execSync(`mvn dependency-check:check -DfailBuildOnCVSS=${score}`, { stdio: 'inherit' });
  } catch (_) {
    // maven build error will be output to the console, no need to throw
  }
});

task('Show JAR structure.', [], function showJARs(value) {
  execSync(__dirname + `/pmake.js -makers=Maven -pom=${pom()}`, { stdio: 'inherit' });
  try {
    execSync(`mvn dependency:tree `, { stdio: 'inherit' });
  } catch (_) {
    // maven build error will be output to the console, no need to throw
  }
});

task('Get Maven java sources.', [], function mavenGetSources(value) {
  execSync(__dirname + `/pmake.js -makers=Maven -pom=${pom()}`, { stdio: 'inherit' });
  try {
    execSync(`mvn dependency:resolve-sources -DincludeArtifactIds=${value} `, { stdio: 'inherit' });
  } catch (_) {
    // maven build error will be output to the console, no need to throw
  }
});

task('Generate and compile java source.', [ 'genJava' ], function buildJava() {
  // remove previous app jar in build directory to fix classes resolution for non-jar run
  execSync(`rm -f ${BUILD_DIR}/lib/${APP_NAME}-*.jar >/dev/null 2>&1`);
  genJava();
});

task('Build Java JAR file.', [ 'versions', 'jarWebroot', 'jarImages' ], function buildJar() {
  // remove any previous timestamped versions
  execSync(`rm -f ${JAR_LIB_DIR}/${APP_NAME}-*.jar >/dev/null 2>&1`);

  versions();
  jarWebroot();
  jarImages();
  jarJournals();
  copy();

  fs.writeFileSync(BUILD_DIR + '/MANIFEST.MF', manifest());
  execSync(`jar cfm ${BUILD_DIR}/lib/${JAR_NAME} ${BUILD_DIR}/MANIFEST.MF -C ${BUILD_DIR} documents ${JAR_INCLUDES} -C ${BUILD_DIR}/classes .`);
});


task('Package files into a TAR archive', [], function buildTar() {
  // Notice that the argument to the second -C is relative to the directory from the first -C, since -C
  // switches the current directory.
  ensureDir(BUILD_DIR + '/package');
  execSync(`tar -a -cf ${BUILD_DIR}/package/${APP_NAME}-deploy-${VERSION}.tar.gz -C ./foam3/tools/deploy bin etc -C${require('path').resolve(BUILD_DIR)} lib`);
});


task('Copy runtime data to deployment dir APP_HOME', [], function deployData() {
  deployJournals();
  copy();
  deployDocuments();
});


task('Copy deployment files to APP_HOME deployment directory.', [], function deployApp() {
  copyDir('./foam3/tools/deploy/bin', join(APP_HOME, 'bin'));
  copyDir('./foam3/tools/deploy/etc', join(APP_HOME, 'etc'));
  copyDir(BUILD_DIR + '/lib', join(APP_HOME, 'lib'));
});


task('Start CORE application server.', [ 'setJavaEnv', 'deployData', 'deployApp' ], function startCORE() {
  setJavaEnv();
  deployData();

  if ( JAR ) {
    // When running JARs we run the app from the deployment dir
    deployApp();
    var OPT_ARGS = ``;

    if ( WEB_PORT ) OPT_ARGS += ` -W${WEB_PORT}`;
    if ( DEBUG ) OPT_ARGS += ` -D${DEBUG_PORT}`;
    if ( DEBUG_SUSPEND ) OPT_ARGS += ` -s`;
    if ( PROFILER ) OPT_ARGS += ` -P${PROFILER_PORT}`;
    if ( CLUSTER ) OPT_ARGS += ` -m`;
    if ( HOST_NAME && HOST_NAME !== 'localhost' ) OPT_ARGS += ` -H${HOST_NAME}`;

    exec(`${APP_HOME}/bin/run.sh -N${APP_NAME} -V${VERSION} ${OPT_ARGS}`);
  } else {

    if ( HOST_NAME ) {
      JAVA_OPTS += ` -Dhostname=${HOST_NAME}`;
    }

    if ( DEBUG ) {
      JAVA_OPTS += ` -agentlib:jdwp=transport=dt_socket,server=y,suspend=${DEBUG_SUSPEND ? 'y' : 'n'},address=127.0.0.1:${DEBUG_PORT}`;
    }

    if ( WEB_PORT ) {
      JAVA_OPTS += ` -Dhttp.port=${WEB_PORT}`;
    }

    JAVA_OPTS += ` -Dcore.webroot=${PROJECT_HOME}`;

    CLASSPATH = `${BUILD_DIR}/lib/\*:${BUILD_DIR}/classes`;

    logLevelLower = 'info';
    if ( LOG_LEVEL ) {
      JAVA_OPTS += ` -Dlog.level=${LOG_LEVEL}`;
      logLevelLower = `${LOG_LEVEL}`.toLowerCase();
    }
    JAVA_OPTS += ` -Dorg.slf4j.simpleLogger.defaultLogLevel=${logLevelLower}`;

    MESSAGE = `Starting CORE ${APP_NAME}`;
    if ( TEST || BENCHMARK ) {
      // TODO: move to pom task
      JAVA_OPTS += ' -Dresource.journals.dir=journals';
      JAVA_OPTS += ' -DRES_JAR_HOME=' + JAR_OUT;

      if ( TEST ) {
        MESSAGE = 'Running tests...';
        JAVA_OPTS += ' -Dfoam.main=testRunnerScript';
        if ( TESTS ) JAVA_OPTS += ' -Dfoam.tests=' + TESTS;
      } else if ( BENCHMARK ) {
        MESSAGE = 'Running benchmarks...';
        JAVA_OPTS += ' -Dfoam.main=benchmarkRunnerScript';
        if ( BENCHMARKS ) JAVA_OPTS += ' -Dfoam.benchmarks=' + BENCHMARKS;
      }
    }

    info('JAVA_OPTS:' + JAVA_OPTS);
    info(MESSAGE);

    if ( TEST ) {
      try {
        exec(`java -jar ${JAR_OUT}`);
      } catch ( e ) {
        // Failing tests, no need to throw
      }
      process.exit(0);
    } else if ( BENCHMARK ) {
      exec(`java -jar ${JAR_OUT}`);
    } else {
      // Acquires environment variables via JAVA_TOOL_OPTIONS (JAVA_OPTS)
      exec(`java -cp "${CLASSPATH}" foam.core.boot.Boot`);
    }
  }
});


task('Extract project git hash.', [], function getProjectGitHash() {
  var out = 'Unversioned';

  try {
    out = execSync('git rev-parse --short HEAD');
  } catch (x) {
    warning('Cannot determine project revision, no commit yet');
  }

  PROJECT_REVISION = out.toString().trim();
});


task('Extract FOAM git hash.', [], function getFOAMGitHash() {
  FOAM_REVISION = execSync('git -C foam3 rev-parse --short HEAD').toString().trim();
});

task('Show version information.', [ 'getProjectGitHash', 'getFOAMGitHash'], function versions() {
  getProjectGitHash();
  getFOAMGitHash();

  console.log(`Application Version: ${VERSION}`);
  console.log(`${APP_NAME} revision:    ${PROJECT_REVISION}`);
  console.log(`FOAM revision:       ${FOAM_REVISION}`);
});

task('Show application information.', [], function appName() {
  console.log(`Application Name: ${APP_NAME}`);
  console.log(`Application VendorId: ${PROJECT.vendorId}`);
});


task('Create empty build and deployment directory structures if required.', [], function setupDirs() {
  try {
    if ( ! BUILD_ONLY ) {
      ensureDir(APP_HOME);
      ensureDir(`${APP_HOME}/lib`);
      ensureDir(`${APP_HOME}/bin`);
      ensureDir(`${APP_HOME}/etc`);
      ensureDir(LOG_HOME);
      ensureDir(JOURNAL_HOME);
      ensureDir(DOCUMENT_HOME);
    }
    if (ensureDir(BUILD_DIR + '/lib')) {
      // Remove stale pom.xml if the /lib dir needed to be created
      // Wouldn't be necessary if pom.xml were written into the BUILD_DIR but then
      // you couldn't check it in to get dependbot warnings.
      rmfile('pom.xml');
    }
    ensureDir(JOURNAL_OUT);
    ensureDir(DOCUMENT_OUT);
  } catch ( e ) {
    error(`Directory is not writable! Please run 'sudo chown -R $USER ${APP_ROOT}' first.`, e);
  }
});


function writeToPidFile(pid) {
  fs.writeFileSync(CORE_PIDFILE, pid.toString());
}


function readFromPidFile() {
  if ( fs.existsSync(CORE_PIDFILE) )
    return fs.readFileSync(CORE_PIDFILE).toString().trim();
}

task('Set Java environmental variables.', [], function setJavaEnv() {
  if ( TEST || BENCHMARK ) {
    rmdir(APP_HOME);
    JAVA_OPTS += ' -enableassertions';
  }

  JAVA_OPTS += ` -DJOURNAL_HOME=${JOURNAL_HOME}`;
  JAVA_OPTS += ` -DDOCUMENT_HOME=${DOCUMENT_HOME}`;
});

function foamBinVersion() {
  return TIMESTAMP_FOAM_BIN ? `${VERSION}-${TIMESTAMP}` : `${VERSION}`;
}

task('Stop running CORE server.', [], function stopCORE() {
  info('Stopping CORE server...');

  var pid = readFromPidFile();
  try {
    if ( pid ) {
      execSync(`kill -9 ${pid} &>/dev/null`);
      rmfile(CORE_PIDFILE);
    }
    info('CORE server stopped successfully.');
  } catch (e) {
    warning('CORE server not running, or failed to stop');
  }
});

// Environment Variables which are exported when updated
const ENVS = {
  APP_HOME:          ['Application root directory. To symultaniously deploy multiple applications, give each a unique APP_NAME and WEB_PORT',() => APP_ROOT + '/' + APP_NAME],
  APP_NAME:          ['Application name, defaults to name in root pom. see APP_HOME',APP_NAME],
  APP_ROOT:          ['Application root directory','/opt'],
  BENCHMARK:         ['Run benchmarks when true',false],
  BENCHMARKS:        ['Set of benchmarks to run, run all when empty',''],
  BUILD_DIR:         ['Build directory, relative to project root','build'],
  BUILD_ONLY:        ['Only execute java generation and java compilation build steps',false],
  CLEAN:             ['Clean generated code before building.  Required if generated classes have been removed. Use -XcleanAll to remove build/ directory. NOTE: if compilation fails after option c is issued, clean is again required until a succesful build.',false],
  CLEAN_ALL:         ['Clean application lib/, and remove build/ directory',false],
  CLUSTER:           ['Deploy JVM as a Medusa Mediator',false],
  CORE_PIDFILE:      ['JVM process ID file','/tmp/core.pid'],
  DEBUG:             ['Launch JVM with JDPA debugging enabled',false],
  DEBUG_PORT:        ['Port JVM will listen on for debuggers to connect',8000],
  DEBUG_SUSPEND:     ['JVM will suspend on startup until a Debugger connects',false],
  DELETE_RUNTIME_JOURNALS: ['Delete application journals',false],
  DELETE_RUNTIME_LOGS: ['Delete application logs',false],
  DOCUMENT_HOME:     ['Appplication documents directory',() => `${APP_HOME}/documents`],
  DOCUMENT_OUT:      ['Build documents directory',() => `${PROJECT_HOME}/${BUILD_DIR}/documents`],
  // FLAGS:             ['pmake flags',''], // TODO
  FOAM_REVISION:     ['FOAM Revision ?',''],
  GEN_JAVA:          ['Generate Java from model files',true],
  HOST_NAME:         ['Hostname set in JVM application','localhost'],
  JAR:               ['Start Application from Java jar file',false],
  JAR_INCLUDES:      ['Additional directories to include Java jar',''],
  JAR_LIB_DIR:       ['Deployment lib directory',() => ( TAR ? `${PROJECT_HOME}/${BUILD_DIR}` : APP_HOME ) + '/lib'],
  JAR_NAME:          ['Java jar name',() => `${APP_NAME}-${VERSION}.jar`],
  JAR_OUT:           ['Java jar path and name',() => `${JAR_LIB_DIR}/${JAR_NAME}`],
  JAVA_OPTS:         ['Additional JVM options',''],
  JAVA_RELEASE:      ['Java target version',JAVA_RELEASE || 17],
  JAVA_TOOL_OPTIONS: ['Internal configuration for JVM with the JAVA_OPTS',() => JAVA_OPTS],
  JOURNALS:    ['Deployment poms to include in build',''],
  JOURNAL_HOME:      ['Application journals directory',() => `${APP_HOME}/journals`],
  JOURNAL_OUT:       ['Build journals directory',() => `${PROJECT_HOME}/${BUILD_DIR}/journals`],
  LOG_HOME:          ['Application logs directory',() => `${APP_HOME}/logs`],
  LOG_LEVEL:         ['Set JVM Log level for TEST cases. Defaults to ERROR. example: -LINFO',null],
  POMS:              ['CSV list of pom files to process,minus any suffix','pom'],
  // POM_TASKS:         ['CSV list of tasks from the root pom'],
  PROFILER:          ['Enable JVM profiling',false],
  PROFILER_PORT:     ['Port JVM will listen on for profiler to connect',8849],
  PROJECT:           ['Top-Level Loaded POM Object, not be be confused with POMS, which is the name of POM(s) to be loaded'],
  PROJECT_HOME:      ['Project directory',PWD],
  PROJECT_REVISION:  ['Project revision ?',null],
  RESTART:           ['Only execute JVM starting procedure, without a new build',false],
  STAGE_JS:          ['Generate multiple foam-bin files, intended to be loaded in order to reduce initial client startup time',true],
  STOP:              ['Stop CORE Server',true],
  TAR:               ['Generate a tar file for remote Application installation', false],
  TASKS:             ['CSV list of build tasks to execute. Set via -X. -XcheckDeps:9', 'all'],
  TEST:              ['Run test cases',false],
  TESTS:             ['Set of test cases to run. Run all when empty'],
  TIMESTAMP:         ['Build date, used to timestamp foam-bin and jar files',Date.now()],
  TIMESTAMP_FOAM_BIN:['foam-bin files are timestamped by default. Disable timestamp to retain breakpoints during development cycle.',true],
  WEB_PORT:          ['HTTP port to start web server on. HTTP defaults to 8080, HTTPS defaults to 8443'],
  VERBOSE:           ['Enable VerboseMaker to log additional info during build',false],
  VENDOR:            ['Java Manifest Vendor',VENDOR || APP_NAME],
  VENDOR_ID:         ['Java Manifest Vendor ID',VENDOR_ID],
  VERSION:           ['Application version',VERSION || '1.0.0']
};

task('Set build environmental variables.', [], function setBuildEnv() {
  buildEnv(ENVS);
});

// Convenience build flags.
const ARGS = {
  a: [ 'Run/launch from Java jar file.',
    () => JAR = true ],
  b: [ 'run all benchmarks.',
    () => {
      BENCHMARK = true;
      DELETE_RUNTIME_JOURNALS = true;
      APP_ROOT = '/tmp';
    } ],
  B: [ 'benchmarkId1,benchmarkId2,... : Run listed benchmarks.',
    args => { ARGS.b[1](); BENCHMARKS = args; } ],
  c: [ 'Clean generated code before building.  Required if generated classes have been removed. Use -XcleanAll to remove build/ directory. NOTE: if compilation fails after option c is issued, clean is again required until a succesful build.',
    () => CLEAN = true ],
  d: [ 'Run with JDPA debugging enabled on port 8000.',
    () => DEBUG = true ],
  E: [ 'Set environment variables. Example: -EJAVA_OPTS:-Xmx8g,APP_NAME:demo',
       args => {
         args.split(',').forEach(b => {
           var c = b.split(':');
           if ( ! ( c[0] in globalThis ) ) {
             error('Unknown environment variable:', c[0]);
           } else if ( c.length == 2 ) {
             globalThis[c[0]] = c[1];
           }
         });
       }
     ],
  g: [ 'Do not timestamp foam-bin javascript file to retain breakpoints during development cycle.',
    () => TIMESTAMP_FOAM_BIN = false ],
  j: [ 'Delete runtime journals.',
    () => DELETE_RUNTIME_JOURNALS = true ],
  J: [ 'JOURNALS : comma seperated list of additional journal directories, relateive to deployment/ from the root project.',
       args => {
         JOURNALS = comma(JOURNALS, args);
         args.split(',').forEach(j => {
           POMS = comma(POMS, 'deployment/'+j+'/pom');
         });
       }
     ],
  k: [ 'Package up a deployment tarball.',
    () => { JAR = BUILD_ONLY = TAR = true; } ],
  N: [ `NAME : Used to construct a unique deployment directory, '/opt/NAME', to support multiple running applications.  Also requires a unique WEB_PORT.`,
       args => { APP_NAME = args; CORE_PIDFILE=`/tmp/core_${APP_NAME}.pid`; info('APP_NAME=' + args); } ],
  o: [ "Build only - don't start CORE server.",
    () => BUILD_ONLY = true ],
  P: [ "comma seperated list of pom files. Defaults to 'pom' at the root of the project.",
     args => { POMS = args; info('POMS=' + POMS); } ],
  r: [ 'Restart CORE Server from last build.',
    () => RESTART = true ],
  s: [ 'Start JDPA debugging in suspend state.',
    ()  => {
      DEBUG = true;
      DEBUG_SUSPEND = true;
    } ],
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
    } ],
  W: [ 'PORT : Port WebServer will listen on. WebSocketServer will use PORT+1',
    args => { WEB_PORT = args; info('WEB_PORT=' + WEB_PORT); } ],
  X: [ 'Explicitly execute tasks. Comma seperated list of task names. Parameters to each demarcated with : symbol. Ex: -XcheckDeps:9',
       args => {
         if ( TASKS === 'all' )
           TASKS = '';
         TASKS=args;
       } ]
};

function moreUsage() {
  console.log('\nTasks:');
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
    tasks[t][1].forEach(printTask);
    depth--;
  }
  Object.keys(ts).sort().forEach(t => {
    printTask(t);
  });

  console.log('\nEnvironment variables:');
  depth = 1;
  Object.keys(ENVS).sort().forEach(k => {
    var [ desc, val ] = ENVS[k];
    var v = val;
    if ( typeof val === 'function' )
       v = val();
    v = v && v + ' ' || 'undefined';
    console.log(''.padStart(1), k+':', ''.padStart(22-k.length), v, ''.padStart(22-v.length), desc);
  });
}

// ############################
// # Build steps
// ############################

task(
'Build everything specified by flags.',
  [ 'clean', 'cleanAll', 'setJavaEnv', 'deleteRuntimeLogs', 'setupDirs', 'packageFOAM', 'buildJava', 'deleteRuntimeJournals', 'deployData', 'deployApp', 'buildJar', 'buildTar', 'startCORE', 'stopCORE' ],
  function all() {
    setJavaEnv();

    if ( STOP && ! ( TAR || BUILD_ONLY ) ) {
      stopCORE();
    }

    if ( ( CLEAN || CLEAN_ALL ) && ! RESTART ) {
      clean();
      if ( CLEAN_ALL ) {
        cleanAll();
      }
    }

    setupDirs();

    if ( ! RESTART ) {
      if ( TAR || JAR || TEST || BENCHMARK ) {
        packageFOAM();
      }

      buildJava();

      if ( TAR || JAR || TEST || BENCHMARK ) {
        buildJar();
      }

      // Tests and benchmarks run from a deployed jar
      if ( JAR || TEST || BENCHMARK ) {
        deployData();
        deployApp();
      }

      if ( TAR ) {
        buildTar();
      }
    }

    if ( ! ( TAR || BUILD_ONLY ) ) {
      startCORE();
    }
  }
);

// Configure build.  Must be run before POM_TASKS, otherwise
// globleThis.foam.POM is not defined, and pom() failes.
setBuildEnv();
processSingleCharArgs(ARGS, moreUsage);

// Install POM tasks
if ( POM_TASKS ) {
  POM_TASKS.forEach(f => task(f));

  // Exports local variables and functions for POM tasks
  var poms = pom();
  EXPORTS = {
    APP_NAME,
    BUILD_DIR,
    JAVA_OPTS,
    JOURNALS,
    PROJECT,
    VERSION,
    copyDir,
    copyFile,
    ensureDir,
    exec,
    execSync,
    poms
  };
};

TASKS.split(',').forEach(t => {
  var s = t.split(':');
  var f = globalThis[s[0]];
  if ( f ) {
    f(...s.slice(1));
  } else {
    error('Unknown task:', t);
  }
});

quit(0);
