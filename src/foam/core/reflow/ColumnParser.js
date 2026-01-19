/**
 * @license
 * Copyright 2024 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.core.reflow',
  name: 'ColumnParser',
  extends: 'foam.parse.Grammar',

  documentation: "Call either .parseString() to parse an individual column or .parseString(columns, 'columnList') to parse a array of columns.",

  properties: [
    'of'
  ],

  methods: [
    /**
     * Normalize column name to FOAM property naming convention (camelCase).
     * Converts underscore-separated names to camelCase.
     * Examples:
     *   Element_attribute → elementAttribute
     *   Parent_Child_value → parentChildValue
     *   CONSTANT_CASE → constantCase
     */
    function normalizeToPropertyName(str) {
      if ( ! str ) return str;

      // If no underscore, just lowercase first char
      if ( str.indexOf('_') === -1 ) {
        return str.charAt(0).toLowerCase() + str.slice(1);
      }

      var parts = str.split('_');
      var result = parts[0].charAt(0).toLowerCase() + parts[0].slice(1).toLowerCase();

      for ( var i = 1 ; i < parts.length ; i++ ) {
        if ( parts[i].length > 0 ) {
          result += parts[i].charAt(0).toUpperCase() + parts[i].slice(1).toLowerCase();
        }
      }

      return result;
    },

    function grammar(alt, seq, seq0, seq1, eof, literal, literalIC, repeat, repeat0, sym, action, str, plus, notChars, peek) {
      var fs  = [];
      var ps = this.of.getAxiomsByClass(foam.lang.Property);

      // Helper to iterate over all property identifiers (name, shortName, aliases)
      function forEachIdentifier(p, fn) {
        fn(p.name, p);
        if ( p.shortName ) fn(p.shortName, p);
        p.aliases.forEach(a => fn(a, p));
      }

      function addProperty(p, lit) {
        forEachIdentifier(p, (n, p) => fs.push(lit(n, p)));
      }

      // Five chances to match:

      // 1. Exact match
      ps.forEach(p => addProperty(p, literal));

      // 2. Case insensitive match
      ps.forEach(p => addProperty(p, literalIC));

      // 3. CONSTANT_CASE with spaces: "PAYMENT TOKEN ID"
      ps.forEach(p => addProperty(p, (n, p) => literalIC(foam.String.constantize(n).replaceAll('_', ' '), p)));

      // 4. CONSTANT_CASE: "PAYMENT_TOKEN_ID"
      ps.forEach(p => addProperty(p, (n, p) => literalIC(foam.String.constantize(n), p)));

      // 5. Final fallback: Normalize any underscore-separated input to camelCase and lookup
      // Handles arbitrary underscore formats like "Element_attribute" → "elementAttribute"
      var propertyMap = {};
      ps.forEach(p => forEachIdentifier(p, (n, p) => { propertyMap[n.toLowerCase()] = p; }));

      var self = this;
      var normalizedLookup = action(
        // Capture any non-delimiter characters as a string (stops at comma, tab, newline, space)
        str(plus(notChars(',\t\n\r '))),
        function(input) {
          var normalized = self.normalizeToPropertyName(input);
          var prop = propertyMap[normalized.toLowerCase()];
          return prop || foam.parse.ParserWithAction.NO_PARSE;
        }
      );
      fs.push(normalizedLookup);

      var fieldNameParser = alt.apply(null, fs.map(f => seq1(0, f, sym('end'))));

      return {
        START: sym('fieldName'),

        end: peek(alt(',', eof())),

        fieldName: fieldNameParser,

        ws: repeat0(' '),

        comma: seq0(sym('ws'), ',', sym('ws')),

        columnList: seq1(1,
          sym('ws'),
          repeat(sym('fieldName'), sym('comma')),
          sym('ws'),
          eof())
      };
    }
  ]
});
