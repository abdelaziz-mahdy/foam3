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

      return { isIncomplete: false, items: items };
    },

    function collectSuggestions(text, cursorOffset) {
      // Collect ALL suggestions with their positions, then pick nearest to cursor
      var allSuggestions = []; // { pos, suggestion }

      var apply = function(p, grammar) {
        if ( p.suggest ) {
          var s = p.suggest();
          if ( s ) allSuggestions.push({ pos: this.pos, suggestion: s });
        }
        return p.parse(this, grammar);
      };

      var str = text + String.fromCharCode(26);
      var ps = this.StringPStream.create({ str: str, apply: apply });

      try {
        this.grammar.parse(ps);
      } catch (e) {}

      // Find suggestions closest to cursor (within 5 chars)
      var best = {};
      var bestDist = 999999;
      for ( var i = 0 ; i < allSuggestions.length ; i++ ) {
        var dist = Math.abs(allSuggestions[i].pos - cursorOffset);
        if ( dist < bestDist ) {
          bestDist = dist;
          best = {};
          best[allSuggestions[i].suggestion.text || allSuggestions[i].suggestion.label] = allSuggestions[i].suggestion;
        } else if ( dist === bestDist ) {
          var s = allSuggestions[i].suggestion;
          best[s.text || s.label] = s;
        }
      }

      return bestDist <= 5 ? best : {};
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
