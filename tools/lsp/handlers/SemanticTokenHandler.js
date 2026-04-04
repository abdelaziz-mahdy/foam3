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
      }

      // Sort by position (line, then character)
      tokens.sort(function(a, b) {
        return a.line !== b.line ? a.line - b.line : a.char - b.char;
      });

      // Encode as relative deltas per LSP spec
      return this.encodeTokens_(tokens);
    },

    function collectModelTokens_(text, model, tokens) {
      var requiresMap = this.cache.buildRequiresMap(model);
      var aliases = Object.keys(requiresMap);
      if ( aliases.length === 0 ) return;

      var lines = text.split('\n');

      // Build a single regex for all aliases: this\.(Alias1|Alias2|...)\b
      var aliasPattern = new RegExp('this\\.(' + aliases.map(function(a) {
        return a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      }).join('|') + ')\\b', 'g');

      // Single pass over all lines for alias references
      for ( var lineNum = 0 ; lineNum < lines.length ; lineNum++ ) {
        var line = lines[lineNum];
        aliasPattern.lastIndex = 0;
        var match;
        while ( ( match = aliasPattern.exec(line) ) !== null ) {
          tokens.push({
            line: lineNum,
            char: match.index + 5,
            length: match[1].length,
            type: 0,
            modifiers: 0
          });
        }
      }

      // Typed variable declarations + usages (single pass)
      if ( ! this.typeTracker ) return;
      var createRegex = /(?:var|let|const)\s+(\w+)\s*=\s*(?:this\.)?(\w+)\.create\s*\(/g;
      var varTypes = {};

      for ( var lineNum = 0 ; lineNum < lines.length ; lineNum++ ) {
        var line = lines[lineNum];
        createRegex.lastIndex = 0;
        var match;
        while ( ( match = createRegex.exec(line) ) !== null ) {
          var varName = match[1];
          var className = match[2];
          var resolved = requiresMap[className] || ( this.index.classExists(className) ? className : null );
          if ( resolved ) {
            varTypes[varName] = true;
            tokens.push({
              line: lineNum,
              char: match.index + match[0].indexOf(varName),
              length: varName.length,
              type: 2,
              modifiers: 1
            });
          }
        }
      }

      // Mark usages of typed variables
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
