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
      of: 'foam.parse.lsp.CursorAnalyzer',
      name: 'analyzer',
      factory: function() { return this.CursorAnalyzer.create(); }
    }
  ],

  methods: [
    function handle(text, position) {
      if ( ! /foam\.(CLASS|ENUM|INTERFACE|RELATIONSHIP)\s*\(/.test(text) ) {
        return { isIncomplete: false, items: [] };
      }

      var lines = text.split('\n');
      var line = lines[position.line] || '';
      var prefix = line.substring(0, position.character);

      // Detect context: this.X.create({ ▊ }) — on the same line
      var createMatch = prefix.match(/this\.(\w+)\.create\(\s*\{\s*\w*$/);
      if ( createMatch ) {
        return this.handleCreateCompletion(text, createMatch[1]);
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
      // Look backwards from current line to find the .create({ opening
      var createCtx = this.analyzer.findCreateContext(lines, position.line, text, this.index);
      if ( createCtx ) {
        return this.getClassPropertyItems(createCtx);
      }

      // Detect context: this. ▊ — suggest members + requires + imports
      if ( /this\.\w*$/.test(prefix) ) {
        return this.handleThisCompletion(text);
      }

      return { isIncomplete: false, items: [] };
    },

    function handleThisCompletion(text) {
      /** Suggest: own properties, methods, actions, required classes, imports. */
      var classId = this.analyzer.resolveClassId(text);
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
          kind: 10, // Property
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
          kind: 2, // Method
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
      var requiresMap = this.analyzer.parseRequires(text);
      for ( var shortName in requiresMap ) {
        var fullId = requiresMap[shortName];
        var cls = this.index.getClass(fullId);
        var doc = cls && cls.model_ ? ( cls.model_.documentation || '' ) : '';
        items.push({
          label: shortName,
          kind: 7, // Class
          detail: fullId,
          documentation: doc.substring(0, 100),
          sortText: '2_' + shortName
        });
      }

      // Imports — this.importedName is available
      var imports = this.analyzer.parseImports(text);
      for ( var i = 0 ; i < imports.length ; i++ ) {
        items.push({
          label: imports[i],
          kind: 10, // Property (imported context value)
          detail: 'import',
          sortText: '2_' + imports[i]
        });
      }

      return { isIncomplete: false, items: items };
    },

    function handleCreateCompletion(text, shortName) {
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
          kind: 10, // Property
          detail: typeName + ' — ' + classId,
          documentation: p.documentation || '',
          insertText: p.name + ': '
        });
      }
      return { isIncomplete: false, items: items };
    }
  ]
});
