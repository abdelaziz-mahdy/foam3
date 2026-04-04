/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.parse.lsp',
  name: 'CursorAnalyzer',

  documentation: 'Shared text analysis utilities for LSP handlers.',

  methods: [
    function offsetToPosition(text, offset) {
      /** Convert a character offset to { line, character } position. */
      var line = 0;
      var col = 0;
      for ( var i = 0 ; i < offset && i < text.length ; i++ ) {
        if ( text[i] === '\n' ) { line++; col = 0; } else { col++; }
      }
      return { line: line, character: col };
    },

    function positionToOffset(text, position) {
      /** Convert a { line, character } position to a character offset. */
      var lines = text.split('\n');
      var offset = 0;
      for ( var i = 0 ; i < position.line && i < lines.length ; i++ ) {
        offset += lines[i].length + 1;
      }
      offset += Math.min(position.character, (lines[position.line] || '').length);
      return offset;
    },

    function getDottedWordAtPosition(text, position) {
      /** Get the full dotted word (e.g., 'foam.lang.FObject') at the cursor position. */
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
    },

    function getSegmentAtPosition(text, position) {
      /**
       * Get just the single identifier segment under the cursor (stops at dots).
       * For 'this.Suggestion.create', returns 'Suggestion' if cursor is on it.
       */
      var lines = text.split('\n');
      var line = lines[position.line] || '';
      var ch = position.character;

      var start = ch;
      while ( start > 0 && /[a-zA-Z0-9_$]/.test(line[start - 1]) ) start--;
      var end = ch;
      while ( end < line.length && /[a-zA-Z0-9_$]/.test(line[end]) ) end++;

      return line.substring(start, end);
    },

    function resolveClassId(text) {
      /** Extract the full class ID (package.name) from a foam.CLASS definition. */
      var pkgMatch = text.match(/package\s*:\s*['"]([^'"]+)['"]/);
      var nameMatch = text.match(/name\s*:\s*['"]([^'"]+)['"]/);
      if ( ! nameMatch ) return null;
      return pkgMatch ? pkgMatch[1] + '.' + nameMatch[1] : nameMatch[1];
    },

    function parseRequires(text) {
      /**
       * Parse requires: [...] to build shortName -> fullId map.
       * 'foam.u2.DetailView' -> { DetailView: 'foam.u2.DetailView' }
       * 'foam.u2.DetailView as DV' -> { DV: 'foam.u2.DetailView' }
       */
      var map = {};
      var requiresMatch = text.match(/requires\s*:\s*\[([\s\S]*?)\]/);
      if ( ! requiresMatch ) return map;

      var regex = /['"]([a-zA-Z][\w.]+\.(\w+))(?:\s+as\s+(\w+))?['"]/g;
      var m;
      while ( ( m = regex.exec(requiresMatch[1]) ) !== null ) {
        var fullId = m[1];
        var shortName = m[3] || m[2];
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
        name = name.replace(/\?$/, '');
        names.push(name);
      }
      return names;
    },

    function resolveShortName(text, name) {
      /** Resolve a short class name to full ID using requires. */
      var map = this.parseRequires(text);
      return map[name] || null;
    },

    function findCreateContext(lines, lineNum, text, index) {
      /**
       * Scan backwards from current line to find if we're inside a .create({ block.
       * Returns the resolved class ID or null.
       * @param lines - text split by newlines
       * @param lineNum - current line number
       * @param text - full source text (for requires resolution)
       * @param index - FoamIndex instance (for classExists checks)
       */
      var depth = 0;
      for ( var i = lineNum ; i >= Math.max(0, lineNum - 20) ; i-- ) {
        var line = lines[i];
        for ( var c = line.length - 1 ; c >= 0 ; c-- ) {
          if ( line[c] === '}' ) depth++;
          if ( line[c] === '{' ) depth--;
        }
        if ( depth < 0 ) {
          for ( var j = i ; j >= Math.max(0, i - 3) ; j-- ) {
            var checkLine = lines[j];
            var createMatch = checkLine.match(/(?:this\.)?(\w+)\.create\s*\(/);
            if ( createMatch ) {
              var shortName = createMatch[1];
              var resolved = this.resolveShortName(text, shortName);
              if ( resolved ) return resolved;
              if ( index.classExists(shortName) ) return shortName;
            }
          }
          break;
        }
      }
      return null;
    },

    function getMethodSignature(method) {
      /** Extract method signature: name(param1, param2) */
      if ( method.args && method.args.length > 0 ) {
        var params = method.args.map(function(a) {
          return ( a.type ? a.type + ' ' : '' ) + a.name;
        });
        return method.name + '(' + params.join(', ') + ')';
      }
      if ( method.code ) {
        var match = method.code.toString().match(/function\s*\w*\s*\(([^)]*)\)/);
        if ( match && match[1].trim() ) {
          return method.name + '(' + match[1].trim() + ')';
        }
      }
      return method.name + '()';
    },

    function resolveJavaVariableType(text, position, varName, model, index) {
      /**
       * Resolve a Java variable's type from its declaration or cast.
       * Checks (in order):
       *   1. Cast: ((TypeName) varName). on the current line
       *   2. Declaration: TypeName varName = ... scanning backward
       */
      var lines = text.split('\n');
      var line = lines[position.line] || '';

      // Check for cast on current line: ((TypeName) varName).
      var castRegex = new RegExp('\\(\\s*\\(\\s*(\\w+)\\s*\\)\\s*' + varName + '\\s*\\)');
      var castMatch = line.match(castRegex);
      if ( castMatch ) {
        var castType = this.resolveJavaTypeName(castMatch[1], model, index);
        if ( castType ) return castType;
      }

      // Also check previous lines for multi-line cast
      for ( var i = position.line ; i >= Math.max(0, position.line - 3) ; i-- ) {
        var checkLine = lines[i];
        if ( ! checkLine ) continue;
        var mlCast = checkLine.match(castRegex);
        if ( mlCast ) {
          var castType = this.resolveJavaTypeName(mlCast[1], model, index);
          if ( castType ) return castType;
        }
      }

      // Declaration: TypeName varName = ... or TypeName varName;
      for ( var i = position.line ; i >= 0 ; i-- ) {
        var scanLine = lines[i];
        if ( ! scanLine ) continue;
        var declMatch = scanLine.match(new RegExp('(\\w+)\\s+' + varName + '\\s*[=;]'));
        if ( declMatch ) {
          var typeName = declMatch[1];
          if ( ['var', 'return', 'new', 'if', 'for', 'while', 'try', 'catch', 'throw', 'else'].indexOf(typeName) !== -1 ) continue;
          return this.resolveJavaTypeName(typeName, model, index);
        }
      }
      return null;
    },

    function resolveJavaCastType(line, model, index) {
      /**
       * Extract the cast type from a line containing ((TypeName) expr).method()
       * Returns the resolved FOAM class ID or null.
       * Used by hover on method calls after casts and by semantic tokens.
       */
      var castMatch = line.match(/\(\s*\(\s*(\w+)\s*\)\s*\w+\s*\)\s*\.\s*(\w+)/);
      if ( castMatch ) {
        return {
          classId: this.resolveJavaTypeName(castMatch[1], model, index),
          typeName: castMatch[1],
          methodName: castMatch[2]
        };
      }
      return null;
    },

    function resolveJavaTypeName(typeName, model, index) {
      /**
       * Resolve a Java type name to a FOAM class ID.
       * Checks: direct lookup, javaImports, same package, dynamic scan.
       */
      if ( index.classExists(typeName) ) return typeName;

      var imports = model ? model.javaImports || [] : [];
      for ( var i = 0 ; i < imports.length ; i++ ) {
        var imp = imports[i];
        if ( imp.endsWith('.' + typeName) || imp.endsWith('.*') ) {
          var fullId = imp.endsWith('.*') ? imp.replace('.*', '.' + typeName) : imp;
          if ( index.classExists(fullId) ) return fullId;
        }
      }

      if ( model && model.package ) {
        var samePackage = model.package + '.' + typeName;
        if ( index.classExists(samePackage) ) return samePackage;
      }

      var ids = index.getAllClassIds();
      var suffix = '.' + typeName;
      for ( var i = 0 ; i < ids.length ; i++ ) {
        if ( ids[i].endsWith(suffix) ) return ids[i];
      }

      return null;
    }
  ]
});
