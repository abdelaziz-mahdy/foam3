#!/usr/bin/env node
/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */
// 
// POM Make - POM Specific Build Tool
//
// Recursively traverses POMs applying specified makers.
//
// Uses the Visitor design pattern, with Makers actually being visitors.
//
// Standard Makers Include:
//
//   CopyMaker    : copy from source to target directory. source/* -> target/
//   DocMaker     : copies .flow files into /build/documents
//   EnvMaker     : capture pom environment variables
//   JavaMaker    : generates .java files from .js models
//   JavacMaker   : create /build/javacfiles file containing list of modified or static .java files, call javac
//   JournalMaker : copies .jrl files into /build/journals
//   JsMaker      : create a minified foam-bin.js file
//   MavenMaker   : build a Maven pom.xml from javaDependencies, call maven if pom.xml updated
//   TaskMaker    : capture pom tasks for later execution when same named build task is run.
//   VerboseMaker : print out information about POMs and files visited

const startTime = Date.now();

const fs_   = require('fs');
const path_ = require('path');
const b_    = require('./buildlib');

var pmake = function(...args) {
  // TODO: new version of processArgs which takes a map
  var [argv, X, flags] = require('./processArgs')( 
    args,
    {
      d:           './build/classes',
      builddir:    './build',
      pom:         'pom',
      makers:      '', // TODO: doc, swift,
      path:        './'
    },
    {
      // TODO: it would be better if the Makers specified if they needed files loaded or not
      loadFiles:   true,   // controls if individual .js files are loaded or not
      verbose:     false   // print extra status information
    },
    {
      usage: function() {
        // Include list of available Makers in 'usage' output.
        // TODO: load from dir where pmake is also
        var files = fs_.readdirSync('.');

        console.log('\nMakers:');
        files.forEach(f => {
          if ( f.endsWith('Maker.js') ) {
            var maker = require('./' + f.substring(0, f.length-3));
            console.log('  ' + f.substring(0, f.length-8).padEnd(14, ' '), maker.description || '');
            ( maker.args || []).forEach(a => {
              var desc = a.description || '';
              var def  = a.value ? ( ( desc ? ', ' : '' ) + 'default: ' + a.value ) : '';
              console.log('     ' + a.name.padEnd(12, ' ') + desc + def);
            });
          }
        });
      }
    }
  );

  var SUPER_X        = Object.assign({}, globalThis.X);
  globalThis.X       = X;
  var SUPER_FLAGS    = Object.assign({}, globalThis.flags);
  globalThis.flags   = flags;
  globalThis.verbose = function verbose() { if ( flags.verbose ) console.log.apply(console, arguments); };

  /** 'makers' format: task1,task2,task3(args),... where args are optional **/
  var makers = X.makers.split(',').map(m => {
    var maker;
    var [_, makerName, _, makerArgs] = m.match(/([a-zA-Z0-9]*)(\((.*)\))?/);

    var loc = path_.join(__dirname, X.path, makerName + "Maker.js");

    if (!fs_.existsSync(loc)) {
      loc = path_.join(process.cwd(), x.path, makerName + "Maker.js");
    }
    maker = require(loc);
    if ( maker ) maker.name = m;
    if ( maker && maker.init ) maker.init(makerArgs);

    return maker;
  });

  function processDir(pom, location, skipIfHasPOM) {
    verbose('\tdirectory:', location);
    var files = fs_.readdirSync(location, {withFileTypes: true});

    if ( skipIfHasPOM && files.find(f => f.name.endsWith('pom.js')) ) {
      return;
    }

    files.forEach(f => {
      var fn = location + '/' + f.name;
      if ( f.isDirectory() ) {
        if ( ! f.name.startsWith('.') ) {
          if ( f.name.endsWith('build') || f.name.endsWith('build2') ) return;
          if ( f.name.indexOf('android') != -1 ) return;
          if ( f.name.indexOf('examples') != -1 ) return;
          if ( ! b_.isExcluded(pom, fn) ) processDir(pom, fn, true);
        }
        makers.forEach(v => v.visitDir && v.visitDir(pom, f, fn));
      } else {
        makers.forEach(v => v.visitFile && v.visitFile(pom, f, fn));
      }
    });
  }

  var SUPER_POM = foam.POM;
  try {
    var seen = {};

    foam.POM = function(pom) {
      if ( seen[foam.sourceFile] ) {
        return;
      }
      seen[foam.sourceFile] = true;

      pom.location = foam.cwd;
      pom.path     = foam.sourceFile;

      makers.forEach(v => {
        // verbose('[RMAKE] visitPOM', v.name, pom);
        v.visitPOM && v.visitPOM(pom);
      });
      if ( ! seen[foam.cwd] ) {
        // verbose('[RMAKE] procesDir', pom.path );
        processDir(pom, foam.cwd, false, makers);
        seen[foam.cwd] = true;
      }

      SUPER_POM(pom);
      makers.forEach(v => v.endVisitPOM && v.endVisitPOM(pom));
    };

    // Speeds up Makers like Verbose and JS which don't need to load .js model files.
    if ( ! flags.loadFiles ) foam.loadFiles = function() {};

    X.pom.split(',').forEach(pom => {
      try {
        var path = path_.resolve(foam.cwd, pom) + '.js';
        foam.require(pom, false, true);
        // REVIEW: delete not working from here, see foam_node.js
        // delete require.cache[require.resolve(path)];
      } catch (e) {
        console.error('Unable to load POM: ' + pom);
        console.error(e);
        console.trace();
        process.exit(-1);
      }
    });

    makers.forEach(v => v.end && v.end());

  } finally {
    // reset global variables for next run
    foam.POM = SUPER_POM;

    globalThis.X       = Object.assign(globalThis.X, SUPER_X);
    globalThis.flags   = Object.assign(globalThis.flags, SUPER_FLAGS);
  }
}

module.exports = pmake;
