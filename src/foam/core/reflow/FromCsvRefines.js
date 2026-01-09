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
      documentation: 'Parses integer values from CSV. Removes commas (thousands separators) before parsing.',
      value: function(str) {
        if ( ! str || typeof str !== 'string' ) {
          return this.fromString(str);
        }

        // Remove commas (thousands separators in standard format)
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
      documentation: 'Parses float values from CSV. Removes commas (thousands separators) before parsing.',
      value: function(str) {
        if ( ! str || typeof str !== 'string' ) {
          return this.fromString(str);
        }

        // Remove commas (thousands separators in standard format)
        if ( str.includes(',') ) {
          str = str.replace(/,/g, '');
        }
        return this.fromString(str);
      }
    }
  ]
});
