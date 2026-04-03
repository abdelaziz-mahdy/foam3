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
    'foam.parse.lsp.CursorAnalyzer',
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
      of: 'foam.parse.lsp.CursorAnalyzer',
      name: 'analyzer',
      factory: function() { return this.CursorAnalyzer.create(); }
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

      this.analyzer.forEachFoamClass(text, function(block, startOffset) {
        self.validateBlock(text, block, startOffset, diagnostics);
      });

      return diagnostics;
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
        if ( ! this.classKnown_(extendsId) ) {
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
          if ( ! this.classKnown_(reqId) ) {
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
        if ( ! validTypes[typeName] && ! this.classKnown_(typeName) ) {
          var offset = startOffset + cMatch.index + cMatch[0].indexOf(typeName);
          this.addDiag(diagnostics, fullText, offset, typeName.length, 3,
            "Unknown property type: '" + typeName + "'");
        }
      }

      // Validate Java blocks
      this.javaValidator.validate(classId, block, diagnostics, startOffset, fullText);
    },

    function classKnown_(classId) {
      /**
       * Check if a class is known — registered in FOAM runtime OR in the
       * POM file index. The file index includes all files from the POM walk
       * with the current flags, so flag-filtered classes (test, swift, etc.)
       * are correctly excluded unless the user enables those flags.
       */
      return this.index.classExists(classId) || this.index.getFilePath(classId) != null;
    },

    function addDiag(diagnostics, fullText, offset, length, severity, message) {
      var pos = this.analyzer.offsetToPosition(fullText, offset);
      diagnostics.push({
        range: {
          start: pos,
          end: { line: pos.line, character: pos.character + length }
        },
        severity: severity,
        message: message,
        source: 'foam-lsp'
      });
    }
  ]
});
