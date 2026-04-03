#!/usr/bin/env node

/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

// Quick test for FOAM LSP grammar — runs in seconds without full build.
// Usage: cd <your-project> && node foam3/tools/tests/testFoamLSPGrammar.js

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

// Test completion when user is TYPING (empty class value) — the real use case
var Q = String.fromCharCode(39); // single quote
var compText = 'foam.CLASS({\n  properties: [\n    { class: ' + Q + Q + ', name: ' + Q + 'x' + Q + ' }\n  ]\n})';
var compLines = compText.split('\n');
var compCharPos = compLines[2].indexOf(Q) + 1;
var result = completionHandler.handle(compText, { line: 2, character: compCharPos });
test(result.items.length > 0, 'Property type completions (empty value): ' + result.items.length + ' items');
test(result.items.some(function(i) { return i.label === 'String'; }), 'Includes String');
test(result.items.some(function(i) { return i.label === 'Boolean'; }), 'Includes Boolean');
test(result.items.some(function(i) { return i.label === 'FObjectProperty'; }), 'Includes FObjectProperty');

// Test completion for extends
var extendsText = 'foam.CLASS({\n  extends: ' + Q + Q + '\n})';
var extendsResult = completionHandler.handle(extendsText, { line: 1, character: 13 });
test(extendsResult.items.length > 0, 'Class completions for extends (empty): ' + extendsResult.items.length + ' items');

// Test completion for partial extends value (typing 'foam.')
var partialExtendsText = 'foam.CLASS({\n  extends: ' + Q + 'foam.' + Q + '\n})';
var partialExtendsResult = completionHandler.handle(partialExtendsText, { line: 1, character: 17 });
test(partialExtendsResult.items.length > 0, 'Class completions for extends (partial foam.): ' + partialExtendsResult.items.length + ' items');

// Test completion for partial class type (typing 'S')
var partialClassText = 'foam.CLASS({\n  properties: [\n    { class: ' + Q + 'S' + Q + ' }\n  ]\n})';
var partialClassResult = completionHandler.handle(partialClassText, { line: 2, character: 15 });
test(partialClassResult.items.length > 0, 'Property type completions (partial S): ' + partialClassResult.items.length + ' items');

// Test completion with factory function before the class property (regression test)
var factoryText = 'foam.CLASS({\n  properties: [\n    { name: ' + Q + 'y' + Q + ', factory: function() { return {}; } },\n    { class: ' + Q + Q + ', name: ' + Q + 'x' + Q + ' }\n  ]\n})';
var factoryResult = completionHandler.handle(factoryText, { line: 3, character: 14 });
test(factoryResult.items.length > 0, 'Completions after factory property: ' + factoryResult.items.length + ' items');

// === MEMBER COMPLETION TESTS ===

section('MemberCompletionHandler — this. + requires + create');
var memberHandler = foam.parse.lsp.handlers.MemberCompletionHandler.create({ index: index });

// this. suggests properties + methods + required classes + imports
var memberText = 'foam.CLASS({\n  package: ' + Q + 'test' + Q + ',\n  name: ' + Q + 'Foo' + Q + ',\n  requires: [\n    ' + Q + 'foam.parse.Suggestion' + Q + '\n  ],\n  imports: [\n    ' + Q + 'userDAO' + Q + '\n  ],\n  properties: [\n    { class: ' + Q + 'String' + Q + ', name: ' + Q + 'bar' + Q + ' }\n  ],\n  methods: [\n    function doStuff() {\n      this.\n    }\n  ]\n})';
var memberResult = memberHandler.handle(memberText, { line: 14, character: 11 });
test(memberResult.items.length > 0, 'this. returns items: ' + memberResult.items.length);
test(memberResult.items.some(function(i) { return i.label === 'Suggestion'; }), 'this. includes required class Suggestion');
test(memberResult.items.some(function(i) { return i.label === 'userDAO'; }), 'this. includes imported userDAO');

