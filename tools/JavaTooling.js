/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

const fs       = require('fs');
const { join } = require('path');
const pmake    = require('./pmake.js');
const { comma, copyDir, copyFile, emptyDir, ensureDir, exec, execSync, exportEnvs, flag, info, rmdir, rmfile, warning } = require('./buildlib');

foam.POM({
  name: 'java',

  envs: {
    BUILD_ONLY:        ['Only execute java generation and java compilation build steps',false],
    CORE_PIDFILE:      ['JVM process ID file','/tmp/core.pid'],
    DEBUG:             ['Launch JVM with JDPA debugging enabled',false],
    DEBUG_PORT:        ['Port JVM will listen on for debuggers to connect',8000],
    DEBUG_SUSPEND:     ['JVM will suspend on startup until a Debugger connects',false],
    DELETE_RUNTIME_JOURNALS: ['Delete application journals',false],
    DOCUMENT_HOME:     ['Appplication documents directory',() => `${APP_HOME}/documents`],
    DOCUMENT_OUT:      ['Build documents directory',() => `${PROJECT_HOME}/${BUILD_DIR}/documents`],
    GEN_JAVA:          ['Generate Java from model files',true],
    JAR:               ['Start Application from Java jar file',false],
    JAR_INCLUDES:      ['Additional directories to include Java jar',''],
    JAR_LIB_DIR:       ['Deployment lib directory',() => ( TAR ? `${PROJECT_HOME}/${BUILD_DIR}` : APP_HOME ) + '/lib'],
    JAR_NAME:          ['Java jar name',() => `${APP_NAME}-${VERSION}.jar`],
    JAR_OUT:           ['Java jar path and name',() => `${JAR_LIB_DIR}/${JAR_NAME}`],
    JAVA_OPTS:         ['Additional JVM options',''],
    JAVA_RELEASE:      ['Java target version. Can also be set in root pom. ex: java: \'11\''],
    JAVA_RELEASE_DEFAULT: ['Default Java target version.','17'],
    JAVA_TOOL_OPTIONS: ['Internal configuration for JVM with the JAVA_OPTS',() => JAVA_OPTS],
    JAVAC_PARAMS:      ['Parameters passed to Java Compiler',''],
    JAVAC_PARAMS_DEFAULT:  ['Default parameters for Java Compiler', () => `--release ${JAVA_RELEASE} -proc:none`],
    JOURNALS:          ['Deployment poms to include in build',''],
    JOURNAL_HOME:      ['Application journals directory',() => `${APP_HOME}/journals`],
    JOURNAL_OUT:       ['Build journals directory',() => `${PROJECT_HOME}/${BUILD_DIR}/journals`],
    LOG_HOME:          ['Application logs directory',() => `${APP_HOME}/logs`],
    LOG_LEVEL:         ['Set JVM Log level for TEST cases. Defaults to ERROR. example: -ELOG_LEVEL:INFO',null],
    PROJECT_REVISION:  ['Root project git revision. Will be set JVM Manifest',null],
    RESTART:           ['Only execute JVM starting procedure, without a new build',false],
    RUN_ARGS:          ['Arguments which will be passed to run.sh to when starting CORE server from JAR',''],
    TAR:               ['Generate a tar file for remote Application installation', false],
    TIMESTAMP:         ['Build date, used to timestamp foam-bin and jar files',Date.now()],
    WEB_PORT:          ['HTTP port to start web server on. HTTP defaults to 8080, HTTPS defaults to 8443'],
    VENDOR:            ['Java Manifest Vendor. Defaults to APP_NAME'],
    VENDOR_ID:         ['Java Manifest Vendor ID'],
    VERSION:           ['Application version'],
    VERSION_DEFAULT:   ['Default Application version', '1.0.0']
  },

  args: {
    a: [ 'Run/launch from Java jar file.',
         () => JAR = true ],
    d: [ 'Run with JDPA debugging enabled on port 8000.',
         () => DEBUG = true ],
    j: [ 'Delete runtime journals.',
         () => DELETE_RUNTIME_JOURNALS = true ],
    J: [ 'JOURNALS : comma seperated list of additional journal directories, relative to deployment/ from the root project.',
       args => JOURNALS = comma(JOURNALS, args) ],
    k: [ 'Package up a deployment tarball.',
         () => { TAR = true; } ],
    o: [ "Build only - don't start CORE server.",
         () => BUILD_ONLY = true ],
    r: [ 'Restart CORE Server from last build.',
         () => RESTART = true ],
    s: [ 'Start JDPA debugging in suspend state.',
         ()  => {
           DEBUG = true;
           DEBUG_SUSPEND = true;
         } ],
    W: [ 'PORT : Port WebServer will listen on. WebSocketServer will use PORT+1',
         args => { WEB_PORT = args;} ]
  },

  tasks: {
    clean: ['Remove generated files', ['pomEnvs'], function clean() {
      if ( APP_HOME && fs.existsSync(APP_HOME) ) {
        emptyDir(`${APP_HOME}/bin`);
        emptyDir(`${APP_HOME}/lib`);
      }
    }],

    cleanAll: ['Remove pom.xml and java lib directory.', [], function cleanAll() {
      rmfile('pom.xml');
      emptyDir(BUILD_DIR + '/lib');
    }],

    cleanJava: ['Remove previously generated JAR.', [], function cleanJava() {
      // remove previous app jar in build directory to fix classes resolution for non-jar run
      execSync(`rm -f ${BUILD_DIR}/lib/${APP_NAME}-*.jar >/dev/null 2>&1`);
    }],

    deleteRuntimeJournals: ['Delete runtime journals.', [], function deleteRuntimeJournals() {
      info('Runtime journals deleted.');
      emptyDir(JOURNAL_HOME);
    }],

    genImages: ['Prepare images from inclusion in jar.', [], function genImages() {
      JAR_INCLUDES += ` -C ${BUILD_DIR} images `;

      pmake(`-makers=Image -flags=${flag()} -pom=${POMS} -builddir=${BUILD_DIR}`);
    }],
    genJava: ['Generate Java source from models and complile', ['cleanJava'], function genJava() {
      JAR_INCLUDES += ` -C ${BUILD_DIR} journals `;
      JAR_INCLUDES += ` -C ${BUILD_DIR} documents `;
      JAR_INCLUDES += ` -C ${BUILD_DIR}/classes .`;

      var makers = VERBOSE ? 'Verbose,' : '';
      // NOTE: Java and Javac Maker must be run together as they share data through X
      makers += 'Java,Maven,Javac';
      makers += ',Journal,Doc';
      pmake(`-makers=${makers} -flags=${flag()} -pom=${POMS} -builddir=${BUILD_DIR} -d=${BUILD_DIR}/classes -journaldir=${JOURNAL_OUT} -documentdir=${DOCUMENT_OUT} -outdir=${BUILD_DIR}/src/java -libdir=${BUILD_DIR}/lib -javacParams='${JAVAC_PARAMS_DEFAULT} ${JAVAC_PARAMS}'`);
    }],

    genManifest: ['Generate JVM Manifest', ['versions', 'genFoamBinVersion'], function genManifest() {
      var jars = execSync(`find ${BUILD_DIR}/lib -type f -name "*.jar"`).toString()
          .replaceAll(`${BUILD_DIR}/lib/`, '  ').trim();
      var m = `
Manifest-Version: 1.0
Main-Class: foam.core.boot.Boot
Class-Path: ${jars}
Implementation-Title: ${APP_NAME}
Implementation-Version: ${FOAM_BIN_VERSION}
Specification-Version: ${PROJECT_REVISION}
Implementation-Timestamp: ${TIMESTAMP}
${APP_NAME}-Revision: ${PROJECT_REVISION}
FOAM-Revision: ${FOAM_REVISION}
Implementation-Vendor: ${VENDOR || APP_NAME}
`.trim() + '\n';

      if ( VENDOR_ID ) {
        m += `Implementation-Vendor-Id: ${VENDOR_ID}\n`;
      }

      fs.writeFileSync(BUILD_DIR + '/MANIFEST.MF', m);
      return m;
    }],

    getProjectGitHash: ['Extract project git hash.', [], function getProjectGitHash() {
      var out = 'Unversioned';

      try {
        out = execSync('git rev-parse --short HEAD');
      } catch (x) {
        warning('Cannot determine project revision, no commit yet');
      }

      PROJECT_REVISION = out.toString().trim();
    }],

    getFOAMGitHash: ['Extract FOAM git hash.', [], function getFOAMGitHash() {
      FOAM_REVISION = execSync('git -C foam3 rev-parse --short HEAD').toString().trim();
    }],

    versions: ['Show version information.', [ 'pomEnvs', 'getProjectGitHash', 'getFOAMGitHash'], function versions() {
      console.log(`Application Version: ${VERSION}`);
      console.log(`${APP_NAME} revision: ${PROJECT_REVISION}`);
      console.log(`FOAM revision:       ${FOAM_REVISION}`);
    }],

    deployBin: ['Copy bash files to deployment', [], function deployBin() {
      ensureDir(join(APP_HOME, 'bin'));
      copyDir('./foam3/tools/deploy/bin', join(APP_HOME, 'bin'));
      ensureDir(join(APP_HOME, 'etc'));
      copyDir('./foam3/tools/deploy/etc', join(APP_HOME, 'etc'));
    }],

    deployLib: ['Copy library files to deployment', [], function deployLib() {
      ensureDir(join(APP_HOME, 'lib'));
      copyDir(BUILD_DIR + '/lib', join(APP_HOME, 'lib'));
    }],

    deployDocuments: ['Deploy documents from DOCUMENT_OUT to DOCUMENT_HOME.', ['setupDirs'], function deployDocuments() {
      ensureDir(DOCUMENT_HOME);
      copyDir(DOCUMENT_OUT, DOCUMENT_HOME);
    }],

    deployJournals: ['Deploy journal files from JOURNAL_OUT to JOURNAL_HOME.', ['setupDirs'], function deployJournals() {
      ensureDir(JOURNAL_HOME);
      copyDir(JOURNAL_OUT, JOURNAL_HOME);
    }],

    genJournals: ['Concatenate repository journal files into .0 files', [], function genJournals() {
      JAR_INCLUDES += ` -C ${BUILD_DIR} journals `;
      pmake(`-makers=Journal -flags=${flag()} -pom=${POMS} -builddir=${BUILD_DIR} -journaldir=${JOURNAL_OUT}`);
    }],

    genDocuments: ['Capture repository documentation - flow docs', [], function genDocuments() {
      JAR_INCLUDES += ` -C ${BUILD_DIR} documents `;
      pmake(`-makers=Doc -flags=${flag()} -pom=${POMS} -builddir=${BUILD_DIR} -documentdir=${DOCUMENT_OUT}`);
    }],

    showManifest: ['Display generated JAR manifest file.', ['genManifest'], function showManifest() {
      console.log('Manifest:', genManifest());
    }],
    jarFOAM: ['Copy foam-bin files for inclusion in JAR file.', ['genJava'], function jarFOAM() {
      ensureDir(join(BUILD_DIR, 'webroot'));
      execSync(`cp ${BUILD_DIR}/js/foam-bin-* ${BUILD_DIR}/webroot/`, {stdio: VERBOSE ? 'inherit' : 'ignore' });
    }],
    buildJar: ['Build Java JAR file.', [()=>JAR=true, 'setupDirs', 'genJS', 'genJava', 'versions', 'copy', 'genImages', 'genManifest', 'jarFOAM' ], function buildJar() {
      JAR_INCLUDES += ` -C ${BUILD_DIR} webroot `;
      execSync(`jar cfm ${BUILD_DIR}/lib/${JAR_NAME} ${BUILD_DIR}/MANIFEST.MF ${JAR_INCLUDES}`, { stdio: VERBOSE ? 'inherit' : 'ignore' });
    }],

    buildTar: ['Package files into a TAR archive', ['buildJar'], function buildTar() {
      ensureDir(join(BUILD_DIR, 'package'));
      // Notice that the argument to the second -C is relative to the directory from the first -C, since -C
      execSync(`tar -a -cf ${BUILD_DIR}/package/${APP_NAME}-deploy-${VERSION}.tar.gz -C ./foam3/tools/deploy bin etc -C${require('path').resolve(BUILD_DIR)} lib`, { stdio: VERBOSE ? 'inherit' : 'ignore' });
    }],
    setJavaEnv: ['Set Java environmental variables.', [], function setJavaEnv() {
      JAVA_OPTS += ` -DJOURNAL_HOME=${JOURNAL_HOME}`;
      JAVA_OPTS += ` -DDOCUMENT_HOME=${DOCUMENT_HOME}`;
    }],

    setRunArgs: ['Set arguments which will be passed to run.sh to start CORE server', [], function setRunArgs() {
      if ( WEB_PORT ) RUN_ARGS += ` -W${WEB_PORT}`;
      if ( DEBUG ) RUN_ARGS += ` -D${DEBUG_PORT}`;
      if ( DEBUG_SUSPEND ) RUN_ARGS += ` -s`;
      // if ( PROFILER ) RUN_ARGS += ` -P${PROFILER_PORT}`;
      if ( HOST_NAME && HOST_NAME !== 'localhost' ) RUN_ARGS += ` -H${HOST_NAME}`;
    }],

    setupDirs: ['Create empty build and deployment directory structures if required.', [], function setupDirs() {
      try {
        if ( ! BUILD_ONLY ) {
          ensureDir(APP_HOME);
          if ( JAR ) {
            ensureDir(DOCUMENT_HOME);
            ensureDir(JOURNAL_HOME);
            ensureDir(LOG_HOME);
          }
        }
      } catch ( e ) {
        error(`Directory is not writable! Please run 'sudo chown -R $USER ${APP_ROOT}' first.`, e);
      }
    }],

    startCOREJar: ['Start CORE server (JAR).', [ 'setJavaEnv', 'setRunArgs', 'stopCORE', 'deployBin', 'deployLib'], function startCOREJar() {
      this.showSummary();
      exec(`${APP_HOME}/bin/run.sh -N${APP_NAME} -V${VERSION} ${RUN_ARGS}`);
    }],

    startCORE: ['Start CORE server (CLASSPATH).', [ 'setJavaEnv', 'stopCORE', 'deployJournals', 'deployDocuments', 'deployLib' ], function startCORE() {
      if ( HOST_NAME && HOST_NAME !== 'localhost' ) {
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
        JAVA_OPTS += ' -enableassertions';
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
        this.showSummary();
        // Acquires environment variables via JAVA_TOOL_OPTIONS (JAVA_OPTS)
        exec(`java -cp "${CLASSPATH}" foam.core.boot.Boot`);
      }
    }],

    stopCORE: ['Stop CORE server.', [], function stopCORE() {
      info('Stopping CORE server...');

      var pid = '';
      if ( fs.existsSync(CORE_PIDFILE) )
        pid = fs.readFileSync(CORE_PIDFILE).toString().trim();
      try {
        if ( pid ) {
          execSync(`kill -9 ${pid} &>/dev/null`);
          rmfile(CORE_PIDFILE);
        }
        info('Stopped CORE server.');
      } catch (e) {
        warning('CORE server not running or failed to stop');
      }
    }],

    usage: ['Build usage examples', [], function usage() {
      console.log('All builds will still start a Java web server (CORE), unless directed otherwise.');
      console.log('./build.sh -aJhttps -EJAVA_OPTS:\"-Xms4g -Xmx8g\"');
      console.log('    Start CORE with additional memory, launch from JAR file, and suppor HTTPS support.');
      console.log('./build.sh -Ndemo -W8300');
      console.log('    Build into a unique path \'demo\', and start web server on port \'8300\'.');
      console.log('./build.sh -EAPP_NAME:demo,WEB_PORT:8300');
      console.log('    Build into a unique path \'demo\', and start web server on port \'8300\'.');
    }]
 }
});
