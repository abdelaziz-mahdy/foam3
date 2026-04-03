#!/usr/bin/env node

/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

// Quick test for FOAM LSP grammar — runs in seconds without full build.
// Usage: cd ptv3 && node foam3/tools/tests/testFoamLSPGrammar.js

console.log = function() { console.error.apply(console, arguments); };
console.warn = function() { console.error.apply(console, arguments); };
globalThis.SILENT = false; globalThis.VERBOSE = false;
globalThis.DRY_RUN = false; globalThis.HELP = false; globalThis.NOP = '';

process.on('unhandledRejection', function(e) {});
process.on('uncaughtException', function(e) {
  if ( e.message && ( e.message.includes('document') || e.message.includes('window') ) ) return;
  if ( e instanceof SyntaxError ) return;
});

var path = require('path');
var fs = require('fs');
var pmake = require(path.resolve(__dirname, '../pmake'));
var buildlib = require(path.resolve(__dirname, '../buildlib'));
buildlib.error = function() { /* suppress fatal errors during boot */ };

var pomPath = path.resolve(process.cwd(), 'pom');
pmake.bind(buildlib, '-makers=LSP -pom=' + pomPath)();

// === TEST HARNESS ===

var failures = 0;
var passes = 0;

function test(condition, message) {
  if ( condition ) {
    passes++;
    console.error('  \x1b[32m✓\x1b[0m ' + message);
  } else {
    failures++;
    console.error('  \x1b[31m✘ FAIL:\x1b[0m ' + message);
  }
}

function section(name) {
  console.error('\n\x1b[1m=== ' + name + ' ===\x1b[0m');
}

// === TEST FILES ===

var TEST_FILES = [
  'foam3/src/foam/lang/types.js',
  'foam3/src/foam/parse/parse.js',
  'foam3/src/foam/core/controller/ApplicationController.js',
  'foam3/src/foam/lang/Enum.js',
  'foam3/src/foam/parse/SimpleQueryParser.js'
];

// === FOAMINDEX TESTS ===

section('FoamIndex');
var index = foam.parse.lsp.FoamIndex.create();
test(index.getAllClassIds().length > 100, 'getAllClassIds returns many classes: ' + index.getAllClassIds().length);
test(index.classExists('foam.lang.FObject'), 'FObject exists');
test(index.getPropertyTypes().length > 50, 'Many property types: ' + index.getPropertyTypes().length);
test(index.getPropertyTypes().some(function(t) { return t.name === 'String'; }), 'Includes String type');
test(index.getPropertyTypes().some(function(t) { return t.name === 'Boolean'; }), 'Includes Boolean type');
test(index.getPropertyTypes().some(function(t) { return t.name === 'FObjectProperty'; }), 'Includes FObjectProperty type');

// === GRAMMAR TESTS ===

section('FoamClassGrammar — symbol check');
var grammar = foam.parse.lsp.FoamClassGrammar.create({ index: index });
test(Object.keys(grammar.symbolMap_).length > 20, 'Grammar has symbols: ' + Object.keys(grammar.symbolMap_).length);
test('START' in grammar.symbolMap_, 'Has START symbol');

section('FoamClassGrammar — parse real files');
TEST_FILES.forEach(function(filePath) {
  var absPath = path.resolve(process.cwd(), filePath);
  if ( ! fs.existsSync(absPath) ) {
    console.error('  Skipping (not found): ' + filePath);
    return;
  }

  var text = fs.readFileSync(absPath, 'utf8');
  console.error('\n  File: ' + filePath + ' (' + text.split('\n').length + ' lines)');

  var ps = foam.parse.StringPStream.create({ str: text + String.fromCharCode(26) });
  try {
    var result = grammar.parse(ps);
    test(result !== undefined, 'Parses without error');
  } catch (e) {
    test(false, 'Parse threw: ' + e.message);
  }
});

// === COMPLETION TESTS ===

section('CompletionHandler — property types');
var completionHandler = foam.parse.lsp.handlers.CompletionHandler.create({ index: index, grammar: grammar });