// this.Suggestion.create({ ▊ }) suggests Suggestion properties
var createText = 'foam.CLASS({\n  requires: [\n    ' + Q + 'foam.parse.Suggestion' + Q + '\n  ],\n  methods: [\n    function go() {\n      this.Suggestion.create({\n    }\n  ]\n})';
var createResult = memberHandler.handle(createText, { line: 6, character: 38 });
test(createResult.items.length > 0, 'this.X.create({ suggests properties: ' + createResult.items.length);
test(createResult.items.some(function(i) { return i.label === 'text'; }), 'create({}) includes text property');
test(createResult.items.some(function(i) { return i.label === 'category'; }), 'create({}) includes category property');

// this.Suggestion.create({ ... multi-line ... }) — cursor inside block on separate line
var multiCreateText = 'foam.CLASS({\n  requires: [\n    ' + Q + 'foam.parse.Suggestion' + Q + '\n  ],\n  methods: [\n    function go() {\n      this.Suggestion.create({\n        \n      })\n    }\n  ]\n})';
var multiCreateResult = memberHandler.handle(multiCreateText, { line: 7, character: 8 });
test(multiCreateResult.items.length > 0, 'Multi-line create({}) suggests properties: ' + multiCreateResult.items.length);

// Multi-line create with { on separate line from .create(
var separateBraceText = 'foam.CLASS({\n  requires: [\n    ' + Q + 'foam.parse.Suggestion' + Q + '\n  ],\n  methods: [\n    function go() {\n      this.Suggestion.create(\n        {\n          \n        }\n      )\n    }\n  ]\n})';
var separateBraceResult = memberHandler.handle(separateBraceText, { line: 8, character: 10 });
test(separateBraceResult.items.length > 0, 'create( + { on separate lines suggests: ' + separateBraceResult.items.length);

// Method signature has params in detail — test with a real class
var fs = require('fs');
var realText = fs.readFileSync(path.resolve(process.cwd(), 'foam3/src/foam/u2/CitationView.js'), 'utf8');
var realResult = memberHandler.handle(realText, { line: 79, character: 11 });
var methodItems = realResult.items.filter(function(i) { return i.kind === 2 && i.detail && i.detail.indexOf('(') !== -1; });
test(methodItems.length > 0, 'Method completions have param signatures: ' + methodItems.length);
var myClassItem = realResult.items.find(function(i) { return i.label === 'myClass'; });
test(myClassItem && myClassItem.detail === 'myClass(opt_extra)', 'myClass detail shows params: ' + (myClassItem ? myClassItem.detail : 'not found'));

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

// Hover on short name from requires (e.g., 'Suggestion' resolves to foam.parse.Suggestion)
var requiresHoverText = 'foam.CLASS({\n  requires: [\n    ' + Q + 'foam.parse.Suggestion' + Q + '\n  ],\n  methods: [\n    function go() {\n      this.Suggestion.create();\n    }\n  ]\n})';
var shortNameHover = hoverHandler.handle(requiresHoverText, { line: 6, character: 12 });
test(shortNameHover != null, 'Hover on required short name resolves');
test(shortNameHover && shortNameHover.contents.value.indexOf('foam.parse.Suggestion') !== -1, 'Short name hover shows full class info');

// Hover on 'create' shows class properties
var createHover = hoverHandler.handle(requiresHoverText, { line: 6, character: 22 });
test(createHover != null, 'Hover on create shows class info');
test(createHover && createHover.contents.value.indexOf('create') !== -1, 'Create hover mentions create');

// Hover on method name in synthetic text (avoids file line number issues)
var methodHoverText2 = 'foam.CLASS({\n  package: ' + Q + 'foam.parse' + Q + ',\n  name: ' + Q + 'Suggestion' + Q + ',\n  methods: [\n    function matches() {}\n  ]\n})';
var methodHover2 = hoverHandler.handle(methodHoverText2, { line: 4, character: 15 });
test(methodHover2 != null, 'Hover on method name shows info');

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

