/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.parse.lsp.handlers',
  name: 'HoverHandler',

  requires: [
    'foam.parse.lsp.FoamIndex',
    'foam.parse.lsp.FileModelCache',
    'foam.parse.lsp.CursorAnalyzer',
    'foam.parse.lsp.TypeTracker'
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
      of: 'foam.parse.lsp.TypeTracker',
      name: 'typeTracker'
    }
  ],

  methods: [
    function handle(text, position, opt_uri) {
      if ( ! /foam\.(CLASS|ENUM|INTERFACE|RELATIONSHIP)\s*\(/.test(text) ) {
        return null;
      }

      var word = this.analyzer.getDottedWordAtPosition(text, position);
      if ( ! word ) return null;

      // Try Java block hover — getters, variables, type references inside javaCode
      var javaHover = this.javaBlockHover_(text, position, opt_uri);
      if ( javaHover ) return javaHover;

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
      var segment = this.analyzer.getSegmentAtPosition(text, position);

      // Try as short name from requires via model
      if ( segment ) {
        var resolved = this.resolveFromModel_(text, position, segment, opt_uri);
        if ( resolved ) {
          return this.buildClassHover(resolved);
        }
        // Fallback to text-based requires parsing
        resolved = this.analyzer.resolveShortName(text, segment);
        if ( resolved ) {
          return this.buildClassHover(resolved);
        }
      }

      // Try as typed variable (var x = this.Foo.create())
      if ( segment && this.typeTracker ) {
        var model = this.cache.getModelAt(opt_uri || '', text, position.line);
        var varType = this.typeTracker.resolveVariableType(text, position, segment, model, this.index);
        if ( varType ) {
          return this.buildClassHover(varType);
        }
      }

      // Try as property on a typed variable: testvar.breadcrumbTitle
      // word = 'testvar.breadcrumbTitle', segment = 'breadcrumbTitle'
      if ( segment && word && word.indexOf('.') !== -1 && this.typeTracker ) {
        var parts = word.split('.');
        var varName = parts[0];
        var propName = parts[parts.length - 1];
        if ( varName !== 'this' && varName !== 'foam' ) {
          var model = this.cache.getModelAt(opt_uri || '', text, position.line);
          var varType = this.typeTracker.resolveVariableType(text, position, varName, model, this.index);
          if ( varType ) {
            var propDoc = this.index.getPropertyDoc(varType, propName);
            if ( propDoc ) {
              return { contents: { kind: 'markdown', value: propDoc } };
            }
          }
        }
      }

      // Try 'create' — show info about the class being created
      if ( segment === 'create' ) {
        var createHover = this.buildCreateHover_(text, position);
        if ( createHover ) return createHover;
      }

      // Try as property inside .create({}) block — resolve the target class
      var lookupName = segment || word;
      var createClassId = this.resolveCreateContext_(text, position);
      if ( createClassId ) {
        var createPropDoc = this.index.getPropertyDoc(createClassId, lookupName);
        if ( createPropDoc ) {
          return { contents: { kind: 'markdown', value: createPropDoc } };
        }
      }

      // Try segment as property or method name — resolve the current class
      var currentClassId = this.resolveCurrentClass_(text, position, opt_uri);
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

    function resolveFromModel_(text, position, shortName, opt_uri) {
      /** Resolve a short name from model.requires using FileModelCache. */
      var model = this.cache.getModelAt(opt_uri || '', text, position.line);
      if ( ! model ) return null;
      var requiresMap = this.cache.buildRequiresMap(model);
      return requiresMap[shortName] || null;
    },

    function resolveCurrentClass_(text, position, opt_uri) {
      /** Get the class ID of the model at the cursor position. */
      var model = this.cache.getModelAt(opt_uri || '', text, position.line);
      if ( ! model ) return null;
      return model.refines || (model.package ? model.package + '.' + model.name : model.name);
    },

    function javaBlockHover_(text, position, opt_uri) {
      /** Hover inside Java code blocks — resolve getters, variables, types. */
      var offset = this.analyzer.positionToOffset(text, position);
      var textBefore = text.substring(0, offset);
      var lastBT = -1;
      var btd = 0;
      for ( var i = textBefore.length - 1 ; i >= 0 ; i-- ) {
        if ( textBefore[i] === '`' ) { btd++; if ( btd % 2 === 1 ) { lastBT = i; break; } }
      }
      if ( lastBT === -1 ) return null;
      var beforeBT = text.substring(Math.max(0, lastBT - 200), lastBT);
      if ( ! /(javaCode|javaGetter|javaPreSet|javaPostSet|javaFactory)\s*:\s*$/.test(beforeBT) ) return null;

      var segment = this.analyzer.getSegmentAtPosition(text, position);
      if ( ! segment ) return null;

      var model = this.cache.getModelAt(opt_uri || '', text, position.line);

      // Hover on getX/setX → show property type
      var getSetMatch = segment.match(/^(get|set)([A-Z]\w*)$/);
      if ( getSetMatch ) {
        var propName = getSetMatch[2].charAt(0).toLowerCase() + getSetMatch[2].substring(1);
        var classId = model ? (model.refines || (model.package ? model.package + '.' + model.name : model.name)) : null;
        if ( classId ) {
          var javaType = this.index.getPropertyJavaType(classId, propName);
          if ( javaType ) {
            var md = getSetMatch[1] === 'get'
              ? '**' + javaType + '** get' + getSetMatch[2] + '()\n\nGetter for `' + propName + '` on `' + classId + '`'
              : '**void** set' + getSetMatch[2] + '(' + javaType + ' val)\n\nSetter for `' + propName + '` on `' + classId + '`';
            return { contents: { kind: 'markdown', value: md } };
          }
        }
      }

      // Hover on a variable name → resolve its Java type
      var varType = this.analyzer.resolveJavaVariableType(text, position, segment, model, this.index);
      if ( varType ) {
        return this.buildClassHover(varType);
      }

      // Hover on a type name (e.g., FlowAccess, Subject) → resolve to FOAM class
      var typeClassId = this.analyzer.resolveJavaTypeName(segment, model, this.index);
      if ( typeClassId ) {
        return this.buildClassHover(typeClassId);
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

    function resolveCreateContext_(text, position) {
      /** Find if cursor is inside a .create({}) block, return the target class ID. */
      var lines = text.split('\n');
      return this.analyzer.findCreateContext(lines, position.line, text, this.index);
    },

    function buildCreateHover_(text, position) {
      /** When hovering on 'create', resolve the class and show its info. */
      var lines = text.split('\n');
      var line = lines[position.line] || '';
      var match = line.match(/(?:this\.)?(\w[\w.]*)\.create/);
      if ( ! match ) return null;
      var name = match[1];
      var resolved = this.analyzer.resolveShortName(text, name);
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
      var sig = this.analyzer.getMethodSignature(method);

      var md = '**' + sig + '**\n\n';
      md += 'Method on `' + classId + '`\n\n';
      if ( method.documentation ) md += method.documentation + '\n\n';
      if ( method.type ) md += 'Returns: `' + method.type + '`\n';
      return md;
    }
  ]
});
