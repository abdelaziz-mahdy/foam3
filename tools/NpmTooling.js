/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

const { comma, copyDir, copyFile, emptyDir, ensureDir, exec, execSync, exportEnvs, info, rmdir, rmfile, warning } = require('./buildlib');

foam.POM({
  name: 'npm',

  tasks: {
    install: ['Install npm tools that foam and the build use.', [], function install() {
      process.chdir(PROJECT_HOME);
      execSync('npm install', { stdio: 'inherit'} );
    }]
  }
});
