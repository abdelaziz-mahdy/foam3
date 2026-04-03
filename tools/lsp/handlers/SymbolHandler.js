/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.parse.lsp.handlers',
  name: 'SymbolHandler',

  requires: [
    'foam.parse.lsp.CursorAnalyzer'
  ],

  properties: [
    {
      class: 'FObjectProperty',
      of: 'foam.parse.lsp.CursorAnalyzer',
      name: 'analyzer',
      factory: function() { return this.CursorAnalyzer.create(); }
    }
  ],

  methods: [
    function handle(text) {
      /**
       * Returns DocumentSymbol[] — outline of class, properties, methods.
       */
      if ( ! /foam\.(CLASS|ENUM|INTERFACE|RELATIONSHIP)\s*\(/.test(text) ) {
        return [];
      }

      var symbols = [];

      // Extract class name
      var pkgMatch = text.match(/package\s*:\s*['"]([^'"]+)['"]/);
      var nameMatch = text.match(/name\s*:\s*['"]([^'"]+)['"]/);
      var className = '';
      if ( pkgMatch && nameMatch ) {
        className = pkgMatch[1] + '.' + nameMatch[1];
      } else if ( nameMatch ) {
        className = nameMatch[1];
      }

      if ( className ) {
        var classPos = this.analyzer.offsetToPosition(text, nameMatch.index);
        symbols.push({
          name: className,
          kind: 5, // Class
          range: { start: { line: 0, character: 0 }, end: this.analyzer.offsetToPosition(text, text.length) },
          selectionRange: { start: classPos, end: { line: classPos.line, character: classPos.character + nameMatch[0].length } }
        });
      }

      // Extract properties
      this.extractProperties(text, symbols);

      // Extract methods
      this.extractMethods(text, symbols);

      return symbols;
    },

    function extractProperties(text, symbols) {
      // Match property objects: { class: '...', name: '...' }
      var objRegex = /\{\s*class\s*:\s*['"][^'"]*['"]\s*,\s*name\s*:\s*['"]([^'"]+)['"]/g;
      var match;
      while ( ( match = objRegex.exec(text) ) !== null ) {
        var pos = this.analyzer.offsetToPosition(text, match.index);
        symbols.push({
          name: match[1],
          kind: 7, // Property
          range: { start: pos, end: { line: pos.line, character: pos.character + match[0].length } },
          selectionRange: { start: pos, end: { line: pos.line, character: pos.character + match[0].length } }
        });
      }

      // Also name-first: { name: '...', class: '...' }
      var nameFirstRegex = /\{\s*name\s*:\s*['"]([^'"]+)['"]\s*,\s*class\s*:\s*['"][^'"]*['"]/g;
      while ( ( match = nameFirstRegex.exec(text) ) !== null ) {
        var pos = this.analyzer.offsetToPosition(text, match.index);
        symbols.push({
          name: match[1],
          kind: 7,
          range: { start: pos, end: { line: pos.line, character: pos.character + match[0].length } },
          selectionRange: { start: pos, end: { line: pos.line, character: pos.character + match[0].length } }
        });
      }

      // Match shorthand string properties inside properties: [ ... ]
      var propsSection = text.match(/properties\s*:\s*\[([\s\S]*?)\]/);
      if ( propsSection ) {
        var shorthandRegex = /(?:^|,)\s*'([a-zA-Z_][a-zA-Z0-9_]*)'/g;
        var sectionText = propsSection[1];
        var sectionOffset = propsSection.index + text.indexOf('[', propsSection.index) + 1;
        while ( ( match = shorthandRegex.exec(sectionText) ) !== null ) {
          var pos = this.analyzer.offsetToPosition(text, sectionOffset + match.index + match[0].indexOf("'"));
          symbols.push({
            name: match[1],
            kind: 7,
            range: { start: pos, end: { line: pos.line, character: pos.character + match[1].length } },
            selectionRange: { start: pos, end: { line: pos.line, character: pos.character + match[1].length } }
          });
        }
      }
    },

    function extractMethods(text, symbols) {
      // Match: function methodName(
      var regex = /function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
      var match;
      while ( ( match = regex.exec(text) ) !== null ) {
        // Skip the foam.CLASS wrapper function if any
        if ( match[1] === 'factory' || match[1] === 'expression' ) continue;
        var pos = this.analyzer.offsetToPosition(text, match.index);
        symbols.push({
          name: match[1],
          kind: 6, // Method
          range: { start: pos, end: { line: pos.line, character: pos.character + match[0].length } },
          selectionRange: { start: pos, end: { line: pos.line, character: pos.character + match[0].length } }
        });
      }
    }
  ]
});
