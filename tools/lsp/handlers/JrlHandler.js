/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.parse.lsp.handlers',
  name: 'JrlHandler',

  documentation: 'Hover and semantic tokens for FOAM journal (.jrl) files. JRL files contain p({...}), c({...}), r({...}) calls with FOAM model objects.',

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
    },
    {
      name: 'journalClassMap_',
      documentation: 'Map of journal filename → FOAM class ID, built from services.jrl files.',
      factory: function() { return {}; }
    }
  ],

  methods: [
    function isJrlFile(uri) {
      return uri && uri.endsWith('.jrl');
    },

    function buildJournalClassMap() {
      /**
       * Scan services.jrl files for setJournalName/setOf pairings.
       * Builds map: journalName → FOAM class ID.
       * Called once at startup.
       */
      var fs_ = require('fs');
      var path_ = require('path');
      var map = {};

      // Find all services.jrl files via POM locations
      var poms = foam.poms || [];
      for ( var p = 0 ; p < poms.length ; p++ ) {
        var loc = poms[p].location || '';
        var svcPath = path_.resolve(loc, 'services.jrl');
        if ( ! fs_.existsSync(svcPath) ) continue;

        try {
          var content = fs_.readFileSync(svcPath, 'utf8');
          // Find setJournalName + setOf pairs (they appear close together)
          var journalName = null;
          var lines = content.split('\n');
          for ( var i = 0 ; i < lines.length ; i++ ) {
            var jnMatch = lines[i].match(/\.setJournalName\s*\(\s*"(\w+)"\s*\)/);
            if ( jnMatch ) journalName = jnMatch[1];

            var ofMatch = lines[i].match(/\.setOf\s*\(\s*([\w.]+)\.getOwnClassInfo\s*\(\s*\)\s*\)/);
            if ( ofMatch && journalName ) {
              map[journalName] = ofMatch[1];
              journalName = null;
            }
          }
        } catch (e) {}
      }

      // Also scan sub-project services.jrl files
      this.walkServiceFiles_(map, fs_, path_);

      this.journalClassMap_ = map;
      return map;
    },

    function walkServiceFiles_(map, fs_, path_) {
      /** Walk the file index to find services.jrl files not in POM locations. */
      var fileIndex = this.index.fileIndex_;
      if ( ! fileIndex ) return;
      var seenDirs = {};
      for ( var classId in fileIndex ) {
        var entry = fileIndex[classId];
        var filePath = entry.path || entry;
        var dir = path_.dirname(filePath);
        if ( seenDirs[dir] ) continue;
        seenDirs[dir] = true;
        var svcPath = path_.resolve(dir, 'services.jrl');
        if ( ! fs_.existsSync(svcPath) ) continue;
        try {
          var content = fs_.readFileSync(svcPath, 'utf8');
          var journalName = null;
          var lines = content.split('\n');
          for ( var i = 0 ; i < lines.length ; i++ ) {
            var jnMatch = lines[i].match(/\.setJournalName\s*\(\s*"(\w+)"\s*\)/);
            if ( jnMatch ) journalName = jnMatch[1];
            var ofMatch = lines[i].match(/\.setOf\s*\(\s*([\w.]+)\.getOwnClassInfo\s*\(\s*\)\s*\)/);
            if ( ofMatch && journalName ) {
              map[journalName] = ofMatch[1];
              journalName = null;
            }
          }
        } catch (e) {}
      }
    },

    function resolveClassForJrl(uri, entry) {
      /**
       * Resolve the FOAM class for a JRL entry.
       * 1. If entry has "class" field, use it directly
       * 2. Otherwise, look up the JRL filename in journalClassMap_
       */
      if ( entry && entry['class'] ) return entry['class'];

      // Extract filename from URI: file:///path/to/journals/threddCardAuthorizations.jrl → threddCardAuthorizations
      if ( uri ) {
        var parts = uri.split('/');
        var filename = parts[parts.length - 1].replace('.jrl', '');
        return this.journalClassMap_[filename] || null;
      }
      return null;
    },

    function handleHover(text, position, opt_uri) {
      var lines = text.split('\n');
      var line = lines[position.line] || '';

      // Try single-line first, then multi-line
      var entry = this.parseJrlEntry_(line);
      if ( ! entry ) {
        var found = this.findEntryAtLine_(text, position.line);
        if ( found ) entry = found.entry;
      }
      if ( ! entry ) return null;

      // Resolve class: nearest class context (handles nested objects)
      var classId = this.resolveNearestClass_(text, position.line, opt_uri, entry);
      var cls = classId ? this.index.getClass(classId) : null;

      // Hover on p/c/r/v command
      var cmdMatch = line.match(/^\s*(?:\w+\.)?(p|c|r|v)\s*\(/);
      if ( cmdMatch ) {
        var cmdStart = line.indexOf(cmdMatch[1]);
        if ( position.character >= cmdStart && position.character <= cmdStart + cmdMatch[1].length ) {
          var cmdDocs = {
            p: '**p** (Put / Update)\n\nUpdate an existing record in the DAO. If a record with the same ID exists, it is merged with the new values. If no record exists, it is created.\n\nUsed in data journals for persisting FObject state.',
            c: '**c** (Create)\n\nCreate a new record in the DAO. Unlike `p`, this always creates a new entry and does not merge with existing records.\n\nCommonly used in `services.jrl` to define DAO configurations and service CSpecs.',
            r: '**r** (Remove)\n\nRemove a record from the DAO by its ID.\n\nThe object only needs the `id` field to identify which record to remove.',
            v: '**v** (Version)\n\nSet the journal version number for schema migration tracking.\n\nWhen the journal version changes, FOAM can run migration logic to update persisted data.'
          };
          return { contents: { kind: 'markdown', value: cmdDocs[cmdMatch[1]] || '' } };
        }
      }

      // Find what's under the cursor — pass entry so it works for multi-line
      var col = position.character;
      var segment = this.getSegmentAt_(line, col, entry);
      if ( ! segment ) return null;

      // Hover on "class" value → show class info
      if ( segment.value === classId ) {
        if ( ! cls ) return null;
        var m = cls.model_;
        var md = '**' + m.id + '**\n\n';
        if ( m.extends && m.extends !== 'FObject' ) md += 'extends `' + m.extends + '`\n\n';
        if ( m.documentation ) md += m.documentation + '\n\n';
        return { contents: { kind: 'markdown', value: md } };
      }

      // Hover on a property name → show type info
      // Handles both full names (processDate) and shortNames (an → accountNo)
      if ( segment.isKey && cls ) {
        var prop = this.resolveProperty_(cls, segment.value);
        if ( prop ) {
          var typeName = prop.cls_ && prop.cls_.model_ ? prop.cls_.model_.name : 'Property';
          var isShort = prop.name !== segment.value;
          var md = isShort
            ? '**' + prop.name + '** → `' + segment.value + '`\n\n'
            : '**' + segment.value + '**\n\n';
          if ( prop.label ) md += 'Label: **' + prop.label + '**\n\n';
          md += 'Type: `' + typeName + '`\n\n';
          if ( prop.documentation ) md += prop.documentation + '\n\n';
          return { contents: { kind: 'markdown', value: md } };
        }
      }

      // Hover on a value → check if it's a timestamp on a Date property
      if ( segment.isValue && segment.key && cls ) {
        var prop = this.resolveProperty_(cls, segment.key);
        if ( prop ) {
          var typeName = prop.cls_ && prop.cls_.model_ ? prop.cls_.model_.name : '';
          var propLabel = prop.label || prop.name;
          if ( (typeName === 'Date' || typeName === 'DateTime' || typeName === 'DateTimeUTC') && typeof segment.rawValue === 'number' ) {
            var formatted = this.formatTimestamp_(segment.rawValue);
            var md = '**' + propLabel + '**: `' + formatted + '`\n\n';
            md += 'Type: ' + typeName + '\n\nRaw: ' + segment.rawValue;
            return { contents: { kind: 'markdown', value: md } };
          }
        }
      }

      return null;
    },

    function handleSemanticTokens(text) {
      var lines = text.split('\n');
      var tokens = [];

      // Only emit semantic tokens for things the TextMate grammar can't resolve:
      // - Class values verified against the FOAM registry (type=1 class)
      // Token types: 0=type, 1=class, 2=variable, 3=keyword, 4=string,
      // 5=comment, 6=number, 7=operator, 8=method
      for ( var lineNum = 0 ; lineNum < lines.length ; lineNum++ ) {
        var line = lines[lineNum];
        if ( ! line.trim() || /^\s*\/\//.test(line) ) continue;

        // Highlight verified class values — both "class":"value" and class:"value"
        var classRegex = /(?:"class"|(?<=[{,])\s*class)\s*:\s*(?:"([^"]+)"|'([^']+)')/g;
        var cm;
        while ( ( cm = classRegex.exec(line) ) !== null ) {
          var classVal = cm[1] || cm[2];
          if ( classVal && this.index.classExists(classVal) ) {
            var valIdx = line.indexOf(classVal, cm.index);
            if ( valIdx !== -1 ) {
              tokens.push({ line: lineNum, char: valIdx, length: classVal.length, type: 1, modifiers: 0 });
            }
          }
        }
      }

      // Sort and encode
      tokens.sort(function(a, b) {
        return a.line !== b.line ? a.line - b.line : a.char - b.char;
      });

      var data = [];
      var prevLine = 0, prevChar = 0;
      for ( var i = 0 ; i < tokens.length ; i++ ) {
        var t = tokens[i];
        var deltaLine = t.line - prevLine;
        var deltaChar = deltaLine === 0 ? t.char - prevChar : t.char;
        data.push(deltaLine, deltaChar, t.length, t.type, t.modifiers);
        prevLine = t.line;
        prevChar = t.char;
      }
      return { data: data };
    },

    function parseJrlEntry_(line) {
      /**
       * Extract the object from a single-line p({...}), c({...}), r({...}).
       * FOAM JRL uses JS object notation (unquoted keys), not JSON.
       */
      var match = line.match(/^\s*(?:\w+\.)?\w+\s*\(\s*(\{.*\})\s*\)\s*$/);
      if ( ! match ) return null;
      return this.evalJrlObject_(match[1]);
    },

    function findEntryAtLine_(text, lineNum) {
      /**
       * Find the JRL entry spanning the given line (handles multi-line entries).
       * Returns { entry, startLine, endLine, rawText } or null.
       */
      var lines = text.split('\n');

      // Walk backward from lineNum to find the start of the entry (the p({, c({, etc.)
      var startLine = lineNum;
      while ( startLine > 0 && ! /^\s*(?:\w+\.)?\w+\s*\(/.test(lines[startLine]) ) {
        startLine--;
      }

      // Single-line entry — fast path
      var singleMatch = lines[startLine].match(/^\s*(?:\w+\.)?\w+\s*\(\s*(\{.*\})\s*\)\s*$/);
      if ( singleMatch ) {
        var entry = this.evalJrlObject_(singleMatch[1]);
        return entry ? { entry: entry, startLine: startLine, endLine: startLine, rawText: lines[startLine] } : null;
      }

      // Multi-line entry — collect lines until we find the closing )
      var depth = 0;
      var endLine = startLine;
      var raw = '';
      for ( var i = startLine ; i < lines.length ; i++ ) {
        raw += lines[i] + '\n';
        for ( var c = 0 ; c < lines[i].length ; c++ ) {
          if ( lines[i][c] === '{' || lines[i][c] === '[' ) depth++;
          if ( lines[i][c] === '}' || lines[i][c] === ']' ) depth--;
        }
        if ( depth <= 0 && raw.indexOf(')') !== -1 ) {
          endLine = i;
          break;
        }
      }

      // Extract the object from p({...}) across lines
      var objMatch = raw.match(/(?:\w+\.)?\w+\s*\(\s*(\{[\s\S]*\})\s*\)/);
      if ( ! objMatch ) return null;
      var entry = this.evalJrlObject_(objMatch[1]);
      return entry ? { entry: entry, startLine: startLine, endLine: endLine, rawText: raw } : null;
    },

    function evalJrlObject_(objStr) {
      /** Parse a JRL object string (JSON or FOAM unquoted-key format). */
      try {
        return JSON.parse(objStr);
      } catch (e) {
        try {
          return eval('(' + objStr + ')');
        } catch (e2) {
          return null;
        }
      }
    },

    function getSegmentAt_(line, col, opt_entry) {
      /**
       * Find what's under the cursor in a JRL line.
       * Handles both JSON ("key":value) and FOAM (key:value) formats.
       * opt_entry: pre-parsed entry object (for multi-line entries).
       * Returns { value, isKey, isValue, key, rawValue } or null.
       */
      var entry = opt_entry || this.parseJrlEntry_(line);
      if ( ! entry ) return null;

      // Match both quoted and unquoted keys: "key": or key:
      // Also match single-quoted keys: 'key':
      var kvRegex = /(?:"(\w+)"|'(\w+)'|(?<=[{,\s])(\w+))\s*:\s*/g;
      var kv;
      while ( ( kv = kvRegex.exec(line) ) !== null ) {
        var keyName = kv[1] || kv[2] || kv[3];
        var keyStart = kv.index + (kv[1] ? 1 : kv[2] ? 1 : 0); // skip quote if present
        var keyEnd = keyStart + keyName.length;

        // Cursor on key name
        if ( col >= keyStart && col <= keyEnd ) {
          return { value: keyName, isKey: true, isValue: false };
        }

        // Check if cursor is on the value after this key
        var afterKey = kv.index + kv[0].length;
        var valuePart = line.substring(afterKey);

        // String value (quoted)
        var strMatch = valuePart.match(/^"([^"]*)"/);
        if ( strMatch ) {
          var valEnd = afterKey + 1 + strMatch[1].length;
          if ( col >= afterKey && col <= valEnd + 1 ) {
            return { value: strMatch[1], isKey: false, isValue: true, key: keyName, rawValue: entry[keyName] };
          }
          continue;
        }

        // Number value
        var numMatch = valuePart.match(/^(-?\d+\.?\d*)/);
        if ( numMatch ) {
          var valEnd = afterKey + numMatch[1].length;
          if ( col >= afterKey && col <= valEnd ) {
            return { value: numMatch[1], isKey: false, isValue: true, key: keyName, rawValue: entry[keyName] };
          }
          continue;
        }

        // Boolean/null
        var boolMatch = valuePart.match(/^(true|false|null)/);
        if ( boolMatch ) {
          var valEnd = afterKey + boolMatch[1].length;
          if ( col >= afterKey && col <= valEnd ) {
            return { value: boolMatch[1], isKey: false, isValue: true, key: keyName, rawValue: entry[keyName] };
          }
        }
      }

      return null;
    },

    function resolveProperty_(cls, keyName) {
      /** Find a property by name, shortName, or alias. */
      // Try direct name first
      var prop = cls.getAxiomByName(keyName);
      if ( prop && foam.lang.Property.isInstance(prop) ) return prop;

      // Search by shortName or alias
      var props = cls.getAxiomsByClass(foam.lang.Property);
      for ( var i = 0 ; i < props.length ; i++ ) {
        if ( props[i].shortName === keyName ) return props[i];
        if ( props[i].aliases ) {
          for ( var j = 0 ; j < props[i].aliases.length ; j++ ) {
            if ( props[i].aliases[j] === keyName ) return props[i];
          }
        }
      }
      return null;
    },

    function handleCompletion(text, position, opt_uri) {
      /** Suggest property names based on the class in the JRL entry. */
      var lines = text.split('\n');
      var line = lines[position.line] || '';
      var entry = this.parseJrlEntry_(line);
      if ( ! entry ) {
        var found = this.findEntryAtLine_(text, position.line);
        if ( found ) entry = found.entry;
      }
      // For nested objects, find the nearest class context
      var classId = this.resolveNearestClass_(text, position.line, opt_uri, entry);
      if ( ! classId ) return { isIncomplete: false, items: [] };

      var cls = this.index.getClass(classId);
      if ( ! cls ) return { isIncomplete: false, items: [] };

      var prefix = line.substring(0, position.character);

      // After a key colon — suggest class names for "class": or enum values
      var afterColonMatch = prefix.match(/"(class)"\s*:\s*"?(\w*)$/);
      if ( afterColonMatch ) {
        return this.getClassNameCompletions_(afterColonMatch[2]);
      }

      // Inside a key position — suggest property names
      var items = [];
      var props = this.index.getProperties(classId);
      var existingKeys = entry ? Object.keys(entry) : [];

      for ( var i = 0 ; i < props.length ; i++ ) {
        var p = props[i];
        if ( existingKeys.indexOf(p.name) !== -1 ) continue;
        var typeName = p.cls_ && p.cls_.model_ ? p.cls_.model_.name : 'Property';
        var doc = '';
        if ( p.label ) doc += '**' + p.label + '**\n\n';
        doc += 'Type: `' + typeName + '`';
        if ( p.documentation ) doc += '\n\n' + p.documentation;

        items.push({
          label: p.name,
          kind: 10,
          detail: typeName + ' — ' + classId,
          documentation: { kind: 'markdown', value: doc },
          insertText: '"' + p.name + '": ',
          sortText: '!' + p.name
        });

        // Also suggest shortName if available
        if ( p.shortName ) {
          items.push({
            label: p.shortName,
            kind: 10,
            detail: p.name + ' (' + typeName + ')',
            documentation: { kind: 'markdown', value: 'Short name for `' + p.name + '`\n\n' + doc },
            insertText: '"' + p.shortName + '": ',
            sortText: '~' + p.shortName
          });
        }
      }

      // Always suggest "class" if not present
      if ( ! entry || ! entry['class'] ) {
        items.unshift({
          label: 'class',
          kind: 10,
          detail: 'FOAM class identifier',
          insertText: '"class": "',
          sortText: '!!class'
        });
      }

      return { isIncomplete: false, items: items };
    },

    function getClassNameCompletions_(partial) {
      /** Suggest FOAM class IDs matching partial input. */
      var allIds = this.index.getAllClassIds();
      var items = [];
      var lower = partial.toLowerCase();
      for ( var i = 0 ; i < allIds.length ; i++ ) {
        if ( lower && allIds[i].toLowerCase().indexOf(lower) === -1 ) continue;
        items.push({
          label: allIds[i],
          kind: 7,
          insertText: allIds[i],
          sortText: allIds[i]
        });
        if ( items.length > 50 ) break;
      }
      return { isIncomplete: items.length > 50, items: items };
    },

    function handleDiagnostics(text, opt_uri) {
      /** Validate JRL entries: unknown classes, unknown properties. Handles single and multi-line. */
      var lines = text.split('\n');
      var diags = [];
      var processed = {};

      for ( var lineNum = 0 ; lineNum < lines.length ; lineNum++ ) {
        var line = lines[lineNum];
        if ( ! line.trim() || /^\s*\/\//.test(line) ) continue;
        if ( processed[lineNum] ) continue;

        // Try single-line first, then multi-line
        var entry = this.parseJrlEntry_(line);
        var startLine = lineNum;
        var endLine = lineNum;

        if ( ! entry ) {
          // Only try multi-line from entry start lines
          if ( ! /^\s*(?:\w+\.)?\w+\s*\(/.test(line) ) continue;
          var found = this.findEntryAtLine_(text, lineNum);
          if ( ! found ) continue;
          entry = found.entry;
          startLine = found.startLine;
          endLine = found.endLine;
        }

        // Mark processed lines
        for ( var p = startLine ; p <= endLine ; p++ ) processed[p] = true;

        var classId = this.resolveClassForJrl(opt_uri, entry);
        if ( ! classId ) continue;

        // Validate class exists
        var cls = this.index.getClass(classId);
        if ( ! cls ) {
          // Find the class string in the entry lines
          for ( var sl = startLine ; sl <= endLine ; sl++ ) {
            var classIdx = lines[sl].indexOf(classId);
            if ( classIdx !== -1 ) {
              diags.push({
                range: { start: { line: sl, character: classIdx }, end: { line: sl, character: classIdx + classId.length } },
                severity: 1,
                source: 'foam-lsp',
                message: 'Unknown class: ' + classId
              });
              break;
            }
          }
          continue;
        }

        // Validate property names across all lines of the entry
        for ( var key in entry ) {
          if ( key === 'class' ) continue;
          var prop = this.resolveProperty_(cls, key);
          if ( ! prop ) {
            var escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            var keyPattern = new RegExp('(?:"' + escaped + '"|' + escaped + ')\\s*:');
            for ( var sl = startLine ; sl <= endLine ; sl++ ) {
              var keyMatch = keyPattern.exec(lines[sl]);
              if ( keyMatch ) {
                var keyStart = keyMatch.index + (keyMatch[0].charAt(0) === '"' ? 1 : 0);
                diags.push({
                  range: { start: { line: sl, character: keyStart }, end: { line: sl, character: keyStart + key.length } },
                  severity: 2,
                  source: 'foam-lsp',
                  message: 'Unknown property "' + key + '" on ' + classId
                });
                break;
              }
            }
          }
        }
      }

      return diags;
    },

    function handleDefinition(text, position, opt_uri) {
      /**
       * Go-to-definition for JRL entries.
       * Resolves: class names → .js source, property keys → property in class file.
       */
      var lines = text.split('\n');
      var line = lines[position.line] || '';
      var entry = this.parseJrlEntry_(line);
      if ( ! entry ) {
        var found = this.findEntryAtLine_(text, position.line);
        if ( found ) entry = found.entry;
      }
      if ( ! entry ) return null;

      var classId = this.resolveNearestClass_(text, position.line, opt_uri, entry);
      var cls = classId ? this.index.getClass(classId) : null;

      var col = position.character;
      var segment = this.getSegmentAt_(line, col, entry);
      if ( ! segment ) return null;

      // Go-to on class value → navigate to the class .js file
      if ( segment.value === classId || ( segment.isValue && segment.key === 'class' ) ) {
        var clsId = segment.value;
        var filePath = this.index.getFilePath(clsId);
        if ( filePath ) {
          return { uri: 'file://' + filePath, range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } } };
        }
      }

      // Go-to on property key → navigate to property definition in the class
      if ( segment.isKey && cls ) {
        var prop = this.resolveProperty_(cls, segment.value);
        if ( prop ) {
          // Find which class in the chain defines this property
          var chain = this.index.getInheritanceChain(classId);
          for ( var c = 0 ; c < chain.length ; c++ ) {
            var ancestorCls = this.index.getClass(chain[c]);
            if ( ! ancestorCls ) continue;
            var own = ancestorCls.getOwnAxiomsByClass(foam.lang.Property);
            for ( var i = 0 ; i < own.length ; i++ ) {
              if ( own[i].name === prop.name ) {
                var filePath = this.index.getFilePath(chain[c]);
                if ( filePath ) {
                  // Find the property line in the file
                  var fs_ = require('fs');
                  try {
                    var content = fs_.readFileSync(filePath, 'utf8');
                    var propRegex = new RegExp("name\\s*:\\s*['\"]" + prop.name + "['\"]");
                    var match = propRegex.exec(content);
                    if ( match ) {
                      var lineNum = 0;
                      for ( var ci = 0 ; ci < match.index ; ci++ ) {
                        if ( content[ci] === '\n' ) lineNum++;
                      }
                      return { uri: 'file://' + filePath, range: { start: { line: lineNum, character: 0 }, end: { line: lineNum, character: 0 } } };
                    }
                  } catch (e) {}
                  return { uri: 'file://' + filePath, range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } } };
                }
              }
            }
          }
        }
      }

      // Go-to on a value that looks like a class ID → navigate to that class
      if ( segment.isValue && typeof segment.value === 'string' && this.index.classExists(segment.value) ) {
        var filePath = this.index.getFilePath(segment.value);
        if ( filePath ) {
          return { uri: 'file://' + filePath, range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } } };
        }
      }

      return null;
    },

    function resolveNearestClass_(text, lineNum, opt_uri, entry) {
      /**
       * Find the nearest "class" value for the cursor position.
       * Handles nested objects: walks backward from cursor to find
       * the closest "class": "..." within the current brace depth.
       */
      var lines = text.split('\n');
      var depth = 0;

      // Walk backward from cursor to find the nearest "class" at our depth or above
      for ( var i = lineNum ; i >= 0 ; i-- ) {
        var l = lines[i] || '';

        // Track brace depth (going backward, } increases, { decreases)
        for ( var c = l.length - 1 ; c >= 0 ; c-- ) {
          if ( l[c] === '}' ) depth++;
          if ( l[c] === '{' ) depth--;
        }

        // Look for "class" on this line at current depth or shallower
        var classMatch = l.match(/(?:"class"|class)\s*:\s*(?:"([^"]+)"|'([^']+)')/);
        if ( classMatch && depth <= 0 ) {
          return classMatch[1] || classMatch[2];
        }
      }

      // Fallback to entry-level or filename-based resolution
      return this.resolveClassForJrl(opt_uri, entry);
    },

    function formatTimestamp_(ts) {
      /** Convert a timestamp to human-readable UTC date string. */
      var d = new Date(ts);
      return d.getUTCFullYear() + '-' +
        String(d.getUTCMonth() + 1).padStart(2, '0') + '-' +
        String(d.getUTCDate()).padStart(2, '0') + ' ' +
        String(d.getUTCHours()).padStart(2, '0') + ':' +
        String(d.getUTCMinutes()).padStart(2, '0') + ':' +
        String(d.getUTCSeconds()).padStart(2, '0') + ' UTC';
    }
  ]
});