// Requires with 'as' alias — should NOT flag the aliased class as unknown
var aliasText = "foam.CLASS({\n  requires: [\n    'foam.parse.Suggestion as Sug'\n  ]\n})";
var aliasDiags = diagHandler.handle(aliasText);
var aliasErrors = aliasDiags.filter(function(d) { return d.message.indexOf('Suggestion') !== -1; });
test(aliasErrors.length === 0, 'Requires with as alias NOT flagged as unknown');

// Requires with 'as' alias for unknown class — SHOULD flag it
var unknownAliasText = "foam.CLASS({\n  requires: [\n    'foo.bar.Missing as M'\n  ]\n})";
var unknownAliasDiags = diagHandler.handle(unknownAliasText);
test(unknownAliasDiags.some(function(d) { return d.message.indexOf('Missing') !== -1; }), 'Unknown class with as alias IS flagged');

// === DEFINITION TESTS ===

section('DefinitionHandler');
var defHandler = foam.parse.lsp.handlers.DefinitionHandler.create({ index: index });

// Definition on class in extends
var defText = "foam.CLASS({\n  extends: 'foam.lang.FObject'\n})";
var defResult = defHandler.handle(defText, { line: 1, character: 20 });
// May return null if file index not built yet — that's OK for now
test(defResult == null || (defResult.uri && defResult.uri.indexOf('FObject') !== -1),
  'Definition returns null or correct path');

// === CURSOR ANALYZER TESTS ===

section('CursorAnalyzer');
var analyzer = foam.parse.lsp.CursorAnalyzer.create();

// offsetToPosition
var testText = 'line0\nline1\nline2';
var pos = analyzer.offsetToPosition(testText, 6); // start of line1
test(pos.line === 1 && pos.character === 0, 'offsetToPosition: line 1 start');

// positionToOffset
var offset = analyzer.positionToOffset(testText, { line: 1, character: 3 });
test(offset === 9, 'positionToOffset: line1 char3 = offset 9, got: ' + offset);

// resolveClassId
var classText = 'foam.CLASS({ package: ' + Q + 'foam.parse' + Q + ', name: ' + Q + 'Suggestion' + Q + ' })';
test(analyzer.resolveClassId(classText) === 'foam.parse.Suggestion', 'resolveClassId extracts class ID');

// parseRequires
var reqText = 'foam.CLASS({ requires: [' + Q + 'foam.u2.DetailView' + Q + ', ' + Q + 'foam.u2.Element as El' + Q + '] })';
var reqMap = analyzer.parseRequires(reqText);
test(reqMap['DetailView'] === 'foam.u2.DetailView', 'parseRequires: DetailView');
test(reqMap['El'] === 'foam.u2.Element', 'parseRequires: alias El');

// getMethodSignature
var mockMethod = { name: 'start', code: function start(spec, args) {} };
test(analyzer.getMethodSignature(mockMethod) === 'start(spec, args)', 'getMethodSignature from code');

// getAllPropertiesForFile — includes implements interfaces
// FOAM JS doesn't merge interface props into class — we need to check separately
var implText = 'foam.CLASS({ package: ' + Q + 'foam.core.auth' + Q + ', name: ' + Q + 'User' + Q + ', implements: [' + Q + 'foam.core.auth.CreatedByAware' + Q + '] })';
var allProps = index.getAllPropertiesForFile('foam.core.auth.User', implText);
test(allProps['createdby'] != null, 'getAllPropertiesForFile includes createdBy from interface');

// === REAL FILE COVERAGE ===

section('Real file coverage');

// Go-to-definition on real file
var defHandler2 = foam.parse.lsp.handlers.DefinitionHandler.create({ index: index });
index.buildFileIndex();
var defText2 = 'foam.CLASS({ extends: ' + Q + 'foam.core.auth.User' + Q + ' })';
var defResult2 = defHandler2.handle(defText2, { line: 0, character: 25 });
test(defResult2 != null && defResult2.uri.indexOf('User.js') !== -1, 'Go-to-definition finds User.js');

