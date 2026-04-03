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
      if ( ! /foam\.(CLASS|ENUM|INTERFACE|RELATIONSHIP)\s*\(/.test(text) ) {
        return null;
      }

      var word = this.getDottedWordAtPosition(text, position);
      if ( ! word ) return null;

      // Try as class ID (full path like foam.lang.FObject)
      if ( this.index.classExists(word) ) {
        return this.buildClassHover(word);
      }

      // Try as property type (short name like String, FObjectProperty)
      var propTypes = this.index.getPropertyTypes();
      for ( var i = 0 ; i < propTypes.length ; i++ ) {
        if ( propTypes[i].name === word ) {
          return this.buildClassHover(propTypes[i].id);
        }
      }

      // Get the specific segment under cursor (not the full dotted chain)
      var segment = this.getSegmentAtPosition_(text, position);

      // Try as short name from requires (e.g., StackBlock → foam.u2.stack.StackBlock)
      if ( segment ) {
        var resolved = this.resolveRequiredClass_(text, segment);
        if ( resolved ) {
          return this.buildClassHover(resolved);
        }
      }

      // Try 'create' — show info about the class being created
      if ( segment === 'create' ) {
        var createHover = this.buildCreateHover_(text, position);
        if ( createHover ) return createHover;
      }

      // Try segment as property or method name — resolve the current class
      var lookupName = segment || word;
      var currentClassId = this.resolveCurrentClass(text);
      if ( currentClassId ) {
        // Property hover
        var propDoc = this.index.getPropertyDoc(currentClassId, lookupName);
        if ( propDoc ) {
          return { contents: { kind: 'markdown', value: propDoc } };
        }

        // Method hover — show signature and documentation
        var methods = this.index.getMethods(currentClassId);
        for ( var i = 0 ; i < methods.length ; i++ ) {
          if ( methods[i].name === lookupName ) {
            return { contents: { kind: 'markdown', value: this.buildMethodHover_(methods[i], currentClassId) } };
          }
        }
      }

      return null;
    },

    function buildClassHover(classId) {
      var cls = this.index.getClass(classId);
      if ( ! cls ) return null;
      var m = cls.model_;

      var md = '**' + m.id + '**\n\n';
      if ( m.extends && m.extends !== 'FObject' ) md += 'extends `' + m.extends + '`\n\n';
      if ( m.documentation ) md += m.documentation + '\n\n';

      // Own properties
      var ownProps = this.index.getOwnProperties(classId);
      if ( ownProps.length > 0 ) {
        md += '**Own Properties:**\n';
        for ( var i = 0 ; i < ownProps.length ; i++ ) {
          var p = ownProps[i];
          var typeName = p.cls_ && p.cls_.model_ ? p.cls_.model_.name : 'Property';
          md += '- `' + p.name + '` (' + typeName + ')';
          if ( p.documentation ) md += ' — ' + p.documentation.split('\n')[0].substring(0, 60);
          md += '\n';
        }
        md += '\n';
      }

      // Inherited properties (grouped by source)
      var inherited = this.index.getInheritedProperties(classId);
      for ( var g = 0 ; g < inherited.length ; g++ ) {
        var group = inherited[g];
        md += '**Inherited from ' + group.className + ':**\n';
        for ( var j = 0 ; j < Math.min(group.properties.length, 5) ; j++ ) {
          var ip = group.properties[j];
          var iTypeName = ip.cls_ && ip.cls_.model_ ? ip.cls_.model_.name : 'Property';
          md += '- `' + ip.name + '` (' + iTypeName + ')\n';
        }
        if ( group.properties.length > 5 ) {
          md += '- ... and ' + (group.properties.length - 5) + ' more\n';
        }
        md += '\n';
      }

      // Methods
      var methods = this.index.getMethods(classId);
      if ( methods.length > 0 ) {
        var methodNames = methods.slice(0, 10).map(function(m) { return '`' + m.name + '`'; });
        md += '**Methods:** ' + methodNames.join(', ');
        if ( methods.length > 10 ) md += ' ... and ' + (methods.length - 10) + ' more';
        md += '\n';
      }

      return { contents: { kind: 'markdown', value: md } };
    },

    function resolveRequiredClass_(text, shortName) {
      /** Resolve a short class name from requires: [...] to full ID. */
      var requiresMatch = text.match(/requires\s*:\s*\[([\s\S]*?)\]/);
      if ( ! requiresMatch ) return null;
      var regex = /['"]([a-zA-Z][\w.]+\.(\w+))(?:\s+as\s+(\w+))?['"]/g;
      var m;
      while ( ( m = regex.exec(requiresMatch[1]) ) !== null ) {
        var alias = m[3] || m[2];
        if ( alias === shortName && this.index.classExists(m[1]) ) return m[1];
      }
      return null;
    },

    function buildCreateHover_(text, position) {
      /** When hovering on 'create', resolve the class and show its info. */
      var lines = text.split('\n');
      var line = lines[position.line] || '';
      // Find ClassName.create or this.ShortName.create
      var match = line.match(/(?:this\.)?(\w[\w.]*)\.create/);
      if ( ! match ) return null;
      var name = match[1];
      // Try as short name from requires
      var resolved = this.resolveRequiredClass_(text, name);
      // Try as full class ID
      if ( ! resolved && this.index.classExists(name) ) resolved = name;
      if ( ! resolved ) return null;

      var cls = this.index.getClass(resolved);
      if ( ! cls ) return null;
      var md = '**create** — Create a new `' + resolved + '` instance\n\n';
      var props = this.index.getOwnProperties(resolved);
      if ( props.length > 0 ) {
        md += '**Properties you can set:**\n';
        for ( var i = 0 ; i < Math.min(props.length, 10) ; i++ ) {
          var p = props[i];
          var typeName = p.cls_ && p.cls_.model_ ? p.cls_.model_.name : 'Property';
          md += '- `' + p.name + '` (' + typeName + ')\n';
        }
        if ( props.length > 10 ) md += '- ... and ' + (props.length - 10) + ' more\n';
      }
      return { contents: { kind: 'markdown', value: md } };
    },

    function buildMethodHover_(method, classId) {
      /** Build markdown hover for a method with signature. */
      var sig = method.name;
      // Extract params from formal args or function code
      if ( method.args && method.args.length > 0 ) {
        var params = method.args.map(function(a) {
          return ( a.type ? a.type + ' ' : '' ) + a.name;
        });
        sig += '(' + params.join(', ') + ')';
      } else if ( method.code ) {
        var match = method.code.toString().match(/function\s*\w*\s*\(([^)]*)\)/);
        if ( match && match[1].trim() ) {
          sig += '(' + match[1].trim() + ')';
        } else {
          sig += '()';
        }
      } else {
        sig += '()';
      }

      var md = '**' + sig + '**\n\n';
      md += 'Method on `' + classId + '`\n\n';
      if ( method.documentation ) md += method.documentation + '\n\n';
      if ( method.type ) md += 'Returns: `' + method.type + '`\n';
      return md;
    },

    function resolveCurrentClass(text) {
      var pkgMatch = text.match(/package\s*:\s*['"]([^'"]+)['"]/);
      var nameMatch = text.match(/name\s*:\s*['"]([^'"]+)['"]/);
      if ( ! nameMatch ) return null;
      return pkgMatch ? pkgMatch[1] + '.' + nameMatch[1] : nameMatch[1];
    },

    function getSegmentAtPosition_(text, position) {
      /**
       * For chains like 'this.Suggestion.create', returns just the segment
       * under the cursor. Used for resolving short names and method names.
       */
      var lines = text.split('\n');
      var line = lines[position.line] || '';
      var ch = position.character;

      // Get just the identifier under cursor (stop at dots)
      var start = ch;
      while ( start > 0 && /[a-zA-Z0-9_$]/.test(line[start - 1]) ) start--;
      var end = ch;
      while ( end < line.length && /[a-zA-Z0-9_$]/.test(line[end]) ) end++;

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
      if ( word.startsWith("'") ) word = word.substring(1);
      if ( word.endsWith("'") ) word = word.substring(0, word.length - 1);
      return word;
    }
  ]
});
