/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.parse.lsp.handlers',
  name: 'CompletionHandler',

  requires: [
    'foam.parse.lsp.FoamIndex',
    'foam.parse.lsp.FileModelCache',
    'foam.parse.lsp.FoamClassGrammar',
    'foam.parse.lsp.CursorAnalyzer',
    'foam.parse.StringPStream'
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
      of: 'foam.parse.lsp.FileModelCache',
      name: 'cache',
      factory: function() { return this.FileModelCache.create(); }
    },
    {
      class: 'FObjectProperty',
      of: 'foam.parse.lsp.FoamClassGrammar',
      name: 'grammar',
      factory: function() { return this.FoamClassGrammar.create({ index: this.index }); }
    },
    {
      class: 'FObjectProperty',
      of: 'foam.parse.lsp.CursorAnalyzer',
      name: 'analyzer',
      factory: function() { return this.CursorAnalyzer.create(); }
    },
    {
      class: 'FObjectProperty',
      of: 'foam.parse.lsp.CSSTokenResolver',
      name: 'cssTokenResolver'
    }
  ],

  methods: [
    function handle(text, position) {
      if ( ! /foam\.(CLASS|ENUM|INTERFACE|RELATIONSHIP)\s*\(/.test(text) ) {
        return { isIncomplete: false, items: [] };
      }

      var lines = text.split('\n');
      var line = lines[position.line] || '';
      var prefix = line.substring(0, position.character);

      // CSS block completions: suggest $tokens inside css: backtick blocks
      var cssItems = this.cssBlockCompletion_(text, position, prefix);
      if ( cssItems && cssItems.length > 0 ) {
        return { isIncomplete: false, items: cssItems };
      }

      // Java block completions: suggest getters/setters inside javaCode/javaGetter/etc.
      var javaItems = this.javaBlockCompletion_(text, position, lines, prefix);
      if ( javaItems && javaItems.length > 0 ) {
        return { isIncomplete: false, items: javaItems };
      }

      // Try context-based completion first when cursor is inside a quoted value.
      // The grammar sees complete text including closing quote, but contextFallback
      // correctly extracts the partial value between opening quote and cursor.
      if ( /['"][^'"]*$/.test(prefix) ) {
        var contextItems = this.contextFallback(text, position);
        if ( contextItems.length > 0 ) {
          return { isIncomplete: contextItems.length > 200, items: contextItems };
        }
      }

      // Fall back to grammar-based suggestions
      var offset = this.analyzer.positionToOffset(text, position);
      var suggestions = this.collectSuggestions(text, offset);

      var items = [];
      var keys = Object.keys(suggestions);
      for ( var i = 0 ; i < keys.length ; i++ ) {
        var s = suggestions[keys[i]];
        items.push(this.toCompletionItem(s));
      }

      // Fallback: if grammar found no suggestions, detect context from line text
      if ( items.length === 0 ) {
        items = this.contextFallback(text, position);
      }

      return { isIncomplete: items.length > 200, items: items };
    },

    function contextFallback(text, position) {
      /** Detect cursor context from surrounding text and provide suggestions. */
      var lines = text.split('\n');
      var line = lines[position.line] || '';
      var prefix = line.substring(0, position.character);

      // Find where the partial value starts (after the opening quote)
      var partialStart = this.findQuoteStart_(prefix);
      var replaceRange = {
        start: { line: position.line, character: partialStart },
        end: position
      };

      // Inside class: '...' → property types
      if ( /class\s*:\s*['"][^'"]*$/.test(prefix) ) {
        var self = this;
        return this.index.getPropertyTypes().map(function(t) {
          return {
            label: t.name, kind: 7, detail: t.id,
            textEdit: { range: replaceRange, newText: t.name },
            sortText: '!' + t.name.toLowerCase()
          };
        });
      }

      // Inside extends: '...' or of: '...' or requires: ['...' → class names
      if ( /(?:extends|of)\s*:\s*['"][^'"]*$/.test(prefix) ||
           /requires\s*:\s*\[/.test(this.getLineContext_(lines, position.line)) && /['"][^'"]*$/.test(prefix) ||
           /implements\s*:\s*\[/.test(this.getLineContext_(lines, position.line)) && /['"][^'"]*$/.test(prefix) ) {
        var partial = this.extractPartial_(prefix).toLowerCase();
        var ids = this.index.getAllClassIds();
        var items = [];
        for ( var i = 0 ; i < ids.length ; i++ ) {
          if ( partial && ids[i].toLowerCase().indexOf(partial) === -1 ) continue;
          items.push({
            label: ids[i], kind: 7,
            textEdit: { range: replaceRange, newText: ids[i] },
            filterText: ids[i],
            sortText: '!' + ids[i].toLowerCase()
          });
          if ( items.length > 200 ) break;
        }
        return items;
      }

      // Inside javaImports: ['...' → Java packages (dynamic from registry)
      if ( /javaImports\s*:\s*\[/.test(this.getLineContext_(lines, position.line)) && /['"][^'"]*$/.test(prefix) ) {
        return this.getJavaImportSuggestions_(replaceRange, this.extractPartial_(prefix));
      }

      return [];
    },

    function cssBlockCompletion_(text, position, prefix) {
      /**
       * Suggest CSS token names when cursor is inside a css: backtick block
       * and the user has typed a $ prefix.
       */
      if ( ! this.cssTokenResolver ) return null;

      var offset = this.analyzer.positionToOffset(text, position);
      var textBefore = text.substring(0, offset);

      // Check if cursor is inside a backtick-delimited CSS block.
      var lastOpenBacktick = -1;
      var btDepth = 0;
      for ( var i = textBefore.length - 1 ; i >= 0 ; i-- ) {
        if ( textBefore[i] === '`' ) {
          btDepth++;
          if ( btDepth % 2 === 1 ) { lastOpenBacktick = i; break; }
        }
      }
      if ( lastOpenBacktick === -1 ) return null;

      // Verify the backtick belongs to a css block key
      var beforeBacktick = text.substring(Math.max(0, lastOpenBacktick - 200), lastOpenBacktick);
      if ( ! /css\s*:\s*$/.test(beforeBacktick) ) return null;

      // Check if prefix ends with $word pattern
      var dollarMatch = prefix.match(/\$(\w*)$/);
      if ( ! dollarMatch ) return null;

      var partial = dollarMatch[1].toLowerCase();
      var allNames = this.cssTokenResolver.getAllTokenNames();
      var items = [];

      for ( var i = 0 ; i < allNames.length ; i++ ) {
        var name = allNames[i];
        if ( partial && name.toLowerCase().indexOf(partial) === -1 ) continue;

        var info = this.cssTokenResolver.getTokenInfo(name);
        var resolved = this.cssTokenResolver.getResolvedValue(name);
        var isColor = info && info.type && info.type.indexOf('ColorToken') !== -1;

        items.push({
          label: name,
          kind: isColor ? 16 : 6,
          detail: resolved || '',
          insertText: name,
          filterText: '$' + name,
          sortText: '!' + name.toLowerCase()
        });
      }

      return items;
    },

    function javaBlockCompletion_(text, position, lines, prefix) {
      /**
       * Suggest getter/setter methods when cursor is inside a Java code block
       * (javaCode, javaGetter, javaPreSet, javaPostSet, javaFactory).
       * Detects backtick-delimited blocks by scanning backward for the opening backtick.
       */
      var offset = this.analyzer.positionToOffset(text, position);

      // Check if cursor is inside a backtick-delimited Java block.
      // Scan backward from cursor to find an unmatched opening backtick,
      // then verify it belongs to a Java block key.
      var textBefore = text.substring(0, offset);
      var lastOpenBacktick = -1;
      var btDepth = 0;
      for ( var i = textBefore.length - 1 ; i >= 0 ; i-- ) {
        if ( textBefore[i] === '`' ) {
          btDepth++;
          if ( btDepth % 2 === 1 ) { lastOpenBacktick = i; break; }
        }
      }
      if ( lastOpenBacktick === -1 ) return null;

      // Verify the backtick belongs to a Java block key
      var beforeBacktick = text.substring(Math.max(0, lastOpenBacktick - 200), lastOpenBacktick);
      if ( ! /(javaCode|javaGetter|javaPreSet|javaPostSet|javaFactory)\s*:\s*$/.test(beforeBacktick) ) {
        return null;
      }

      // User is typing inside a Java code block
      var cache = this.cache || foam.parse.lsp.FileModelCache.create();
      var model = cache.getModelAt('', text, position.line);

      var targetClassId = null;
      var getSet, partial;

      // Empty line or just whitespace inside Java block — suggest all getters and setters
      var trimmedPrefix = prefix.trim();
      if ( trimmedPrefix === '' ) {
        if ( model ) {
          getSet = 'both';
          partial = '';
          targetClassId = model.refines || (model.package ? model.package + '.' + model.name : model.name);
        }
      }

      // Check for get/set/is prefix — either bare (getCreatedBy, getcre) or on a variable (user.get)
      // Also trigger on variable. (dot with no prefix yet) or variable.g/ge partial
      var varGetSet = prefix.match(/(\w+)\.(get|set|is)(\w*)$/);
      var varDot = ! varGetSet ? prefix.match(/(\w+)\.(\w*)$/) : null;
      var bareGetSet = prefix.match(/(?:^|[\s(=!&|,])(?:return\s+)?(get|set|is)(\w*)$/);

      if ( ! targetClassId && ! varGetSet && ! varDot && ! bareGetSet ) return null;

      if ( varGetSet ) {
        // variable.getX — resolve the variable's type from Java declarations
        var javaVarName = varGetSet[1];
        getSet = varGetSet[2];
        partial = varGetSet[3] ? varGetSet[3].toLowerCase() : '';
        targetClassId = this.analyzer.resolveJavaVariableType(text, position, javaVarName, model, this.index);
      } else if ( varDot ) {
        // variable. or variable.g or variable.ge — resolve type, show all getters+setters
        var javaVarName = varDot[1];
        var dotPartial = varDot[2] ? varDot[2].toLowerCase() : '';
        targetClassId = this.analyzer.resolveJavaVariableType(text, position, javaVarName, model, this.index);
        if ( targetClassId ) {
          // Show both getters and setters, filtered by the partial after the dot
          getSet = 'both';
          partial = dotPartial;
        }
      }

      if ( ! targetClassId && bareGetSet ) {
        // Bare getX/setX — use the current model's class
        getSet = bareGetSet[1];
        partial = bareGetSet[2] ? bareGetSet[2].toLowerCase() : '';
        if ( model ) {
          targetClassId = model.refines || (model.package ? model.package + '.' + model.name : model.name);
        }
      }

      if ( ! targetClassId ) return null;

      // Collect properties with Java types
      var items = [];
      var props = this.index.getProperties(targetClassId);

      // Also add own model properties not yet in registry
      if ( model ) {
        var ownNames = {};
        for ( var i = 0 ; i < props.length ; i++ ) ownNames[props[i].name] = true;
        (model.properties || []).forEach(function(p) {
          var name = typeof p === 'string' ? p : p.name;
          if ( name && ! ownNames[name] ) {
            props.push({ name: name, cls_: null });
          }
        });
      }

      for ( var i = 0 ; i < props.length ; i++ ) {
        var p = props[i];
        var propName = p.name;
        var capName = propName.charAt(0).toUpperCase() + propName.substring(1);
        var javaType = this.index.getPropertyJavaType(targetClassId, propName) || 'Object';
        var getLabel = 'get' + capName + '()';
        var setLabel = 'set' + capName + '(' + javaType + ')';

        // Filter: for 'both' mode (variable.partial), match against full label
        if ( partial ) {
          var getMatches = getLabel.toLowerCase().indexOf(partial) !== -1;
          var setMatches = setLabel.toLowerCase().indexOf(partial) !== -1;
          if ( ! getMatches && ! setMatches ) continue;
        }

        if ( getSet === 'get' || getSet === 'is' || getSet === 'both' ) {
          if ( ! partial || getLabel.toLowerCase().indexOf(partial) !== -1 ) {
            items.push({
              label: getLabel,
              kind: 2,
              detail: javaType + ' — ' + propName,
              documentation: javaType + ' get' + capName + '()',
              insertText: 'get' + capName + '()',
              sortText: '!' + propName
            });
          }
        }
        if ( getSet === 'set' || getSet === 'both' ) {
          if ( ! partial || setLabel.toLowerCase().indexOf(partial) !== -1 ) {
            items.push({
              label: setLabel,
              kind: 2,
              detail: 'void — ' + propName,
              documentation: 'void set' + capName + '(' + javaType + ' val)',
              insertText: 'set' + capName + '(',
              sortText: '!' + propName
            });
          }
        }
      }
      return items;
    },

    function getLineContext_(lines, lineNum) {
      var ctx = '';
      for ( var i = Math.max(0, lineNum - 10) ; i <= lineNum ; i++ ) {
        ctx += (lines[i] || '') + '\n';
      }
      return ctx;
    },

    function extractPartial_(prefix) {
      var match = prefix.match(/['"]([^'"]*?)$/);
      return match ? match[1] : '';
    },

    function getJavaImportSuggestions_(replaceRange, partial) {
      /**
       * Build Java import suggestions dynamically from the FOAM registry.
       * Extract unique package prefixes from all class IDs that look like
       * Java-compatible packages (foam.*, com.*, java.*, etc.)
       */
      var ids = this.index.getAllClassIds();
      var packages = {};
      var lower = partial.toLowerCase();

      for ( var i = 0 ; i < ids.length ; i++ ) {
        var id = ids[i];
        var lastDot = id.lastIndexOf('.');
        if ( lastDot <= 0 ) continue;
        var pkg = id.substring(0, lastDot);

        // Skip if doesn't match partial
        if ( lower && id.toLowerCase().indexOf(lower) === -1 &&
             pkg.toLowerCase().indexOf(lower) === -1 ) continue;

        // Add both the full class import and the package prefix
        if ( ! packages[id] ) {
          packages[id] = true;
        }
      }

      var items = [];
      var keys = Object.keys(packages);
      for ( var i = 0 ; i < keys.length ; i++ ) {
        if ( items.length > 200 ) break;
        items.push({
          label: keys[i],
          kind: 7,
          textEdit: { range: replaceRange, newText: keys[i] },
          filterText: keys[i],
          sortText: keys[i].toLowerCase()
        });
      }
      return items;
    },

    function findQuoteStart_(prefix) {
      /** Find the character position right after the opening quote. */
      for ( var i = prefix.length - 1 ; i >= 0 ; i-- ) {
        if ( prefix[i] === "'" || prefix[i] === '"' ) return i + 1;
      }
      return prefix.length;
    },

    function collectSuggestions(text, cursorOffset) {
      /**
       * Uses the SmartView pattern: track maxPos (furthest successful parse),
       * collect suggestions at maxPos. Reset when maxPos advances.
       * Only collect when near the cursor position.
       */
      var suggestions = {};
      var maxPos = 0;

      var apply = function(p, grammar) {
        var result = p.parse(this, grammar);

        // Only consider suggestions from parsers that were tried near cursor
        // AND at positions that are part of a successful parse path
        if ( result && p.suggest ) {
          var s = p.suggest();
          if ( s ) {
            // Track suggestion at the position where the parser started (this.pos)
            var startPos = this.pos;
            if ( startPos >= cursorOffset - 2 && startPos <= cursorOffset + 2 ) {
              suggestions[s.text || s.label] = s;
            }
          }
        }

        // Also collect at current max position (like SmartView)
        if ( this.pos > maxPos ) {
          maxPos = this.pos;
        }
        if ( ! result && p.suggest && this.pos === maxPos &&
             this.pos >= cursorOffset - 2 && this.pos <= cursorOffset + 2 ) {
          var s = p.suggest();
          if ( s ) suggestions[s.text || s.label] = s;
        }

        return result;
      };

      var str = text + String.fromCharCode(26);
      var ps = this.StringPStream.create({ str: str, apply: apply });

      try {
        this.grammar.parse(ps);
      } catch (e) {}

      return suggestions;
    },

    function toCompletionItem(suggestion) {
      return {
        label: suggestion.text || suggestion.label,
        kind: this.categoryToKind(suggestion.category),
        detail: suggestion.hint || '',
        documentation: suggestion.tooltip || '',
        insertText: suggestion.text
      };
    },

    function categoryToKind(category) {
      switch ( category ) {
        case 'class':    return 7;
        case 'property': return 10;
        case 'method':   return 2;
        case 'key':      return 14;
        case 'enum':     return 13;
        case 'operator': return 24;
        default:         return 1;
      }
    }
  ]
});