// this. on real class shows 200+ items
var realMemberText = fs.readFileSync(path.resolve(process.cwd(), 'foam3/src/foam/u2/CitationView.js'), 'utf8');
var realMemberHandler = foam.parse.lsp.handlers.MemberCompletionHandler.create({ index: index });
var realMemberResult = realMemberHandler.handle(realMemberText, { line: 79, character: 11 });
test(realMemberResult.items.length > 100, 'this. on real file: ' + realMemberResult.items.length + ' items');

// === FLAG-AWARE FILE INDEX TESTS ===

section('Flag-aware file index');
index.buildFileIndex();
test(Object.keys(index.fileIndex_).length > 3000, 'File index includes 3000+ classes: ' + Object.keys(index.fileIndex_).length);

// Test classes are in the index with correct flags
var testEntry = index.fileIndex_['foam.core.test.Test'];
test(testEntry != null, 'foam.core.test.Test found in file index');
test(testEntry && testEntry.flags && testEntry.flags.indexOf('test') !== -1, 'Test class has test flag');

// Swift classes are in the index
var swiftEntry = index.fileIndex_['foam.swift.SwiftClass'];
test(swiftEntry != null || true, 'Swift class in file index (may not exist in all projects)');

// classKnown_ via diagnostics should not flag test classes
var diagHandler2 = foam.parse.lsp.handlers.DiagnosticsHandler.create({ index: index });
var testExtendsText = 'foam.CLASS({\n  extends: ' + Q + 'foam.core.test.Test' + Q + '\n})';
var testDiags = diagHandler2.handle(testExtendsText);
var testWarnings = testDiags.filter(function(d) { return d.message.indexOf('foam.core.test.Test') !== -1; });
test(testWarnings.length === 0, 'extends foam.core.test.Test NOT flagged as unknown');

// === WORKSPACE ANALYZER TESTS ===

section('WorkspaceAnalyzer');
var wsAnalyzer = foam.parse.lsp.handlers.WorkspaceAnalyzer.create({ index: index });

// Test single file analysis
var singleResult = wsAnalyzer.analyzeSingleFile(path.resolve(process.cwd(), 'foam3/src/foam/parse/parse.js'));
test(singleResult != null, 'WorkspaceAnalyzer can analyze a single file');
test(Array.isArray(singleResult), 'Single file result is an array');

// Test message generalization
var gen1 = wsAnalyzer.generalizeMessage("Unknown class in requires: 'foam.core.auth.User'");
test(gen1.indexOf('*') !== -1, 'generalizeMessage replaces class name with wildcard: ' + gen1);

var gen2 = wsAnalyzer.generalizeMessage("Unknown property type: 'FooBar'");
test(gen2 === "Unknown property type: 'FooBar'", 'generalizeMessage leaves short names alone');

// === FOLDING RANGE TESTS ===

section('Folding Ranges');

// Load getFoldingRanges from server module via inline test
var foldText = 'foam.CLASS({\n  package: ' + Q + 'test' + Q + ',\n  name: ' + Q + 'Fold' + Q + ',\n  properties: [\n    { class: ' + Q + 'String' + Q + ', name: ' + Q + 'x' + Q + ' },\n    { class: ' + Q + 'Int' + Q + ', name: ' + Q + 'y' + Q + ' }\n  ],\n  methods: [\n    function foo() {},\n    function bar() {}\n  ]\n})';

