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
      documentation: 'Parses integer values from CSV using NumberParser.',
      value: function(str, format) {
        // format is the parser symbol name: undefined/null for standard, 'european' for European
        if ( ! str || typeof str !== 'string' ) {
          return this.fromString(str);
        }

        var parser = foam.parse.NumberParser.create();
        var result = parser.parseString(str, format);

        if ( isNaN(result) ) {
          return this.fromString(str);
        }

        return Math.round(result);
      }
    }
  ]
});


foam.CLASS({
  name: 'LongFromCSVRefines',
  refines: 'foam.lang.Long',

  properties: [
    {
      class: 'Function',
      name: 'fromCSV',
      documentation: 'Parses long values from CSV using NumberParser.',
      value: function(str, format) {
        // format is the parser symbol name: undefined/null for standard, 'european' for European
        if ( ! str || typeof str !== 'string' ) {
          return this.fromString(str);
        }

        var parser = foam.parse.NumberParser.create();
        var result = parser.parseString(str, format);

        if ( isNaN(result) ) {
          return this.fromString(str);
        }

        return Math.round(result);
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
      documentation: 'Parses float values from CSV using NumberParser.',
      value: function(str, format) {
        // format is the parser symbol name: undefined/null for standard, 'european' for European
        if ( ! str || typeof str !== 'string' ) {
          return this.fromString(str);
        }

        var parser = foam.parse.NumberParser.create();
        var result = parser.parseString(str, format);

        if ( isNaN(result) ) {
          return this.fromString(str);
        }

        return result;
      }
    }
  ]
});


foam.CLASS({
  name: 'DoubleFromCSVRefines',
  refines: 'foam.lang.Double',

  properties: [
    {
      class: 'Function',
      name: 'fromCSV',
      documentation: 'Parses double values from CSV using NumberParser.',
      value: function(str, format) {
        // format is the parser symbol name: undefined/null for standard, 'european' for European
        if ( ! str || typeof str !== 'string' ) {
          return this.fromString(str);
        }

        var parser = foam.parse.NumberParser.create();
        var result = parser.parseString(str, format);

        if ( isNaN(result) ) {
          return this.fromString(str);
        }

        return result;
      }
    }
  ]
});


foam.CLASS({
  name: 'DateFromCSVRefines',
  refines: 'foam.lang.Date',

  properties: [
    {
      class: 'Function',
      name: 'fromCSV',
      value: function(str, format) {
        // format is the parser symbol name: 'START', 'ddmmyyyy', or 'yyyyddmm'
        if ( ! str || str === '' ) return null;
        return foam.util.DateUtil.parseDateString(str, format);
      }
    }
  ]
});


foam.CLASS({
  name: 'DateTimeFromCSVRefines',
  refines: 'foam.lang.DateTime',

  properties: [
    {
      class: 'Function',
      name: 'fromCSV',
      value: function(str, format) {
        // format is the parser symbol name: 'START', 'ddmmyyyy', or 'yyyyddmm'
        if ( ! str || str === '' ) return null;
        return foam.util.DateUtil.parseDateTime(str, format);
      }
    }
  ]
});


foam.CLASS({
  name: 'DateTimeUTCFromCSVRefines',
  refines: 'foam.lang.DateTimeUTC',

  properties: [
    {
      class: 'Function',
      name: 'fromCSV',
      value: function(str, format) {
        // format is the parser symbol name: 'START', 'ddmmyyyy', or 'yyyyddmm'
        if ( ! str || str === '' ) return null;
        return foam.util.DateUtil.parseDateTimeUTC(str, format);
      }
    }
  ]
});
