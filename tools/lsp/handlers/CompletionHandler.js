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
            sortText: t.name.toLowerCase()
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
            sortText: ids[i].toLowerCase()
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

      // User is typing inside a Java code block — check for get/set prefix
      var wordMatch = prefix.match(/(get|set|is)([A-Z]\w*)?$/);
      if ( ! wordMatch ) return null;

      var getSet = wordMatch[1]; // 'get', 'set', or 'is'
      var partial = wordMatch[2] ? wordMatch[2].toLowerCase() : '';

      // Build property list from the model
      var cache = this.cache || foam.parse.lsp.FileModelCache.create();
      var model = cache.getModelAt('', text, position.line);
      if ( ! model ) return null;

      var classId = model.refines || (model.package ? model.package + '.' + model.name : model.name);
      var props = [];

      // Own properties from model
      (model.properties || []).forEach(function(p) {
        var name = typeof p === 'string' ? p : p.name;
        if ( name ) props.push(name);
      });

      // Inherited properties from class registry
      var cls = this.index.getClass(classId);
      if ( cls ) {
        var axioms = cls.getAxiomsByClass(foam.lang.Property);
        for ( var i = 0 ; i < axioms.length ; i++ ) {
          if ( props.indexOf(axioms[i].name) === -1 ) props.push(axioms[i].name);
        }
      }

      // Build completion items
      var items = [];
      for ( var i = 0 ; i < props.length ; i++ ) {
        var propName = props[i];
        var capName = propName.charAt(0).toUpperCase() + propName.substring(1);
        if ( partial && capName.toLowerCase().indexOf(partial) !== 0 ) continue;

        if ( getSet === 'get' || getSet === 'is' ) {
          items.push({
            label: 'get' + capName + '()',
            kind: 2, // Method
            detail: 'getter for ' + propName,
            insertText: 'get' + capName + '()',
            sortText: '0_' + propName
          });
        }
        if ( getSet === 'set' ) {
          items.push({
            label: 'set' + capName + '(val)',
            kind: 2,
            detail: 'setter for ' + propName,
            insertText: 'set' + capName + '(',
            sortText: '0_' + propName
          });
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
