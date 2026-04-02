/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.parse.lsp.handlers',
  name: 'HoverHandler',

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
       * Returns { contents: { kind: 'markdown', value: String }, range: Range } or null.
       */
      if ( ! /foam\.(CLASS|ENUM|INTERFACE|RELATIONSHIP)\s*\(/.test(text) ) {
        return null;
      }

      var word = this.getWordAtPosition(text, position);
      if ( ! word ) return null;

      // Try as class ID
      if ( this.index.classExists(word) ) {
        var doc = this.index.getClassDoc(word);
        if ( doc ) {
          return {
            contents: { kind: 'markdown', value: doc }
          };
        }
      }

      // Try as a dotted class ID by expanding the word to include dots
      var dottedWord = this.getDottedWordAtPosition(text, position);
      if ( dottedWord && this.index.classExists(dottedWord) ) {
        var doc = this.index.getClassDoc(dottedWord);
        if ( doc ) {
          return {
            contents: { kind: 'markdown', value: doc }
          };
        }
      }

      return null;
    },

    function getWordAtPosition(text, position) {
      var lines = text.split('\n');
      var line = lines[position.line] || '';
      var ch = position.character;

      var start = ch;
      while ( start > 0 && /[a-zA-Z0-9_]/.test(line[start - 1]) ) start--;
      var end = ch;
      while ( end < line.length && /[a-zA-Z0-9_]/.test(line[end]) ) end++;

      return line.substring(start, end);
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
      // Strip surrounding quotes
      if ( word.startsWith("'") ) word = word.substring(1);
      if ( word.endsWith("'") ) word = word.substring(0, word.length - 1);
      return word;
    }
  ]
});
