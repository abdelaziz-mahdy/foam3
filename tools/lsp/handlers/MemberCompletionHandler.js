/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.parse.lsp.handlers',
  name: 'MemberCompletionHandler',

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
    function handle(text, position, opt_uri) {
      if ( ! /foam\.(CLASS|ENUM|INTERFACE|RELATIONSHIP)\s*\(/.test(text) ) {
        return { isIncomplete: false, items: [] };
      }

      var lines = text.split('\n');
      var line = lines[position.line] || '';
      var prefix = line.substring(0, position.character);

      // Detect context: this.X.create({ ▊ }) — on the same line
      var createMatch = prefix.match(/this\.(\w+)\.create\(\s*\{\s*\w*$/);
      if ( createMatch ) {
        return this.handleCreateCompletion(text, createMatch[1], position, opt_uri);
      }

      // Detect context: ClassName.create({ ▊ }) — full class name, same line
      var fullCreateMatch = prefix.match(/([\w.]+)\.create\(\s*\{\s*\w*$/);
      if ( fullCreateMatch ) {
        var classId = fullCreateMatch[1];
        var resolved = this.analyzer.resolveShortName(text, classId) || classId;
        if ( this.index.classExists(resolved) ) {
          return this.getClassPropertyItems(resolved);
        }
      }

      // Detect context: cursor INSIDE a .create({ ... }) block on a separate line
      var createCtx = this.analyzer.findCreateContext(lines, position.line, text, this.index);
      if ( createCtx ) {
        return this.getClassPropertyItems(createCtx);
      }

      // Detect context: this. ▊ — suggest members + requires + imports
      if ( /this\.\w*$/.test(prefix) ) {
        return this.handleThisCompletion(text, position, opt_uri);
      }

      return { isIncomplete: false, items: [] };
    },

    function handleThisCompletion(text, position, opt_uri) {
      /** Suggest: own properties, methods, actions, required classes, imports. */
      var model = this.cache.getModelAt(opt_uri || '', text, position.line);
      var classId = model ? (model.refines || (model.package ? model.package + '.' + model.name : model.name)) : null;

      // Fallback: if eval failed (SyntaxError from incomplete code like 'this.'),
      // resolve classId from regex
      if ( ! classId ) {
        classId = this.analyzer.resolveClassId(text);
      }

      var items = [];

      // Properties (own + inherited) — only if class exists in registry
      var props = classId ? this.index.getProperties(classId) : [];
      for ( var i = 0 ; i < props.length ; i++ ) {
        var p = props[i];
        var typeName = p.cls_ && p.cls_.model_ ? p.cls_.model_.name : 'Property';
        var propDoc = '**' + p.name + '** (`' + typeName + '`)';
        if ( p.documentation ) propDoc += '\n\n' + p.documentation;
        items.push({
          label: p.name,
          kind: 10,
          detail: typeName,
          documentation: { kind: 'markdown', value: propDoc },
          sortText: '0_' + p.name
        });
      }

      // Methods — with parameter signatures
      var methods = classId ? this.index.getMethods(classId) : [];
      for ( var i = 0 ; i < methods.length ; i++ ) {
        var m = methods[i];
        var sig = this.analyzer.getMethodSignature(m);
        var doc = '```javascript\n' + sig + '\n```';
        if ( m.documentation ) doc += '\n\n' + m.documentation;
        items.push({
          label: m.name,
          kind: 2,
          detail: sig,
          documentation: { kind: 'markdown', value: doc },
          insertText: m.name + '()',
          sortText: '1_' + m.name
        });
      }

      // Actions
      var actions = classId ? this.index.getActions(classId) : [];
      for ( var i = 0 ; i < actions.length ; i++ ) {
        items.push({
          label: actions[i].name,
          kind: 2,
          detail: 'Action',
          documentation: actions[i].documentation || '',
          sortText: '1_' + actions[i].name
        });
      }

      // Required classes — this.ShortName is available
      if ( model ) {
        var requires = model.requires || [];
        for ( var i = 0 ; i < requires.length ; i++ ) {
          var r = requires[i];
          var fullId = typeof r === 'string' ? r : r.path;
          var shortName = typeof r === 'string' ? fullId.split('.').pop() : (r.name || fullId.split('.').pop());
          var cls = this.index.getClass(fullId);
          var rdoc = cls && cls.model_ ? ( cls.model_.documentation || '' ) : '';
          items.push({
            label: shortName,
            kind: 7,
            detail: fullId,
            documentation: rdoc.substring(0, 100),
            sortText: '2_' + shortName
          });
        }

        // Imports from model — this.importedName is available
        var imports = model.imports || [];
        for ( var i = 0 ; i < imports.length ; i++ ) {
          var imp = imports[i];
          var name = typeof imp === 'string' ? imp : imp.name;
          name = name.replace(/\?$/, '');
          items.push({
            label: name,
            kind: 10,
            detail: 'import',
            sortText: '2_' + name
          });
        }
      } else {
        // Fallback: parse requires/imports via regex for broken files
        var requiresMap = this.analyzer.parseRequires(text);
        for ( var shortName in requiresMap ) {
          var fullId = requiresMap[shortName];
          var cls = this.index.getClass(fullId);
          var rdoc = cls && cls.model_ ? ( cls.model_.documentation || '' ) : '';
          items.push({
            label: shortName,
            kind: 7,
            detail: fullId,
            documentation: rdoc.substring(0, 100),
            sortText: '2_' + shortName
          });
        }

        var importNames = this.analyzer.parseImports(text);
        for ( var i = 0 ; i < importNames.length ; i++ ) {
          items.push({
            label: importNames[i],
            kind: 10,
            detail: 'import',
            sortText: '2_' + importNames[i]
          });
        }
      }

      return { isIncomplete: false, items: items };
    },

    function handleCreateCompletion(text, shortName, position, opt_uri) {
      /** Resolve short name from requires, then suggest its properties. */
      var fullId = this.analyzer.resolveShortName(text, shortName);
      if ( ! fullId ) return { isIncomplete: false, items: [] };
      return this.getClassPropertyItems(fullId);
    },

    function getClassPropertyItems(classId) {
      /** Get completion items for all properties of a class (for .create({})). */
      var props = this.index.getProperties(classId);
      var items = [];
      for ( var i = 0 ; i < props.length ; i++ ) {
        var p = props[i];
        var typeName = p.cls_ && p.cls_.model_ ? p.cls_.model_.name : 'Property';
        items.push({
          label: p.name,
          kind: 10,
          detail: typeName + ' — ' + classId,
          documentation: p.documentation || '',
          insertText: p.name + ': '
        });
      }
      return { isIncomplete: false, items: items };
    }
  ]
});
