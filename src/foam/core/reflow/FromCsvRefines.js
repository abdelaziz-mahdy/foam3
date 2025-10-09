/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.lib.csv',
  name: 'PropertyFromCSV',
  refines: 'foam.lang.Property',

  properties: [
    {
      class: 'Function',
      name: 'fromCSV',
      value: function(str) {
        return this.fromString(str);
      }
    }
  ]
});


foam.CLASS({
  name: 'IntFromCSVRefines',
  refines: 'foam.lang.Int',

  properties: [
    {
      class: 'Function',
      name: 'fromCSV',
      documentation: `
        Parses integer values from CSV with optional locale support.
        Parameters:
        - str: The string to parse
        - opt_parser: Optional NumberParser instance for locale-aware parsing
      `,
      value: function(str, opt_parser) {
        if ( ! str || typeof str !== 'string' ) {
          return this.fromString(str);
        }

        // If a NumberParser is provided, use it for locale-aware parsing
        if ( opt_parser && opt_parser.parse ) {
          var parsed = opt_parser.parse(str);
          return isNaN(parsed) ? this.fromString(str) : Math.floor(parsed);
        }

        // Default behavior: remove commas (US format) then parse
        if ( str.includes(',') ) {
          str = str.replace(/,/g, '');
        }
        return this.fromString(str);
      }
    }
  ]
});


foam.CLASS({
  name: 'FloatFromCSVRefines',
  refines: 'foam.lang.Float',

  properties: [
    {
      class: 'Function',
      name: 'fromCSV',
      documentation: `
        Parses float values from CSV with optional locale support.
        Parameters:
        - str: The string to parse
        - opt_parser: Optional NumberParser instance for locale-aware parsing
      `,
      value: function(str, opt_parser) {
        if ( ! str || typeof str !== 'string' ) {
          return this.fromString(str);
        }

        // If a NumberParser is provided, use it for locale-aware parsing
        if ( opt_parser && opt_parser.parse ) {
          var parsed = opt_parser.parse(str);
          return isNaN(parsed) ? this.fromString(str) : parsed;
        }

        // Default behavior: remove commas (US format) then parse
        if ( str.includes(',') ) {
          str = str.replace(/,/g, '');
        }
        return this.fromString(str);
      }
    }
  ]
});
