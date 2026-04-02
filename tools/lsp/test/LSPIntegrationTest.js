/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.parse.lsp.test',
  name: 'LSPIntegrationTest',
  extends: 'foam.core.test.JSTest',

  methods: [
    async function runTest(x) {
      // Test the full request/response cycle without spawning a process.
      // We test the end-to-end handler chain directly.

      var index   = foam.parse.lsp.FoamIndex.create();
      var grammar = foam.parse.lsp.FoamClassGrammar.create({ index: index });

      var completionHandler  = foam.parse.lsp.handlers.CompletionHandler.create({ index: index, grammar: grammar });
      var hoverHandler       = foam.parse.lsp.handlers.HoverHandler.create({ index: index });
      var definitionHandler  = foam.parse.lsp.handlers.DefinitionHandler.create({ index: index });
      var diagnosticsHandler = foam.parse.lsp.handlers.DiagnosticsHandler.create({ index: index });
      var symbolHandler      = foam.parse.lsp.handlers.SymbolHandler.create();
      var memberHandler      = foam.parse.lsp.handlers.MemberCompletionHandler.create({ index: index });

      var testFile = "foam.CLASS({\n  package: 'test.integration',\n  name: 'TestModel',\n  extends: 'foam.lang.FObject',\n  properties: [\n    { class: 'String', name: 'firstName' },\n    'lastName'\n  ],\n  methods: [\n    function greet() {\n      this.\n      return 'hello';\n    }\n  ]\n})";

      // Completion: property type
      var c1 = completionHandler.handle(
        "foam.CLASS({\n  properties: [\n    { class: '",
        { line: 2, character: 14 }
      );
      x.test(c1.items.length > 5, 'Integration: completion returns property types');

      // Hover: class in extends
      var h1 = hoverHandler.handle(testFile, { line: 3, character: 20 });
      x.test(h1 != null, 'Integration: hover returns info for FObject');

      // Definition: extends class
      var d1 = definitionHandler.handle(testFile, { line: 3, character: 20 });
      x.test(d1 != null, 'Integration: definition returns location for FObject');

      // Diagnostics: valid file
      var diag1 = diagnosticsHandler.handle(testFile);
      var errors = diag1.filter(function(d) { return d.severity === 1; });
      x.test(errors.length === 0, 'Integration: valid file has no errors');

      // Symbols: outline
      var s1 = symbolHandler.handle(testFile);
      x.test(s1.length >= 3, 'Integration: symbols include class + properties + methods');

      // Member completion: this.
      var m1 = memberHandler.handle(testFile, { line: 10, character: 11 });
      x.test(m1.items.length > 0, 'Integration: member completion returns items');
    }
  ]
});
