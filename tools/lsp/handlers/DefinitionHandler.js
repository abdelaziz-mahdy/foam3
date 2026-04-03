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
      if ( ! /foam\.(CLASS|ENUM|INTERFACE|RELATIONSHIP)\s*\(/.test(text) ) {
        return null;
      }

      var word = this.getDottedWordAtPosition(text, position);
      if ( ! word ) return null;

      // Try as full class ID
      var filePath = this.index.getFilePath(word);
      if ( filePath ) return this.buildLocation(filePath);

      // Try as short property type name → resolve to full ID → get file
      var propTypes = this.index.getPropertyTypes();
      for ( var i = 0 ; i < propTypes.length ; i++ ) {
        if ( propTypes[i].name === word ) {
          filePath = this.index.getFilePath(propTypes[i].id);
          if ( filePath ) return this.buildLocation(filePath);
          break;
        }
      }

      return null;
    },

    function buildLocation(filePath) {
      return {
        uri: 'file://' + filePath,
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
