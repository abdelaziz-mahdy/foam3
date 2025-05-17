/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.POM({
  name: 'java',

  envs: {
    CORE_PIDFILE:      ['JVM process ID file', () => APP_NAME ? `/tmp/core_${APP_NAME}.pid` : '/tmp/core_APP_NAME.pid'],
    DOCUMENT_HOME:     ['Appplication documents directory',() => APP_NAME ? `${APP_HOME}/documents`: 'APP_HOME/documents'],
    DOCUMENT_OUT:      ['Build documents directory',() => `${PROJECT_HOME}/${BUILD_DIR}/documents`],
    JAR_INCLUDES:      ['Additional directories to include Java jar',''],
    JAR_LIB_DIR:       ['Deployment lib directory',() => ( TAR ? `${PROJECT_HOME}/${BUILD_DIR}` : (APP_NAME ? APP_HOME : 'APP_HOME')) + '/lib'],
    JAR_NAME:          ['Java jar name',() => APP_NAME ? `${APP_NAME}-${VERSION}.jar` : 'APP_NAME-VERSION.jar' ],
    JAR_OUT:           ['Java jar path and name',() => `${JAR_LIB_DIR}/${JAR_NAME}`],
    JAVA_MANIFEST:     ['Generated JAVA_MANIFEST'],
    JAVA_TOOL_OPTIONS: ['Internal configuration for JVM with the JAVA_OPTS',() => JAVA_OPTS],
    JOURNAL_HOME:      ['Application journals directory',() => `${APP_HOME}/journals`],
    JOURNAL_OUT:       ['Build journals directory',() => `${PROJECT_HOME}/${BUILD_DIR}/journals`],
    LOG_HOME:          ['Application logs directory',() => APP_NAME ? `${APP_HOME}/logs`: 'APP_HOME/logs']
  },

  options: {
    bootScript: ['', 'boot-script', 'BOOT_SCRIPT', 'Boot executes a bootscript just after statup. This bootscript is how Test cases are run. TODO: elaborate.  bootScript:testRunnerScript','main', arg => BOOT_SCRIPT = arg ],
    buildOnly: [ 'o', 'build-only', 'BUILD_ONLY', "Only execute java generation and java compilation build steps, don't start CORE server.", false, function(arg) { BUILD_ONLY = this.arg ? bool(arg) : true; } ],
    debug: [ 'd', 'debug', 'DEBUG', 'Launch JVM with JDPA debugging enabled. Default port 8000.', false, function(arg) { DEBUG = this.arg ? bool(arg) : true; } ],
    debugPort: [ 'D', 'debug-port', 'DEBUG_PORT', 'Port JVM will listen on for debuggers (JDPA) connections.',8000, args => DEBUG_PORT = args],
    deleteRuntimeJournals: [ 'j', 'delete-runtime-journals', 'DELETE_RUNTIME_JOURNALS', 'Delete runtime journals.', false, function(arg) { DELETE_RUNTIME_JOURNALS = this.arg ? bool(arg) : true; } ],
    javacParameters: ['', 'javac-parameters', 'JAVAC_PARAMETERS', 'Parameters passed to Java Compiler','-proc:none', arg => JAVAC_PARAMETERS = arg ],
    javaRelease: ['', 'java-release', 'JAVA_RELEASE', 'Java target version. Can also be set in root pom. ex: java: \'11\'', '17', args => JAVA_RELEASE = args],
    journals: [ 'J', 'journals', 'JOURNALS', 'Comma seperated list of additional journal directories, relative to deployment/ from the root project.', '', function(args) { JOURNALS = this.comma(JOURNALS, args); } ],
    jar: [ 'a', 'jar', 'JAR', 'Run/launch from Java jar file.', false, function(arg) { JAR = this.arg ? bool(arg) : true; } ],
    javaManifestVendor: ['', 'java-manifest-vendor', 'JAVA_MANIFEST_VENDOR', 'Java Manifest Vendor', () => APP_NAME ? `${APP_NAME}` : 'APP_NAME', args => JAVA_MANIFEST_VENDOR = args ],
    javaManifestVendorId: ['', 'java-manifiest-vendor-id', 'JAVA_MANIFEST_VENDOR_ID', 'Java Manifest Vendor ID', '', args => JAVA_MANIFEST_VENDOR_ID = args ],
    javaOpts: ['', 'java-opts', 'JAVA_OPTS', 'Additional JVM options','', arg => JAVA_OPTS = arg ],
    logLevel: ['l', 'log-level', 'LOG_LEVEL', 'Set JVM Log level for TEST cases. Defaults to ERROR. example: --log-level:INFO',null, arg => LOG_LEVEL = arg ],
    javaMainClass: ['', 'java-main-class', 'JAVA_MAIN_CLASS', 'Java \'main\' class', 'foam.core.boot.Boot', arg => JAVA_MAIN_CLASS = arg ],
    javaMainArgs: ['', 'java-main-args', 'JAVA_MAIN_ARGS', 'Comma separated key[:value] arguments passed to the Java \'main\' class', '', function(arg) { JAVA_MAIN_ARGS = this.comma(JAVA_MAIN_ARGS, arg); } ],
    restart: [ 'r', 'restart', 'RESTART', 'Restart CORE Server using last build.', false, function(arg) { RESTART = this.arg ? bool(arg) : true; } ],
    runArgs: ['', 'run-args', 'RUN_ARGS', 'Arguments which will be passed to run.sh to when starting CORE server from JAR','', arg => RUN_ARGS = arg ],
    suspend: [ 's', 'suspend', 'SUSPEND', 'Start JDPA debugging in suspend state.', false, function(arg) { DEBUG = this.arg ? bool(arg) : true; SUSPEND = this.arg ? bool(arg) : true; } ],
    tar: [ 'k', 'tar', 'TAR', 'Package up a deployment tarball for remote application installation', false, function(arg) { TAR = this.arg ? bool(arg) : true; } ],
    webPort: [ 'W', 'web-port', 'WEB_PORT', 'Port WebServer will listen on. HTTP defaults to 8080, HTTPS defaults to 8443.  WebSocketServer will use PORT+1', '8080', args => WEB_PORT = args ],
    version: ['', 'version', 'VERSION', 'Application version', '1.0.0', args => VERSION = args ]
  },

  tasks: {
    buildJar: ['build-jar', 'Build Java JAR file.', [()=>JAR=true, 'setupDirs', 'genJS', 'genJava', 'versions', 'copy', 'genImages', 'genJavaManifest', 'jarFOAM' ], function buildJar() {
      JAR_INCLUDES += ` -C ${BUILD_DIR} webroot `;
      this.execSync(`jar cfm ${BUILD_DIR}/lib/${JAR_NAME} ${BUILD_DIR}/MANIFEST.MF ${JAR_INCLUDES}`, { stdio: VERBOSE ? 'inherit' : 'ignore' });
    }],
    buildJavaMainArgs: ['build-java-main-args', 'Collection all options which should be passed to Java main', [], function buildJavaMainArgs() {
      JAVA_MAIN_ARGS = this.comma(JAVA_MAIN_ARGS, `boot.script:${BOOT_SCRIPT}`);
    }],
    buildJavaOpts: ['build-java-opts', 'Set Java environmental variables.', [], function buildJavaOpts() {
      JAVA_OPTS += ` -DJOURNAL_HOME=${JOURNAL_HOME}`;
      JAVA_OPTS += ` -DDOCUMENT_HOME=${DOCUMENT_HOME}`;
      if ( HOST_NAME !== 'localhost' ) {
        JAVA_OPTS += ` -Dhostname=${HOST_NAME}`;
      }
      if ( WEB_PORT ) {
        JAVA_OPTS += ` -Dhttp.port=${WEB_PORT}`;
      }
    }],
    buildJavaTestOpts: ['build-java-test-ops', 'Add test specific JAVA_OPTS', ['buildJavaOpts'], function buildJavaTestOpts() {
      JAVA_OPTS += ' -enableassertions';
      JAVA_OPTS += ' -Dresource.journals.dir=journals';
      JAVA_OPTS += ' -DRES_JAR_HOME=' + JAR_OUT;

      if ( DEBUG )
        JAVA_OPTS += ` -agentlib:jdwp=transport=dt_socket,server=y,suspend=${SUSPEND ? 'y' : 'n'},address=127.0.0.1:${DEBUG_PORT}`;
    }],
    buildRunArgs: ['set-run-args', 'Set arguments which will be passed to run.sh to start CORE server', [], function buildRunArgs() {
      if ( WEB_PORT ) RUN_ARGS += ` -W${WEB_PORT}`;
      if ( DEBUG ) RUN_ARGS += ` -D${DEBUG_PORT}`;
      if ( SUSPEND ) RUN_ARGS += ` -s`;
      // if ( PROFILER ) RUN_ARGS += ` -P${PROFILER_PORT}`;
      if ( HOST_NAME && HOST_NAME !== 'localhost' ) RUN_ARGS += ` -H${HOST_NAME}`;
    }],

    buildTar: ['build-tar', 'Package files into a TAR archive', [()=>TAR=true, 'buildJar'], function buildTar() {
      this.ensureDir(this.join(BUILD_DIR, 'package'));
      // Notice that the argument to the second -C is relative to the directory from the first -C, since -C
      this.execSync(`tar -a -cf ${BUILD_DIR}/package/${APP_NAME}-deploy-${VERSION}.tar.gz -C ./foam3/tools/deploy bin etc -C${require('path').resolve(BUILD_DIR)} lib`, { stdio: VERBOSE ? 'inherit' : 'ignore' });
    }],

    clean: ['clean', 'Remove generated files', ['cleanJava'], function clean() {
      if ( APP_HOME && this.existsSync(APP_HOME) ) {
        this.emptyDir(`${APP_HOME}/bin`);
        this.emptyDir(`${APP_HOME}/lib`);
      }
    }],

    cleanJava: ['clean-java', 'Remove previously generated JAR.', [], function cleanJava() {
      // remove previous app jar in build directory to fix classes resolution for non-jar run
      this.execSync(`rm -f ${BUILD_DIR}/lib/${APP_NAME}-*.jar >/dev/null 2>&1`);
    }],

    cleanTest: ['clean-test', 'Remove entire test deployment for next run', [], function cleanTest() {
      this.rmdir(APP_HOME);
    }],

    deleteRuntimeJournals: ['delete-runtime-journals', 'Delete runtime journals.', [], function deleteRuntimeJournals() {
      this.info('Runtime journals deleted.');
      this.emptyDir(JOURNAL_HOME);
    }],

    genImages: ['gen-images', 'Prepare images from inclusion in jar.', [], function genImages() {
      JAR_INCLUDES += ` -C ${BUILD_DIR} images `;

      this.pmake.bind(this, `-makers=Image -flags=${this.flag()} -pom=${POMS} -builddir=${BUILD_DIR}`)();
    }],

    genImages: ['gen-images', 'Prepare images from inclusion in jar.', [], function genImages() {
      JAR_INCLUDES += ` -C ${BUILD_DIR} images `;

      this.pmake.bind(this, `-makers=Image -flags=${this.flag()} -pom=${POMS} -builddir=${BUILD_DIR}`)();
    }],

    genJava: ['gen-java', 'Generate Java source from models and complile', ['cleanJava', 'javacParameters'], function genJava() {
      JAR_INCLUDES += ` -C ${BUILD_DIR} journals `;
      JAR_INCLUDES += ` -C ${BUILD_DIR} documents `;
      JAR_INCLUDES += ` -C ${BUILD_DIR}/classes .`;

      var makers = VERBOSE ? 'Verbose,' : '';
      // NOTE: Java and Javac Maker must be run together as they share data through X
      makers += 'Java,Maven,Javac';
      makers += ',Journal,Doc';
      this.pmake.bind(this, `-makers=${makers} -flags=${this.flag()} -pom=${POMS} -builddir=${BUILD_DIR} -d=${BUILD_DIR}/classes -journaldir=${JOURNAL_OUT} -documentdir=${DOCUMENT_OUT} -outdir=${BUILD_DIR}/src/java -libdir=${BUILD_DIR}/lib -javacParams=\'${JAVAC_PARAMETERS}\'`)();
    }],

    deployBin: ['deploy-bin', 'Copy bash files to deployment', [], function deployBin() {
      this.ensureDir(this.join(APP_HOME, 'bin'));
      this.copyDir('./foam3/tools/deploy/bin', this.join(APP_HOME, 'bin'));
      this.ensureDir(this.join(APP_HOME, 'etc'));
      this.copyDir('./foam3/tools/deploy/etc', this.join(APP_HOME, 'etc'));
    }],

    deployDocuments: ['deploy-documents', 'Deploy documents from DOCUMENT_OUT to DOCUMENT_HOME.', ['setupDirs'], function deployDocuments() {
      this.ensureDir(DOCUMENT_HOME);
      this.copyDir(DOCUMENT_OUT, DOCUMENT_HOME);
    }],

    deployJournals: ['deploy-journals', 'Deploy journal files from JOURNAL_OUT to JOURNAL_HOME.', ['setupDirs'], function deployJournals() {
      this.ensureDir(JOURNAL_HOME);
      this.copyDir(JOURNAL_OUT, JOURNAL_HOME);
    }],

    deployLib: ['depoy-lib', 'Copy library files to deployment', [], function deployLib() {
      this.ensureDir(this.join(APP_HOME, 'lib'));
      this.copyDir(BUILD_DIR + '/lib', this.join(APP_HOME, 'lib'));
    }],

    genDocuments: ['gen-documents', 'Capture repository documentation - flow docs', [], function genDocuments() {
      JAR_INCLUDES += ` -C ${BUILD_DIR} documents `;
      this.pmake(`-makers=Doc -flags=${this.flag()} -pom=${POMS} -builddir=${BUILD_DIR} -documentdir=${DOCUMENT_OUT}`);
    }],

    genJournals: ['gen-journals', 'Concatenate repository journal files into .0 files', [], function genJournals() {
      JAR_INCLUDES += ` -C ${BUILD_DIR} journals `;
      this.pmake.bind(this, `-makers=Journal -flags=${this.flag()} -pom=${POMS} -builddir=${BUILD_DIR} -journaldir=${JOURNAL_OUT}`)();
    }],

    jarFOAM: ['jar-foam', 'Copy foam-bin files for inclusion in JAR file.', ['genJava'], function jarFOAM() {
      this.ensureDir(this.join(BUILD_DIR, 'webroot'));
      this.execSync(`cp ${BUILD_DIR}/js/foam-bin-* ${BUILD_DIR}/webroot/`, {stdio: VERBOSE ? 'inherit' : 'ignore' });
    }],

    // TODO: not tested
    javaBenchmarks: ['java-benchmarks', 'Run all or specified benchmarks. ex: javaBenchmarks[:Benchmark1,Benchmark2]', [/*'stopCORE'*/], function javaBenchmarks(args) {
      APP_ROOT = '/tmp';
      FLAGS = this.comma(FLAGS, 'test');
      // this.addJournal('test'); ??
      this.execute('pomEnvs');
      if ( CLEAN ) this.execute('clean');
      this.execute(cleanTest);
      BOOT_SCRIPT = 'benchmarkRunnerScript';

      this.execute('buildJar');
      this.execute('startCORETest', 'benchmark', args);
    }],

    javacParameters: ['javac-parameters', 'Set parameters passed the Java compiler', [], function javacParameters() {
      if ( ! JAVAC_PARAMETERS.includes('--release') ) {
        JAVAC_PARAMETERS += ' --release '+JAVA_RELEASE;
      }
    }],

    // TODO: build piece-meal so each tooling pom can it's contribution
    genJavaManifest: ['gen-java-manifest', 'Generate Java Manifest', ['versions', 'genFoamBinVersion', 'buildJavaMainArgs'], function genJavaManifest() {
      var jars = this.execSync(`find ${BUILD_DIR}/lib -type f -name "*.jar"`).toString()
          .replaceAll(`${BUILD_DIR}/lib/`, '  ').trim();
      var m = `
Manifest-Version: 1.0
Main-Class: ${JAVA_MAIN_CLASS}
Args: ${JAVA_MAIN_ARGS}
Class-Path: ${jars}
Implementation-Title: ${APP_NAME}
Implementation-Version: ${FOAM_BIN_VERSION}
Specification-Version: ${PROJECT_REVISION}
Implementation-Timestamp: ${TIMESTAMP}
${APP_NAME}-Revision: ${PROJECT_REVISION}
FOAM-Revision: ${FOAM_REVISION}
Implementation-Vendor: ${JAVA_MANIFEST_VENDOR}
`.trim() + '\n';

      if ( JAVA_MANIFEST_VENDOR_ID ) {
        m += `Implementation-Vendor-Id: ${JAVA_MANIFEST_VENDOR_ID}\n`;
      }
      JAVA_MANIFEST = m;
      this.writeFileSync(BUILD_DIR + '/MANIFEST.MF', m);
      return m;
    }],

    javaTests: ['java-tests', 'Run all or specified test cases. ex: javaTests[:Test1,Test2]', [/*'stopCORE'*/], function javaTests(args) {
      APP_ROOT='/tmp';
      FLAGS = this.comma(FLAGS, 'test');
      this.addJournal('test');
      this.execute('pomEnvs');
      if ( CLEAN ) this.execute('clean');
      this.execute('cleanTest');
      BOOT_SCRIPT = 'testRunnerScript';

      this.execute('buildJar');
      this.execute('startCORETest', 'test', args);
    }],

    showJavaManifest: ['show-java-manifest', 'Display generated Java Manifest file.', ['genJavaManifest'], function showJavaManifest() {
      console.log('Manifest:', JAVA_MANIFEST);
    }],

    setupDirs: ['setup-dirs', 'Create empty build and deployment directory structures if required.', [], function setupDirs() {
      try {
        if ( ! BUILD_ONLY ) {
          this.ensureDir(APP_HOME);
          if ( JAR ) {
            this.ensureDir(DOCUMENT_HOME);
            this.ensureDir(JOURNAL_HOME);
          }
          this.ensureDir(LOG_HOME);
        }
      } catch ( e ) {
        this.error(`Directory is not writable! Please run 'sudo chown -R $USER ${APP_ROOT}' first.`, e);
      }
    }],

    startCORE: ['start-core', 'Start CORE server (CLASSPATH).', ['setupDirs', 'deployJournals', 'deployDocuments', 'deployLib', 'buildJavaOpts', 'buildJavaMainArgs'], function startCORE() {

      JAVA_OPTS += ` -Dcore.webroot=${PROJECT_HOME}`;

      if ( DEBUG )
        JAVA_OPTS += ` -agentlib:jdwp=transport=dt_socket,server=y,suspend=${SUSPEND ? 'y' : 'n'},address=127.0.0.1:${DEBUG_PORT}`;

      this.showSummary();
      if ( BUILD_ONLY ) return;

      this.info(`Starting CORE ${APP_NAME}`);
      // Acquires environment variables via JAVA_TOOL_OPTIONS (JAVA_OPTS)
      this.execSync(`java -cp "${BUILD_DIR}/lib/\*:${BUILD_DIR}/classes" ${JAVA_MAIN_CLASS} "${JAVA_MAIN_ARGS}"`, { stdio: 'inherit' });
    }],

    startCOREJar: ['start-core-jar', 'Start CORE server (JAR).', [/*'stopCORE'*/, 'setupDirs', 'deployBin', 'deployLib', 'buildJavaOpts', 'buildRunArgs', 'showSummary'], function startCOREJar() {
      if ( BUILD_ONLY ) return;

      // see etc/shrc.local for jdwp configuration
      this.execSync(`${APP_HOME}/bin/run.sh -N${APP_NAME} -V${VERSION} ${RUN_ARGS}`, { stdio: 'inherit' });

      // TODO: Previously support running as a daemon process and using 'stop' to kill
      // z: [ 'Daemonize into the background, will write PID into $PIDFILE environment variable.',
      //      () => DAEMONIZE = true ]
      // var proc = spawn(`java -cp ${CLASSPATH} foam.nanos.boot.Boot`);
      // writeToPidFile(proc.pid);
      // function writeToPidFile(pid) {
      //   fs.writeFileSync(NANOS_PIDFILE, pid.toString());
      // }
      // function readFromPidFile() {
      //   if ( fs.existsSync(NANOS_PIDFILE) )
      //     return fs.readFileSync(NANOS_PIDFILE).toString().trim();
      // }
    }],

    startCORETest: ['start-core-test', 'Start CORE server (Test, Benchmarks).', ['deployJournals', 'deployDocuments', 'deployLib', 'buildJavaTestOpts'], function startCORETest(mode, ...tests) {
      console.log(`startCORETest tests: '${tests}', tests !== '': ${String(tests) !== ''} `);
      MESSAGE = 'Running tests...';

      if ( mode === 'benchmark' ) {
        MESSAGE = 'Running benchmarks...';
        if ( String(tests) != '' )
          JAVA_OPTS += ' -Dfoam.benchmarks=' + tests;
      } else {
        if ( String(tests) != '' )
          JAVA_OPTS += ' -Dfoam.tests=' + tests;
      }

      this.showSummary();
      if ( BUILD_ONLY ) return;

      this.info(MESSAGE);

      try {
        this.execSync(`java -jar ${JAR_OUT}`, { stdio: 'inherit' });
      } catch ( e ) {
        if ( mode !== 'test' )
          throw e;
      }
      if ( mode === 'test' ) {
        process.exit(0);
      }
    }],

    stopCORE: ['stop-core', 'Stop CORE server.', [], function stopCORE() {
      if ( this.existsSync(CORE_PIDFILE) ) {
        let pid = this.readFileSync(CORE_PIDFILE).toString().trim();
        if ( pid ) {
          this.info('CORE server stopping...');
          try {
            this.execSync(`kill -9 ${pid} &>/dev/null`);
            this.rmfile(CORE_PIDFILE);
            this.info('CORE server stopped.');
            // FUTURE: query for pid in system process table
          } catch (e) {
            this.warning('CORE server failed stop.', e);
          }
        } else {
          verbose('CORE server not running.');
        }
      } else {
        verbose('CORE PIDFILE not found.');
      }
    }],

    usage: ['usage', 'Build usage examples', [], function usage() {
      console.log('All builds will still start a Java web server (CORE), unless directed otherwise.');
      console.log('./build.sh -aJhttps -EJAVA_OPTS:\"-Xms4g -Xmx8g\"');
      console.log('    Start CORE with additional memory, launch from JAR, start HTTPS web server, set JVM max and min memory.');
      console.log('./build.sh -Ndemo -W8300 -aJhttps');
      console.log('    Build into a unique path \'demo\', launch from JAR, start HTTPS web server on port \'8300\'.');
      console.log('./build.sh --appName:demo --webPort:8300 --jar --journals:https');
      console.log('    Build into a unique path \'demo\', launch from JAR, start HTTPS web server on port \'8300\'.');
      console.log('./build.sh --app-name:demo --web-port:8300 --jar --journals:https');
      console.log('    Build into a unique path \'demo\', launch from JAR, start HTTPS web server on port \'8300\'.');
      console.log('./build.sh -EAPP_NAME:demo,WEB_PORT:8300,JAR:true,JOURNALS:https');
      console.log('    Build into a unique path \'demo\', launch from JAR, start HTTPS web server on port \'8300\'.');
      // Testing
      console.log('./build.sh --java-tests');
      console.log('    Run all Java test cases.');
      console.log('./build.sh --java-tests:SequenceNumberDAO,MapDAOTest');
      console.log('    Run specified Java test cases.');
    }],

    versions: ['versions', 'Show version information.', ['getProjectRevision', 'getFOAMRevision'], function versions() {
      console.log(`Application Version: ${VERSION}`);
    }]
 }
});
