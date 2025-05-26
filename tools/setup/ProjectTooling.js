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
    adminPassword: ['P', 'admin-password', 'ADMIN_PASSWORD', 'Initial password admin user', '', arg => ADMIN_PASSWORD = arg],
    adminUser: ['', 'admin-user', 'ADMIN_USER', 'Identifier of super-user. This will be the \'username\' for login.', 'admin', arg => ADMIN_USER = arg],
    adminUserId: ['', 'admin-user-id', 'ADMIN_USER_ID', 'Admin user \'id\'. Numerical value between 3 and 999.', '42', function(arg) {
      if ( arg && arg > 2 && arg < 1000) ADMIN_USER_ID = arg;
      else this.error(`Invalid adminUserId. Expecting value between in range [3..999]`);
    }],
    appName: ['N', 'app-name', 'APP_NAME', 'Identifier of application, used for root pom and default deployment directory:  /opt/APP_NAME', '', arg => APP_NAME = arg ],
    package: ['', 'package', 'PACKAGE', 'Source code path - typically following Java package naming conventions which takes a FQDN inverts it and drops the sub-domain. Ex: www.foamdev.com -> com.foamdev.  This will become the source directory structure under src/. For the purposes of this Project creation the result would be src/com/foamdev/APP_NAME/', '', arg => PACKAGE = arg ],
    modelName: ['M', 'model-name', 'MODEL_NAME', 'If a model name is provided, the project creation processs will also setup a complete working application, with user, group, menu, permissions, and service journals based on the model name', '', arg => MODEL_NAME = arg ],
    spid: ['', 'spid', 'SPID', 'Default spid', 'foam', arg => SPID = arg],
    type: ['', 'type', 'TYPE', '?? One of: simple, demo, recipe', 'simple', function(arg) {
      if (arg && (arg === 'simple' || arg === 'demo' || arg == 'recipe' )) TYPE = arg;
      else this.error(`Invalid type '${arg}', expecting one of [simple, demo, recipe]`);
    }]
  },

  tasks: {
    all: ['all', 'Run all tasks to create a new project', ['validate', 'createProject']],
    createProject: ['create-project', 'Create directories and creates root and src/ POMs for a new FOAM based project', [], function createProject(arg) {
      var dir = process.cwd();
      let templateDir = __dirname;

      // if called from foam3/ directory, move up one level.
      if ( dir.substring(dir.lastIndexOf('/')+1) === 'foam3' ) {
        dir = dir.substring(0, dir.lastIndexOf('/'));
      }


      var appName = arg || APP_NAME;
      if ( ! appName ) {
        appName = dir.substring(dir.lastIndexOf('/')+1);
      }
      appName = appName.toLowerCase();

      var adminPassword = ADMIN_PASSWORD;
      var adminUser = ADMIN_USER;
      var adminUserId = ADMIN_USER_ID;
      var AppName = appName[0].toUpperCase() + appName.substring(1);
      var group = appName;
      var package = PACKAGE || appName;
      var modelName = MODEL_NAME || appName;
      modelName = modelName[0].toLowerCase() + modelName.substring(1);
      var ModelName = modelName[0].toUpperCase() + modelName.substring(1);
      var packagePath = package.replaceAll('.', '/');
      var spid = SPID || appName;
      var srcDir;

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

        text = text.replaceAll("{adminPassword}", adminPassword);
        text = text.replaceAll("{adminUser}", adminUser);
        text = text.replaceAll("{adminUserId}", adminUserId);
        text = text.replaceAll("{app}", appName);
        text = text.replaceAll("{appName}", appName);
        text = text.replaceAll("{App}", AppName);
        text = text.replaceAll("{AppName}", AppName);
        text = text.replaceAll("{group}", group);
        text = text.replaceAll("{model}", modelName);
        text = text.replaceAll("{modelName}", modelName);
        text = text.replaceAll("{Model}", ModelName);
        text = text.replaceAll("{ModelName}", ModelName);
        text = text.replaceAll("{package}", package);
        text = text.replaceAll("{packagePath}", packagePath);
        text = text.replaceAll("{spid}", spid);

        fn = this.join(outDir, outFn);
        this.log(`[Project] creating file ${fn}`);
        if ( ! this.existsSync(fn) ) {
          this.ensureDir(outDir);
          this.writeFileSync(fn, text);
        } else {
          this.warning(`[Project] file already exists: ${fn}`);
        }
      }

      // base setup
      readWrite.bind(this, templateDir, 'rootPOM.js', `${dir}`)();
      readWrite.bind(this, templateDir, 'deploymentAppPOM.js', `${dir}/deployment/${appName}`, 'pom.js')();
      readWrite.bind(this, templateDir, 'journalPOM.js', `${dir}/journals`, 'pom.js')();
      readWrite.bind(this, templateDir, 'journalGroups.jrl', `${dir}/journals`, `groups.jrl`)();
      readWrite.bind(this, templateDir, 'journalGroupPermissionJunctions.jrl', `${dir}/journals`, `groupPermissionJunctions.jrl`)();

      // demo user setup
      readWrite.bind(this, templateDir, 'deploymentDemoPOM.js', `${dir}/deployment/demo`, `pom.js`)();
      readWrite.bind(this, templateDir, 'deploymentDemoUsers.jrl', `${dir}/deployment/demo`, `users.jrl`)();
      readWrite.bind(this, templateDir, 'run.sh', `${dir}/deployment/demo`, `run.sh`)();
      this.execSync(`chmod u+x ${dir}/deployment/demo/run.sh`);

      // test
      readWrite.bind(this, templateDir, 'modelTestPOM.js', `${dir}/src/${packagePath}/test`, 'pom.js')();
      readWrite.bind(this, templateDir, 'modelTest.js', `${dir}/src/${packagePath}/test`, `${ModelName}Test.js`)();
      readWrite.bind(this, templateDir, 'deploymentModelTestPOM.js', `${dir}/deployment/test`, 'pom.js')();
      readWrite.bind(this, templateDir, 'tests.jrl', `${dir}/src/${packagePath}/test`, 'tests.jrl')();

      readWrite.bind(this, templateDir, 'journalMenus.jrl', `${dir}/journals`, `menus.jrl`)();

      // model
      if ( TYPE === 'demo' ) {
        readWrite.bind(this, templateDir, 'demoModel.js', `${dir}/src/${packagePath}`, `${ModelName}.js`)();
        readWrite.bind(this, templateDir, 'demoModelCategory.js', `${dir}/src/${packagePath}`, `${ModelName}Category.js`)();
        readWrite.bind(this, templateDir, 'demoModelPOM.js', `${dir}/src/${packagePath}`, 'pom.js')();
        readWrite.bind(this, templateDir, 'journalServices.jrl', `${dir}/journals`, `services.jrl`)();
      } else if ( TYPE === 'recipe' || appName === 'recipe' ) {
        // See FOAM-Recipe Tutorial
        readWrite.bind(this, templateDir, 'recipeModel.js', `${dir}/src/${packagePath}`, `Recipe.js`)();
        readWrite.bind(this, templateDir, 'recipeModelCategory.js', `${dir}/src/${packagePath}`, `RecipeCategory.js`)();
        readWrite.bind(this, templateDir, 'recipeModelPOM.js', `${dir}/src/${packagePath}`, 'pom.js')();
        readWrite.bind(this, templateDir, 'journalServices.jrl', `${dir}/journals`, `services.jrl`)();
      } else {
        readWrite.bind(this, templateDir, 'simpleModel.js', `${dir}/src/${packagePath}`, `${ModelName}.js`)();
        readWrite.bind(this, templateDir, 'simpleModelPOM.js', `${dir}/src/${packagePath}`, 'pom.js')();
        readWrite.bind(this, templateDir, 'simpleJournalServices.jrl', `${dir}/journals`, `services.jrl`)();
      }

      // theme
      readWrite.bind(this, templateDir, 'themes.jrl', `${dir}/journals`, `themes.jrl`)();

      // adminPassword = this.hash(adminPassword);
      readWrite.bind(this, templateDir, 'adminUser.jrl', `${dir}/journals`, `users.jrl`)();

      // Additional directories and poms
      readWrite.bind(this, templateDir, 'build.sh', `${dir}`, `build.sh`)();
      this.execSync(`chmod u+x ${dir}/build.sh`);
      readWrite.bind(this, templateDir, 'gitignore', `${dir}`, `.gitignore`)();

      // this.execSync('sudo chown -R $USER /opt')
    }],

    info: ['info', 'Documentation for this Tooling', [], function() {
      this.log('Project Tooling');
    }],
    usage: ['usage', 'Example usage', [], function() {
      this.log('Project creation examples:');
      this.log('  node foam3/tools/build.js -Tsetup/Project --appName:Recipe --package:com.foamdev.cook');
      this.log('      Will generate a project matchin the FOAM-Recipes tutorial');
      this.log('  node foam3/tools/build.js -Tsetup/Project --appName:Simple --package:com.foamdev');
      this.log('      Will generate a project with a very simple model.');
      this.log('  node foam3/tools/build.js -Tsetup/Project --type:demo --appName:Example --package:com.foamdev');
      this.log('      Will generate a project with a more elaborate model demonstrating more FOAM features..');
    }],

    validate: ['validate', 'Validate tooling parameters before execution', [], function() {
      // if ( ! ADMIN_PASSWORD ) {
      //   this.error(`[Project] option --adminPassword required.`);
      // }
    }]
  }
});
