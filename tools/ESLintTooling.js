/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.POM({
  name: 'eslint',
  description: 'Replaces command line eslint operations and replaces the need for node package.json eslint scripts.',

  options: {
    dirs: ['', 'directories', 'DIRECTORIES', 'Directories to inspect', 'src,tools', arg => DIRECTORIES = arg],
    maxWarnings: ['', 'max-warnings', 'MAX_WARNINGS', 'Number of warnings reported before truncating output', 0, arg => MAX_WARNINGS = arg],
  },

  tasks: {
    all: ['all', 'Default to ESLint check', ['check']],
    check : ['check', 'Run ESLint \'check\' operation.', [], function() {
      try {
        this.execSync(`npx eslint ${DIRECTORIES.replaceAll(',', '/ ')} --ext .js --max-warnings ${MAX_WARNINGS}`, { stdio: 'inherit' });
      } catch(e) {
        // nop - already reported
      }
    }],
    fix: ['fix', 'Run ESLint \'fix\' operation to correct warnings', [], function() {
      try {
        this.execSync(`npx eslint ${DIRECTORIES.replacAll(',','/ ')} --ext .js --fix`, { stdio: 'inherit' });
      } catch(e) {
        // nop - already reported
      }
    }],
    usage: ['usage', 'usage examples', [], function() {
      console.log('ESLint tooling examples');
      console.log('  ./build.sh -TESLint');
      console.log('    Run eslint reporting/check on default directories: src/ tools/');
      console.log('  ./build.sh -TESLint --max-warnings:8');
      console.log('    Run eslint reporting/check on default directories: src/ tools/ and reduced \'warning\' output');
      console.log('  ./build.sh -TESLint --dirs:tools');
      console.log('    Run eslint reporting/check on directories: tools/ (NOTE: trailing / is added by tooling)');
      console.log('  ./build.sh -TESLint --fix');
      console.log('    Run eslint fix against default directories src/ tools/. Changes can easily be rolled back with the \'git checkout\' operation.');
    }]
  }
});
