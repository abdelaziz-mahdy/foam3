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

  constants: {
    JAVA_FOBJECT_METHODS_: {
      fclone:          { sig: 'FObject fclone()',          doc: 'Create a shallow clone of this object. Properties are copied by value.' },
      deepClone:       { sig: 'FObject deepClone()',       doc: 'Create a deep clone of this object. Nested FObjects are also cloned.' },
      freeze:          { sig: 'FObject freeze()',          doc: 'Freeze this object, making it immutable. Throws on subsequent modifications.' },
      isFrozen:        { sig: 'boolean isFrozen()',        doc: 'Returns true if this object has been frozen.' },
      copyFrom:        { sig: 'FObject copyFrom(FObject o)', doc: 'Copy all set properties from another object into this one.' },
      diff:            { sig: 'Map diff(FObject o)',       doc: 'Compute the difference between this object and another.' },
      hardDiff:        { sig: 'FObject hardDiff(FObject o)', doc: 'Compute a hard diff: returns an object with only the differing properties.' },
      getClassInfo:    { sig: 'ClassInfo getClassInfo()',   doc: 'Returns the ClassInfo (metadata) for this object\'s class.' },
      getProperty:     { sig: 'Object getProperty(String name)', doc: 'Get a property value by name.' },
      setProperty:     { sig: 'void setProperty(String name, Object value)', doc: 'Set a property value by name.' },
      clearProperty:   { sig: 'void clearProperty(String name)', doc: 'Clear a property, resetting it to its default value.' },
      hasDefaultValue: { sig: 'boolean hasDefaultValue(String name)', doc: 'Returns true if the property has its default value.' },
      toJSON:          { sig: 'String toJSON()',           doc: 'Serialize this object to JSON.' },
      compareTo:       { sig: 'int compareTo(Object o)',   doc: 'Compare this object to another for ordering.' },
      equals:          { sig: 'boolean equals(Object o)',  doc: 'Returns true if this object equals another.' },
      hashCode:        { sig: 'int hashCode()',            doc: 'Returns the hash code for this object.' },
      toString:        { sig: 'String toString()',         doc: 'Returns a string representation of this object.' },
      toSummary:       { sig: 'String toSummary()',        doc: 'Returns a short human-readable summary of this object.' },
      validate:        { sig: 'void validate(X x)',        doc: 'Validate this object. Throws ValidationException if invalid.' },
      put_:            { sig: 'FObject put_(X x, FObject obj)', doc: 'DAO put operation: store an object.' },
      find_:           { sig: 'FObject find_(X x, Object id)', doc: 'DAO find operation: retrieve an object by ID.' },
      remove_:         { sig: 'FObject remove_(X x, FObject obj)', doc: 'DAO remove operation: delete an object.' },
      select_:         { sig: 'Sink select_(X x, Sink sink, ...)', doc: 'DAO select operation: query objects into a sink.' },
      cmd_:            { sig: 'Object cmd_(X x, Object obj)', doc: 'DAO command operation: execute a command on the DAO.' }
    },
    JAVA_X_METHODS_: {
      get:            { sig: 'Object get(String key)',     doc: 'Look up a service or value in the context by key.\n\nCommon keys: `"userDAO"`, `"subject"`, `"auth"`, `"emailMessageDAO"`' },
      put:            { sig: 'X put(String key, Object value)', doc: 'Create a new sub-context with an additional key-value binding.' },
      createSubContext: { sig: 'X createSubContext(Map values)', doc: 'Create a sub-context with multiple key-value bindings.' }
    }
  },

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
    },
    {
      class: 'FObjectProperty',
      of: 'foam.parse.lsp.CSSTokenResolver',
      name: 'cssTokenResolver'
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

      // Try CSS block hover — $tokens and ^myClass references
      var cssHover = this.cssBlockHover_(text, position);
      if ( cssHover ) return cssHover;

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
      var blockCtx = this.analyzer.getBacktickBlockContext(text, position);
      if ( ! blockCtx || blockCtx.blockKey === 'css' ) return null;
      // blockCtx.blockKey is javaCode/javaPreSet/javaPostSet/javaFactory/javaGetter

      var segment = this.analyzer.getSegmentAtPosition(text, position);
      if ( ! segment ) return null;

      var model = this.cache.getModelAt(opt_uri || '', text, position.line);

      // Hover on getX/setX → show property type
      // Resolves from: (1) cast on same line, (2) current model's class
      var getSetMatch = segment.match(/^(get|set)([A-Z]\w*)$/);
      if ( getSetMatch ) {
        var propName = getSetMatch[2].charAt(0).toLowerCase() + getSetMatch[2].substring(1);

        // Try cast resolution first: ((TypeName) expr).getX()
        var lines = text.split('\n');
        var castInfo = this.analyzer.resolveJavaCastType(lines[position.line] || '', model, this.index);
        var classId = castInfo && castInfo.classId ? castInfo.classId : null;

        // Fall back to current model's class
        if ( ! classId ) {
          classId = model ? (model.refines || (model.package ? model.package + '.' + model.name : model.name)) : null;
        }

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

      // Hover on enum value: PRIVATE, SHARED, etc. — check if preceded by ClassName.
      if ( /^[A-Z][A-Z0-9_]+$/.test(segment) ) {
        var word = this.analyzer.getDottedWordAtPosition(text, position);
        var dotParts = word ? word.split('.') : [];
        if ( dotParts.length >= 2 ) {
          var enumClassName = dotParts[dotParts.length - 2];
          var enumValue = dotParts[dotParts.length - 1];
          var enumClassId = this.analyzer.resolveJavaTypeName(enumClassName, model, this.index);
          if ( enumClassId ) {
            var enumValues = this.index.getEnumValues(enumClassId);
            for ( var i = 0 ; i < enumValues.length ; i++ ) {
              if ( enumValues[i].name === enumValue ) {
                var md = '**' + enumClassId + '.' + enumValue + '**\n\n';
                md += 'Enum value (ordinal: ' + enumValues[i].ordinal + ')';
                if ( enumValues[i].label ) md += '\n\nLabel: ' + enumValues[i].label;
                return { contents: { kind: 'markdown', value: md } };
              }
            }
          }
        }
      }

      // Hover on variable.method() — resolve variable type, then find method
      var word = this.analyzer.getDottedWordAtPosition(text, position);
      if ( word && word.indexOf('.') !== -1 ) {
        var parts = word.split('.');
        var varName = parts[parts.length - 2];
        var methodName = parts[parts.length - 1];

        // Skip this.method (handled by main hover) and ClassName.ENUM_VALUE (handled above)
        if ( varName !== 'this' && ! /^[A-Z][A-Z0-9_]+$/.test(methodName) ) {
          // Special: x is always foam.lang.X (the FOAM context)
          if ( varName === 'x' ) {
            var xMethodDoc = this.JAVA_X_METHODS_[methodName];
            if ( xMethodDoc ) {
              return { contents: { kind: 'markdown', value: '```java\n' + xMethodDoc.sig + '\n```\n*foam.lang.X*\n\n' + xMethodDoc.doc } };
            }
          }

          // Resolve the variable's type
          var varClassId = this.analyzer.resolveJavaVariableType(text, position, varName, model, this.index);
          if ( ! varClassId ) {
            // Try as a type name (static call like Country.find())
            varClassId = this.analyzer.resolveJavaTypeName(varName, model, this.index);
          }
          if ( varClassId ) {
            // Check if it's a getter/setter
            var gsMatch = methodName.match(/^(get|set)([A-Z]\w*)$/);
            if ( gsMatch ) {
              var propName = gsMatch[2].charAt(0).toLowerCase() + gsMatch[2].substring(1);
              var javaType = this.index.getPropertyJavaType(varClassId, propName);
              if ( javaType ) {
                var md = gsMatch[1] === 'get'
                  ? '```java\n' + javaType + ' get' + gsMatch[2] + '()\n```\n*' + varClassId + '*\n\nGetter for `' + propName + '`'
                  : '```java\nvoid set' + gsMatch[2] + '(' + javaType + ' val)\n```\n*' + varClassId + '*\n\nSetter for `' + propName + '`';
                return { contents: { kind: 'markdown', value: md } };
              }
            }

            // Check if it's a FOAM method
            var methods = this.index.getMethods(varClassId);
            for ( var i = 0 ; i < methods.length ; i++ ) {
              if ( methods[i].name === methodName ) {
                return { contents: { kind: 'markdown', value: this.buildMethodHover_(methods[i], varClassId) } };
              }
            }

            // Fallback: common Java-only FObject methods not in FOAM axioms
            var javaMethodDoc = this.JAVA_FOBJECT_METHODS_[methodName];
            if ( javaMethodDoc ) {
              return { contents: { kind: 'markdown', value: '```java\n' + javaMethodDoc.sig + '\n```\n*foam.lang.FObject*\n\n' + javaMethodDoc.doc } };
            }

            // Show the variable's type at minimum
            var propDoc = this.index.getPropertyDoc(varClassId, methodName);
            if ( propDoc ) {
              return { contents: { kind: 'markdown', value: propDoc } };
            }
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

    function cssBlockHover_(text, position) {
      /**
       * Hover inside CSS template blocks — uses shared block detection
       * and CSS context analysis.
       */
      if ( ! this.cssTokenResolver ) return null;

      var blockCtx = this.analyzer.getBacktickBlockContext(text, position);
      if ( ! blockCtx || blockCtx.blockKey !== 'css' ) return null;

      var lines = text.split('\n');
      var line = lines[position.line] || '';
      var cssCtx = this.analyzer.getCSSContext(line, position.character);
      if ( ! cssCtx || ! cssCtx.partial ) return null;

      // Get the full word (including text after cursor) for exact matching
      var fullWord = line.substring(cssCtx.replaceRange.start, cssCtx.replaceRange.end);

      // $tokenName — resolve via CSSTokenResolver
      if ( fullWord.charAt(0) === '$' ) {
        var tokenName = fullWord.substring(1);
        var md = this.cssTokenResolver.buildHoverContent(tokenName);
        if ( md ) return { contents: { kind: 'markdown', value: md } };
      }

      // ^name — myClass shorthand
      if ( fullWord.charAt(0) === '^' ) {
        var suffix = fullWord.substring(1);
        var model = this.cache.getModelAt('', text, position.line);
        if ( model ) {
          var pkg = model.package ? model.package.replace(/\./g, '-') : '';
          var cls = model.name || '';
          var expanded = '.' + pkg + '-' + cls + (suffix ? '-' + suffix : '');
          var md = '**^' + suffix + '**\n\nExpands to: `' + expanded + '`';
          return { contents: { kind: 'markdown', value: md } };
        }
      }

      return null;
    },

    function buildClassHover(classId) {
      var cls = this.index.getClass(classId);
      if ( ! cls ) return null;
      var m = cls.model_;

      // Header: class signature in a code block
      var sig = m.id;
      if ( m.extends && m.extends !== 'FObject' ) sig += ' extends ' + m.extends;
      if ( m.implements && m.implements.length > 0 ) {
        var ifaces = m.implements.map(function(i) { return typeof i === 'string' ? i : i.path; });
        sig += ' implements ' + ifaces.join(', ');
      }
      var md = '```foam\n' + sig + '\n```\n';

      // Documentation
      if ( m.documentation ) md += m.documentation + '\n';

      // Own properties
      var ownProps = this.index.getOwnProperties(classId);
      if ( ownProps.length > 0 ) {
        md += '\n---\n\n';
        md += '| Property | Type | Description |\n';
        md += '|:--|:--|:--|\n';
        for ( var i = 0 ; i < ownProps.length ; i++ ) {
          var p = ownProps[i];
          var typeName = p.cls_ && p.cls_.model_ ? p.cls_.model_.name : 'Property';
          var doc = p.documentation ? p.documentation.split('\n')[0].substring(0, 50) : '';
          md += '| `' + p.name + '` | ' + typeName + ' | ' + doc + ' |\n';
        }
      }

      // Inherited properties grouped by ancestor
      var inherited = this.index.getInheritedProperties(classId);
      for ( var g = 0 ; g < inherited.length ; g++ ) {
        var group = inherited[g];
        md += '\n---\n\n';
        md += '**' + group.className + '** (' + group.properties.length + ')\n\n';
        var names = [];
        for ( var j = 0 ; j < group.properties.length ; j++ ) {
          var ip = group.properties[j];
          var iType = ip.cls_ && ip.cls_.model_ ? ip.cls_.model_.name : '';
          names.push('`' + ip.name + '`' + ( iType ? ' *' + iType + '*' : '' ));
        }
        md += names.join(' · ') + '\n';
      }

      // Methods (compact inline)
      var methods = this.index.getMethods(classId);
      if ( methods.length > 0 ) {
        var methodNames = methods.slice(0, 8).map(function(m) { return '`' + m.name + '()`'; });
        md += '\nMethods: ' + methodNames.join(' · ');
        if ( methods.length > 8 ) md += ' *+' + (methods.length - 8) + ' more*';
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
      var md = '```foam\n' + resolved + '.create()\n```\n';
      var props = this.index.getOwnProperties(resolved);
      if ( props.length > 0 ) {
        md += '| Property | Type |\n';
        md += '|:--|:--|\n';
        for ( var i = 0 ; i < Math.min(props.length, 12) ; i++ ) {
          var p = props[i];
          var typeName = p.cls_ && p.cls_.model_ ? p.cls_.model_.name : 'Property';
          md += '| `' + p.name + '` | ' + typeName + ' |\n';
        }
        if ( props.length > 12 ) md += '| *... +' + (props.length - 12) + ' more* | |\n';
      }
      return { contents: { kind: 'markdown', value: md } };
    },

    function buildMethodHover_(method, classId) {
      /** Build markdown hover for a method with signature. */
      var sig = this.analyzer.getMethodSignature(method);
      var md = '```javascript\n' + sig + '\n```\n';
      md += '*' + classId + '*\n';
      if ( method.documentation ) md += '\n' + method.documentation + '\n';
      if ( method.type ) md += '\nReturns: `' + method.type + '`\n';
      return md;
    }
  ]
});
