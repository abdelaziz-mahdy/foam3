/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.util.test',
  name: 'NumberParserTest',
  extends: 'foam.core.test.Test',

  documentation: 'Test NumberParser utility functions',

  methods: [
    {
      name: 'runTest',
      javaCode: `
        NumberParserTest_parse_USLocale();
        NumberParserTest_parse_FrenchLocale();
        NumberParserTest_parse_GermanLocale();
        NumberParserTest_parse_InvalidStrings();
        NumberParserTest_parse_EmptyAndNull();
        NumberParserTest_parse_WithoutGroupingSeparator();
        NumberParserTest_parse_NegativeNumbers();
        NumberParserTest_format_USLocale();
        NumberParserTest_format_FrenchLocale();
        NumberParserTest_format_GermanLocale();
        NumberParserTest_format_WithPrecision();
        NumberParserTest_format_InvalidNumbers();
      `
    },
    {
      name: 'NumberParserTest_parse_USLocale',
      javaCode: `
        // US locale uses comma for grouping, period for decimal
        foam.util.NumberParser parser = new foam.util.NumberParser.Builder(null).setLocale("en-US").build();
        float num = parser.parse("1,234.56");
        test(Math.abs(num - 1234.56f) < 0.001f, "US locale - parses 1,234.56 correctly");

        float num2 = parser.parse("1234.56");
        test(Math.abs(num2 - 1234.56f) < 0.001f, "US locale - parses 1234.56 without grouping correctly");
      `
    },
    {
      name: 'NumberParserTest_parse_FrenchLocale',
      javaCode: `
        // French locale uses space for grouping, comma for decimal
        foam.util.NumberParser parser = new foam.util.NumberParser.Builder(null).setLocale("fr-FR").build();
        float num = parser.parse("1 234,56");
        test(Math.abs(num - 1234.56f) < 0.001f, "French locale - parses 1 234,56 correctly");

        float num2 = parser.parse("1234,56");
        test(Math.abs(num2 - 1234.56f) < 0.001f, "French locale - parses 1234,56 without grouping correctly");
      `
    },
    {
      name: 'NumberParserTest_parse_GermanLocale',
      javaCode: `
        // German locale uses period for grouping, comma for decimal
        foam.util.NumberParser parser = new foam.util.NumberParser.Builder(null).setLocale("de-DE").build();
        float num = parser.parse("1.234,56");
        test(Math.abs(num - 1234.56f) < 0.001f, "German locale - parses 1.234,56 correctly");

        float num2 = parser.parse("1234,56");
        test(Math.abs(num2 - 1234.56f) < 0.001f, "German locale - parses 1234,56 without grouping correctly");
      `
    },
    {
      name: 'NumberParserTest_parse_InvalidStrings',
      javaCode: `
        foam.util.NumberParser parser = new foam.util.NumberParser.Builder(null).setLocale("en-US").build();
        float num1 = parser.parse("abc");
        test(Float.isNaN(num1), "Invalid string 'abc' returns NaN");

        float num2 = parser.parse("12.34.56");
        test(Float.isNaN(num2), "Invalid format '12.34.56' returns NaN");

        float num3 = parser.parse("");
        test(Float.isNaN(num3), "Empty string returns NaN");
      `
    },
    {
      name: 'NumberParserTest_parse_EmptyAndNull',
      javaCode: `
        foam.util.NumberParser parser = new foam.util.NumberParser.Builder(null).setLocale("en-US").build();
        float num1 = parser.parse(null);
        test(Float.isNaN(num1), "null returns NaN");

        float num2 = parser.parse("");
        test(Float.isNaN(num2), "Empty string returns NaN");

        float num3 = parser.parse("   ");
        test(Float.isNaN(num3), "Whitespace string returns NaN");
      `
    },
    {
      name: 'NumberParserTest_parse_WithoutGroupingSeparator',
      javaCode: `
        foam.util.NumberParser parser1 = new foam.util.NumberParser.Builder(null).setLocale("en-US").build();
        float num1 = parser1.parse("123.45");
        test(Math.abs(num1 - 123.45f) < 0.001f, "US locale - parses 123.45 without grouping");

        foam.util.NumberParser parser2 = new foam.util.NumberParser.Builder(null).setLocale("fr-FR").build();
        float num2 = parser2.parse("123,45");
        test(Math.abs(num2 - 123.45f) < 0.001f, "French locale - parses 123,45 without grouping");

        foam.util.NumberParser parser3 = new foam.util.NumberParser.Builder(null).setLocale("de-DE").build();
        float num3 = parser3.parse("123,45");
        test(Math.abs(num3 - 123.45f) < 0.001f, "German locale - parses 123,45 without grouping");
      `
    },
    {
      name: 'NumberParserTest_parse_NegativeNumbers',
      javaCode: `
        foam.util.NumberParser parser1 = new foam.util.NumberParser.Builder(null).setLocale("en-US").build();
        float num1 = parser1.parse("-1,234.56");
        test(Math.abs(num1 - (-1234.56f)) < 0.001f, "US locale - parses negative -1,234.56");

        foam.util.NumberParser parser2 = new foam.util.NumberParser.Builder(null).setLocale("fr-FR").build();
        float num2 = parser2.parse("-1 234,56");
        test(Math.abs(num2 - (-1234.56f)) < 0.001f, "French locale - parses negative -1 234,56");

        foam.util.NumberParser parser3 = new foam.util.NumberParser.Builder(null).setLocale("de-DE").build();
        float num3 = parser3.parse("-1.234,56");
        test(Math.abs(num3 - (-1234.56f)) < 0.001f, "German locale - parses negative -1.234,56");
      `
    },
    {
      name: 'NumberParserTest_format_USLocale',
      javaCode: `
        foam.util.NumberParser parser = new foam.util.NumberParser.Builder(null).setLocale("en-US").build();
        String formatted = parser.format(1234.56f, null);
        test(formatted.equals("1,234.56"), "US locale - formats 1234.56 as '1,234.56'");
      `
    },
    {
      name: 'NumberParserTest_format_FrenchLocale',
      javaCode: `
        foam.util.NumberParser parser = new foam.util.NumberParser.Builder(null).setLocale("fr-FR").build();
        String formatted = parser.format(1234.56f, null);
        // French locale may use non-breaking space (\\u00A0) or regular space
        test(formatted.contains("234") && formatted.contains("56"), "French locale - formats 1234.56 correctly");
      `
    },
    {
      name: 'NumberParserTest_format_GermanLocale',
      javaCode: `
        foam.util.NumberParser parser = new foam.util.NumberParser.Builder(null).setLocale("de-DE").build();
        String formatted = parser.format(1234.56f, null);
        test(formatted.contains("234") && formatted.contains("56"), "German locale - formats 1234.56 correctly");
      `
    },
    {
      name: 'NumberParserTest_format_WithPrecision',
      javaCode: `
        foam.util.NumberParser parser = new foam.util.NumberParser.Builder(null).setLocale("en-US").build();

        java.util.Map options1 = new java.util.HashMap();
        options1.put("minimumFractionDigits", 2);
        options1.put("maximumFractionDigits", 2);
        String formatted1 = parser.format(1234.5f, options1);
        test(formatted1.equals("1,234.50"), "US locale - formats 1234.5 with precision 2 as '1,234.50'");

        java.util.Map options2 = new java.util.HashMap();
        options2.put("minimumFractionDigits", 2);
        options2.put("maximumFractionDigits", 2);
        String formatted2 = parser.format(1234.567f, options2);
        test(formatted2.equals("1,234.57"), "US locale - formats 1234.567 with precision 2 as '1,234.57'");

        java.util.Map options3 = new java.util.HashMap();
        options3.put("minimumFractionDigits", 0);
        options3.put("maximumFractionDigits", 0);
        String formatted3 = parser.format(1234f, options3);
        test(formatted3.equals("1,234"), "US locale - formats 1234 with precision 0 as '1,234'");
      `
    },
    {
      name: 'NumberParserTest_format_InvalidNumbers',
      javaCode: `
        foam.util.NumberParser parser = new foam.util.NumberParser.Builder(null).setLocale("en-US").build();
        String formatted1 = parser.format(null, null);
        test(formatted1.equals(""), "null returns empty string");

        String formatted2 = parser.format(Float.NaN, null);
        test(formatted2.equals(""), "NaN returns empty string");
      `
    }
  ]
});
