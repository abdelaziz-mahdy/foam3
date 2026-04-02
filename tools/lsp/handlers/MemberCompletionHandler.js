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
      /**
       * Handles this. completion by resolving the current class and suggesting members.
       * Returns { isIncomplete: Boolean, items: CompletionItem[] }
       */
      if ( ! /foam\.(CLASS|ENUM|INTERFACE|RELATIONSHIP)\s*\(/.test(text) ) {
        return { isIncomplete: false, items: [] };
      }

      // Check if cursor is after "this."
      var lines = text.split('\n');
      var line = lines[position.line] || '';
      var prefix = line.substring(0, position.character);
      if ( ! /this\.\s*$/.test(prefix) ) {
        return { isIncomplete: false, items: [] };
      }

      // Resolve current class ID from file
      var classId = this.resolveClassId(text);
      if ( ! classId ) {
        return { isIncomplete: false, items: [] };
      }

      var items = [];

      // Add properties
      var props = this.index.getProperties(classId);
      for ( var i = 0 ; i < props.length ; i++ ) {
        items.push({
          label: props[i].name,
          kind: 10, // Property
          detail: props[i].cls_ && props[i].cls_.model_ ? props[i].cls_.model_.name : 'Property',
          documentation: props[i].documentation || ''
        });
      }

      // Add methods
      var methods = this.index.getMethods(classId);
      for ( var i = 0 ; i < methods.length ; i++ ) {
        items.push({
          label: methods[i].name,
          kind: 2, // Method
          detail: 'Method',
          documentation: methods[i].documentation || ''
        });
      }

      // Add actions
      var actions = this.index.getActions(classId);
      for ( var i = 0 ; i < actions.length ; i++ ) {
        items.push({
          label: actions[i].name,
          kind: 2,
          detail: 'Action',
          documentation: actions[i].documentation || ''
        });
      }

      return { isIncomplete: false, items: items };
    },

    function resolveClassId(text) {
      /** Extract class ID from foam.CLASS definition in file. */
      var pkgMatch = text.match(/package\s*:\s*['"]([^'"]+)['"]/);
      var nameMatch = text.match(/name\s*:\s*['"]([^'"]+)['"]/);
      if ( ! nameMatch ) return null;
      return pkgMatch ? pkgMatch[1] + '.' + nameMatch[1] : nameMatch[1];
    }
  ]
});