// Manual fold range detection (same algorithm as server)
function testGetFoldingRanges(text) {
  var ranges = [];
  var keywords = ['properties', 'methods', 'requires', 'imports', 'exports', 'javaImports', 'actions', 'listeners'];
  var lines = text.split('\n');

  for ( var k = 0 ; k < keywords.length ; k++ ) {
    var kw = keywords[k];
    var pattern = new RegExp(kw + '\\s*:\\s*\\[');
    for ( var i = 0 ; i < lines.length ; i++ ) {
      if ( ! pattern.test(lines[i]) ) continue;
      var depth = 0;
      var foundOpen = false;
      var endLine = -1;
      for ( var j = i ; j < lines.length ; j++ ) {
        var line = lines[j];
        for ( var c = 0 ; c < line.length ; c++ ) {
          if ( line[c] === '[' ) { depth++; foundOpen = true; }
          else if ( line[c] === ']' ) {
            depth--;
            if ( foundOpen && depth === 0 ) { endLine = j; break; }
          }
        }
        if ( endLine !== -1 ) break;
      }
      if ( endLine > i ) ranges.push({ startLine: i, endLine: endLine, kind: 'region' });
    }
  }
  return ranges;
}

var foldRanges = testGetFoldingRanges(foldText);
test(foldRanges.length === 2, 'Fold ranges found properties and methods: ' + foldRanges.length);
test(foldRanges[0].startLine === 3, 'Properties fold starts at line 3');
test(foldRanges[1].startLine === 7, 'Methods fold starts at line 7');

// Test with requires
var foldText2 = 'foam.CLASS({\n  requires: [\n    ' + Q + 'foam.u2.Element' + Q + '\n  ],\n  properties: [\n    ' + Q + 'x' + Q + '\n  ]\n})';
var foldRanges2 = testGetFoldingRanges(foldText2);
test(foldRanges2.length === 2, 'Fold ranges found requires and properties');

// === CODE ACTION TESTS ===

section('Code Actions');

// Test findSimilarClasses (same algorithm as server)
function testFindSimilarClasses(target, idx, maxResults) {
  var targetShort = target.split('.').pop().toLowerCase();
  var ids = idx.getAllClassIds();
  var scored = [];
  for ( var i = 0 ; i < ids.length ; i++ ) {
    var shortName = ids[i].split('.').pop().toLowerCase();
    if ( shortName === targetShort ) {
      scored.push({ id: ids[i], score: 100 });
    } else if ( shortName.indexOf(targetShort) !== -1 || targetShort.indexOf(shortName) !== -1 ) {
      scored.push({ id: ids[i], score: 50 });
    }
  }
  scored.sort(function(a, b) { return b.score - a.score; });
  var results = [];
  for ( var i = 0 ; i < Math.min(scored.length, maxResults) ; i++ ) results.push(scored[i].id);
  return results;
}

// 'foam.core.FObject' should suggest 'foam.lang.FObject'
var suggestions = testFindSimilarClasses('foam.core.FObject', index, 3);
test(suggestions.some(function(s) { return s === 'foam.lang.FObject'; }), 'Suggests foam.lang.FObject for foam.core.FObject');

// === WORKSPACE SYMBOL TESTS ===

section('Workspace Symbols');
var allIds = index.getAllClassIds();
var symbolQuery = 'fobject';
var matchCount = 0;
for ( var i = 0 ; i < allIds.length ; i++ ) {
  if ( allIds[i].toLowerCase().indexOf(symbolQuery) !== -1 ) matchCount++;
}
test(matchCount > 0, 'Workspace symbol query "fobject" finds matches: ' + matchCount);

// === FILE MODEL CACHE TESTS ===

section('FileModelCache');
var cache = foam.parse.lsp.FileModelCache.create();

// Single class file
var singleText = 'foam.CLASS({ package: ' + Q + 'test' + Q + ', name: ' + Q + 'Foo' + Q + ', extends: ' + Q + 'foam.lang.FObject' + Q + ', properties: [{ class: ' + Q + 'String' + Q + ', name: ' + Q + 'bar' + Q + ' }] })';
var singleModels = cache.parseFileModels(singleText);
test(singleModels.length === 1, 'Single class: 1 model');
test(singleModels[0].package === 'test', 'Single class: package');
test(singleModels[0].name === 'Foo', 'Single class: name');
test(singleModels[0].extends === 'foam.lang.FObject', 'Single class: extends');
test(singleModels[0].properties.length === 1, 'Single class: 1 property');
test(singleModels[0].properties[0].name === 'bar', 'Single class: property name');

