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
    TOKEN_TYPES: ['type', 'class', 'variable', 'keyword', 'string', 'comment', 'number', 'operator', 'method'],
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
      // For refines: the FOAM registry class already has all axioms merged
      // (original + refinement). Use registry requires, not just the raw model.
      var classId = model.refines || (model.package ? model.package + '.' + model.name : model.name);
      var cls = this.index.getClass(classId);
      var requiresMap = this.cache.buildRequiresMap(model);
      // Merge registry requires (handles refines inheriting parent's requires)
      if ( cls ) {
        var regRequires = this.index.getRequires(classId);
        for ( var i = 0 ; i < regRequires.length ; i++ ) {
          var r = regRequires[i];
          if ( r.name && r.path && ! requiresMap[r.name] ) {
            requiresMap[r.name] = r.path;
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
       * Full Java syntax highlighting inside javaCode blocks.
       * Token type indices: 0=type, 1=class, 2=variable, 3=keyword, 4=string,
       * 5=comment, 6=number, 7=operator, 8=method
       */
      var javaKeys = ['javaCode', 'javaPreSet', 'javaPostSet', 'javaFactory', 'javaGetter'];
      var self = this;

      // Pre-compute line offsets for fast offset → line/col conversion
      var lineOffsets = [0];
      for ( var i = 0 ; i < text.length ; i++ ) {
        if ( text[i] === '\n' ) lineOffsets.push(i + 1);
      }

      function offsetToLineCol(absOffset) {
        // Binary search for the line
        var lo = 0, hi = lineOffsets.length - 1;
        while ( lo < hi ) {
          var mid = (lo + hi + 1) >> 1;
          if ( lineOffsets[mid] <= absOffset ) lo = mid; else hi = mid - 1;
        }
        return { line: lo, col: absOffset - lineOffsets[lo] };
      }

      function addToken(absOffset, length, type) {
        var pos = offsetToLineCol(absOffset);
        tokens.push({ line: pos.line, char: pos.col, length: length, type: type, modifiers: 0 });
      }

      var JAVA_KEYWORDS = /\b(abstract|assert|boolean|break|byte|case|catch|char|class|const|continue|default|do|double|else|enum|extends|final|finally|float|for|goto|if|implements|import|instanceof|int|interface|long|native|new|null|package|private|protected|public|return|short|static|strictfp|super|switch|synchronized|this|throw|throws|transient|try|var|void|volatile|while|true|false)\b/g;

      function scanJavaBlock(javaStr) {
        if ( ! javaStr || typeof javaStr !== 'string' ) return;
        var baseOffset = text.indexOf(javaStr);
        if ( baseOffset === -1 ) return;

        // 1. Java keywords
        var kw;
        JAVA_KEYWORDS.lastIndex = 0;
        while ( ( kw = JAVA_KEYWORDS.exec(javaStr) ) !== null ) {
          addToken(baseOffset + kw.index, kw[1].length, 3);
        }

        // 2. String literals: "..." and '...'
        var strRegex = /"(?:[^"\\]|\\.)*"|'[^']*'/g;
        var sm;
        while ( ( sm = strRegex.exec(javaStr) ) !== null ) {
          addToken(baseOffset + sm.index, sm[0].length, 4);
        }

        // 3. Comments: // ... and /* ... */
        var commentRegex = /\/\/[^\n]*|\/\*[\s\S]*?\*\//g;
        var cm;
        while ( ( cm = commentRegex.exec(javaStr) ) !== null ) {
          addToken(baseOffset + cm.index, cm[0].length, 5);
        }

        // 4. Numbers
        var numRegex = /\b\d+[lLfFdD]?\b/g;
        var nm;
        while ( ( nm = numRegex.exec(javaStr) ) !== null ) {
          addToken(baseOffset + nm.index, nm[0].length, 6);
        }

        // 5. Type names (capitalized identifiers in declarations)
        var typeRegex = /\b([A-Z][a-zA-Z0-9_]*)\b/g;
        var tm;
        while ( ( tm = typeRegex.exec(javaStr) ) !== null ) {
          var typeName = tm[1];
          // Skip Java keywords that start with uppercase (none really, but safe)
          if ( /^(String|Object|Exception|Boolean|Integer|Long|Double|Float|Short|Byte|Character|Void)$/.test(typeName) ) {
            addToken(baseOffset + tm.index, typeName.length, 0);
          } else if ( self.index.classExists(typeName) || self.index.getAllClassIds().some(function(id) { return id.endsWith('.' + typeName); }) ) {
            addToken(baseOffset + tm.index, typeName.length, 0);
          }
        }

        // 6. Method calls: methodName(
        var methodRegex = /\b([a-z]\w*)\s*\(/g;
        var mm;
        while ( ( mm = methodRegex.exec(javaStr) ) !== null ) {
          var mname = mm[1];
          // Skip keywords already highlighted
          if ( /^(if|for|while|switch|catch|return|new|throw)$/.test(mname) ) continue;
          addToken(baseOffset + mm.index, mname.length, 8);
        }
      }

      // Scan all Java blocks: model-level, property-level, method-level
      javaKeys.forEach(function(key) { scanJavaBlock(model[key]); });
      (model.properties || []).forEach(function(p) {
        if ( typeof p !== 'object' ) return;
        javaKeys.forEach(function(key) { scanJavaBlock(p[key]); });
      });
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
