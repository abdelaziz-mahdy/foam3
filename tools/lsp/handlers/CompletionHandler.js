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
    'foam.parse.lsp.FoamClassGrammar',
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
      of: 'foam.parse.lsp.FoamClassGrammar',
      name: 'grammar',
      factory: function() { return this.FoamClassGrammar.create({ index: this.index }); }
    }
  ],

  methods: [
    function handle(text, position) {
      if ( ! /foam\.(CLASS|ENUM|INTERFACE|RELATIONSHIP)\s*\(/.test(text) ) {
        return { isIncomplete: false, items: [] };
      }

      var offset = this.positionToOffset(text, position);
      var suggestions = this.collectSuggestions(text, offset);

      var items = [];
      var keys = Object.keys(suggestions);
      for ( var i = 0 ; i < keys.length ; i++ ) {
        var s = suggestions[keys[i]];
        items.push(this.toCompletionItem(s));
      }

      // Fallback: if grammar found no suggestions, detect context from line text
      // and provide appropriate items. This handles partial values like 'foam.'
      // where the grammar's sug(literal(...)) can't match.
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

      // Inside class: '...' → property types
      if ( /class\s*:\s*['"][^'"]*$/.test(prefix) ) {
        return this.index.getPropertyTypes().map(function(t) {
          return { label: t.name, kind: 7, detail: t.id, insertText: t.name, sortText: t.name.toLowerCase() };
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
          items.push({ label: ids[i], kind: 7, insertText: ids[i], sortText: ids[i].toLowerCase() });
          if ( items.length > 200 ) break;
        }
        return items;
      }

      // Inside javaImports: ['...' → Java packages
      if ( /javaImports\s*:\s*\[/.test(this.getLineContext_(lines, position.line)) && /['"][^'"]*$/.test(prefix) ) {
        return [
          { label: 'foam.lang.', kind: 9, detail: 'FObject, X, PropertyInfo' },
          { label: 'foam.core.', kind: 9, detail: 'auth, logger, ruler' },
          { label: 'java.util.', kind: 9, detail: 'List, ArrayList, Map, Set' },
          { label: 'java.io.', kind: 9, detail: 'IO classes' }
        ];
      }

      return [];
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

    function positionToOffset(text, position) {
      var lines = text.split('\n');
      var offset = 0;
      for ( var i = 0 ; i < position.line && i < lines.length ; i++ ) {
        offset += lines[i].length + 1;
      }
      offset += Math.min(position.character, (lines[position.line] || '').length);
      return offset;
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
