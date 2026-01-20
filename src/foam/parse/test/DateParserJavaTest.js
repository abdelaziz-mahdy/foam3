/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.parse.test',
  name: 'DateParserJavaTest',
  extends: 'foam.core.test.Test',

  javaImports: [
    'foam.parse.DateParser',
    'java.util.Calendar',
    'java.util.Date',
    'java.util.TimeZone'
  ],

  documentation: 'Comprehensive Java tests for DateParser covering all formats',

  methods: [
    {
      name: 'runTest',
      javaCode: `
        // YYYYMMDD Format Tests
        DateParserTest_YYYYMMDD_Separated();
        DateParserTest_YYYYMMDD_Compact();
        DateParserTest_YYYYMMDD_WithTime();
        DateParserTest_YYYYMMDD_WithTimezone();

        // MMDDYYYY Format Tests
        DateParserTest_MMDDYYYY_Separated();
        DateParserTest_MMDDYYYY_Compact();
        DateParserTest_MMDDYYYY_WithTime();

        // YYMMDD Format Tests
        DateParserTest_YYMMDD_Separated();
        DateParserTest_YYMMDD_Compact();
        DateParserTest_YYMMDD_TwoDigitYearPivot();

        // DDMMYYYY Format Tests (via opt_name)
        DateParserTest_DDMMYYYY_Separated();
        DateParserTest_DDMMYYYY_Compact();
        DateParserTest_DDMMYYYY_WithTime();

        // YYYYDDMM Format Tests (via opt_name)
        DateParserTest_YYYYDDMM_Separated();
        DateParserTest_YYYYDDMM_Compact();

        // Month Name Format Tests
        DateParserTest_DDMMMYYYY_Separated();
        DateParserTest_DDMMMYYYY_Compact();
        DateParserTest_YYYYDDMMM_Separated();
        DateParserTest_YYYYDDMMM_Compact();

        // Parsing Method Tests
        DateParserTest_parseDateString();
        DateParserTest_parseDateTime();
        DateParserTest_parseDateTimeUTC();

        // Timezone Tests
        DateParserTest_Timezone_Z();
        DateParserTest_Timezone_Positive();
        DateParserTest_Timezone_Negative();
        DateParserTest_Timezone_Formats();

        // Edge Cases and Validation
        DateParserTest_LeapYear();
        DateParserTest_InvalidDates();
        DateParserTest_PartialParse();

        // Strict Validation Mode Tests
        DateParserTest_StrictValidation_ThrowsForInvalid();
        DateParserTest_StrictValidation_ValidDatesWork();
        DateParserTest_LenientValidation_ReturnsMaxDate();
        DateParserTest_LenientValidation_ValidDatesWork();
      `
    },

    // ========== YYYYMMDD Format Tests ==========

    {
      name: 'DateParserTest_YYYYMMDD_Separated',
      javaCode: `
        DateParser parser = new DateParser();

        // Test 2025-01-15
        Date date1 = parser.parseString("2025-01-15");
        Calendar cal1 = Calendar.getInstance(TimeZone.getTimeZone("GMT"));
        cal1.setTime(date1);
        test(cal1.get(Calendar.YEAR) == 2025, "YYYYMMDD-Sep: year 2025");
        test(cal1.get(Calendar.MONTH) == 0, "YYYYMMDD-Sep: month 0 (Jan)");
        test(cal1.get(Calendar.DAY_OF_MONTH) == 15, "YYYYMMDD-Sep: day 15");
        test(cal1.get(Calendar.HOUR_OF_DAY) == 12, "YYYYMMDD-Sep: hour 12 (noon)");

        // Test 2025/01/15
        Date date2 = parser.parseString("2025/01/15");
        Calendar cal2 = Calendar.getInstance(TimeZone.getTimeZone("GMT"));
        cal2.setTime(date2);
        test(cal2.get(Calendar.YEAR) == 2025, "YYYYMMDD-Sep (slash): year 2025");
        test(cal2.get(Calendar.MONTH) == 0, "YYYYMMDD-Sep (slash): month 0");

        // Test 2024-12-31
        Date date3 = parser.parseString("2024-12-31");
        Calendar cal3 = Calendar.getInstance(TimeZone.getTimeZone("GMT"));
        cal3.setTime(date3);
        test(cal3.get(Calendar.YEAR) == 2024, "YYYYMMDD-Sep: year 2024");
        test(cal3.get(Calendar.MONTH) == 11, "YYYYMMDD-Sep: month 11 (Dec)");
        test(cal3.get(Calendar.DAY_OF_MONTH) == 31, "YYYYMMDD-Sep: day 31");
      `
    },

    {
      name: 'DateParserTest_YYYYMMDD_Compact',
      javaCode: `
        DateParser parser = new DateParser();

        // Test 20250115
        Date date1 = parser.parseString("20250115");
        Calendar cal1 = Calendar.getInstance(TimeZone.getTimeZone("GMT"));
        cal1.setTime(date1);
        test(cal1.get(Calendar.YEAR) == 2025, "YYYYMMDD-Compact: year 2025");
        test(cal1.get(Calendar.MONTH) == 0, "YYYYMMDD-Compact: month 0 (Jan)");
        test(cal1.get(Calendar.DAY_OF_MONTH) == 15, "YYYYMMDD-Compact: day 15");

        // Test 20241231
        Date date2 = parser.parseString("20241231");
        Calendar cal2 = Calendar.getInstance(TimeZone.getTimeZone("GMT"));
        cal2.setTime(date2);
        test(cal2.get(Calendar.YEAR) == 2024, "YYYYMMDD-Compact: year 2024");
        test(cal2.get(Calendar.MONTH) == 11, "YYYYMMDD-Compact: month 11 (Dec)");
        test(cal2.get(Calendar.DAY_OF_MONTH) == 31, "YYYYMMDD-Compact: day 31");

        // Test 19990101
        Date date3 = parser.parseString("19990101");
        Calendar cal3 = Calendar.getInstance(TimeZone.getTimeZone("GMT"));
        cal3.setTime(date3);
        test(cal3.get(Calendar.YEAR) == 1999, "YYYYMMDD-Compact: year 1999");
        test(cal3.get(Calendar.MONTH) == 0, "YYYYMMDD-Compact: month 0 (Jan)");
        test(cal3.get(Calendar.DAY_OF_MONTH) == 1, "YYYYMMDD-Compact: day 1");
      `
    },

    {
      name: 'DateParserTest_YYYYMMDD_WithTime',
      javaCode: `
        DateParser parser = new DateParser();

        // Test 2025-01-15T14:30:45
        Date date1 = parser.parseDateTime("2025-01-15T14:30:45");
        Calendar cal1 = Calendar.getInstance();
        cal1.setTime(date1);
        test(cal1.get(Calendar.YEAR) == 2025, "YYYYMMDD with time: year 2025");
        test(cal1.get(Calendar.MONTH) == 0, "YYYYMMDD with time: month 0");
        test(cal1.get(Calendar.DAY_OF_MONTH) == 15, "YYYYMMDD with time: day 15");
        test(cal1.get(Calendar.HOUR_OF_DAY) == 14, "YYYYMMDD with time: hour 14");
        test(cal1.get(Calendar.MINUTE) == 30, "YYYYMMDD with time: minute 30");
        test(cal1.get(Calendar.SECOND) == 45, "YYYYMMDD with time: second 45");

        // Test 2025-01-15 09:15 (space separator)
        Date date2 = parser.parseDateTime("2025-01-15 09:15");
        Calendar cal2 = Calendar.getInstance();
        cal2.setTime(date2);
        test(cal2.get(Calendar.HOUR_OF_DAY) == 9, "YYYYMMDD with time (space): hour 9");
        test(cal2.get(Calendar.MINUTE) == 15, "YYYYMMDD with time (space): minute 15");
      `
    },

    {
      name: 'DateParserTest_YYYYMMDD_WithTimezone',
      javaCode: `
        DateParser parser = new DateParser();

        // Test 2025-01-15T14:30:45Z
        Date date1 = parser.parseDateTimeUTC("2025-01-15T14:30:45Z");
        Calendar cal1 = Calendar.getInstance(TimeZone.getTimeZone("GMT"));
        cal1.setTime(date1);
        test(cal1.get(Calendar.YEAR) == 2025, "YYYYMMDD with Z: year 2025");
        test(cal1.get(Calendar.MONTH) == 0, "YYYYMMDD with Z: month 0");
        test(cal1.get(Calendar.DAY_OF_MONTH) == 15, "YYYYMMDD with Z: day 15");
        test(cal1.get(Calendar.HOUR_OF_DAY) == 14, "YYYYMMDD with Z: hour 14");
        test(cal1.get(Calendar.MINUTE) == 30, "YYYYMMDD with Z: minute 30");
        test(cal1.get(Calendar.SECOND) == 45, "YYYYMMDD with Z: second 45");
      `
    },

    // ========== MMDDYYYY Format Tests ==========

    {
      name: 'DateParserTest_MMDDYYYY_Separated',
      javaCode: `
        DateParser parser = new DateParser();

        // Test 01/15/2025
        Date date1 = parser.parseString("01/15/2025");
        Calendar cal1 = Calendar.getInstance(TimeZone.getTimeZone("GMT"));
        cal1.setTime(date1);
        test(cal1.get(Calendar.YEAR) == 2025, "MMDDYYYY-Sep: year 2025");
        test(cal1.get(Calendar.MONTH) == 0, "MMDDYYYY-Sep: month 0 (Jan)");
        test(cal1.get(Calendar.DAY_OF_MONTH) == 15, "MMDDYYYY-Sep: day 15");

        // Test 12/31/2024
        Date date2 = parser.parseString("12/31/2024");
        Calendar cal2 = Calendar.getInstance(TimeZone.getTimeZone("GMT"));
        cal2.setTime(date2);
        test(cal2.get(Calendar.YEAR) == 2024, "MMDDYYYY-Sep: year 2024");
        test(cal2.get(Calendar.MONTH) == 11, "MMDDYYYY-Sep: month 11 (Dec)");
        test(cal2.get(Calendar.DAY_OF_MONTH) == 31, "MMDDYYYY-Sep: day 31");
      `
    },

    {
      name: 'DateParserTest_MMDDYYYY_Compact',
      javaCode: `
        DateParser parser = new DateParser();

        // Test 01152025
        Date date1 = parser.parseString("01152025");
        Calendar cal1 = Calendar.getInstance(TimeZone.getTimeZone("GMT"));
        cal1.setTime(date1);
        test(cal1.get(Calendar.YEAR) == 2025, "MMDDYYYY-Compact: year 2025");
        test(cal1.get(Calendar.MONTH) == 0, "MMDDYYYY-Compact: month 0 (Jan)");
        test(cal1.get(Calendar.DAY_OF_MONTH) == 15, "MMDDYYYY-Compact: day 15");

        // Test 12312024
        Date date2 = parser.parseString("12312024");
        Calendar cal2 = Calendar.getInstance(TimeZone.getTimeZone("GMT"));
        cal2.setTime(date2);
        test(cal2.get(Calendar.YEAR) == 2024, "MMDDYYYY-Compact: year 2024");
        test(cal2.get(Calendar.MONTH) == 11, "MMDDYYYY-Compact: month 11 (Dec)");
        test(cal2.get(Calendar.DAY_OF_MONTH) == 31, "MMDDYYYY-Compact: day 31");
      `
    },

    {
      name: 'DateParserTest_MMDDYYYY_WithTime',
      javaCode: `
        DateParser parser = new DateParser();

        // Test 01/15/2025 14:30:45
        Date date1 = parser.parseDateTime("01/15/2025 14:30:45");
        Calendar cal1 = Calendar.getInstance();
        cal1.setTime(date1);
        test(cal1.get(Calendar.YEAR) == 2025, "MMDDYYYY with time: year 2025");
        test(cal1.get(Calendar.MONTH) == 0, "MMDDYYYY with time: month 0");
        test(cal1.get(Calendar.DAY_OF_MONTH) == 15, "MMDDYYYY with time: day 15");
        test(cal1.get(Calendar.HOUR_OF_DAY) == 14, "MMDDYYYY with time: hour 14");
        test(cal1.get(Calendar.MINUTE) == 30, "MMDDYYYY with time: minute 30");
        test(cal1.get(Calendar.SECOND) == 45, "MMDDYYYY with time: second 45");
      `
    },

    // ========== YYMMDD Format Tests ==========

    {
      name: 'DateParserTest_YYMMDD_Separated',
      javaCode: `
        DateParser parser = new DateParser();

        // Test 25/01/15
        Date date1 = parser.parseString("25/01/15");
        Calendar cal1 = Calendar.getInstance(TimeZone.getTimeZone("GMT"));
        cal1.setTime(date1);
        test(cal1.get(Calendar.YEAR) == 2025, "YYMMDD-Sep: year 2025");
        test(cal1.get(Calendar.MONTH) == 0, "YYMMDD-Sep: month 0 (Jan)");
        test(cal1.get(Calendar.DAY_OF_MONTH) == 15, "YYMMDD-Sep: day 15");

        // Test 00/02/29 (leap year 2000)
        Date date2 = parser.parseString("00/02/29");
        Calendar cal2 = Calendar.getInstance(TimeZone.getTimeZone("GMT"));
        cal2.setTime(date2);
        test(cal2.get(Calendar.YEAR) == 2000, "YYMMDD-Sep: year 2000");
        test(cal2.get(Calendar.MONTH) == 1, "YYMMDD-Sep: month 1 (Feb)");
        test(cal2.get(Calendar.DAY_OF_MONTH) == 29, "YYMMDD-Sep: day 29");
      `
    },

    {
      name: 'DateParserTest_YYMMDD_Compact',
      javaCode: `
        DateParser parser = new DateParser();

        // Test 250115
        Date date1 = parser.parseString("250115");
        Calendar cal1 = Calendar.getInstance(TimeZone.getTimeZone("GMT"));
        cal1.setTime(date1);
        test(cal1.get(Calendar.YEAR) == 2025, "YYMMDD-Compact: year 2025");
        test(cal1.get(Calendar.MONTH) == 0, "YYMMDD-Compact: month 0 (Jan)");
        test(cal1.get(Calendar.DAY_OF_MONTH) == 15, "YYMMDD-Compact: day 15");

        // Test 000229 (leap year 2000)
        Date date2 = parser.parseString("000229");
        Calendar cal2 = Calendar.getInstance(TimeZone.getTimeZone("GMT"));
        cal2.setTime(date2);
        test(cal2.get(Calendar.YEAR) == 2000, "YYMMDD-Compact: year 2000");
        test(cal2.get(Calendar.MONTH) == 1, "YYMMDD-Compact: month 1 (Feb)");
        test(cal2.get(Calendar.DAY_OF_MONTH) == 29, "YYMMDD-Compact: day 29");
      `
    },

    {
      name: 'DateParserTest_YYMMDD_TwoDigitYearPivot',
      javaCode: `
        DateParser parser = new DateParser();

        // Test pivot at 50: 00-49 => 2000-2049, 50-99 => 1950-1999

        // Test 49/12/31 (should be 2049)
        Date date1 = parser.parseString("49/12/31");
        Calendar cal1 = Calendar.getInstance(TimeZone.getTimeZone("GMT"));
        cal1.setTime(date1);
        test(cal1.get(Calendar.YEAR) == 2049, "YYMMDD pivot: 49 => 2049");

        // Test 50/01/01 (should be 1950)
        Date date2 = parser.parseString("50/01/01");
        Calendar cal2 = Calendar.getInstance(TimeZone.getTimeZone("GMT"));
        cal2.setTime(date2);
        test(cal2.get(Calendar.YEAR) == 1950, "YYMMDD pivot: 50 => 1950");

        // Test 99/12/31 (should be 1999)
        Date date3 = parser.parseString("99/12/31");
        Calendar cal3 = Calendar.getInstance(TimeZone.getTimeZone("GMT"));
        cal3.setTime(date3);
        test(cal3.get(Calendar.YEAR) == 1999, "YYMMDD pivot: 99 => 1999");
      `
    },

    // ========== DDMMYYYY Format Tests ==========

    {
      name: 'DateParserTest_DDMMYYYY_Separated',
      javaCode: `
        DateParser parser = new DateParser();

        // Test 15/01/2025 (with opt_name='ddmmyyyy')
        Date date1 = parser.parseString("15/01/2025", "ddmmyyyy");
        Calendar cal1 = Calendar.getInstance(TimeZone.getTimeZone("GMT"));
        cal1.setTime(date1);
        test(cal1.get(Calendar.YEAR) == 2025, "DDMMYYYY-Sep: year 2025");
        test(cal1.get(Calendar.MONTH) == 0, "DDMMYYYY-Sep: month 0 (Jan)");
        test(cal1.get(Calendar.DAY_OF_MONTH) == 15, "DDMMYYYY-Sep: day 15");

        // Test 31/12/2024
        Date date2 = parser.parseString("31/12/2024", "ddmmyyyy");
        Calendar cal2 = Calendar.getInstance(TimeZone.getTimeZone("GMT"));
        cal2.setTime(date2);
        test(cal2.get(Calendar.YEAR) == 2024, "DDMMYYYY-Sep: year 2024");
        test(cal2.get(Calendar.MONTH) == 11, "DDMMYYYY-Sep: month 11 (Dec)");
        test(cal2.get(Calendar.DAY_OF_MONTH) == 31, "DDMMYYYY-Sep: day 31");
      `
    },

    {
      name: 'DateParserTest_DDMMYYYY_Compact',
      javaCode: `
        DateParser parser = new DateParser();

        // Test 15012025 (with opt_name='ddmmyyyy')
        Date date1 = parser.parseString("15012025", "ddmmyyyy");
        Calendar cal1 = Calendar.getInstance(TimeZone.getTimeZone("GMT"));
        cal1.setTime(date1);
        test(cal1.get(Calendar.YEAR) == 2025, "DDMMYYYY-Compact: year 2025");
        test(cal1.get(Calendar.MONTH) == 0, "DDMMYYYY-Compact: month 0 (Jan)");
        test(cal1.get(Calendar.DAY_OF_MONTH) == 15, "DDMMYYYY-Compact: day 15");

        // Test 31122024
        Date date2 = parser.parseString("31122024", "ddmmyyyy");
        Calendar cal2 = Calendar.getInstance(TimeZone.getTimeZone("GMT"));
        cal2.setTime(date2);
        test(cal2.get(Calendar.YEAR) == 2024, "DDMMYYYY-Compact: year 2024");
        test(cal2.get(Calendar.MONTH) == 11, "DDMMYYYY-Compact: month 11 (Dec)");
        test(cal2.get(Calendar.DAY_OF_MONTH) == 31, "DDMMYYYY-Compact: day 31");
      `
    },

    {
      name: 'DateParserTest_DDMMYYYY_WithTime',
      javaCode: `
        DateParser parser = new DateParser();

        // Test 15/01/2025 14:30:45 (with opt_name='ddmmyyyy')
        Date date1 = parser.parseDateTime("15/01/2025 14:30:45", "ddmmyyyy");
        Calendar cal1 = Calendar.getInstance();
        cal1.setTime(date1);
        test(cal1.get(Calendar.YEAR) == 2025, "DDMMYYYY with time: year 2025");
        test(cal1.get(Calendar.MONTH) == 0, "DDMMYYYY with time: month 0");
        test(cal1.get(Calendar.DAY_OF_MONTH) == 15, "DDMMYYYY with time: day 15");
        test(cal1.get(Calendar.HOUR_OF_DAY) == 14, "DDMMYYYY with time: hour 14");
        test(cal1.get(Calendar.MINUTE) == 30, "DDMMYYYY with time: minute 30");
        test(cal1.get(Calendar.SECOND) == 45, "DDMMYYYY with time: second 45");
      `
    },

    // ========== YYYYDDMM Format Tests ==========

    {
      name: 'DateParserTest_YYYYDDMM_Separated',
      javaCode: `
        DateParser parser = new DateParser();

        // Test 2025/15/01 (with opt_name='yyyyddmm')
        Date date1 = parser.parseString("2025/15/01", "yyyyddmm");
        Calendar cal1 = Calendar.getInstance(TimeZone.getTimeZone("GMT"));
        cal1.setTime(date1);
        test(cal1.get(Calendar.YEAR) == 2025, "YYYYDDMM-Sep: year 2025");
        test(cal1.get(Calendar.MONTH) == 0, "YYYYDDMM-Sep: month 0 (Jan)");
        test(cal1.get(Calendar.DAY_OF_MONTH) == 15, "YYYYDDMM-Sep: day 15");
      `
    },

    {
      name: 'DateParserTest_YYYYDDMM_Compact',
      javaCode: `
        DateParser parser = new DateParser();

        // Test 20251501 (with opt_name='yyyyddmm')
        Date date1 = parser.parseString("20251501", "yyyyddmm");
        Calendar cal1 = Calendar.getInstance(TimeZone.getTimeZone("GMT"));
        cal1.setTime(date1);
        test(cal1.get(Calendar.YEAR) == 2025, "YYYYDDMM-Compact: year 2025");
        test(cal1.get(Calendar.MONTH) == 0, "YYYYDDMM-Compact: month 0 (Jan)");
        test(cal1.get(Calendar.DAY_OF_MONTH) == 15, "YYYYDDMM-Compact: day 15");
      `
    },

    // ========== Month Name Format Tests ==========

    {
      name: 'DateParserTest_DDMMMYYYY_Separated',
      javaCode: `
        DateParser parser = new DateParser();

        // Test 15-JAN-2025
        Date date1 = parser.parseString("15-JAN-2025");
        Calendar cal1 = Calendar.getInstance(TimeZone.getTimeZone("GMT"));
        cal1.setTime(date1);
        test(cal1.get(Calendar.YEAR) == 2025, "DDMMMYYYY-Sep: year 2025");
        test(cal1.get(Calendar.MONTH) == 0, "DDMMMYYYY-Sep: month 0 (JAN)");
        test(cal1.get(Calendar.DAY_OF_MONTH) == 15, "DDMMMYYYY-Sep: day 15");

        // Test 31/DEC/2024
        Date date2 = parser.parseString("31/DEC/2024");
        Calendar cal2 = Calendar.getInstance(TimeZone.getTimeZone("GMT"));
        cal2.setTime(date2);
        test(cal2.get(Calendar.YEAR) == 2024, "DDMMMYYYY-Sep: year 2024");
        test(cal2.get(Calendar.MONTH) == 11, "DDMMMYYYY-Sep: month 11 (DEC)");
        test(cal2.get(Calendar.DAY_OF_MONTH) == 31, "DDMMMYYYY-Sep: day 31");
      `
    },

    {
      name: 'DateParserTest_DDMMMYYYY_Compact',
      javaCode: `
        DateParser parser = new DateParser();

        // Test 15JAN2025
        Date date1 = parser.parseString("15JAN2025");
        Calendar cal1 = Calendar.getInstance(TimeZone.getTimeZone("GMT"));
        cal1.setTime(date1);
        test(cal1.get(Calendar.YEAR) == 2025, "DDMMMYYYY-Compact: year 2025");
        test(cal1.get(Calendar.MONTH) == 0, "DDMMMYYYY-Compact: month 0 (JAN)");
        test(cal1.get(Calendar.DAY_OF_MONTH) == 15, "DDMMMYYYY-Compact: day 15");
      `
    },

    {
      name: 'DateParserTest_YYYYDDMMM_Separated',
      javaCode: `
        DateParser parser = new DateParser();

        // Test 2025-15-JAN
        Date date1 = parser.parseString("2025-15-JAN");
        Calendar cal1 = Calendar.getInstance(TimeZone.getTimeZone("GMT"));
        cal1.setTime(date1);
        test(cal1.get(Calendar.YEAR) == 2025, "YYYYDDMMM-Sep: year 2025");
        test(cal1.get(Calendar.MONTH) == 0, "YYYYDDMMM-Sep: month 0 (JAN)");
        test(cal1.get(Calendar.DAY_OF_MONTH) == 15, "YYYYDDMMM-Sep: day 15");
      `
    },

    {
      name: 'DateParserTest_YYYYDDMMM_Compact',
      javaCode: `
        DateParser parser = new DateParser();

        // Test 202515JAN
        Date date1 = parser.parseString("202515JAN");
        Calendar cal1 = Calendar.getInstance(TimeZone.getTimeZone("GMT"));
        cal1.setTime(date1);
        test(cal1.get(Calendar.YEAR) == 2025, "YYYYDDMMM-Compact: year 2025");
        test(cal1.get(Calendar.MONTH) == 0, "YYYYDDMMM-Compact: month 0 (JAN)");
        test(cal1.get(Calendar.DAY_OF_MONTH) == 15, "YYYYDDMMM-Compact: day 15");
      `
    },

    // ========== Parsing Method Tests ==========

    {
      name: 'DateParserTest_parseDateString',
      javaCode: `
        DateParser parser = new DateParser();

        // parseDateString should return date at noon GMT
        Date date1 = parser.parseDateString("2025-01-15");
        Calendar cal1 = Calendar.getInstance(TimeZone.getTimeZone("GMT"));
        cal1.setTime(date1);
        test(cal1.get(Calendar.YEAR) == 2025, "parseDateString: year 2025");
        test(cal1.get(Calendar.MONTH) == 0, "parseDateString: month 0");
        test(cal1.get(Calendar.DAY_OF_MONTH) == 15, "parseDateString: day 15");
        test(cal1.get(Calendar.HOUR_OF_DAY) == 12, "parseDateString: hour 12 (noon)");
        test(cal1.get(Calendar.MINUTE) == 0, "parseDateString: minute 0");
        test(cal1.get(Calendar.SECOND) == 0, "parseDateString: second 0");

        // Even if time is present, parseDateString ignores it
        Date date2 = parser.parseDateString("2025-01-15T14:30:45");
        Calendar cal2 = Calendar.getInstance(TimeZone.getTimeZone("GMT"));
        cal2.setTime(date2);
        test(cal2.get(Calendar.HOUR_OF_DAY) == 12, "parseDateString with time: hour 12 (ignores time)");
      `
    },

    {
      name: 'DateParserTest_parseDateTime',
      javaCode: `
        DateParser parser = new DateParser();

        // parseDateTime should use local time
        Date date1 = parser.parseDateTime("2025-01-15T14:30:45");
        Calendar cal1 = Calendar.getInstance();
        cal1.setTime(date1);
        test(cal1.get(Calendar.YEAR) == 2025, "parseDateTime: year 2025");
        test(cal1.get(Calendar.MONTH) == 0, "parseDateTime: month 0");
        test(cal1.get(Calendar.DAY_OF_MONTH) == 15, "parseDateTime: day 15");
        test(cal1.get(Calendar.HOUR_OF_DAY) == 14, "parseDateTime: hour 14");
        test(cal1.get(Calendar.MINUTE) == 30, "parseDateTime: minute 30");
        test(cal1.get(Calendar.SECOND) == 45, "parseDateTime: second 45");
      `
    },

    {
      name: 'DateParserTest_parseDateTimeUTC',
      javaCode: `
        DateParser parser = new DateParser();

        // parseDateTimeUTC should use UTC
        Date date1 = parser.parseDateTimeUTC("2025-01-15T14:30:45");
        Calendar cal1 = Calendar.getInstance(TimeZone.getTimeZone("GMT"));
        cal1.setTime(date1);
        test(cal1.get(Calendar.YEAR) == 2025, "parseDateTimeUTC: year 2025");
        test(cal1.get(Calendar.MONTH) == 0, "parseDateTimeUTC: month 0");
        test(cal1.get(Calendar.DAY_OF_MONTH) == 15, "parseDateTimeUTC: day 15");
        test(cal1.get(Calendar.HOUR_OF_DAY) == 14, "parseDateTimeUTC: hour 14");
        test(cal1.get(Calendar.MINUTE) == 30, "parseDateTimeUTC: minute 30");
        test(cal1.get(Calendar.SECOND) == 45, "parseDateTimeUTC: second 45");
      `
    },

    // ========== Timezone Tests ==========

    {
      name: 'DateParserTest_Timezone_Z',
      javaCode: `
        DateParser parser = new DateParser();

        // Test with Z timezone (UTC)
        Date date1 = parser.parseDateTimeUTC("2025-01-15T14:30:45Z");
        Calendar cal1 = Calendar.getInstance(TimeZone.getTimeZone("GMT"));
        cal1.setTime(date1);
        test(cal1.get(Calendar.YEAR) == 2025, "Timezone Z: year 2025");
        test(cal1.get(Calendar.HOUR_OF_DAY) == 14, "Timezone Z: hour 14 (no offset)");
        test(cal1.get(Calendar.MINUTE) == 30, "Timezone Z: minute 30");
      `
    },

    {
      name: 'DateParserTest_Timezone_Positive',
      javaCode: `
        DateParser parser = new DateParser();

        // Test with +05:30 timezone
        Date date1 = parser.parseDateTimeUTC("2025-01-15T14:30:45+05:30");
        Calendar cal1 = Calendar.getInstance(TimeZone.getTimeZone("GMT"));
        cal1.setTime(date1);
        test(cal1.get(Calendar.HOUR_OF_DAY) == 9, "Timezone +05:30: hour 9 (14:30 - 5:30 = 9:00)");
        test(cal1.get(Calendar.MINUTE) == 0, "Timezone +05:30: minute 0");
      `
    },

    {
      name: 'DateParserTest_Timezone_Negative',
      javaCode: `
        DateParser parser = new DateParser();

        // Test with -05:00 timezone
        Date date1 = parser.parseDateTimeUTC("2025-01-15T14:30:45-05:00");
        Calendar cal1 = Calendar.getInstance(TimeZone.getTimeZone("GMT"));
        cal1.setTime(date1);
        test(cal1.get(Calendar.HOUR_OF_DAY) == 19, "Timezone -05:00: hour 19 (14:30 + 5:00 = 19:30)");
        test(cal1.get(Calendar.MINUTE) == 30, "Timezone -05:00: minute 30");
      `
    },

    {
      name: 'DateParserTest_Timezone_Formats',
      javaCode: `
        DateParser parser = new DateParser();

        // Test +HHMM format (no colon)
        Date date1 = parser.parseDateTimeUTC("2025-01-15T14:30:45+0530");
        Calendar cal1 = Calendar.getInstance(TimeZone.getTimeZone("GMT"));
        cal1.setTime(date1);
        test(cal1.get(Calendar.HOUR_OF_DAY) == 9, "Timezone +0530 (no colon): hour 9");

        // Test +HH format (hours only)
        Date date2 = parser.parseDateTimeUTC("2025-01-15T14:30:45+05");
        Calendar cal2 = Calendar.getInstance(TimeZone.getTimeZone("GMT"));
        cal2.setTime(date2);
        test(cal2.get(Calendar.HOUR_OF_DAY) == 9, "Timezone +05 (hours only): hour 9");
        test(cal2.get(Calendar.MINUTE) == 30, "Timezone +05 (hours only): minute 30");
      `
    },

    // ========== Edge Cases ==========

    {
      name: 'DateParserTest_LeapYear',
      javaCode: `
        DateParser parser = new DateParser();

        // Test leap year 2000-02-29
        Date date1 = parser.parseString("2000-02-29");
        Calendar cal1 = Calendar.getInstance(TimeZone.getTimeZone("GMT"));
        cal1.setTime(date1);
        test(cal1.get(Calendar.YEAR) == 2000, "Leap year: year 2000");
        test(cal1.get(Calendar.MONTH) == 1, "Leap year: month 1 (Feb)");
        test(cal1.get(Calendar.DAY_OF_MONTH) == 29, "Leap year: day 29");

        // Test leap year 2024-02-29
        Date date2 = parser.parseString("2024-02-29");
        Calendar cal2 = Calendar.getInstance(TimeZone.getTimeZone("GMT"));
        cal2.setTime(date2);
        test(cal2.get(Calendar.YEAR) == 2024, "Leap year: year 2024");
        test(cal2.get(Calendar.MONTH) == 1, "Leap year: month 1 (Feb)");
        test(cal2.get(Calendar.DAY_OF_MONTH) == 29, "Leap year: day 29");
      `
    },

    {
      name: 'DateParserTest_InvalidDates',
      javaCode: `
        DateParser parser = new DateParser();
        // Default is non-strict mode - invalid formats return MAX_DATE instead of throwing

        // Test invalid format - returns MAX_DATE in lenient mode
        Date date1 = parser.parseString("not-a-date");
        test(date1.equals(DateParser.MAX_DATE), "Invalid format returns MAX_DATE in lenient mode");

        // Test empty string - returns MAX_DATE in lenient mode
        Date date2 = parser.parseString("");
        test(date2.equals(DateParser.MAX_DATE), "Empty string returns MAX_DATE in lenient mode");

        // Test null - returns MAX_DATE in lenient mode
        Date date3 = parser.parseString(null);
        test(date3.equals(DateParser.MAX_DATE), "Null returns MAX_DATE in lenient mode");
      `
    },

    {
      name: 'DateParserTest_PartialParse',
      javaCode: `
        DateParser parser = new DateParser();

        // Trailing text is allowed - parser should extract date and ignore trailing text
        // Test with trailing text
        Date date1 = parser.parseDateTimeUTC("2025-01-15T14:30:45Z extra text");
        Calendar cal1 = Calendar.getInstance(TimeZone.getTimeZone("GMT"));
        cal1.setTime(date1);
        test(cal1.get(Calendar.YEAR) == 2025, "Trailing text allowed: year is 2025");
        test(cal1.get(Calendar.MONTH) == 0, "Trailing text allowed: month is January (0)");
        test(cal1.get(Calendar.DAY_OF_MONTH) == 15, "Trailing text allowed: day is 15");
        test(cal1.get(Calendar.HOUR_OF_DAY) == 14, "Trailing text allowed: hour is 14 UTC");
        test(cal1.get(Calendar.MINUTE) == 30, "Trailing text allowed: minute is 30");
        test(cal1.get(Calendar.SECOND) == 45, "Trailing text allowed: second is 45");
      `
    },

    // ========== Strict Validation Mode Tests ==========

    {
      name: 'DateParserTest_StrictValidation_ThrowsForInvalid',
      javaCode: `
        DateParser parser = new DateParser();
        parser.setStrictValidation(true);

        // Test 1: Invalid format should throw
        try {
          parser.parseString("not-a-date");
          test(false, "StrictMode: invalid format should throw");
        } catch (RuntimeException e) {
          test(e.getMessage().contains("Unsupported Date format"), "StrictMode: invalid format throws correct exception");
        }

        // Test 2: Empty string should throw
        try {
          parser.parseString("");
          test(false, "StrictMode: empty string should throw");
        } catch (RuntimeException e) {
          test(e.getMessage().contains("empty or null"), "StrictMode: empty string throws correct exception");
        }

        // Test 3: Null should throw
        try {
          parser.parseString(null);
          test(false, "StrictMode: null should throw");
        } catch (RuntimeException e) {
          test(e.getMessage().contains("empty or null"), "StrictMode: null throws correct exception");
        }

        // Test 4: parseDateTime with invalid input should throw
        try {
          parser.parseDateTime("garbage");
          test(false, "StrictMode parseDateTime: should throw for invalid input");
        } catch (RuntimeException e) {
          test(true, "StrictMode parseDateTime: throws for invalid input");
        }

        // Test 5: parseDateTimeUTC with invalid input should throw
        try {
          parser.parseDateTimeUTC("invalid");
          test(false, "StrictMode parseDateTimeUTC: should throw for invalid input");
        } catch (RuntimeException e) {
          test(true, "StrictMode parseDateTimeUTC: throws for invalid input");
        }
      `
    },

    {
      name: 'DateParserTest_StrictValidation_ValidDatesWork',
      javaCode: `
        DateParser parser = new DateParser();
        parser.setStrictValidation(true);

        // Test that valid dates still work in strict mode
        Date date1 = parser.parseString("2025-01-15");
        Calendar cal1 = Calendar.getInstance(TimeZone.getTimeZone("GMT"));
        cal1.setTime(date1);
        test(cal1.get(Calendar.YEAR) == 2025, "StrictMode: valid date parses - year 2025");
        test(cal1.get(Calendar.MONTH) == 0, "StrictMode: valid date parses - month Jan");
        test(cal1.get(Calendar.DAY_OF_MONTH) == 15, "StrictMode: valid date parses - day 15");

        // Test parseDateTime
        Date date2 = parser.parseDateTime("2025-01-15T14:30:45");
        Calendar cal2 = Calendar.getInstance();
        cal2.setTime(date2);
        test(cal2.get(Calendar.YEAR) == 2025, "StrictMode: valid datetime parses - year 2025");
        test(cal2.get(Calendar.HOUR_OF_DAY) == 14, "StrictMode: valid datetime parses - hour 14");

        // Test parseDateTimeUTC
        Date date3 = parser.parseDateTimeUTC("2025-01-15T14:30:45Z");
        Calendar cal3 = Calendar.getInstance(TimeZone.getTimeZone("GMT"));
        cal3.setTime(date3);
        test(cal3.get(Calendar.YEAR) == 2025, "StrictMode: valid UTC datetime parses - year 2025");
        test(cal3.get(Calendar.HOUR_OF_DAY) == 14, "StrictMode: valid UTC datetime parses - hour 14");
      `
    },

    {
      name: 'DateParserTest_LenientValidation_ReturnsMaxDate',
      javaCode: `
        DateParser parser = new DateParser();
        parser.setStrictValidation(false);

        // Test 1: Default should be lenient (strictValidation = false)
        test(parser.getStrictValidation() == false, "Default parser has strictValidation=false");

        // Test 2: Invalid format should return MAX_DATE, not throw
        Date result1 = parser.parseString("not-a-date");
        test(result1.equals(DateParser.MAX_DATE), "LenientMode: invalid format returns MAX_DATE");

        // Test 3: Empty string should return MAX_DATE
        Date result2 = parser.parseString("");
        test(result2.equals(DateParser.MAX_DATE), "LenientMode: empty string returns MAX_DATE");

        // Test 4: Null should return MAX_DATE
        Date result3 = parser.parseString(null);
        test(result3.equals(DateParser.MAX_DATE), "LenientMode: null returns MAX_DATE");

        // Test 5: parseDateTime with invalid returns MAX_DATE
        Date result4 = parser.parseDateTime("garbage");
        test(result4.equals(DateParser.MAX_DATE), "LenientMode parseDateTime: invalid returns MAX_DATE");

        // Test 6: parseDateTimeUTC with invalid returns MAX_DATE
        Date result5 = parser.parseDateTimeUTC("invalid");
        test(result5.equals(DateParser.MAX_DATE), "LenientMode parseDateTimeUTC: invalid returns MAX_DATE");
      `
    },

    {
      name: 'DateParserTest_LenientValidation_ValidDatesWork',
      javaCode: `
        DateParser parser = new DateParser();
        parser.setStrictValidation(false);

        // Test that valid dates work in lenient mode
        Date date1 = parser.parseString("2025-01-15");
        Calendar cal1 = Calendar.getInstance(TimeZone.getTimeZone("GMT"));
        cal1.setTime(date1);
        test(cal1.get(Calendar.YEAR) == 2025, "LenientMode: valid date parses - year 2025");
        test(cal1.get(Calendar.MONTH) == 0, "LenientMode: valid date parses - month Jan");
        test(cal1.get(Calendar.DAY_OF_MONTH) == 15, "LenientMode: valid date parses - day 15");
      `
    }
  ]
});
