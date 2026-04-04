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

      // Try as method/property on current class — navigate to the defining class
      var segment = this.analyzer.getSegmentAtPosition(text, position);
      if ( segment ) {
        var model = this.cache.getModelAt('', text, position.line);
        var classId = model ? (model.refines || (model.package ? model.package + '.' + model.name : model.name)) : null;
        if ( classId ) {
          var cls = this.index.getClass(classId);
          if ( cls ) {
            // Check if it's a method
            var methods = cls.getAxiomsByClass(foam.lang.Method);
            for ( var i = 0 ; i < methods.length ; i++ ) {
              if ( methods[i].name === segment ) {
                // Find which class in the hierarchy defines this method
                var defClass = this.findMethodDefiner_(cls, segment);
                if ( defClass ) {
                  filePath = this.index.getFilePath(defClass);
                  if ( filePath ) return this.buildLocationAtMethod(filePath, defClass, segment);
                }
              }
            }
            // Check if it's a property
            var prop = cls.getAxiomByName(segment);
            if ( prop && foam.lang.Property.isInstance(prop) ) {
              var defClass = this.findPropertyDefiner_(cls, segment);
              if ( defClass ) {
                filePath = this.index.getFilePath(defClass);
                if ( filePath ) return this.buildLocationAtProperty(filePath, segment);
              }
            }
          }
        }

        // Try as short name from requires
        var resolved = this.analyzer.resolveShortName(text, segment);
        if ( resolved ) {
          filePath = this.index.getFilePath(resolved);
          if ( filePath ) return this.buildLocation(filePath, resolved);
        }
      }

      return null;
    },

    function findMethodDefiner_(cls, methodName) {
      /** Walk the class hierarchy to find which class defines the method. */
      while ( cls ) {
        var own = cls.getOwnAxiomsByClass(foam.lang.Method);
        for ( var i = 0 ; i < own.length ; i++ ) {
          if ( own[i].name === methodName ) return cls.id;
        }
        cls = cls.model_.extends ? this.index.getClass(cls.model_.extends) : null;
      }
      return null;
    },

    function findPropertyDefiner_(cls, propName) {
      /** Walk the class hierarchy to find which class defines the property. */
      while ( cls ) {
        var own = cls.getOwnAxiomsByClass(foam.lang.Property);
        for ( var i = 0 ; i < own.length ; i++ ) {
          if ( own[i].name === propName ) return cls.id;
        }
        cls = cls.model_.extends ? this.index.getClass(cls.model_.extends) : null;
      }
      return null;
    },

    function buildLocationAtMethod(filePath, classId, methodName) {
      /**
       * Jump to a method definition within the correct class in the file.
       * Uses FileModelCache to find the class's source range, then searches
       * only within that range — avoids matching refinement methods.
       */
      try {
        var fs_ = require('fs');
        var content = fs_.readFileSync(filePath, 'utf8');

        // Find the correct model's source range
        var models = this.cache.parseFileModels(content);
        var startLine = 0;
        var endLine = content.split('\n').length;
        for ( var i = 0 ; i < models.length ; i++ ) {
          var m = models[i];
          var id = m.refines || (m.package ? m.package + '.' + m.name : m.name);
          if ( id === classId ) {
            startLine = m.sourceLine_ || 0;
            endLine = (i + 1 < models.length && models[i + 1].sourceLine_) ? models[i + 1].sourceLine_ : endLine;
            break;
          }
        }

        // Search for the method only within the model's range
        var lines = content.split('\n');
        var regex = new RegExp('function\\s+' + methodName + '\\s*\\(');
        for ( var ln = startLine ; ln < endLine ; ln++ ) {
          if ( regex.test(lines[ln]) ) {
            return { uri: 'file://' + filePath, range: { start: { line: ln, character: 0 }, end: { line: ln, character: 0 } } };
          }
        }
      } catch (e) {}
      return this.buildLocation(filePath, classId);
    },

    function buildLocationAtProperty(filePath, propName) {
      /** Jump to a property definition within a file. */
      try {
        var fs_ = require('fs');
        var content = fs_.readFileSync(filePath, 'utf8');
        var regex = new RegExp("name\\s*:\\s*['\"]" + propName + "['\"]");
        var match = regex.exec(content);
        if ( match ) {
          var line = 0;
          for ( var i = 0 ; i < match.index ; i++ ) {
            if ( content[i] === '\n' ) line++;
          }
          return { uri: 'file://' + filePath, range: { start: { line: line, character: 0 }, end: { line: line, character: 0 } } };
        }
      } catch (e) {}
      return this.buildLocation(filePath);
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