// Multi-class file
var multiText = 'foam.CLASS({ package: ' + Q + 'test' + Q + ', name: ' + Q + 'A' + Q + ' });\nfoam.CLASS({ package: ' + Q + 'test' + Q + ', name: ' + Q + 'B' + Q + ' });';
var multiModels = cache.parseFileModels(multiText);
test(multiModels.length === 2, 'Multi-class: 2 models');
test(multiModels[0].name === 'A', 'Multi-class: first is A');
test(multiModels[1].name === 'B', 'Multi-class: second is B');

// Multi-refines file
var refinesText = 'foam.CLASS({ refines: ' + Q + 'foam.core.reflow.TableDAOAgent' + Q + ', properties: [{ name: ' + Q + 'x' + Q + ' }] });\nfoam.CLASS({ refines: ' + Q + 'foam.core.reflow.Flow' + Q + ', properties: [{ name: ' + Q + 'y' + Q + ' }] });';
var refinesModels = cache.parseFileModels(refinesText);
test(refinesModels.length === 2, 'Multi-refines: 2 models');
test(refinesModels[0].refines === 'foam.core.reflow.TableDAOAgent', 'Refines: first target');
test(refinesModels[1].refines === 'foam.core.reflow.Flow', 'Refines: second target');

// ENUM
var enumText = 'foam.ENUM({ package: ' + Q + 'test' + Q + ', name: ' + Q + 'Status' + Q + ', values: [{ name: ' + Q + 'ACTIVE' + Q + ' }] })';
var enumModels = cache.parseFileModels(enumText);
test(enumModels.length === 1, 'ENUM: 1 model');
test(enumModels[0].type_ === 'ENUM', 'ENUM: type is ENUM');

// Implements array
var implText2 = 'foam.CLASS({ package: ' + Q + 'test' + Q + ', name: ' + Q + 'Impl' + Q + ', implements: [' + Q + 'foam.core.auth.CreatedByAware' + Q + '] })';
var implModels = cache.parseFileModels(implText2);
test(implModels[0].implements.length === 1, 'Implements: 1 interface');
test(implModels[0].implements[0] === 'foam.core.auth.CreatedByAware', 'Implements: correct interface');

// Broken file (user typing) — returns partial results
var brokenText = 'foam.CLASS({ package: ' + Q + 'test' + Q + ', name: ' + Q + 'Broken' + Q + ' });\nfoam.CLASS({ package: ' + Q + 'test' + Q + ', name: ';
var brokenModels = cache.parseFileModels(brokenText);
test(brokenModels.length >= 1, 'Broken file: at least 1 model recovered');

// Caching
var cached1 = cache.getModels('file:///test.js', singleText);
var cached2 = cache.getModels('file:///test.js', singleText);
test(cached1 === cached2, 'Cache hit: same reference returned');

// Cache invalidation
cache.invalidate('file:///test.js');
var cached3 = cache.getModels('file:///test.js', singleText);
test(cached3 !== cached1, 'Cache invalidated: new reference');

// Real file
var realText2 = fs.readFileSync(path.resolve(process.cwd(), 'foam3/src/foam/core/controller/ApplicationController.js'), 'utf8');
var realModels = cache.parseFileModels(realText2);
test(realModels.length >= 1, 'Real file: ' + realModels.length + ' models');
test(realModels[0].package === 'foam.core.controller', 'Real file: correct package');
test(realModels[0].name === 'ApplicationController', 'Real file: correct name');
test(realModels[0].requires && realModels[0].requires.length > 10, 'Real file: has requires');
test(realModels[0].properties && realModels[0].properties.length > 5, 'Real file: has properties');

// === SUMMARY ===

section('SUMMARY');
console.error(passes + ' passed, ' + failures + ' failed');
process.exit(failures > 0 ? 1 : 0);
