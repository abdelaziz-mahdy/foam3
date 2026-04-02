/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.parse.lsp.test',
  name: 'HandlersTest',
  extends: 'foam.core.test.JSTest',

  methods: [
    async function runTest(x) {
      await this.testCompletionHandler(x);
      await this.testHoverHandler(x);
      await this.testDefinitionHandler(x);
      await this.testDiagnosticsHandler(x);
      await this.testSymbolHandler(x);
      await this.testMemberCompletionHandler(x);
    },

    // ========== CompletionHandler ==========

    async function testCompletionHandler(x) {
      var handler = foam.parse.lsp.handlers.CompletionHandler.create();

      // Completing property class: '
      var result = handler.handle(
        "foam.CLASS({\n  properties: [\n    { class: '",
        { line: 2, character: 14 }
      );
      x.test(result.items.length > 0, 'Completion: should return property type completions');
      x.test(
        result.items.some(function(i) { return i.label === 'String'; }),
        'Completion: should suggest String'
      );
      x.test(
        result.items.some(function(i) { return i.label === 'Long'; }),
        'Completion: should suggest Long'
      );

      // Completing extends: '
      var result2 = handler.handle(
        "foam.CLASS({\n  extends: '",
        { line: 1, character: 13 }
      );
      x.test(result2.items.length > 0, 'Completion: should return class completions for extends');

      // No completions in plain JS
      var result3 = handler.handle(
        "var x = 42;\nfunction foo() {}",
        { line: 0, character: 5 }
      );
      x.test(result3.items.length === 0, 'Completion: should not suggest in plain JS');
    },

    // ========== HoverHandler ==========

    async function testHoverHandler(x) {
      var handler = foam.parse.lsp.handlers.HoverHandler.create();

      // Hover over a class name in extends
      var result = handler.handle(
        "foam.CLASS({\n  extends: 'foam.parse.Suggestion'\n})",
        { line: 1, character: 20 }
      );
      x.test(result != null, 'Hover: should return hover for class in extends');
      x.test(
        result.contents.value.indexOf('foam.parse.Suggestion') !== -1,
        'Hover: should contain class name'
      );

      // Hover over non-FOAM text
      var result2 = handler.handle(
        "var x = 42;",
        { line: 0, character: 5 }
      );
      x.test(result2 == null, 'Hover: should return null for non-FOAM file');
    },

    // ========== DefinitionHandler ==========

    async function testDefinitionHandler(x) {
      var handler = foam.parse.lsp.handlers.DefinitionHandler.create();

      // Go-to-definition on extends class
      var result = handler.handle(
        "foam.CLASS({\n  extends: 'foam.parse.Suggestion'\n})",
        { line: 1, character: 20 }
      );
      // Source location may be null depending on build environment
      x.test(
        result == null || (result.uri && result.uri.indexOf('parse') !== -1),
        'Definition: URI should point to parse directory or be null'
      );

      // No definition in plain JS
      var result3 = handler.handle(
        "var x = 42;",
        { line: 0, character: 5 }
      );
      x.test(result3 == null, 'Definition: should return null for non-FOAM file');

      // No definition for unknown class
      var result4 = handler.handle(
        "foam.CLASS({\n  extends: 'foo.bar.Nonexistent'\n})",
        { line: 1, character: 20 }
      );
      x.test(result4 == null, 'Definition: should return null for unknown class');
    },

    // ========== DiagnosticsHandler ==========

    async function testDiagnosticsHandler(x) {
      var handler = foam.parse.lsp.handlers.DiagnosticsHandler.create();

      // Valid class -- no errors
      var result = handler.handle(
        "foam.CLASS({\n  package: 'test',\n  name: 'Valid',\n  extends: 'foam.lang.FObject'\n})"
      );
      var errors = result.filter(function(d) { return d.severity === 1; });
      x.test(errors.length === 0, 'Diagnostics: valid class should have no errors');

      // Unknown extends class -- should flag error
      var result2 = handler.handle(
        "foam.CLASS({\n  package: 'test',\n  name: 'Bad',\n  extends: 'foo.bar.Nonexistent'\n})"
      );
      x.test(
        result2.some(function(d) { return d.message.indexOf('Nonexistent') !== -1 || d.message.indexOf('foo.bar') !== -1; }),
        'Diagnostics: should flag unknown class in extends'
      );

      // No diagnostics for non-FOAM file
      var result3 = handler.handle("var x = 42;");
      x.test(result3.length === 0, 'Diagnostics: non-FOAM file should have no diagnostics');
    },

    // ========== SymbolHandler ==========

    async function testSymbolHandler(x) {
      var handler = foam.parse.lsp.handlers.SymbolHandler.create();

      var text = "foam.CLASS({\n  package: 'test',\n  name: 'MyModel',\n  properties: [\n    { class: 'String', name: 'firstName' },\n    'lastName'\n  ],\n  methods: [\n    function greet() { return 'hello'; }\n  ]\n})";

      var result = handler.handle(text);
      x.test(result.length > 0, 'Symbol: should return document symbols');

      // Check for class symbol
      x.test(
        result.some(function(s) { return s.name === 'test.MyModel' && s.kind === 5; }),
        'Symbol: should have class symbol'
      );

      // Check for property symbols
      x.test(
        result.some(function(s) { return s.name === 'firstName'; }),
        'Symbol: should have firstName property symbol'
      );
      x.test(
        result.some(function(s) { return s.name === 'lastName'; }),
        'Symbol: should have lastName property symbol'
      );

      // Check for method symbols
      x.test(
        result.some(function(s) { return s.name === 'greet' && s.kind === 6; }),
        'Symbol: should have greet method symbol'
      );

      // Non-FOAM file
      var result2 = handler.handle("var x = 42;");
      x.test(result2.length === 0, 'Symbol: non-FOAM file should have no symbols');
    },

    // ========== MemberCompletionHandler ==========

    async function testMemberCompletionHandler(x) {
      // Register a test class
      foam.CLASS({
        package: 'foam.parse.lsp.test',
        name: 'MemberTestModel',
        properties: [
          { class: 'String', name: 'firstName' },
          { class: 'Int', name: 'age' }
        ],
        methods: [
          function greet() { return 'hello'; }
        ]
      });

      var handler = foam.parse.lsp.handlers.MemberCompletionHandler.create();

      // this. inside a method of the test class
      var text = "foam.CLASS({\n  package: 'foam.parse.lsp.test',\n  name: 'MemberTestModel',\n  methods: [\n    function doSomething() {\n      this.\n    }\n  ]\n})";
      var result = handler.handle(text, { line: 5, character: 11 });

      x.test(result.items.length > 0, 'Member: should return member completions');
      x.test(
        result.items.some(function(i) { return i.label === 'firstName'; }),
        'Member: should suggest firstName property'
      );
      x.test(
        result.items.some(function(i) { return i.label === 'age'; }),
        'Member: should suggest age property'
      );
      x.test(
        result.items.some(function(i) { return i.label === 'greet'; }),
        'Member: should suggest greet method'
      );

      // Non-FOAM file
      var result2 = handler.handle("var x = this.", { line: 0, character: 13 });
      x.test(result2.items.length === 0, 'Member: should not suggest in non-FOAM file');
    }
  ]
});
