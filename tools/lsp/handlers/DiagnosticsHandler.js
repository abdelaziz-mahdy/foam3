/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.parse.lsp.handlers',
  name: 'DiagnosticsHandler',

  requires: [
    'foam.parse.lsp.FoamIndex'
  ],

  properties: [
    {
      class: 'FObjectProperty',
      of: 'foam.parse.lsp.FoamIndex',
      name: 'index',
      factory: function() { return this.FoamIndex.create(); }
    }
  ],

  methods: [
    function handle(text) {
      /**
       * Returns Diagnostic[] — array of { range, severity, message, source }.
       */
      if ( ! /foam\.(CLASS|ENUM|INTERFACE|RELATIONSHIP)\s*\(/.test(text) ) {
        return [];
      }

      var diagnostics = [];

      // Check extends references
      this.checkClassRefs(text, /extends\s*:\s*['"]([^'"]+)['"]/g, diagnostics);

      // Check requires references
      this.checkClassRefs(text, /['"]([a-zA-Z][a-zA-Z0-9_.]+\.[A-Z][a-zA-Z0-9_]*)['"]/g, diagnostics);

      // Check property class types
      this.checkPropertyTypes(text, diagnostics);

      return diagnostics;
    },

    function checkClassRefs(text, regex, diagnostics) {
      var match;
      while ( ( match = regex.exec(text) ) !== null ) {
        var classId = match[1];
        // Skip property type names (single word, no dots)
        if ( classId.indexOf('.') === -1 ) continue;

        if ( ! this.index.classExists(classId) ) {
          var pos = this.offsetToPosition(text, match.index + match[0].indexOf(classId));
          diagnostics.push({
            range: {
              start: pos,
              end: { line: pos.line, character: pos.character + classId.length }
            },
            severity: 1, // Error
            message: "Unknown class: '" + classId + "'",
            source: 'foam-lsp'
          });
        }
      }
    },

    function checkPropertyTypes(text, diagnostics) {
      var propTypes = this.index.getPropertyTypes();
      var typeNames = {};
      for ( var i = 0 ; i < propTypes.length ; i++ ) {
        typeNames[propTypes[i].name] = true;
      }

      var regex = /class\s*:\s*['"]([^'"]+)['"]/g;
      var match;
      while ( ( match = regex.exec(text) ) !== null ) {
        var typeName = match[1];
        if ( ! typeNames[typeName] ) {
          var pos = this.offsetToPosition(text, match.index + match[0].indexOf(typeName));
          diagnostics.push({
            range: {
              start: pos,
              end: { line: pos.line, character: pos.character + typeName.length }
            },
            severity: 2, // Warning
            message: "Unknown property type: '" + typeName + "'",
            source: 'foam-lsp'
          });
        }
      }
    },

    function offsetToPosition(text, offset) {
      var line = 0;
      var col = 0;
      for ( var i = 0 ; i < offset && i < text.length ; i++ ) {
        if ( text[i] === '\n' ) {
          line++;
          col = 0;
        } else {
          col++;
        }
      }
      return { line: line, character: col };
    }
  ]
});
