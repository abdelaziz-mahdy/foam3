/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.parse.lsp.handlers',
  name: 'CompletionHandler',

  requires: [
    'foam.parse.lsp.FoamIndex'
  ],

  properties: [
    {
      class: 'FObjectProperty',
      of: 'foam.parse.lsp.FoamIndex',
      name: 'index',
      factory: function() { return this.FoamIndex.create(); }
    },
    {
      name: 'topLevelKeys_',
      factory: function() {
        return [
          'package', 'name', 'extends', 'implements', 'requires', 'imports',
          'exports', 'properties', 'methods', 'actions', 'listeners',
          'documentation', 'abstract', 'javaImports', 'axioms', 'css',
          'messages', 'topics', 'constants', 'sections', 'flags',
          'tableColumns', 'searchColumns'
        ];
      }
    },
    {
      name: 'propertyKeys_',
      factory: function() {
        return [
          'class', 'name', 'of', 'value', 'factory', 'expression', 'preSet',
          'postSet', 'view', 'documentation', 'hidden', 'transient', 'section',
          'visibility', 'javaCode', 'javaPreSet', 'javaPostSet', 'javaFactory',
          'javaGetter', 'aliases', 'tableCellFormatter', 'labelFormatter',
          'writePermissionRequired', 'readPermissionRequired'
        ];
      }
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

      var items = [];

      // Context 1: Inside class: ' → property types
      if ( /class\s*:\s*['"][\w]*$/.test(prefix) ) {
        items = this.getPropertyTypeItems();
      }
      // Context 2: Inside extends: ' → class names
      else if ( /extends\s*:\s*['"][\w.]*$/.test(prefix) ) {
        items = this.getClassItems(this.extractPartial(prefix));
      }
      // Context 3: Inside of: ' → class names
      else if ( /of\s*:\s*['"][\w.]*$/.test(prefix) ) {
        items = this.getClassItems(this.extractPartial(prefix));
      }
      // Context 4: Inside requires: ['...  → class names
      else if ( /requires\s*:\s*\[/.test(this.getLineContext(lines, position.line)) &&
                /['"][\w.]*$/.test(prefix) ) {
        items = this.getClassItems(this.extractPartial(prefix));
      }
      // Context 5: Inside implements: ['... → class names
      else if ( /implements\s*:\s*\[/.test(this.getLineContext(lines, position.line)) &&
                /['"][\w.]*$/.test(prefix) ) {
        items = this.getClassItems(this.extractPartial(prefix));
      }
      // Context 6: Top-level key position (after { or ,)
      else if ( this.isTopLevelKeyPosition(lines, position) ) {
        items = this.getTopLevelKeyItems();
      }
      // Context 7: Property key position (inside property object)
      else if ( this.isPropertyKeyPosition(lines, position) ) {
        items = this.getPropertyKeyItems();
      }

      return { isIncomplete: false, items: items };
    },

    function extractPartial(prefix) {
      /** Extract the partial text after the last quote. */
      var match = prefix.match(/['"]([^'"]*?)$/);
      return match ? match[1] : '';
    },

    function getLineContext(lines, lineNum) {
      /** Get surrounding lines to detect array/object context. */
      var ctx = '';
      for ( var i = Math.max(0, lineNum - 10) ; i <= lineNum ; i++ ) {
        ctx += (lines[i] || '') + '\n';
      }
      return ctx;
    },

    function isTopLevelKeyPosition(lines, position) {
      /** Check if cursor is where a top-level foam.CLASS key would go. */
      var line = (lines[position.line] || '').trim();
      // Empty or just whitespace after comma — likely a key position
      if ( /^[a-zA-Z]*$/.test(line) ) {
        // Check if we're inside foam.CLASS({ ... })
        var ctx = this.getLineContext(lines, position.line);
        return /foam\.(CLASS|ENUM|INTERFACE)\s*\(\s*\{/.test(ctx);
      }
      return false;
    },

    function isPropertyKeyPosition(lines, position) {
      /** Check if cursor is inside a property object definition. */
      var line = (lines[position.line] || '').trim();
      if ( /^[a-zA-Z]*$/.test(line) ) {
        var ctx = this.getLineContext(lines, position.line);
        return /properties\s*:\s*\[/.test(ctx) && /\{\s*$/.test(ctx.trim()) || /,\s*$/.test(ctx.trim());
      }
      return false;
    },

    function getPropertyTypeItems() {
      var types = this.index.getPropertyTypes();
      return types.map(function(t) {
        return {
          label: t.name,
          kind: 7, // Class
          detail: t.id,
          documentation: t.doc || '',
          insertText: t.name,
          sortText: t.name.toLowerCase()
        };
      });
    },

    function getClassItems(partial) {
      var ids = this.index.getAllClassIds();
      var items = [];
      var lower = partial.toLowerCase();
      for ( var i = 0 ; i < ids.length ; i++ ) {
        var id = ids[i];
        if ( partial && id.toLowerCase().indexOf(lower) === -1 ) continue;
        var cls = this.index.getClass(id);
        var doc = cls && cls.model_ ? ( cls.model_.documentation || '' ) : '';
        items.push({
          label: id,
          kind: 7, // Class
          detail: doc.substring(0, 80),
          insertText: id,
          sortText: id.toLowerCase()
        });
        // Limit to avoid overwhelming VS Code
        if ( items.length > 200 ) break;
      }
      return items;
    },

    function getTopLevelKeyItems() {
      return this.topLevelKeys_.map(function(k) {
        return {
          label: k,
          kind: 14, // Keyword
          insertText: k + ': ',
          sortText: k
        };
      });
    },

    function getPropertyKeyItems() {
      return this.propertyKeys_.map(function(k) {
        return {
          label: k,
          kind: 14, // Keyword
          insertText: k + ': ',
          sortText: k
        };
      });
    }
  ]
});
