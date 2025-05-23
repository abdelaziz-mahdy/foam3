/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

/**
   Support for creating new FOAM based projects.
   usage: node foam3/tools/build.js -Tproject/standard/Project --createProject:[net.foo.]app[.model]
 */
foam.POM({
  name: 'project',
  description: 'Options and Tasks to create a new project using FOAM',

  options: {
    appName: ['N', 'app-name', 'APP_NAME', 'Identifier of application, used for root pom and default deployment directory:  /opt/APP_NAME', '', arg => APP_NAME = arg ],
    package: ['P', 'package', 'PACKAGE', 'Source code path - typically following Java package naming conventions which takes a FQDN inverts it and drops the sub-domain. Ex: www.foamdev.com -> com.foamdev.  This will become the source directory structure under src/. For the purposes of this Project creation the result would be src/com/foamdev/APP_NAME/', '', arg => PACKAGE = arg ],
    modelName: ['M', 'model-name', 'MODEL_NAME', 'If a model name is provided, the project creation processs will also setup a complete working application, with user, group, menu, permissions, and service journals based on the model name', '', arg => MODEL_NAME = arg ]
  },

  tasks: {
    all: ['all', 'all', 'Run all tasks to create a new project', ['createProject']],
    createProject: ['create-project', 'Create directories and creates root and src/ POMs for a new FOAM based project', [], function createProject(arg) {
      var dir = process.cwd();
      let templateDir = __dirname;

      // if called from foam3/ directory, move up one level.
      if ( dir.substring(dir.lastIndexOf('/')+1) === 'foam3' ) {
        dir = dir.substring(0, dir.lastIndexOf('/'));
      }

      var appName = arg || APP_NAME;
      var AppName;
      var package = PACKAGE || appName;
      var modelName = MODEL_NAME;
      var ModelName;
      var packagePath;
      var srcDir;

      if ( ! package ) {
        appName = dir.substring(dir.lastIndexOf('/')+1);
        package = package || appName;
      } else if ( package.indexOf('.') > 1 ) {
        [modelName, appName, _, _] = package.split('.').reverse();
      }
      packagePath = package.replaceAll('.', '/');

      // special consideration for app name
      if ( APP_NAME ) {
        appName = APP_NAME;
      }
      AppName = appName[0].toUpperCase() + appName.substring(1);
      appName = appName.toLowerCase();

      if ( modelName ) {
        ModelName = modelName[0].toUpperCase() + modelName.substring(1);
        modelName = modelName[0].toLowerCase() + modelName.substring(1);
      }

      this.log(`[Project] creating project ${AppName} at ${dir}`);

      function readWrite(inDir, templateFn, outDir, outFn = 'pom.js') {
        let fn = this.join(inDir, templateFn);
        if ( ! this.existsSync(fn) ) {
          this.error(`[Project] template not found ${fn}`);
        }
        var text = this.readFileSync(fn).toString();
        if ( ! text ) {
          this.error(`[Project] template file empty ${fn}`);
        }

        text = text.replaceAll("{app}", appName);
        text = text.replaceAll("{App}", AppName);
        if ( modelName ) {
          text = text.replaceAll("{model}", modelName);
          text = text.replaceAll("{Model}", ModelName);
        }
        text = text.replaceAll("{package}", package);
        text = text.replaceAll("{packagePath}", packagePath);

        fn = this.join(outDir, outFn);
        this.log(`[Project] creating file ${fn}`);
        if ( ! this.existsSync(fn) ) {
          this.ensureDir(outDir);
          this.writeFileSync(fn, text);
        } else {
          this.warning(`[Project] file already exists: ${fn}`);
        }
      }

      // create root pom
      readWrite.bind(this, templateDir, 'rootPOM.js', `${dir}`)();

      // default deployment pom
      readWrite.bind(this, templateDir, 'deploymentAppPOM.js', `${dir}/deployment/${appName}`, 'pom.js')();
      readWrite.bind(this, templateDir, 'journalPOM.js', `${dir}/journals`, 'pom.js')();

      if ( ! modelName) {
        readWrite.bind(this, templateDir, 'srcPOM.js', `${dir}/src/${packagePath}`, 'pom.js')();
        readWrite.bind(this, templateDir, 'testPOM.js', `${dir}/deployment/test`, 'pom.js')();
      } else {
        readWrite.bind(this, templateDir, 'journalGroups.jrl', `${dir}/journals`, `groups.jrl`)();
        readWrite.bind(this, templateDir, 'journalGroupPermissionJunctions.jrl', `${dir}/journals`, `groupPermissionJunctions.jrl`)();
        readWrite.bind(this, templateDir, 'journalMenus.jrl', `${dir}/journals`, `menus.jrl`)();
        readWrite.bind(this, templateDir, 'journalServices.jrl', `${dir}/journals`, `services.jrl`)();

        readWrite.bind(this, templateDir, 'deploymentDemoPOM.js', `${dir}/deployment/demo`, `pom.js`)();
        readWrite.bind(this, templateDir, 'deploymentDemoUsers.jrl', `${dir}/deployment/demo`, `users.jrl`)();

        // model
        readWrite.bind(this, templateDir, 'modelPOM.js', `${dir}/src/${packagePath}`, 'pom.js')();
        readWrite.bind(this, templateDir, 'model.js', `${dir}/src/${packagePath}`, `${ModelName}.js`)();
        readWrite.bind(this, templateDir, 'modelCategory.js', `${dir}/src/${packagePath}`, `${ModelName}Category.js`)();

        // test
        readWrite.bind(this, templateDir, 'modelTestPOM.js', `${dir}/src/${packagePath}/test`, 'pom.js')();
        readWrite.bind(this, templateDir, 'modelTest.js', `${dir}/src/${packagePath}/test`, `${ModelName}Test.js`)();
        readWrite.bind(this, templateDir, 'deploymentModelTestPOM.js', `${dir}/deployment/test`, 'pom.js')();
        readWrite.bind(this, templateDir, 'tests.jrl', `${dir}/src/${packagePath}/test`, 'tests.jrl')();

        // run script
        readWrite.bind(this, templateDir, 'run.sh', `${dir}/deployment/demo`, `run.sh`)();
        this.execSync(`chmod u+x ${dir}/deployment/demo/run.sh`);
      }

      // Additional directories and poms
      readWrite.bind(this, templateDir, 'emptyPOM.js', `${dir}/journals`, 'pom.js')();

      readWrite.bind(this, templateDir, 'build.sh', `${dir}`, `build.sh`)();
      this.execSync(`chmod u+x ${dir}/build.sh`);

      readWrite.bind(this, templateDir, 'gitignore', `${dir}`, `.gitignore`)();

      // this.execSync('sudo chown -R $USER /opt')
    }],

    usage: ['usage', 'Example usage', [], function usage() {
      this.log('Project creation examples:');
      this.log('  ./build.sh -Ttemplate/demo/Project --createProject --appName:Recipe --modelName:Recipe --package:com.foamdev.cook.recipe');
      this.log('  ./build.sh -Ttemplate/demo/Project --appName:Recipe --modelName:Recipe --package:com.foamdev.cook.recipe');
      this.log('  ./build.sh -Ttemplate/demo/Project --createProject:net.foo.app.demo');
    }]
  }
});
