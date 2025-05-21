/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

/**
   Support for creating new FOAM based projects.
   usage: node foam3/tools/build.js -Tproject/standard/Project --createProject:net.foo
 */
foam.POM({
  name: 'project',
  description: 'Options and Tasks to create a new project using FOAM',

  tasks: {
    createProject: ['create-project', 'Create directories and creates root and src/ POMs for a new FOAM based project', [], function createProject(arg) {
      var dir = process.cwd();
      let templateDir = __dirname;
      console.log(`[Project] dir: ${dir}`);
      console.log(`[Project] templateDir: ${templateDir}`);
      // process.exit(0);

      // if called from foam3/ directory, move up one level.
      if ( dir.substring(dir.lastIndexOf('/')+1) === 'foam3' ) {
        dir = dir.substring(0, dir.lastIndexOf('/'));
      }

      var name = arg;
      if ( ! name ) {
        name = dir.substring(dir.lastIndexOf('/')+1);
      }

      var tld, domain, packagePath;
      if ( name.indexOf('.') > 1 ) {
        [tld, domain] = name.split('.');
        if ( domain ) {
          packagePath = this.join(tld, domain);
        }
      }

      console.log(`[Project] creating project ${domain} at ${dir}`);

      function readWrite(inDir, templateFn, outDir, pomFn = 'pom') {
        let inFn = this.join(inDir, templateFn+'.tmpl');
        if ( ! this.existsSync(inFn) ) {
          this.error(`[Project] template not found ${inFn}`);
        }
        var text = this.readFileSync(inFn).toString();
        if ( ! text ) {
          this.error(`[Project] template file empty ${inFn}`);
        }

        text = text.replaceAll("{name}", name);
        text = text.replaceAll("{domain}", domain);
        text = text.replaceAll("{package}", packagePath);

        let outFn = this.join(outDir, pomFn+'.js');
        console.log(`[Project] creating file ${outFn}`);
        if ( ! this.existsSync(outFn) ) {
          this.ensureDir(outDir);
          this.writeFileSync(outFn, text);
        } else {
          this.warning(`[Project] file already exists: ${outFn}`);
        }
      }

      // create root pom
      readWrite.bind(this, templateDir, 'rootPOM', `${dir}`)();

      // create src pom
      readWrite.bind(this, templateDir, 'srcPOM', `${dir}/src/${packagePath}`)();
      // default deployment pom
      readWrite.bind(this, templateDir, 'emptyPOM', `${dir}/deployment/${domain}`)();

      // test deployment pom
      readWrite.bind(this, templateDir, 'testPOM', `${dir}/deployment/test`)();

      // Additional directories and poms
      readWrite.bind(this, templateDir, 'emptyPOM', `${dir}/journals`)();
    }],

    usage: ['usage', 'Example usage', [], function usage() {
      console.log('./build.sh -TProject --createProject:net.foo');
    }]
  }
});
