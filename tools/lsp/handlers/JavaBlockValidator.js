/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.parse.lsp.handlers',
  name: 'JavaBlockValidator',

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
    function validate(classId, text, diagnostics, baseOffset, fullText) {
      /**
       * Validate Java code blocks within a foam.CLASS definition.
       * text: the foam.CLASS block text
       * baseOffset: offset of this block in the full file
       * fullText: the full file text (for position mapping)
       */
      this.validateJavaImports(classId, text, diagnostics, baseOffset, fullText);
      this.validateGettersSetters(classId, text, diagnostics, baseOffset, fullText);
    },

    function validateJavaImports(classId, text, diagnostics, baseOffset, fullText) {
      var mappings = this.index.getJavaImportMappings();
      var regex = /javaImports\s*:\s*\[([\s\S]*?)\]/g;
      var match = regex.exec(text);
      if ( ! match ) return;

      var block = match[1];
      var blockOffset = match.index + text.indexOf(block, match.index);

      var importRegex = /['"]([^'"]+)['"]/g;
      var imp;
      while ( ( imp = importRegex.exec(block) ) !== null ) {
        var importStr = imp[1];
        // Check known bad imports
        for ( var bad in mappings ) {
          if ( importStr.indexOf(bad) === 0 || importStr === bad ) {
            var absOffset = baseOffset + blockOffset + imp.index + imp[0].indexOf(importStr);
            var pos = this.offsetToPosition(fullText, absOffset);
            diagnostics.push({
              range: {
                start: pos,
                end: { line: pos.line, character: pos.character + importStr.length }
              },
              severity: 1, // Error
              message: "Wrong Java package: '" + importStr + "' → use '" + mappings[bad] + "' instead",
              source: 'foam-lsp'
            });
            break;
          }
        }
      }
    },

    function validateGettersSetters(classId, text, diagnostics, baseOffset, fullText) {
      if ( ! classId ) return;

      // Collect all property names for this class
      var props = this.index.getProperties(classId);
      var propNames = {};
      for ( var i = 0 ; i < props.length ; i++ ) {
        propNames[props[i].name.toLowerCase()] = props[i].name;
      }

      // Find all javaCode/javaPreSet/javaPostSet/javaFactory/javaGetter blocks
      var javaBlockRegex = /(javaCode|javaPreSet|javaPostSet|javaFactory|javaGetter)\s*:\s*[`'"]/g;
      var jMatch;
      while ( ( jMatch = javaBlockRegex.exec(text) ) !== null ) {
        // Find the end of this block
        var startChar = text[jMatch.index + jMatch[0].length - 1];
        var blockStart = jMatch.index + jMatch[0].length;
        var blockEnd = text.indexOf(startChar, blockStart);
        if ( blockEnd === -1 ) continue;
        var javaBlock = text.substring(blockStart, blockEnd);

        // Find getter/setter calls that are on 'this' (not on other objects).
        // Only flag bare getX()/setX() calls — NOT obj.getX() or variable.setX()
        // A bare call has no '.' immediately before it (start of line, after space,
        // after '(' , after '=' , after 'return', etc.)
        var getSetRegex = /(get|set)([A-Z][a-zA-Z0-9_]*)\s*\(/g;
        var gs;
        while ( ( gs = getSetRegex.exec(javaBlock) ) !== null ) {
          // Check character before the match — if it's '.', this is a method call on another object
          var charBefore = gs.index > 0 ? javaBlock[gs.index - 1] : ' ';
          if ( charBefore === '.' ) continue; // e.g., formatter.setQuoteKeys(), conn.getOutputStream()

          var propName = gs[2].charAt(0).toLowerCase() + gs[2].substring(1);
          // Skip known framework methods and common Java patterns
          if ( ['x', 'class', 'classInfo', 'ownClassInfo', 'instance', 'logger'].indexOf(propName) !== -1 ) continue;
          if ( ! propNames[propName.toLowerCase()] ) {
            var absOffset = baseOffset + blockStart + gs.index;
            var pos = this.offsetToPosition(fullText, absOffset);
            diagnostics.push({
              range: {
                start: pos,
                end: { line: pos.line, character: pos.character + gs[0].length - 1 }
              },
              severity: 3, // Info (not warning — could be a local variable method)
              message: "Property '" + propName + "' not found on " + classId,
              source: 'foam-lsp'
            });
          }
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
