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
      if ( ! /foam\.(CLASS|ENUM|INTERFACE|RELATIONSHIP)\s*\(/.test(text) ) {
        return [];
      }

      var diagnostics = [];

      // Only check extends — this is a clear class reference
      this.checkExtendsRef(text, diagnostics);

      // Check requires entries — these are definitely class references
      this.checkRequiresRefs(text, diagnostics);

      // Check property class types — match both short and full names
      this.checkPropertyTypes(text, diagnostics);

      return diagnostics;
    },

    function checkExtendsRef(text, diagnostics) {
      var regex = /extends\s*:\s*['"]([^'"]+)['"]/g;
      var match;
      while ( ( match = regex.exec(text) ) !== null ) {
        var classId = match[1];
        if ( ! this.index.classExists(classId) ) {
          this.addDiagnostic(diagnostics, text, match, classId,
            "Unknown class: '" + classId + "'", 2); // Warning, not error
        }
      }
    },

    function checkRequiresRefs(text, diagnostics) {
      // Only match strings inside requires: [...] blocks
      var requiresMatch = text.match(/requires\s*:\s*\[([\s\S]*?)\]/g);
      if ( ! requiresMatch ) return;

      for ( var r = 0 ; r < requiresMatch.length ; r++ ) {
        var block = requiresMatch[r];
        var blockStart = text.indexOf(block);
        var regex = /['"]([a-zA-Z][\w.]+\.[A-Z]\w*)['"]/g;
        var match;
        while ( ( match = regex.exec(block) ) !== null ) {
          var classId = match[1];
          if ( ! this.index.classExists(classId) ) {
            var absOffset = blockStart + match.index + match[0].indexOf(classId);
            var pos = this.offsetToPosition(text, absOffset);
            diagnostics.push({
              range: {
                start: pos,
                end: { line: pos.line, character: pos.character + classId.length }
              },
              severity: 2, // Warning
              message: "Unknown class in requires: '" + classId + "'",
              source: 'foam-lsp'
            });
          }
        }
      }
    },

    function checkPropertyTypes(text, diagnostics) {
      // Build lookup: both short names AND full IDs
      var propTypes = this.index.getPropertyTypes();
      var validTypes = {};
      for ( var i = 0 ; i < propTypes.length ; i++ ) {
        validTypes[propTypes[i].name] = true;  // Short: 'FObjectProperty'
        validTypes[propTypes[i].id] = true;    // Full: 'foam.lang.FObjectProperty'
      }

      var regex = /class\s*:\s*['"]([^'"]+)['"]/g;
      var match;
      while ( ( match = regex.exec(text) ) !== null ) {
        var typeName = match[1];
        // Skip if it's a known type (short or full name)
        if ( validTypes[typeName] ) continue;
        // Also skip if it looks like a class reference (dots) and exists as a class
        if ( typeName.indexOf('.') !== -1 && this.index.classExists(typeName) ) continue;

        this.addDiagnostic(diagnostics, text, match, typeName,
          "Unknown property type: '" + typeName + "'", 3); // Info, not warning
      }
    },

    function addDiagnostic(diagnostics, text, match, value, message, severity) {
      var pos = this.offsetToPosition(text, match.index + match[0].indexOf(value));
      diagnostics.push({
        range: {
          start: pos,
          end: { line: pos.line, character: pos.character + value.length }
        },
        severity: severity,
        message: message,
        source: 'foam-lsp'
      });
    },

    function offsetToPosition(text, offset) {
      var line = 0;
      var col = 0;
      for ( var i = 0 ; i < offset && i < text.length ; i++ ) {
        if ( text[i] === '\n' ) { line++; col = 0; } else { col++; }
      }
      return { line: line, character: col };
    }
  ]
});
