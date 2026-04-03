/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.parse.lsp.handlers',
  name: 'DefinitionHandler',

  requires: [
    'foam.parse.lsp.FoamIndex',
    'foam.parse.lsp.FileModelCache',
    'foam.parse.lsp.CursorAnalyzer'
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
      of: 'foam.parse.lsp.CursorAnalyzer',
      name: 'analyzer',
      factory: function() { return this.CursorAnalyzer.create(); }
    }
  ],

  methods: [
    function handle(text, position) {
      if ( ! /foam\.(CLASS|ENUM|INTERFACE|RELATIONSHIP)\s*\(/.test(text) ) {
        return null;
      }

      var word = this.analyzer.getDottedWordAtPosition(text, position);
      if ( ! word ) return null;

      // Try as full class ID
      var filePath = this.index.getFilePath(word);
      if ( filePath ) return this.buildLocation(filePath, word);

      // Try as short property type name → resolve to full ID → get file
      var propTypes = this.index.getPropertyTypes();
      for ( var i = 0 ; i < propTypes.length ; i++ ) {
        if ( propTypes[i].name === word ) {
          filePath = this.index.getFilePath(propTypes[i].id);
          if ( filePath ) return this.buildLocation(filePath, propTypes[i].id);
          break;
        }
      }

      return null;
    },

    function buildLocation(filePath, opt_classId) {
      var line = 0;
      if ( opt_classId ) {
        try {
          var fs_ = require('fs');
          var content = fs_.readFileSync(filePath, 'utf8');
          var models = this.cache.parseFileModels(content);
          for ( var i = 0 ; i < models.length ; i++ ) {
            var m = models[i];
            var id = m.refines || (m.package ? m.package + '.' + m.name : m.name);
            if ( id === opt_classId && m.sourceLine_ ) { line = m.sourceLine_; break; }
          }
        } catch (e) {}
      }
      return {
        uri: 'file://' + filePath,
        range: {
          start: { line: line, character: 0 },
          end: { line: line, character: 0 }
        }
      };
    }
  ]
});
