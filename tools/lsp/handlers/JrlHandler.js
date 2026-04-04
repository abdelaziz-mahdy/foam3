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

      // Parse the JSON object from p({...}), c({...}), etc.
      var entry = this.parseJrlEntry_(line);
      if ( ! entry ) return null;

      // Resolve class: from "class" field or from journal filename → services.jrl map
      var classId = this.resolveClassForJrl(opt_uri, entry);
      var cls = classId ? this.index.getClass(classId) : null;

      // Find what's under the cursor
      var col = position.character;
      var segment = this.getSegmentAt_(line, col);
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
      if ( segment.isKey && cls ) {
        var prop = cls.getAxiomByName(segment.value);
        if ( prop ) {
          var typeName = prop.cls_ && prop.cls_.model_ ? prop.cls_.model_.name : 'Property';
          var md = '**' + segment.value + '** (`' + typeName + '`)\n\n';
          if ( prop.documentation ) md += prop.documentation + '\n\n';
          return { contents: { kind: 'markdown', value: md } };
        }
      }

      // Hover on a value → check if it's a timestamp on a Date property
      if ( segment.isValue && segment.key && cls ) {
        var prop = cls.getAxiomByName(segment.key);
        if ( prop ) {
          var typeName = prop.cls_ && prop.cls_.model_ ? prop.cls_.model_.name : '';
          if ( (typeName === 'Date' || typeName === 'DateTime' || typeName === 'DateTimeUTC') && typeof segment.rawValue === 'number' ) {
            var formatted = this.formatTimestamp_(segment.rawValue);
            var md = '**' + segment.key + '**: `' + formatted + '`\n\n';
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

      // Token types: 0=type, 1=class, 2=variable, 3=keyword, 4=string,
      // 5=comment, 6=number, 7=operator, 8=method
      for ( var lineNum = 0 ; lineNum < lines.length ; lineNum++ ) {
        var line = lines[lineNum];
        if ( ! line.trim() ) continue;

        // Comment lines (// ...)
        var commentMatch = line.match(/^\s*\/\//);
        if ( commentMatch ) {
          tokens.push({ line: lineNum, char: 0, length: line.length, type: 5, modifiers: 0 });
          continue;
        }

        // Function name: p, c, r, put, remove, etc.
        var funcMatch = line.match(/^\s*(\w+)\s*\(/);
        if ( funcMatch ) {
          var funcStart = line.indexOf(funcMatch[1]);
          tokens.push({ line: lineNum, char: funcStart, length: funcMatch[1].length, type: 3, modifiers: 0 });
        }

        // Parse key-value pairs from the line
        var kvRegex = /"(\w+)"\s*:\s*/g;
        var kv;
        while ( ( kv = kvRegex.exec(line) ) !== null ) {
          var keyName = kv[1];
          var keyStart = kv.index + 1; // after opening quote

          // "class" key → type color
          if ( keyName === 'class' ) {
            tokens.push({ line: lineNum, char: keyStart, length: keyName.length, type: 0, modifiers: 0 });
            // Class value
            var classValMatch = line.substring(kv.index + kv[0].length).match(/^"([^"]+)"/);
            if ( classValMatch ) {
              var valStart = kv.index + kv[0].length + 1;
              tokens.push({ line: lineNum, char: valStart, length: classValMatch[1].length, type: 1, modifiers: 0 });
            }
          } else {
            // Property name → property color (use type 2 = variable)
            tokens.push({ line: lineNum, char: keyStart, length: keyName.length, type: 2, modifiers: 0 });
          }
        }

        // String values (not keys)
        var strRegex = /:\s*"([^"]*)"/g;
        var sv;
        while ( ( sv = strRegex.exec(line) ) !== null ) {
          var valStart = sv.index + sv[0].indexOf('"') + 1;
          // Skip class values (already highlighted)
          if ( line.substring(sv.index - 10, sv.index).indexOf('"class"') !== -1 ) continue;
          tokens.push({ line: lineNum, char: valStart, length: sv[1].length, type: 4, modifiers: 0 });
        }

        // Number values
        var numRegex = /:\s*(-?\d+\.?\d*)/g;
        var nv;
        while ( ( nv = numRegex.exec(line) ) !== null ) {
          var numStart = nv.index + nv[0].indexOf(nv[1]);
          tokens.push({ line: lineNum, char: numStart, length: nv[1].length, type: 6, modifiers: 0 });
        }

        // Boolean and null values
        var boolRegex = /:\s*(true|false|null)\b/g;
        var bv;
        while ( ( bv = boolRegex.exec(line) ) !== null ) {
          var boolStart = bv.index + bv[0].indexOf(bv[1]);
          tokens.push({ line: lineNum, char: boolStart, length: bv[1].length, type: 3, modifiers: 0 });
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
       * Extract the object from a p({...}), c({...}), r({...}) line.
       * FOAM JRL uses JS object notation (unquoted keys), not JSON.
       * Use eval to parse since it's valid JS.
       */
      var match = line.match(/^\s*\w+\s*\(\s*(\{.*\})\s*\)\s*$/);
      if ( ! match ) return null;
      try {
        // Try JSON first (faster, handles quoted keys)
        return JSON.parse(match[1]);
      } catch (e) {
        // Fall back to eval for FOAM's unquoted-key format
        try {
          return eval('(' + match[1] + ')');
        } catch (e2) {
          return null;
        }
      }
    },

    function getSegmentAt_(line, col) {
      /**
       * Find what's under the cursor in a JRL line.
       * Handles both JSON ("key":value) and FOAM (key:value) formats.
       * Returns { value, isKey, isValue, key, rawValue } or null.
       */
      var entry = this.parseJrlEntry_(line);
      if ( ! entry ) return null;

      // Match both quoted and unquoted keys: "key": or key:
      var kvRegex = /(?:"(\w+)"|(\w+))\s*:\s*/g;
      var kv;
      while ( ( kv = kvRegex.exec(line) ) !== null ) {
        var keyName = kv[1] || kv[2];
        var keyStart = kv.index + (kv[1] ? 1 : 0); // skip quote if present
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
