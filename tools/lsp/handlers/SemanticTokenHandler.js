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
    'foam.parse.lsp.CursorAnalyzer',
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
      of: 'foam.parse.lsp.CursorAnalyzer',
      name: 'analyzer',
      factory: function() { return this.CursorAnalyzer.create(); }
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
       * Knowledge-driven Java syntax highlighting — uses the SAME resolution
       * logic as HoverHandler (via CursorAnalyzer.resolveJavaTypeName).
       * DRY: one source of truth for type/enum resolution.
       *
       * Token types: 0=type, 1=class, 2=variable, 3=keyword, 4=string,
       * 5=comment, 6=number, 7=operator, 8=method
       */
      var javaKeys = ['javaCode', 'javaPreSet', 'javaPostSet', 'javaFactory', 'javaGetter'];
      var self = this;
      var classId = model.refines || (model.package ? model.package + '.' + model.name : model.name);

      // Use registry class for refines — FOAM merges refinements into the original class
      var cls = self.index.getClass(classId);

      // Merge model's javaImports with the registry class's javaImports (for refines)
      var effectiveModel = model;
      if ( model.refines && cls && cls.model_ ) {
        effectiveModel = {
          javaImports: (model.javaImports || []).concat(cls.model_.javaImports || []),
          package: cls.model_.package || model.package
        };
      }

      // Build property set from registry (not manually)
      var propNames = {};
      if ( cls ) {
        var props = cls.getAxiomsByClass(foam.lang.Property);
        for ( var i = 0 ; i < props.length ; i++ ) propNames[props[i].name.toLowerCase()] = true;
      }
      (model.properties || []).forEach(function(p) {
        var name = typeof p === 'string' ? p : p.name;
        if ( name ) propNames[name.toLowerCase()] = true;
      });

      // Pre-compute line offsets for fast offset → line/col
      var lineOffsets = [0];
      for ( var i = 0 ; i < text.length ; i++ ) {
        if ( text[i] === '\n' ) lineOffsets.push(i + 1);
      }

      function addToken(absOffset, length, type) {
        var lo = 0, hi = lineOffsets.length - 1;
        while ( lo < hi ) {
          var mid = (lo + hi + 1) >> 1;
          if ( lineOffsets[mid] <= absOffset ) lo = mid; else hi = mid - 1;
        }
        tokens.push({ line: lo, char: absOffset - lineOffsets[lo], length: length, type: type, modifiers: 0 });
      }

      var JAVA_KEYWORDS = /\b(abstract|assert|boolean|break|byte|case|catch|char|class|const|continue|default|do|double|else|enum|extends|final|finally|float|for|goto|if|implements|import|instanceof|int|interface|long|native|new|null|package|private|protected|public|return|short|static|strictfp|super|switch|synchronized|this|throw|throws|transient|try|var|void|volatile|while|true|false)\b/g;

      // Cache type resolutions to avoid repeated registry scans
      var typeCache = {};
      function resolveType(name) {
        if ( typeCache[name] !== undefined ) return typeCache[name];
        // Use SAME resolution as HoverHandler → CursorAnalyzer.resolveJavaTypeName
        typeCache[name] = self.analyzer.resolveJavaTypeName(name, effectiveModel, self.index);
        return typeCache[name];
      }

      function scanJavaBlock(javaStr) {
        if ( ! javaStr || typeof javaStr !== 'string' ) return;
        var baseOffset = text.indexOf(javaStr);
        if ( baseOffset === -1 ) return;

        // Comments
        var commentRegex = /\/\/[^\n]*|\/\*[\s\S]*?\*\//g;
        var cm;
        while ( ( cm = commentRegex.exec(javaStr) ) !== null ) {
          addToken(baseOffset + cm.index, cm[0].length, 5);
        }

        // String literals
        var strRegex = /"(?:[^"\\]|\\.)*"|'[^']*'/g;
        var sm;
        while ( ( sm = strRegex.exec(javaStr) ) !== null ) {
          addToken(baseOffset + sm.index, sm[0].length, 4);
        }

        // Java keywords
        JAVA_KEYWORDS.lastIndex = 0;
        var kw;
        while ( ( kw = JAVA_KEYWORDS.exec(javaStr) ) !== null ) {
          addToken(baseOffset + kw.index, kw[1].length, 3);
        }

        // Numbers
        var numRegex = /\b\d+[lLfFdD]?\b/g;
        var nm;
        while ( ( nm = numRegex.exec(javaStr) ) !== null ) {
          addToken(baseOffset + nm.index, nm[0].length, 6);
        }

        // Type names — resolved via CursorAnalyzer.resolveJavaTypeName (same as hover)
        var typeRegex = /\b([A-Z][a-zA-Z0-9_]*)\b/g;
        var tm;
        while ( ( tm = typeRegex.exec(javaStr) ) !== null ) {
          if ( resolveType(tm[1]) ) {
            addToken(baseOffset + tm.index, tm[1].length, 0);
          }
        }

        // Java variable declarations: TypeName varName = or var varName =
        var varDeclRegex = /\b(?:([A-Z]\w+)|var)\s+([a-z]\w*)\s*[=;]/g;
        var vd;
        while ( ( vd = varDeclRegex.exec(javaStr) ) !== null ) {
          var vName = vd[2];
          var vOffset = vd.index + vd[0].indexOf(vName);
          addToken(baseOffset + vOffset, vName.length, 2);
        }

        // Enum values: ClassName.VALUE — resolved via same resolveType + getEnumValues
        var enumRegex = /\b([A-Z]\w*)\.([A-Z][A-Z0-9_]+)\b/g;
        var em;
        while ( ( em = enumRegex.exec(javaStr) ) !== null ) {
          var enumFullId = resolveType(em[1]);
          if ( enumFullId ) {
            var enumVals = self.index.getEnumValues(enumFullId);
            for ( var i = 0 ; i < enumVals.length ; i++ ) {
              if ( enumVals[i].name === em[2] ) {
                addToken(baseOffset + em.index + em[1].length + 1, em[2].length, 2);
                break;
              }
            }
          }
        }

        // Getter/setter calls — verified against known properties
        var getSetRegex = /(get|set)([A-Z][a-zA-Z0-9_]*)\s*\(/g;
        var gs;
        while ( ( gs = getSetRegex.exec(javaStr) ) !== null ) {
          var propName = gs[2].charAt(0).toLowerCase() + gs[2].substring(1);
          if ( propNames[propName.toLowerCase()] ) {
            addToken(baseOffset + gs.index, gs[1].length + gs[2].length, 8);
          }
        }
      }

      // Scan model-level, property-level, AND method-level Java blocks
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
