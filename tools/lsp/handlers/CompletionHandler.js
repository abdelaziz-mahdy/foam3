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

      // Extract just the foam.CLASS(...) portion for grammar parsing
      var extracted = this.extractFoamClass(text, offset);
      if ( ! extracted ) {
        return { isIncomplete: false, items: [] };
      }

      var suggestions = this.collectSuggestions(extracted.text, extracted.cursorOffset);

      var items = [];
      var keys = Object.keys(suggestions);
      for ( var i = 0 ; i < keys.length ; i++ ) {
        var s = suggestions[keys[i]];
        items.push(this.toCompletionItem(s));
      }

      return { isIncomplete: false, items: items };
    },

    function extractFoamClass(text, cursorOffset) {
      /**
       * Find the foam.CLASS/ENUM/INTERFACE call that contains the cursor.
       * Returns { text: 'foam.CLASS({...})', cursorOffset: N, startOffset: N }
       * where cursorOffset is relative to the extracted text.
       */
      var regex = /foam\.(CLASS|ENUM|INTERFACE|RELATIONSHIP)\s*\(/g;
      var match;
      var bestMatch = null;

      while ( ( match = regex.exec(text) ) !== null ) {
        var start = match.index;
        // Find the matching closing paren by tracking depth
        var depth = 0;
        var inString = false;
        var stringChar = '';
        var end = start + match[0].length;

        for ( var i = end ; i < text.length ; i++ ) {
          var ch = text[i];

          if ( inString ) {
            if ( ch === '\\' ) { i++; continue; } // skip escaped chars
            if ( ch === stringChar ) inString = false;
            continue;
          }

          if ( ch === "'" || ch === '"' || ch === '`' ) {
            inString = true;
            stringChar = ch;
          } else if ( ch === '(' || ch === '{' || ch === '[' ) {
            depth++;
          } else if ( ch === ')' || ch === '}' || ch === ']' ) {
            if ( depth === 0 ) {
              end = i + 1;
              break;
            }
            depth--;
          }
        }

        // Check if cursor is within this foam.CLASS call
        if ( cursorOffset >= start && cursorOffset <= end ) {
          bestMatch = {
            text: text.substring(start, end),
            cursorOffset: cursorOffset - start,
            startOffset: start
          };
          break;
        }
      }

      return bestMatch;
    },

    function collectSuggestions(text, cursorOffset) {
      var suggestions = {};
      var cursorSuggestions = {};

      var apply = function(p, grammar) {
        // Collect suggestions near cursor position
        if ( p.suggest && this.pos >= cursorOffset - 1 && this.pos <= cursorOffset + 1 ) {
          var s = p.suggest();
          if ( s ) cursorSuggestions[s.text || s.label] = s;
        }
        return p.parse(this, grammar);
      };

      var str = text + String.fromCharCode(26);
      var ps = this.StringPStream.create({ str: str, apply: apply });

      try {
        this.grammar.parse(ps);
      } catch (e) {
        // Grammar parse failed — return whatever we collected
      }

      return cursorSuggestions;
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
