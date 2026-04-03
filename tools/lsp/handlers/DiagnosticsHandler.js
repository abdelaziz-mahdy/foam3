/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.parse.lsp.handlers',
  name: 'DiagnosticsHandler',

  requires: [
    'foam.parse.lsp.FoamIndex',
    'foam.parse.lsp.FileModelCache',
    'foam.parse.lsp.CursorAnalyzer',
    'foam.parse.lsp.handlers.JavaBlockValidator'
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
    },
    {
      class: 'FObjectProperty',
      of: 'foam.parse.lsp.handlers.JavaBlockValidator',
      name: 'javaValidator',
      factory: function() { return this.JavaBlockValidator.create({ index: this.index }); }
    },
    {
      name: 'validTypes_',
      factory: function() {
        var types = {};
        var propTypes = this.index.getPropertyTypes();
        for ( var i = 0 ; i < propTypes.length ; i++ ) {
          types[propTypes[i].name] = true;
          types[propTypes[i].id] = true;
        }
        return types;
      }
    }
  ],

  methods: [
    function handle(text, opt_uri) {
      if ( ! /foam\.(CLASS|ENUM|INTERFACE|RELATIONSHIP)\s*\(/.test(text) ) {
        return [];
      }

      var uri = opt_uri || '';
      var models = this.cache.getModels(uri, text);
      var diagnostics = [];

      for ( var i = 0 ; i < models.length ; i++ ) {
        this.validateModel_(models[i], text, diagnostics);
      }

      return diagnostics;
    },

    function validateModel_(m, text, diagnostics) {
      var classId = m.refines || (m.package ? m.package + '.' + m.name : m.name);
      var modelOffset = m.sourceLine_ ? this.analyzer.positionToOffset(text, { line: m.sourceLine_, character: 0 }) : 0;

      // Validate extends
      if ( m.extends && ! this.classKnown_(m.extends) ) {
        var loc = this.findInText_(text, 'extends', m.extends, modelOffset);
        if ( loc !== null ) this.addDiag_(diagnostics, text, loc, m.extends.length, 2,
          "Unknown class in extends: '" + m.extends + "'");
      }

      // Validate requires — parse 'as' aliases to extract the real class ID
      var requires = m.requires || [];
      for ( var i = 0 ; i < requires.length ; i++ ) {
        var parsed = this.cache.parseRequiresEntry(requires[i]);
        if ( ! parsed ) continue;
        var reqId = parsed.classId;
        if ( reqId && ! this.classKnown_(reqId) ) {
          var loc = this.findInText_(text, null, reqId, modelOffset);
          if ( loc !== null ) this.addDiag_(diagnostics, text, loc, reqId.length, 2,
            "Unknown class in requires: '" + reqId + "'");
        }
      }

      // Validate property types
      var props = m.properties || [];
      for ( var i = 0 ; i < props.length ; i++ ) {
        var p = props[i];
        if ( typeof p === 'object' && p.class ) {
          if ( ! this.validTypes_[p.class] && ! this.classKnown_(p.class) ) {
            var loc = this.findInText_(text, 'class', p.class, modelOffset);
            if ( loc !== null ) this.addDiag_(diagnostics, text, loc, p.class.length, 3,
              "Unknown property type: '" + p.class + "'");
          }
        }
      }

      // Validate Java blocks
      this.javaValidator.validateModel(m, classId, diagnostics, text);
    },

    function classKnown_(classId) {
      /**
       * Check if a class is known — registered in FOAM runtime OR in the
       * POM file index. The file index includes all files from the POM walk
       * with the current flags, so flag-filtered classes (test, swift, etc.)
       * are correctly excluded unless the user enables those flags.
       */
      return this.index.classExists(classId) || this.index.getFilePath(classId) != null;
    },

    function findInText_(text, key, value, opt_startOffset) {
      /** Find the offset of a value string in text, optionally near a key. */
      var escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      var searchStr = key ? key + "\\s*:\\s*['\"]" + escaped : "['\"]" + escaped;
      var regex = new RegExp(searchStr, 'g');
      if ( opt_startOffset ) regex.lastIndex = opt_startOffset;
      var match = regex.exec(text);
      if ( ! match ) return null;
      return match.index + match[0].indexOf(value);
    },

    function addDiag_(diagnostics, text, offset, length, severity, message) {
      var pos = this.analyzer.offsetToPosition(text, offset);
      diagnostics.push({
        range: {
          start: pos,
          end: { line: pos.line, character: pos.character + length }
        },
        severity: severity,
        message: message,
        source: 'foam-lsp'
      });
    }
  ]
});
