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
      var lines = text.split('\n');

      // Find this.<alias> references — mark alias as 'type' (token type 0)
      for ( var alias in requiresMap ) {
        var pattern = new RegExp('this\\.' + alias + '\\b', 'g');
        for ( var lineNum = 0 ; lineNum < lines.length ; lineNum++ ) {
          var line = lines[lineNum];
          var match;
          while ( ( match = pattern.exec(line) ) !== null ) {
            // Offset past 'this.' to highlight just the alias
            tokens.push({
              line: lineNum,
              char: match.index + 5,
              length: alias.length,
              type: 0,
              modifiers: 0
            });
          }
        }
      }

      // Find typed variables — mark as 'variable' (token type 2)
      if ( this.typeTracker ) {
        var createRegex = /(?:var|let|const)\s+(\w+)\s*=\s*(?:this\.)?(\w+)\.create\s*\(/g;
        for ( var lineNum = 0 ; lineNum < lines.length ; lineNum++ ) {
          var line = lines[lineNum];
          var match;
          while ( ( match = createRegex.exec(line) ) !== null ) {
            var varName = match[1];
            var className = match[2];
            var resolved = requiresMap[className] || ( this.index.classExists(className) ? className : null );
            if ( ! resolved ) continue;

            // Mark the variable declaration
            tokens.push({
              line: lineNum,
              char: match.index + match[0].indexOf(varName),
              length: varName.length,
              type: 2,
              modifiers: 1
            });

            // Find usages of this variable in subsequent lines
            var usageRegex = new RegExp('\\b' + varName + '\\b', 'g');
            for ( var j = lineNum + 1 ; j < lines.length ; j++ ) {
              var usage;
              while ( ( usage = usageRegex.exec(lines[j]) ) !== null ) {
                tokens.push({
                  line: j,
                  char: usage.index,
                  length: varName.length,
                  type: 2,
                  modifiers: 2
                });
              }
            }
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
