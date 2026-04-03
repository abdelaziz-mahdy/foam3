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
