/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.parse.lsp.handlers',
  name: 'SemanticTokenHandler',

  documentation: 'Provides semantic tokens for resolved class references (this.ShortName) and typed variables.',

  requires: [
    'foam.parse.lsp.FoamIndex',
    'foam.parse.lsp.FileModelCache',
    'foam.parse.lsp.TypeTracker'
  ],

  constants: {
    TOKEN_TYPES: ['type', 'class', 'variable'],
    TOKEN_MODIFIERS: ['declaration', 'readonly']
  },

  properties: [
    {
      class: 'FObjectProperty',
      of: 'foam.parse.lsp.FoamIndex',
      name: 'index',
      factory: function() { return this.FoamIndex.create(); }
    },
    {
      class: 'FObjectProperty',
      of: 'foam.parse.lsp.FileModelCache',
      name: 'cache',
      factory: function() { return this.FileModelCache.create(); }
    },
    {
      class: 'FObjectProperty',
      of: 'foam.parse.lsp.TypeTracker',
      name: 'typeTracker'
    }
  ],

  methods: [
    function handle(text, opt_uri) {
      /** Returns encoded semantic tokens array for the file. */
      var models = this.cache.getModels(opt_uri || '', text);
      var tokens = [];

      for ( var i = 0 ; i < models.length ; i++ ) {
        this.collectModelTokens_(text, models[i], tokens);
        this.collectJavaTokens_(text, models[i], tokens);
      }

      // Sort by position (line, then character)
      tokens.sort(function(a, b) {
        return a.line !== b.line ? a.line - b.line : a.char - b.char;
      });

      // Encode as relative deltas per LSP spec
      return this.encodeTokens_(tokens);
    },

    function collectModelTokens_(text, model, tokens) {
      // For refines models, also get requires from the refined class in the registry
      var requiresMap = this.cache.buildRequiresMap(model);
      if ( model.refines ) {
        var refinedCls = this.index.getClass(model.refines);
        if ( refinedCls && refinedCls.model_ && refinedCls.model_.requires ) {
          var refinedReqs = this.cache.buildRequiresMap(refinedCls.model_);
          for ( var key in refinedReqs ) {
            if ( ! requiresMap[key] ) requiresMap[key] = refinedReqs[key];
          }
        }
      }

      var aliases = Object.keys(requiresMap);
      var lines = text.split('\n');

      // Alias references: this.ShortName → highlight ShortName as type
      if ( aliases.length > 0 ) {
        var aliasPattern = new RegExp('this\\.(' + aliases.map(function(a) {
          return a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }).join('|') + ')\\b', 'g');

        for ( var lineNum = 0 ; lineNum < lines.length ; lineNum++ ) {
          aliasPattern.lastIndex = 0;
          var match;
          while ( ( match = aliasPattern.exec(lines[lineNum]) ) !== null ) {
            tokens.push({ line: lineNum, char: match.index + 5, length: match[1].length, type: 0, modifiers: 0 });
          }
        }
      }

      // Typed variable declarations + usages
      if ( ! this.typeTracker ) return;
      var createRegex = /(?:var|let|const)\s+(\w+)\s*=\s*(?:this\.)?(\w+)\.create\s*\(/g;
      var varTypes = {};

      for ( var lineNum = 0 ; lineNum < lines.length ; lineNum++ ) {
        createRegex.lastIndex = 0;
        var match;
        while ( ( match = createRegex.exec(lines[lineNum]) ) !== null ) {
          var varName = match[1];
          var className = match[2];
          var resolved = requiresMap[className] || (this.index.classExists(className) ? className : null);
          if ( resolved ) {
            varTypes[varName] = true;
            tokens.push({ line: lineNum, char: match.index + match[0].indexOf(varName), length: varName.length, type: 2, modifiers: 1 });
          }
        }
      }

      var varNames = Object.keys(varTypes);
      if ( varNames.length === 0 ) return;
      var usagePattern = new RegExp('\\b(' + varNames.join('|') + ')\\b', 'g');
      for ( var lineNum = 0 ; lineNum < lines.length ; lineNum++ ) {
        usagePattern.lastIndex = 0;
        var match;
        while ( ( match = usagePattern.exec(lines[lineNum]) ) !== null ) {
          var isDecl = false;
          for ( var t = 0 ; t < tokens.length ; t++ ) {
            if ( tokens[t].line === lineNum && tokens[t].char === match.index && tokens[t].modifiers === 1 ) {
              isDecl = true; break;
            }
          }
          if ( ! isDecl ) {
            tokens.push({ line: lineNum, char: match.index, length: match[1].length, type: 2, modifiers: 2 });
          }
        }
      }
    },

    function collectJavaTokens_(text, model, tokens) {
      /**
       * Highlight getter/setter calls and type names inside Java code blocks.
       * Scans model-level, property-level, AND method-level javaCode blocks.
       */
      var javaKeys = ['javaCode', 'javaPreSet', 'javaPostSet', 'javaFactory', 'javaGetter'];
      var self = this;

      function offsetToLineCol(absOffset) {
        var line = 0, col = 0;
        for ( var i = 0 ; i < absOffset ; i++ ) {
          if ( text[i] === '\n' ) { line++; col = 0; } else { col++; }
        }
        return { line: line, col: col };
      }

      function scanJavaBlock(javaStr) {
        if ( ! javaStr || typeof javaStr !== 'string' ) return;
        var baseOffset = text.indexOf(javaStr);
        if ( baseOffset === -1 ) return;

        // Highlight getter/setter calls: getX(), setX()
        var getSetRegex = /(get|set)([A-Z][a-zA-Z0-9_]*)\s*\(/g;
        var gs;
        while ( ( gs = getSetRegex.exec(javaStr) ) !== null ) {
          var pos = offsetToLineCol(baseOffset + gs.index);
          tokens.push({ line: pos.line, char: pos.col, length: gs[1].length + gs[2].length, type: 2, modifiers: 0 });
        }

        // Highlight Java type names in declarations: TypeName varName =
        var typeRegex = /([A-Z][a-zA-Z0-9_]*)\s+[a-z]\w*\s*[=;]/g;
        var tm;
        while ( ( tm = typeRegex.exec(javaStr) ) !== null ) {
          var typeName = tm[1];
          if ( self.index.classExists(typeName) || self.index.getAllClassIds().some(function(id) { return id.endsWith('.' + typeName); }) ) {
            var pos = offsetToLineCol(baseOffset + tm.index);
            tokens.push({ line: pos.line, char: pos.col, length: typeName.length, type: 1, modifiers: 0 });
          }
        }
      }

      // Model-level Java blocks
      javaKeys.forEach(function(key) { scanJavaBlock(model[key]); });

      // Property-level Java blocks
      (model.properties || []).forEach(function(p) {
        if ( typeof p !== 'object' ) return;
        javaKeys.forEach(function(key) { scanJavaBlock(p[key]); });
      });

      // Method-level Java blocks
      (model.methods || []).forEach(function(m) {
        if ( typeof m !== 'object' ) return;
        javaKeys.forEach(function(key) { scanJavaBlock(m[key]); });
      });
    },

    function encodeTokens_(tokens) {
      /**
       * Encode tokens as flat array of relative deltas per LSP spec:
       * [deltaLine, deltaStartChar, length, tokenType, tokenModifiers]
       */
      var data = [];
      var prevLine = 0;
      var prevChar = 0;
      for ( var i = 0 ; i < tokens.length ; i++ ) {
        var t = tokens[i];
        var deltaLine = t.line - prevLine;
        var deltaChar = deltaLine === 0 ? t.char - prevChar : t.char;
        data.push(deltaLine, deltaChar, t.length, t.type, t.modifiers);
        prevLine = t.line;
        prevChar = t.char;
      }
      return { data: data };
    }
  ]
});
