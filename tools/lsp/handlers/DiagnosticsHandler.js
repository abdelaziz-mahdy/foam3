/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.parse.lsp.handlers',
  name: 'DiagnosticsHandler',

  requires: [
    'foam.parse.lsp.FoamIndex',
    'foam.parse.lsp.handlers.JavaBlockValidator'
  ],

  properties: [
    {
      class: 'FObjectProperty',
      of: 'foam.parse.lsp.FoamIndex',
      name: 'index',
      factory: function() { return this.FoamIndex.create(); }
    },
    {
      class: 'FObjectProperty',
      of: 'foam.parse.lsp.handlers.JavaBlockValidator',
      name: 'javaValidator',
      factory: function() { return this.JavaBlockValidator.create({ index: this.index }); }
    }
  ],

  methods: [
    function handle(text) {
      if ( ! /foam\.(CLASS|ENUM|INTERFACE|RELATIONSHIP)\s*\(/.test(text) ) {
        return [];
      }

      var diagnostics = [];
      var self = this;

      this.forEachFoamClass(text, function(block, startOffset) {
        self.validateBlock(text, block, startOffset, diagnostics);
      });

      return diagnostics;
    },

    function forEachFoamClass(text, callback) {
      var regex = /foam\.(CLASS|ENUM|INTERFACE|RELATIONSHIP)\s*\(/g;
      var match;
      while ( ( match = regex.exec(text) ) !== null ) {
        var start = match.index;
        var end = this.findMatchingEnd(text, start + match[0].length);
        callback(text.substring(start, end), start);
      }
    },

    function findMatchingEnd(text, fromIndex) {
      var depth = 0;
      var inString = false;
      var stringChar = '';
      for ( var i = fromIndex ; i < text.length ; i++ ) {
        var ch = text[i];
        if ( inString ) {
          if ( ch === '\\' ) { i++; continue; }
          if ( ch === stringChar ) inString = false;
          continue;
        }
        if ( ch === "'" || ch === '"' || ch === '`' ) { inString = true; stringChar = ch; }
        else if ( ch === '(' || ch === '{' || ch === '[' ) { depth++; }
        else if ( ch === ')' || ch === '}' || ch === ']' ) {
          if ( depth === 0 ) return i + 1;
          depth--;
        }
      }
      return text.length;
    },

    function validateBlock(fullText, block, startOffset, diagnostics) {
      // Resolve class ID
      var pkgMatch = block.match(/package\s*:\s*['"]([^'"]+)['"]/);
      var nameMatch = block.match(/name\s*:\s*['"]([^'"]+)['"]/);
      var classId = null;
      if ( nameMatch ) {
        classId = pkgMatch ? pkgMatch[1] + '.' + nameMatch[1] : nameMatch[1];
      }

      // Validate extends
      var extendsMatch = block.match(/extends\s*:\s*['"]([^'"]+)['"]/);
      if ( extendsMatch ) {
        var extendsId = extendsMatch[1];
        if ( ! this.index.classExists(extendsId) ) {
          this.addDiag(diagnostics, fullText, startOffset + block.indexOf(extendsId, extendsMatch.index),
            extendsId.length, 2, "Unknown class in extends: '" + extendsId + "'");
        }
      }

      // Validate requires
      var requiresBlock = block.match(/requires\s*:\s*\[([\s\S]*?)\]/);
      if ( requiresBlock ) {
        var reqRegex = /['"]([a-zA-Z][\w.]+\.[A-Z]\w*)['"]/g;
        var rMatch;
        while ( ( rMatch = reqRegex.exec(requiresBlock[1]) ) !== null ) {
          var reqId = rMatch[1];
          if ( ! this.index.classExists(reqId) ) {
            var offset = startOffset + block.indexOf(requiresBlock[0]) +
                        requiresBlock[0].indexOf(requiresBlock[1]) + rMatch.index + rMatch[0].indexOf(reqId);
            this.addDiag(diagnostics, fullText, offset, reqId.length, 2,
              "Unknown class in requires: '" + reqId + "'");
          }
        }
      }

      // Validate property types (both short and full names)
      var validTypes = {};
      var ptypes = this.index.getPropertyTypes();
      for ( var i = 0 ; i < ptypes.length ; i++ ) {
        validTypes[ptypes[i].name] = true;
        validTypes[ptypes[i].id] = true;
      }
      var classRegex = /class\s*:\s*['"]([^'"]+)['"]/g;
      var cMatch;
      while ( ( cMatch = classRegex.exec(block) ) !== null ) {
        var typeName = cMatch[1];
        if ( ! validTypes[typeName] && ! this.index.classExists(typeName) ) {
          var offset = startOffset + cMatch.index + cMatch[0].indexOf(typeName);
          this.addDiag(diagnostics, fullText, offset, typeName.length, 3,
            "Unknown property type: '" + typeName + "'");
        }
      }

      // Validate Java blocks
      this.javaValidator.validate(classId, block, diagnostics, startOffset, fullText);
    },

    function addDiag(diagnostics, fullText, offset, length, severity, message) {
      var pos = this.offsetToPosition(fullText, offset);
      diagnostics.push({
        range: {
          start: pos,
          end: { line: pos.line, character: pos.character + length }
        },
        severity: severity,
        message: message,
        source: 'foam-lsp'
      });
    },

    function offsetToPosition(text, offset) {
      var line = 0; var col = 0;
      for ( var i = 0 ; i < offset && i < text.length ; i++ ) {
        if ( text[i] === '\n' ) { line++; col = 0; } else { col++; }
      }
      return { line: line, character: col };
    }
  ]
});
