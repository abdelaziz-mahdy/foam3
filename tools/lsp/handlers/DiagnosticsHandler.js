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
    function handle(text) {
      if ( ! /foam\.(CLASS|ENUM|INTERFACE|RELATIONSHIP)\s*\(/.test(text) ) {
        return [];
      }

      var diagnostics = [];

      // Extract each foam.CLASS block and validate using grammar
      var self = this;
      this.forEachFoamClass(text, function(block, startOffset) {
        self.validateBlock(text, block, startOffset, diagnostics);
      });

      return diagnostics;
    },

    function forEachFoamClass(text, callback) {
      /** Find each foam.CLASS/ENUM/INTERFACE call and invoke callback with extracted text. */
      var regex = /foam\.(CLASS|ENUM|INTERFACE|RELATIONSHIP)\s*\(/g;
      var match;

      while ( ( match = regex.exec(text) ) !== null ) {
        var start = match.index;
        var end = this.findMatchingEnd(text, start + match[0].length);
        callback(text.substring(start, end), start);
      }
    },

    function findMatchingEnd(text, fromIndex) {
      var depth = 0;
      var inString = false;
      var stringChar = '';

      for ( var i = fromIndex ; i < text.length ; i++ ) {
        var ch = text[i];
        if ( inString ) {
          if ( ch === '\\' ) { i++; continue; }
          if ( ch === stringChar ) inString = false;
          continue;
        }
        if ( ch === "'" || ch === '"' || ch === '`' ) {
          inString = true;
          stringChar = ch;
        } else if ( ch === '(' || ch === '{' || ch === '[' ) {
          depth++;
        } else if ( ch === ')' || ch === '}' || ch === ']' ) {
          if ( depth === 0 ) return i + 1;
          depth--;
        }
      }
      return text.length;
    },

    function validateBlock(fullText, block, startOffset, diagnostics) {
      /**
       * Parse the foam.CLASS block with grammar, collecting validation
       * data via the apply callback, then check references.
       */
      var self = this;
      var classRefs = [];   // { value, pos } — class references found by grammar
      var propTypes = [];   // { value, pos } — property type references
      var maxPos = 0;

      // Use grammar to parse and track what the grammar matched as classRef and propType
      var apply = function(p, grammar) {
        if ( this.pos > maxPos ) maxPos = this.pos;

        // Track suggestions — they tell us what the grammar thinks this token is
        if ( p.suggest ) {
          var s = p.suggest();
          if ( s ) {
            if ( s.category === 'class' ) {
              classRefs.push({ value: s.text, pos: this.pos });
            } else if ( s.category === 'property' ) {
              propTypes.push({ value: s.text, pos: this.pos });
            }
          }
        }

        return p.parse(this, grammar);
      };

      var ps = this.StringPStream.create({ str: block + String.fromCharCode(26), apply: apply });
      try {
        this.grammar.parse(ps);
      } catch (e) {
        // Grammar failed — report parse error position
        if ( maxPos > 0 && maxPos < block.length ) {
          var absPos = startOffset + maxPos;
          var pos = this.offsetToPosition(fullText, absPos);
          diagnostics.push({
            range: { start: pos, end: { line: pos.line, character: pos.character + 10 } },
            severity: 3, // Info
            message: 'FOAM grammar could not fully parse this definition',
            source: 'foam-lsp'
          });
        }
      }

      // Now validate: check extends reference specifically
      var extendsMatch = block.match(/extends\s*:\s*['"]([^'"]+)['"]/);
      if ( extendsMatch ) {
        var classId = extendsMatch[1];
        if ( ! this.index.classExists(classId) ) {
          var absOffset = startOffset + block.indexOf(classId, extendsMatch.index);
          var pos = this.offsetToPosition(fullText, absOffset);
          diagnostics.push({
            range: { start: pos, end: { line: pos.line, character: pos.character + classId.length } },
            severity: 2,
            message: "Unknown class in extends: '" + classId + "'",
            source: 'foam-lsp'
          });
        }
      }

      // Validate requires references
      var requiresBlock = block.match(/requires\s*:\s*\[([\s\S]*?)\]/);
      if ( requiresBlock ) {
        var reqRegex = /['"]([a-zA-Z][\w.]+\.[A-Z]\w*)['"]/g;
        var reqMatch;
        while ( ( reqMatch = reqRegex.exec(requiresBlock[1]) ) !== null ) {
          var reqId = reqMatch[1];
          if ( ! this.index.classExists(reqId) ) {
            var absOffset = startOffset + block.indexOf(requiresBlock[0]) +
                           requiresBlock[0].indexOf(requiresBlock[1]) + reqMatch.index +
                           reqMatch[0].indexOf(reqId);
            var pos = this.offsetToPosition(fullText, absOffset);
            diagnostics.push({
              range: { start: pos, end: { line: pos.line, character: pos.character + reqId.length } },
              severity: 2,
              message: "Unknown class in requires: '" + reqId + "'",
              source: 'foam-lsp'
            });
          }
        }
      }

      // Validate property types — check both short and full names
      var validTypes = {};
      var ptypes = this.index.getPropertyTypes();
      for ( var i = 0 ; i < ptypes.length ; i++ ) {
        validTypes[ptypes[i].name] = true;
        validTypes[ptypes[i].id] = true;
      }

      var classRegex = /class\s*:\s*['"]([^'"]+)['"]/g;
      var classMatch;
      while ( ( classMatch = classRegex.exec(block) ) !== null ) {
        var typeName = classMatch[1];
        if ( ! validTypes[typeName] && ! this.index.classExists(typeName) ) {
          var absOffset = startOffset + classMatch.index + classMatch[0].indexOf(typeName);
          var pos = this.offsetToPosition(fullText, absOffset);
          diagnostics.push({
            range: { start: pos, end: { line: pos.line, character: pos.character + typeName.length } },
            severity: 3, // Info only — might be a valid type we don't know about
            message: "Unknown property type: '" + typeName + "'",
            source: 'foam-lsp'
          });
        }
      }
    },

    function offsetToPosition(text, offset) {
      var line = 0;
      var col = 0;
      for ( var i = 0 ; i < offset && i < text.length ; i++ ) {
        if ( text[i] === '\n' ) { line++; col = 0; } else { col++; }
      }
      return { line: line, character: col };
    }
  ]
});
