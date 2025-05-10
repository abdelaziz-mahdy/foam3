/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.POM({
  name: 'standard',
  envs: {
    APP_HOME:          ['Application root directory. To symultaniously deploy multiple applications, give each a unique APP_NAME and WEB_PORT',() => APP_ROOT + '/' + APP_NAME],
    APP_ROOT:          ['Application root directory','/opt'],
    // PROJECT:           ['Top-Level Loaded POM Object, not be be confused with POMS, which is the name of POM(s) to be loaded']
  },

  options: {
    appName: [ 'N', 'app-name', 'APP_NAME', "Name used to construct a unique deployment directory, '/opt/NAME', to support multiple running applications.  Also requires a unique WEB_PORT.", '',
               args => APP_NAME = args ],
    clean: [ 'c', 'clean', 'CLEAN', 'Clean generated code before building.  Required if generated classes have been removed. Use -XcleanAll to remove build/ directory. NOTE: if compilation fails after option c is issued, clean is again required until a succesful build.', false,
             () => CLEAN = true ],
    cleanAll: [ '', 'clean-all', 'CLEAN_ALL', 'Clean application lib/, and remove build/ directory.',false,
             () => CLEAN_ALL = true ]
  },

  tasks: {
    appName: ['Show application information.', ['pomEnvs'], function appName() {
      console.log(`Application Name: ${APP_NAME}`);
    }],

    clean: ['Remove generated files', ['pomEnvs'], function clean() {
      console.log('[StandardTooling] clean');
      if ( this.existsSync(BUILD_DIR) ) {
        var files = this.readdirSync(BUILD_DIR, {withFileTypes: true});
        files.forEach(f => {
          if ( f.name === 'lib' ) return; // handled via cleanLib

          var fn = BUILD_DIR + '/' + f.name;
          if ( f.isDirectory() ) this.rmdir(fn);
          if ( f.isFile()      ) this.rmfile(fn);
        });
      }
    }],

    cleanAll: ['Clean build files, include pom.xml and java libraries. Cleaner than clean.', [ 'clean' ], function cleanAll() {
      console.log('[StandardTooling] cleanAll');
    }],

    usage: ['Build usage examples', [], function usage() {
      console.log('./build.sh -c');
      console.log('    Remove previously generated code, before rebuilding.');
      console.log('./build.sh -cj');
      console.log('    Remove previously generated code and runtime journals, before rebuilding.');
      console.log('./build.sh -XcleanAll,all');
      console.log('    Perform an extra deep clean before building normally.');
      console.log('./build.sh -Htopic');
      console.log('    Print usage for \'topic\'. Ex: ./build.sh -HcleanAll  or  ./xobuild.sh -Ha');
    }],

    // ############################
    // # Build steps
    // ############################
    all: ['Build everything specified by flags.', ['pomEnvs'], function all() {
      if ( ! ( TAR || BUILD_ONLY ) ) {
        this.execute('stopCORE');
      }

      if ( ! RESTART ) {
        if ( CLEAN_ALL ) {
          this.execute('cleanAll');
        } else if ( CLEAN ) {
          this.execute('clean');
        }
        if ( globalThis['TEST'] || globalThis['BENCHMARK'] ) {
          this.execute('clean');
        } else if ( DELETE_RUNTIME_JOURNALS ) {
          this.execute('deleteRuntimeJournals');
        }

        if ( TAR ) {
          this.execute('buildTar');
        } else if ( JAR || globalThis['TEST'] || globalThis['BENCHMARK'] ) {
          // Tests and benchmarks run from an application jar
          this.execute('buildJar');
        } else {
          this.execute('genJava');
        }
      }

      if ( ! ( TAR || BUILD_ONLY ) ) {
        if ( ! JAR || globalThis['TEST'] || globalThis['BENCHMARK'] ) {
          this.execute('startCORE');
        } else {
          this.execute('startCOREJar');
        }
      }
    }]
  }
});
