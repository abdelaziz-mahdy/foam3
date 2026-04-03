/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.parse.lsp.handlers',
  name: 'MemberCompletionHandler',

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
        var resolved = this.resolveShortName(text, classId) || classId;
        if ( this.index.classExists(resolved) ) {
          return this.getClassPropertyItems(resolved);
        }
      }

      // Detect context: cursor INSIDE a .create({ ... }) block on a separate line
      // Look backwards from current line to find the .create({ opening
      var createCtx = this.findCreateContext_(lines, position.line, text);
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
      var classId = this.resolveClassId(text);
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
        var sig = this.getMethodSignature_(m);
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
      var requiresMap = this.parseRequires(text);
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
      var imports = this.parseImports(text);
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
      var fullId = this.resolveShortName(text, shortName);
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
    },

    function parseRequires(text) {
      /**
       * Parse requires: [...] to build shortName → fullId map.
       * 'foam.u2.DetailView' → { DetailView: 'foam.u2.DetailView' }
       * 'foam.u2.DetailView as DV' → { DV: 'foam.u2.DetailView' }
       */
      var map = {};
      var requiresMatch = text.match(/requires\s*:\s*\[([\s\S]*?)\]/);
      if ( ! requiresMatch ) return map;

      var regex = /['"]([a-zA-Z][\w.]+\.(\w+))(?:\s+as\s+(\w+))?['"]/g;
      var m;
      while ( ( m = regex.exec(requiresMatch[1]) ) !== null ) {
        var fullId = m[1];
        var shortName = m[3] || m[2]; // alias or last part of class ID
        map[shortName] = fullId;
      }
      return map;
    },

    function parseImports(text) {
      /** Parse imports: [...] to get imported names. */
      var names = [];
      var importsMatch = text.match(/imports\s*:\s*\[([\s\S]*?)\]/);
      if ( ! importsMatch ) return names;

      var regex = /['"](\w[\w?]*)(?:\s+as\s+(\w+))?['"]/g;
      var m;
      while ( ( m = regex.exec(importsMatch[1]) ) !== null ) {
        var name = m[2] || m[1];
        // Remove trailing ? (optional import)
        name = name.replace(/\?$/, '');
        names.push(name);
      }
      return names;
    },

    function resolveShortName(text, shortName) {
      /** Resolve a short class name to full ID using requires. */
      var map = this.parseRequires(text);
      return map[shortName] || null;
    },

    function findCreateContext_(lines, lineNum, text) {
      /**
       * Scan backwards from current line to find if we're inside a .create({ block.
       * Handles both: this.X.create({ on same line, and .create(\n{ on separate lines.
       * Returns the resolved class ID or null.
       */
      var depth = 0;
      for ( var i = lineNum ; i >= Math.max(0, lineNum - 20) ; i-- ) {
        var line = lines[i];
        // Count braces to track nesting
        for ( var c = line.length - 1 ; c >= 0 ; c-- ) {
          if ( line[c] === '}' ) depth++;
          if ( line[c] === '{' ) depth--;
        }
        // If we've closed a brace pair (depth < 0), we're inside an opening {
        if ( depth < 0 ) {
          // Check this line and a few lines above for .create(
          for ( var j = i ; j >= Math.max(0, i - 3) ; j-- ) {
            var checkLine = lines[j];
            var createMatch = checkLine.match(/(?:this\.)?(\w+)\.create\s*\(/);
            if ( createMatch ) {
              var shortName = createMatch[1];
              var resolved = this.resolveShortName(text, shortName);
              if ( resolved ) return resolved;
              if ( this.index.classExists(shortName) ) return shortName;
            }
          }
          break;
        }
      }
      return null;
    },

    function getMethodSignature_(method) {
      /** Extract method signature: name(param1, param2) */
      // Try formal args first
      if ( method.args && method.args.length > 0 ) {
        var params = method.args.map(function(a) {
          return ( a.type ? a.type + ' ' : '' ) + a.name;
        });
        return method.name + '(' + params.join(', ') + ')';
      }
      // Fall back to parsing the function code
      if ( method.code ) {
        var match = method.code.toString().match(/function\s*\w*\s*\(([^)]*)\)/);
        if ( match && match[1].trim() ) {
          return method.name + '(' + match[1].trim() + ')';
        }
      }
      return method.name + '()';
    },

    function resolveClassId(text) {
      var pkgMatch = text.match(/package\s*:\s*['"]([^'"]+)['"]/);
      var nameMatch = text.match(/name\s*:\s*['"]([^'"]+)['"]/);
      if ( ! nameMatch ) return null;
      return pkgMatch ? pkgMatch[1] + '.' + nameMatch[1] : nameMatch[1];
    }
  ]
});