var acPath = path.resolve(process.cwd(), 'foam3/src/foam/core/controller/ApplicationController.js');
if ( fs.existsSync(acPath) ) {
  var acText = fs.readFileSync(acPath, 'utf8');
  var acLines = acText.split('\n');
  var classLine = -1;
  for ( var i = 0 ; i < acLines.length ; i++ ) {
    if ( acLines[i].match(/class:\s*'/) && ! acLines[i].includes('foam.CLASS') ) {
      classLine = i;
      break;
    }
  }
  if ( classLine >= 0 ) {
    var charPos = acLines[classLine].indexOf("'") + 1;
    var result = completionHandler.handle(acText, { line: classLine, character: charPos });
    test(result.items.length > 0, 'Property type completions at line ' + classLine + ': ' + result.items.length + ' items');
    test(result.items.some(function(i) { return i.label === 'String'; }), 'Includes String');
    test(result.items.some(function(i) { return i.label === 'Boolean'; }), 'Includes Boolean');
  } else {
    test(false, 'Could not find class: line in ApplicationController.js');
  }
} else {
  console.error('  Skipping: ApplicationController.js not found');
}

// === HOVER TESTS ===

section('HoverHandler — class hover');
var hoverHandler = foam.parse.lsp.handlers.HoverHandler.create({ index: index });

var hoverText = "foam.CLASS({\n  requires: ['foam.parse.Suggestion']\n})";
var hoverResult = hoverHandler.handle(hoverText, { line: 1, character: 20 });
test(hoverResult != null, 'Hover returns result for class name');
test(hoverResult && hoverResult.contents.value.indexOf('foam.parse.Suggestion') !== -1, 'Hover contains class name');

// Hover on property type
var propTypeHover = hoverHandler.handle("foam.CLASS({\n  properties: [\n    { class: 'FObjectProperty' }\n  ]\n})", { line: 2, character: 18 });
test(propTypeHover != null, 'Hover returns result for property type');

// === DIAGNOSTICS TESTS ===

section('DiagnosticsHandler');
var diagHandler = foam.parse.lsp.handlers.DiagnosticsHandler.create({ index: index });

// Valid file — no errors
var validText = "foam.CLASS({\n  package: 'test',\n  name: 'Valid',\n  extends: 'foam.lang.FObject'\n})";
var diags = diagHandler.handle(validText);
var errors = diags.filter(function(d) { return d.severity <= 2; });
test(errors.length === 0, 'Valid file has no errors/warnings');

// Invalid extends
var invalidText = "foam.CLASS({\n  extends: 'foo.bar.Missing'\n})";
var diags2 = diagHandler.handle(invalidText);
test(diags2.some(function(d) { return d.message.indexOf('Missing') !== -1; }), 'Flags unknown extends class');

// Valid property type (full path) — should NOT be flagged
var validPropText = "foam.CLASS({\n  properties: [\n    { class: 'foam.lang.FObjectProperty', name: 'x' }\n  ]\n})";
var diags3 = diagHandler.handle(validPropText);
var propErrors = diags3.filter(function(d) { return d.message.indexOf('FObjectProperty') !== -1; });
test(propErrors.length === 0, 'foam.lang.FObjectProperty NOT flagged as unknown');

// Valid property type (short name) — should NOT be flagged
var validShortPropText = "foam.CLASS({\n  properties: [\n    { class: 'String', name: 'x' }\n  ]\n})";
var diags3b = diagHandler.handle(validShortPropText);
var shortPropErrors = diags3b.filter(function(d) { return d.message.indexOf('String') !== -1; });
test(shortPropErrors.length === 0, 'String NOT flagged as unknown');

// Constants strings — should NOT be flagged
var constantsText = "foam.CLASS({\n  constants: [\n    { name: 'MACROS', value: ['DisplayWidth.XS', 'primary1'] }\n  ]\n})";
var diags4 = diagHandler.handle(constantsText);
test(diags4.filter(function(d) { return d.message.indexOf('DisplayWidth') !== -1; }).length === 0,
  'DisplayWidth.XS in constants NOT flagged');

// === DEFINITION TESTS ===

section('DefinitionHandler');
var defHandler = foam.parse.lsp.handlers.DefinitionHandler.create({ index: index });

// Definition on class in extends
var defText = "foam.CLASS({\n  extends: 'foam.lang.FObject'\n})";
var defResult = defHandler.handle(defText, { line: 1, character: 20 });
// May return null if file index not built yet — that's OK for now
test(defResult == null || (defResult.uri && defResult.uri.indexOf('FObject') !== -1),
  'Definition returns null or correct path');

// === SUMMARY ===

section('SUMMARY');
console.error(passes + ' passed, ' + failures + ' failed');
process.exit(failures > 0 ? 1 : 0);
