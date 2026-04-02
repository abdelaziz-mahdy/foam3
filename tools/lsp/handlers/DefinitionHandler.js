/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.parse.lsp.handlers',
  name: 'DefinitionHandler',

  requires: [
    'foam.parse.lsp.FoamIndex'
  ],

  properties: [
    {
      class: 'FObjectProperty',
      of: 'foam.parse.lsp.FoamIndex',
      name: 'index',
      factory: function() { return this.FoamIndex.create(); }
    }
  ],

  methods: [
    function handle(text, position) {
      /**
       * Returns { uri: String, range: { start, end } } or null.
       */
      if ( ! /foam\.(CLASS|ENUM|INTERFACE|RELATIONSHIP)\s*\(/.test(text) ) {
        return null;
      }

      var classId = this.getDottedWordAtPosition(text, position);
      if ( ! classId ) return null;

      var loc = this.index.getSourceLocation(classId);
      if ( ! loc ) return null;

      return {
        uri: 'file://' + loc.path,
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 0 }
        }
      };
    },

    function getDottedWordAtPosition(text, position) {
      var lines = text.split('\n');
      var line = lines[position.line] || '';
      var ch = position.character;

      var start = ch;
      while ( start > 0 && /[a-zA-Z0-9_.]/.test(line[start - 1]) ) start--;
      var end = ch;
      while ( end < line.length && /[a-zA-Z0-9_.]/.test(line[end]) ) end++;

      var word = line.substring(start, end);
      if ( word.startsWith("'") ) word = word.substring(1);
      if ( word.endsWith("'") ) word = word.substring(0, word.length - 1);
      return word;
    }
  ]
});
