/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.util.test',
  name: 'NumberParserJSTest',
  extends: 'foam.core.test.JSTest',

  documentation: 'JavaScript tests for NumberParser utility functions',

  methods: [
    async function runTest(x) {
      await this.testParse_USLocale(x);
      await this.testParse_FrenchLocale(x);
      await this.testParse_GermanLocale(x);
      await this.testParse_InvalidStrings(x);
      await this.testParse_EmptyAndNull(x);
      await this.testParse_WithoutGroupingSeparator(x);
      await this.testParse_NegativeNumbers(x);
      await this.testFormat_USLocale(x);
      await this.testFormat_FrenchLocale(x);
      await this.testFormat_GermanLocale(x);
      await this.testFormat_WithPrecision(x);
      await this.testFormat_InvalidNumbers(x);
      await this.testSeparatorDetection(x);
    },

    async function testParse_USLocale(x) {
      var parser = foam.util.NumberParser.create({ locale: 'en-US' });

      var num = parser.parse('1,234.56');
      x.test(Math.abs(num - 1234.56) < 0.001, 'US locale - parses 1,234.56 correctly');

      var num2 = parser.parse('1234.56');
      x.test(Math.abs(num2 - 1234.56) < 0.001, 'US locale - parses 1234.56 without grouping correctly');
    },

    async function testParse_FrenchLocale(x) {
      var parser = foam.util.NumberParser.create({ locale: 'fr-FR' });

      // French uses space (or non-breaking space) for grouping, comma for decimal
      var num = parser.parse('1 234,56');
      x.test(Math.abs(num - 1234.56) < 0.001, 'French locale - parses 1 234,56 correctly');

      var num2 = parser.parse('1234,56');
      x.test(Math.abs(num2 - 1234.56) < 0.001, 'French locale - parses 1234,56 without grouping correctly');
    },

    async function testParse_GermanLocale(x) {
      var parser = foam.util.NumberParser.create({ locale: 'de-DE' });

      // German uses period for grouping, comma for decimal
      var num = parser.parse('1.234,56');
      x.test(Math.abs(num - 1234.56) < 0.001, 'German locale - parses 1.234,56 correctly');

      var num2 = parser.parse('1234,56');
      x.test(Math.abs(num2 - 1234.56) < 0.001, 'German locale - parses 1234,56 without grouping correctly');
    },

    async function testParse_InvalidStrings(x) {
      var parser = foam.util.NumberParser.create({ locale: 'en-US' });

      var num1 = parser.parse('abc');
      x.test(isNaN(num1), 'Invalid string "abc" returns NaN');

      var num2 = parser.parse('12.34.56');
      x.test(isNaN(num2), 'Invalid format "12.34.56" returns NaN');

      var num3 = parser.parse('');
      x.test(isNaN(num3), 'Empty string returns NaN');
    },

    async function testParse_EmptyAndNull(x) {
      var parser = foam.util.NumberParser.create({ locale: 'en-US' });

      var num1 = parser.parse(null);
      x.test(isNaN(num1), 'null returns NaN');

      var num2 = parser.parse('');
      x.test(isNaN(num2), 'Empty string returns NaN');

      var num3 = parser.parse('   ');
      x.test(isNaN(num3), 'Whitespace string returns NaN');
    },

    async function testParse_WithoutGroupingSeparator(x) {
      var parser1 = foam.util.NumberParser.create({ locale: 'en-US' });
      var num1 = parser1.parse('123.45');
      x.test(Math.abs(num1 - 123.45) < 0.001, 'US locale - parses 123.45 without grouping');

      var parser2 = foam.util.NumberParser.create({ locale: 'fr-FR' });
      var num2 = parser2.parse('123,45');
      x.test(Math.abs(num2 - 123.45) < 0.001, 'French locale - parses 123,45 without grouping');

      var parser3 = foam.util.NumberParser.create({ locale: 'de-DE' });
      var num3 = parser3.parse('123,45');
      x.test(Math.abs(num3 - 123.45) < 0.001, 'German locale - parses 123,45 without grouping');
    },

    async function testParse_NegativeNumbers(x) {
      var parser1 = foam.util.NumberParser.create({ locale: 'en-US' });
      var num1 = parser1.parse('-1,234.56');
      x.test(Math.abs(num1 - (-1234.56)) < 0.001, 'US locale - parses negative -1,234.56');

      var parser2 = foam.util.NumberParser.create({ locale: 'fr-FR' });
      var num2 = parser2.parse('-1 234,56');
      x.test(Math.abs(num2 - (-1234.56)) < 0.001, 'French locale - parses negative -1 234,56');

      var parser3 = foam.util.NumberParser.create({ locale: 'de-DE' });
      var num3 = parser3.parse('-1.234,56');
      x.test(Math.abs(num3 - (-1234.56)) < 0.001, 'German locale - parses negative -1.234,56');
    },

    async function testFormat_USLocale(x) {
      var parser = foam.util.NumberParser.create({ locale: 'en-US' });
      var formatted = parser.format(1234.56);
      x.test(formatted === '1,234.56', 'US locale - formats 1234.56 as "1,234.56"');
    },

    async function testFormat_FrenchLocale(x) {
      var parser = foam.util.NumberParser.create({ locale: 'fr-FR' });
      var formatted = parser.format(1234.56);
      // French locale may use non-breaking space (\u00A0) or regular space
      x.test(formatted.includes('234') && formatted.includes('56'), 'French locale - formats 1234.56 correctly');
    },

    async function testFormat_GermanLocale(x) {
      var parser = foam.util.NumberParser.create({ locale: 'de-DE' });
      var formatted = parser.format(1234.56);
      x.test(formatted.includes('234') && formatted.includes('56'), 'German locale - formats 1234.56 correctly');
    },

    async function testFormat_WithPrecision(x) {
      var parser = foam.util.NumberParser.create({ locale: 'en-US' });

      var formatted1 = parser.format(1234.5, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      x.test(formatted1 === '1,234.50', 'US locale - formats 1234.5 with precision 2 as "1,234.50"');

      var formatted2 = parser.format(1234.567, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      x.test(formatted2 === '1,234.57', 'US locale - formats 1234.567 with precision 2 as "1,234.57"');

      var formatted3 = parser.format(1234, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
      x.test(formatted3 === '1,234', 'US locale - formats 1234 with precision 0 as "1,234"');
    },

    async function testFormat_InvalidNumbers(x) {
      var parser = foam.util.NumberParser.create({ locale: 'en-US' });

      var formatted1 = parser.format(null);
      x.test(formatted1 === '', 'null returns empty string');

      var formatted2 = parser.format(NaN);
      x.test(formatted2 === '', 'NaN returns empty string');
    },

    async function testSeparatorDetection(x) {
      // Test that separators are correctly detected
      var parserUS = foam.util.NumberParser.create({ locale: 'en-US' });
      parserUS.initSeparators(); // Initialize separators
      x.test(parserUS.groupSeparator_ === ',', 'US locale - group separator is comma');
      x.test(parserUS.decimalSeparator_ === '.', 'US locale - decimal separator is period');

      var parserFR = foam.util.NumberParser.create({ locale: 'fr-FR' });
      parserFR.initSeparators(); // Initialize separators
      x.test(parserFR.decimalSeparator_ === ',', 'French locale - decimal separator is comma');

      var parserDE = foam.util.NumberParser.create({ locale: 'de-DE' });
      parserDE.initSeparators(); // Initialize separators
      x.test(parserDE.groupSeparator_ === '.', 'German locale - group separator is period');
      x.test(parserDE.decimalSeparator_ === ',', 'German locale - decimal separator is comma');
    }
  ]
});
