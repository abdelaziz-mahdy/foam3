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
      await this.testSemanticTokenHandler(x);
      await this.testCSSCompletion(x);
      await this.testCSSHover(x);
      await this.testCSSDiagnostics(x);
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
    },

    // ========== SemanticTokenHandler ==========

    async function testSemanticTokenHandler(x) {
      var handler = foam.parse.lsp.handlers.SemanticTokenHandler.create({
        typeTracker: foam.parse.lsp.TypeTracker.create()
      });

      // Build a test FOAM class with requires, a property, and a method
      var text = [
        "foam.CLASS({",
        "  package: 'test.semantic',",
        "  name: 'TokenTest',",
        "  requires: [",
        "    'foam.core.notification.Notification',",       // line 4: 'notification' inside string
        "    'foam.u2.dialog.ToastState'",
        "  ],",
        "  properties: [",
        "    { class: 'String', name: 'notificationSub' }", // line 8
        "  ],",
        "  methods: [",
        "    function doStuff() {",                          // line 11
        "      var notification = this.Notification.create();", // line 12
        "      notification.userId = 1;",                   // line 13
        "      this.notificationSub = 'test';",             // line 14
        "    }",
        "  ]",
        "})"
      ].join('\n');

      var result = handler.handle(text, 'test://scope');
      var decoded = this.decodeSemanticTokens(result.data);

      // The word 'notification' (12 chars) on line 4 inside the requires string
      // should NOT have a semantic token — it's inside a structural range + string literal
      var line4Hits = decoded.filter(function(t) {
        return t.line === 4 && t.length === 12;
      });
      x.test(
        line4Hits.length === 0,
        'Semantic: "notification" inside requires string should NOT be highlighted'
      );

      // this.Notification on line 12 should be highlighted as type (token type 0)
      var thisNotifHits = decoded.filter(function(t) {
        return t.line === 12 && t.type === 0 && t.length === 12;
      });
      x.test(
        thisNotifHits.length > 0,
        'Semantic: this.Notification on line 12 should be highlighted as type (0)'
      );

      // this.notificationSub on line 14 should be highlighted as property (token type 2)
      var thisPropHits = decoded.filter(function(t) {
        return t.line === 14 && t.type === 2 && t.length === 15;
      });
      x.test(
        thisPropHits.length > 0,
        'Semantic: this.notificationSub on line 14 should be highlighted as property'
      );

      // notification usage on line 13 (inside code, not string) should be highlighted
      // as typed variable usage (type 2, modifiers 2 = readonly)
      var usageHits = decoded.filter(function(t) {
        return t.line === 13 && t.type === 2 && t.length === 12;
      });
      x.test(
        usageHits.length > 0,
        'Semantic: "notification" usage on line 13 should be highlighted as typed variable'
      );

      // --- CSS semantic tokens ---
      var cssResolver = foam.parse.lsp.CSSTokenResolver.create();
      cssResolver.loadFromRegistry();

      var cssHandler = foam.parse.lsp.handlers.SemanticTokenHandler.create({
        typeTracker: foam.parse.lsp.TypeTracker.create(),
        cssTokenResolver: cssResolver
      });

      var cssText = [
        "foam.CLASS({",
        "  package: 'test.css',",
        "  name: 'CSSTokenModel',",
        "  css: `",
        "    ^ { color: $primary400; }",
        "    ^toolbar { background: $backgroundDefault; }",
        "  `",
        "})"
      ].join('\n');

      var cssResult = cssHandler.handle(cssText, 'test://css-tokens');
      var cssDecoded = this.decodeSemanticTokens(cssResult.data);

      // $primary400 should get variable token (type 2)
      var primaryHits = cssDecoded.filter(function(t) {
        return t.type === 2 && t.length === '$primary400'.length;
      });
      x.test(
        primaryHits.length > 0,
        'Semantic CSS: $primary400 should be highlighted as variable (type 2)'
      );

      // ^toolbar should get type token (type 0)
      var toolbarHits = cssDecoded.filter(function(t) {
        return t.type === 0 && t.length === '^toolbar'.length;
      });
      x.test(
        toolbarHits.length > 0,
        'Semantic CSS: ^toolbar should be highlighted as type (type 0)'
      );

      // Test richer CSS highlighting: property names, values, comments, numbers
      var richCSSText = [
        "foam.CLASS({",
        "  package: 'test.css',",
        "  name: 'RichCSS',",
        "  css: `",
        "    /* Step section styling */",
        "    ^step-section {",
        "      display: flex;",
        "      gap: 1rem;",
        "      cursor: not-allowed;",
        "      color: $textSecondary;",
        "    }",
        "  `",
        "})"
      ].join('\n');

      var richResult = cssHandler.handle(richCSSText, 'test://rich-css');
      var richDecoded = this.decodeSemanticTokens(richResult.data);

      // Comment on line 4 should be highlighted (type 5)
      var commentHits = richDecoded.filter(function(t) { return t.line === 4 && t.type === 5; });
      x.test(commentHits.length > 0, 'Semantic CSS: comment should be highlighted (type 5)');

      // 'display' on line 6 should be keyword (type 3)
      var displayHits = richDecoded.filter(function(t) { return t.line === 6 && t.type === 3; });
      x.test(displayHits.length > 0, 'Semantic CSS: "display" property should be keyword (type 3)');

      // 'flex' on line 6 should be string/value (type 4)
      var flexHits = richDecoded.filter(function(t) { return t.line === 6 && t.type === 4; });
      x.test(flexHits.length > 0, 'Semantic CSS: "flex" value should be string (type 4)');

      // '1rem' on line 7 should be number (type 6)
      var remHits = richDecoded.filter(function(t) { return t.line === 7 && t.type === 6; });
      x.test(remHits.length > 0, 'Semantic CSS: "1rem" should be number (type 6)');

      // 'not-allowed' on line 8 should be string/value (type 4)
      var notAllowedHits = richDecoded.filter(function(t) { return t.line === 8 && t.type === 4; });
      x.test(notAllowedHits.length > 0, 'Semantic CSS: "not-allowed" value should be string (type 4)');

      // $textSecondary on line 9 should be variable (type 2)
      var textSecHits = richDecoded.filter(function(t) { return t.line === 9 && t.type === 2; });
      x.test(textSecHits.length > 0, 'Semantic CSS: $textSecondary should be variable (type 2)');
    },

    // ========== CSSCompletion ==========

    async function testCSSCompletion(x) {
      var resolver = foam.parse.lsp.CSSTokenResolver.create();
      resolver.loadFromRegistry();

      var handler = foam.parse.lsp.handlers.CompletionHandler.create({
        cssTokenResolver: resolver
      });

      // Inside a css block with $ at cursor — should suggest tokens
      var cssText = "foam.CLASS({\n  package: 'test',\n  name: 'CSSComp',\n  css: `\n    ^ { color: $\n  `\n})";
      var result = handler.handle(cssText, { line: 4, character: 17 });
      x.test(result.items.length > 0, 'CSSCompletion: should return CSS token items for $ in css block');
      x.test(
        result.items.some(function(i) { return i.label === 'primary400'; }),
        'CSSCompletion: should suggest primary400'
      );
      x.test(
        result.items.some(function(i) { return i.label === 'textDefault'; }),
        'CSSCompletion: should suggest textDefault'
      );

      // Outside css block — property name with $ should NOT suggest CSS tokens
      var nonCSSText = "foam.CLASS({\n  package: 'test',\n  name: 'NoCSSComp',\n  properties: [\n    { class: 'String', name: '$\n  ]\n})";
      var result2 = handler.handle(nonCSSText, { line: 4, character: 33 });
      x.test(
        ! result2.items.some(function(i) { return i.label === 'primary400'; }),
        'CSSCompletion: should NOT suggest CSS tokens outside css block'
      );

      // CSS property value completion: "outline: " → should suggest 'none'
      var valueText = [
        "foam.CLASS({",
        "  package: 'test',",
        "  name: 'CSSValComp',",
        "  css: `",
        "    ^ { outline: ",
        "  `",
        "})"
      ].join('\n');
      var valResult = handler.handle(valueText, { line: 4, character: 17 });
      x.test(valResult.items.length > 0, 'CSSCompletion: should return value suggestions after "outline: "');
      x.test(
        valResult.items.some(function(i) { return i.label === 'none'; }),
        'CSSCompletion: should suggest "none" for outline'
      );
      x.test(
        valResult.items.some(function(i) { return i.label === 'inherit'; }),
        'CSSCompletion: should suggest "inherit" as common value'
      );

      // CSS property value completion: "cursor: no" → should suggest 'not-allowed'
      var cursorText = [
        "foam.CLASS({",
        "  package: 'test',",
        "  name: 'CSSCurComp',",
        "  css: `",
        "    ^ { cursor: no",
        "  `",
        "})"
      ].join('\n');
      var curResult = handler.handle(cursorText, { line: 4, character: 18 });
      x.test(
        curResult.items.some(function(i) { return i.label === 'not-allowed'; }),
        'CSSCompletion: should suggest "not-allowed" for "cursor: no" partial'
      );

      // CSS property name completion on empty indented line
      var propText = [
        "foam.CLASS({",
        "  package: 'test',",
        "  name: 'CSSPropComp',",
        "  css: `",
        "    ^ {",
        "      ",
        "    }",
        "  `",
        "})"
      ].join('\n');
      var propResult = handler.handle(propText, { line: 5, character: 6 });
      x.test(propResult.items.length > 0, 'CSSCompletion: should return property names on empty line');
      x.test(
        propResult.items.some(function(i) { return i.label === 'display'; }),
        'CSSCompletion: should suggest "display" as CSS property'
      );
      x.test(
        propResult.items.some(function(i) { return i.label === 'cursor'; }),
        'CSSCompletion: should suggest "cursor" as CSS property'
      );
      x.test(
        propResult.items.some(function(i) { return i.insertText === 'display: '; }),
        'CSSCompletion: property insertText should include ": " suffix'
      );
    },

    // ========== CSSHover ==========

    async function testCSSHover(x) {
      var resolver = foam.parse.lsp.CSSTokenResolver.create();
      resolver.loadFromRegistry();

      var handler = foam.parse.lsp.handlers.HoverHandler.create({
        cssTokenResolver: resolver
      });

      var cssText = "foam.CLASS({\n  package: 'test',\n  name: 'CSSHov',\n  css: `\n    ^ { color: $primary400; }\n    ^toolbar { background: $backgroundDefault; }\n  `\n})";

      // Hover on $primary400 (line 4, character ~18 inside the token name)
      var result = handler.handle(cssText, { line: 4, character: 18 });
      x.test(result != null, 'CSSHover: should return hover for $primary400');
      x.test(
        result != null && result.contents.value.indexOf('primary400') !== -1,
        'CSSHover: hover content should contain primary400'
      );
      x.test(
        result != null && result.contents.value.indexOf('Default') !== -1,
        'CSSHover: hover content should contain Default theme info'
      );

      // Hover on $backgroundDefault (line 5, character ~32)
      var result2 = handler.handle(cssText, { line: 5, character: 32 });
      x.test(result2 != null, 'CSSHover: should return hover for $backgroundDefault');
    },

    // ========== CSSDiagnostics ==========

    async function testCSSDiagnostics(x) {
      var resolver = foam.parse.lsp.CSSTokenResolver.create();
      resolver.loadFromRegistry();

      var handler = foam.parse.lsp.handlers.DiagnosticsHandler.create({
        cssTokenResolver: resolver
      });

      // Valid $primary400 — should have no CSS token warnings
      var validText = "foam.CLASS({\n  package: 'test',\n  name: 'CSSDiagValid',\n  css: `\n    ^ { color: $primary400; }\n  `\n})";
      var result = handler.handle(validText);
      var cssWarnings = result.filter(function(d) {
        return d.message && d.message.indexOf('CSS token') !== -1;
      });
      x.test(cssWarnings.length === 0, 'CSSDiagnostics: valid $primary400 should have no CSS token warnings');

      // Unknown $nonExistentFakeToken — should produce a warning
      var invalidText = "foam.CLASS({\n  package: 'test',\n  name: 'CSSDiagBad',\n  css: `\n    ^ { color: $nonExistentFakeToken; }\n  `\n})";
      var result2 = handler.handle(invalidText);
      var cssWarnings2 = result2.filter(function(d) {
        return d.message && d.message.indexOf('nonExistentFakeToken') !== -1;
      });
      x.test(cssWarnings2.length > 0, 'CSSDiagnostics: unknown $nonExistentFakeToken should produce a warning');
    },

    function decodeSemanticTokens(data) {
      /**
       * Decodes the LSP relative delta array back to absolute positions.
       * Returns array of { line, char, length, type, modifiers }.
       */
      var tokens = [];
      var prevLine = 0;
      var prevChar = 0;
      for ( var i = 0 ; i + 4 < data.length ; i += 5 ) {
        var deltaLine = data[i];
        var deltaChar = data[i + 1];
        var length    = data[i + 2];
        var type      = data[i + 3];
        var modifiers = data[i + 4];

        var line = prevLine + deltaLine;
        var ch   = deltaLine === 0 ? prevChar + deltaChar : deltaChar;

        tokens.push({ line: line, char: ch, length: length, type: type, modifiers: modifiers });
        prevLine = line;
        prevChar = ch;
      }
      return tokens;
    }
  ]
});
