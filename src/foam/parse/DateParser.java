/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

package foam.parse;

import foam.lib.parse.*;
import foam.lib.parse.Optional;
import java.util.*;

/**
 * Comprehensive date and datetime parser that handles all formats from DateUtil.js.
 * Uses FOAM parser framework with Grammar to support all date/datetime formats in a single parser.
 * Supports both date-only and datetime formats.
 *
 * This Java implementation mirrors the JavaScript DateParser.js grammar structure
 * to ensure identical parsing behavior across JavaScript and Java codebases.
 *
 * Supported formats:
 * - YYYYMMDD (separated and compact with optional time)
 * - MMDDYYYY (separated and compact)
 * - YYMMDD (separated and compact, with 2-digit year pivot at 50)
 * - DDMMYYYY (via opt_name only, separated and compact)
 * - YYYYDDMM (via opt_name only, separated and compact)
 * - DDMMMYYYY, YYYYDDMMM (month names: JAN, FEB, etc.)
 * - Timezone support: Z, +HH:MM, +HHMM, +HH
 *
 * Usage:
 *   DateParser parser = new DateParser();
 *   Date date = parser.parseString("2025-01-15");
 *   Date datetime = parser.parseString("2025-01-15T14:30:45");
 */
public class DateParser {

  private Grammar grammar_;

  /**
   * Maximum date value for invalid dates
   */
  public static final Date MAX_DATE = new Date(Long.MAX_VALUE);

  /**
   * Invalid date marker
   */
  public static final Date INVALID_DATE = new Date(Long.MIN_VALUE);

  /**
   * Constructor - initializes the grammar
   */
  public DateParser() {
    grammar_ = getGrammar();
  }

  /**
   * Convenience method: parse with grammar and return String value
   */
  private Object parseStringWithGrammar(String str, String opt_name) {
    if ( str == null || str.trim().isEmpty() ) {
      return null;
    }

    try {
      ParserContext x = new ParserContextImpl();
      StringPStream ps = new StringPStream();
      ps.setString(str);

      Parser startSymbol = grammar_.sym(opt_name != null && !opt_name.isEmpty() ? opt_name : "START");
      PStream parseResult = ps.apply(startSymbol, x);

      if ( parseResult == null ) {
        return null;
      }

      return parseResult.value();
    } catch (Exception e) {
      return null;
    }
  }

  /**
   * Parse a date/datetime string and return a Date object.
   * Auto-detects format and handles time if present.
   * Throws RuntimeException for invalid formats.
   *
   * @param str The date string to parse
   * @param opt_name Optional grammar symbol name to use (e.g., "ddmmyyyy", "yyyyddmm")
   * @return Parsed Date object
   * @throws RuntimeException if format is unsupported
   */
  public Date parseString(String str, String opt_name) {
    if ( str == null || str.trim().isEmpty() ) {
      throw new RuntimeException("Unsupported Date format: empty or null string");
    }

    try {
      StringPStream sps = new StringPStream();
      sps.setString(str);
      PStream ps = sps;
      ParserContext x = new ParserContextImpl();

      PStream parseResult = grammar_.parse(ps, x, opt_name);

      if ( parseResult == null || parseResult.value() == null ) {
        throw new RuntimeException("Unsupported Date format: " + str);
      }

      @SuppressWarnings("unchecked")
      Map<String, Object> resultMap = (Map<String, Object>) parseResult.value();

      // Determine if this is a datetime or date-only result
      if ( resultMap.containsKey("hour") || resultMap.containsKey("minute") || resultMap.containsKey("second") ) {
        // Datetime format - use local time, let Calendar normalize
        Calendar cal = Calendar.getInstance();
        cal.clear();
        cal.set(
          (Integer) resultMap.get("year"),
          (Integer) resultMap.get("month"),
          (Integer) resultMap.get("day"),
          resultMap.containsKey("hour") ? (Integer) resultMap.get("hour") : 0,
          resultMap.containsKey("minute") ? (Integer) resultMap.get("minute") : 0,
          resultMap.containsKey("second") ? (Integer) resultMap.get("second") : 0
        );
        if ( resultMap.containsKey("millisecond") ) {
          cal.set(Calendar.MILLISECOND, (Integer) resultMap.get("millisecond"));
        }
        return cal.getTime();
      } else {
        // Date-only format - use noon GMT, let Calendar normalize
        Calendar cal = Calendar.getInstance(TimeZone.getTimeZone("GMT"));
        cal.clear();
        cal.set(
          (Integer) resultMap.get("year"),
          (Integer) resultMap.get("month"),
          (Integer) resultMap.get("day"),
          12, 0, 0
        );
        return cal.getTime();
      }
    } catch (RuntimeException e) {
      throw e; // Re-throw RuntimeException as-is
    } catch (Exception e) {
      throw new RuntimeException("Unsupported Date format: " + str, e);
    }
  }

  /**
   * Convenience method: parseString with default grammar START symbol
   */
  public Date parseString(String str) {
    return parseString(str, null);
  }

  /**
   * Parse a date string - ignores any time component and returns date at noon GMT.
   * Returns MAX_DATE for invalid dates.
   *
   * @param str The date string to parse
   * @param opt_name Optional grammar symbol name
   * @return Parsed Date object at noon GMT, or MAX_DATE if invalid
   */
  public Date parseDateString(String str, String opt_name) {
    if ( str == null || str.trim().isEmpty() ) {
      throw new RuntimeException("Unsupported Date format: empty or null string");
    }

    try {
      StringPStream sps = new StringPStream();
      sps.setString(str);
      PStream ps = sps;
      ParserContext x = new ParserContextImpl();

      PStream parseResult = grammar_.parse(ps, x, opt_name);

      // Check if we got a result - value() being non-null means parsing succeeded
      if ( parseResult == null || parseResult.value() == null ) {
        throw new RuntimeException("Unsupported Date format: " + str);
      }

      @SuppressWarnings("unchecked")
      Map<String, Object> resultMap = (Map<String, Object>) parseResult.value();

      int year = (Integer) resultMap.get("year");
      int month = (Integer) resultMap.get("month");
      int day = (Integer) resultMap.get("day");

      // Always return date at noon GMT, ignoring time even if present
      // Let Java Calendar normalize invalid dates (e.g., Feb 30 → Mar 2)
      Calendar cal = Calendar.getInstance(TimeZone.getTimeZone("GMT"));
      cal.clear();
      cal.set(year, month, day, 12, 0, 0);

      return cal.getTime();
    } catch (RuntimeException e) {
      throw e; // Re-throw RuntimeException as-is
    } catch (Exception e) {
      throw new RuntimeException("Unsupported Date format: " + str, e);
    }
  }

  /**
   * Convenience method: parseDateString with default grammar
   */
  public Date parseDateString(String str) {
    return parseDateString(str, null);
  }

  /**
   * Parse a datetime string using local time.
   * Uses time if present, otherwise sets to noon.
   * If timezone is present, converts to UTC.
   * Returns MAX_DATE for invalid dates.
   *
   * @param str The datetime string to parse
   * @param opt_name Optional grammar symbol name
   * @return Parsed Date object in local time, or MAX_DATE if invalid
   */
  public Date parseDateTime(String str, String opt_name) {
    if ( str == null || str.trim().isEmpty() ) {
      throw new RuntimeException("Unsupported DateTime format: empty or null string");
    }

    str = str.trim();

    try {
      // Use parse() to get position information for partial parse detection
      StringPStream sps = new StringPStream();
      sps.setString(str);
      PStream ps = sps;
      ParserContext x = new ParserContextImpl();

      PStream parseResult = grammar_.parse(ps, x, opt_name);

      // Check if we got a result - value() being non-null means parsing succeeded
      if ( parseResult == null || parseResult.value() == null ) {
        throw new RuntimeException("Unsupported DateTime format: " + str);
      }

      @SuppressWarnings("unchecked")
      Map<String, Object> result = (Map<String, Object>) parseResult.value();

      if ( result == null ) {
        throw new RuntimeException("Unsupported DateTime format: " + str);
      }

      // Extract date/time components - let Calendar normalize invalid dates
      int year = (Integer) result.get("year");
      int month = (Integer) result.get("month");
      int day = (Integer) result.get("day");
      int hour = result.containsKey("hour") ? (Integer) result.get("hour") : 12;
      int minute = result.containsKey("minute") ? (Integer) result.get("minute") : 0;
      int second = result.containsKey("second") ? (Integer) result.get("second") : 0;

      if ( result.containsKey("timezone") ) {
        // Timezone present - convert to UTC
        int offset = parseTimezone((String) result.get("timezone"));
        Calendar cal = Calendar.getInstance(TimeZone.getTimeZone("GMT"));
        cal.clear();
        cal.set(year, month, day, hour, minute, second);
        if ( result.containsKey("millisecond") ) {
          cal.set(Calendar.MILLISECOND, (Integer) result.get("millisecond"));
        }

        // Subtract offset to convert to UTC
        cal.add(Calendar.MINUTE, -offset);
        return cal.getTime();
      } else {
        // No timezone - use local time
        Calendar cal = Calendar.getInstance();
        cal.clear();
        cal.set(year, month, day, hour, minute, second);
        if ( result.containsKey("millisecond") ) {
          cal.set(Calendar.MILLISECOND, (Integer) result.get("millisecond"));
        }
        return cal.getTime();
      }
    } catch (RuntimeException e) {
      throw e; // Re-throw RuntimeException as-is
    } catch (Exception e) {
      throw new RuntimeException("Unsupported DateTime format: " + str, e);
    }
  }

  /**
   * Convenience method: parseDateTime with default grammar
   */
  public Date parseDateTime(String str) {
    return parseDateTime(str, null);
  }

  /**
   * Parse a datetime string using UTC time.
   * Uses time if present, otherwise sets to midnight.
   * If timezone is present, converts to UTC.
   * Returns MAX_DATE for invalid dates.
   *
   * @param str The datetime string to parse
   * @param opt_name Optional grammar symbol name
   * @return Parsed Date object in UTC, or MAX_DATE if invalid
   */
  public Date parseDateTimeUTC(String str, String opt_name) {
    if ( str == null || str.trim().isEmpty() ) {
      throw new RuntimeException("Unsupported DateTime format: empty or null string");
    }

    str = str.trim();

    try {
      // Use parse() to get position information
      StringPStream sps = new StringPStream();
      sps.setString(str);
      PStream ps = sps;
      ParserContext x = new ParserContextImpl();

      PStream parseResult = grammar_.parse(ps, x, opt_name);

      // Check if we got a result - value() being non-null means parsing succeeded
      if ( parseResult == null || parseResult.value() == null ) {
        throw new RuntimeException("Unsupported DateTime format: " + str);
      }

      @SuppressWarnings("unchecked")
      Map<String, Object> result = (Map<String, Object>) parseResult.value();

      if ( result == null ) {
        throw new RuntimeException("Unsupported DateTime format: " + str);
      }

      // Extract components - let Calendar normalize invalid dates/times
      int year = (Integer) result.get("year");
      int month = (Integer) result.get("month");
      int day = (Integer) result.get("day");
      int hour = result.containsKey("hour") ? (Integer) result.get("hour") : 0;
      int minute = result.containsKey("minute") ? (Integer) result.get("minute") : 0;
      int second = result.containsKey("second") ? (Integer) result.get("second") : 0;

      Calendar cal = Calendar.getInstance(TimeZone.getTimeZone("GMT"));
      cal.clear();

      if ( result.containsKey("timezone") ) {
        // Timezone present - convert to UTC
        int offset = parseTimezone((String) result.get("timezone"));
        cal.set(year, month, day, hour, minute, second);
        if ( result.containsKey("millisecond") ) {
          cal.set(Calendar.MILLISECOND, (Integer) result.get("millisecond"));
        }
        // Subtract offset
        cal.add(Calendar.MINUTE, -offset);
      } else {
        // No timezone - use UTC as-is
        cal.set(year, month, day, hour, minute, second);
        if ( result.containsKey("millisecond") ) {
          cal.set(Calendar.MILLISECOND, (Integer) result.get("millisecond"));
        }
      }

      return cal.getTime();
    } catch (RuntimeException e) {
      throw e; // Re-throw RuntimeException as-is
    } catch (Exception e) {
      throw new RuntimeException("Unsupported DateTime format: " + str, e);
    }
  }

  /**
   * Convenience method: parseDateTimeUTC with default grammar
   */
  public Date parseDateTimeUTC(String str) {
    return parseDateTimeUTC(str, null);
  }

  // ========== Helper Methods ==========

  /**
   * Flatten timezone array from parser into a string
   */
  private String flattenTimezone(Object tzArray) {
    if ( tzArray == null ) return null;
    if ( tzArray instanceof String ) return (String) tzArray;

    // Handle array structure from parser
    if ( tzArray instanceof Object[] ) {
      StringBuilder result = new StringBuilder();
      Object[] arr = (Object[]) tzArray;
      for ( Object item : arr ) {
        if ( item instanceof Object[] ) {
          for ( Object subItem : (Object[]) item ) {
            result.append(subItem);
          }
        } else if ( item != null ) {
          result.append(item);
        }
      }
      return result.toString();
    }

    return String.valueOf(tzArray);
  }

  /**
   * Parse timezone string and return offset in minutes.
   * Z means UTC (0). +05:30 means +330 minutes.
   */
  private int parseTimezone(String tz) {
    if ( tz == null || tz.equals("Z") ) return 0;

    int sign = tz.charAt(0) == '+' ? 1 : -1;
    String nums = tz.substring(1).replace(":", "");

    int hours, minutes;
    if ( nums.length() >= 4 ) {
      // HHMM format
      hours = Integer.parseInt(nums.substring(0, 2));
      minutes = Integer.parseInt(nums.substring(2, 4));
    } else if ( nums.length() == 2 ) {
      // HH format (no minutes)
      hours = Integer.parseInt(nums);
      minutes = 0;
    } else {
      return 0;
    }

    return sign * (hours * 60 + minutes);
  }

  /**
   * Converts 2-digit year using fixed pivot at 50:
   * - Years 00-49 map to 2000-2049
   * - Years 50-99 map to 1950-1999
   */
  private int convertTwoDigitYear(int twoDigitYear) {
    // Fixed pivot at 50
    if ( twoDigitYear < 50 ) {
      return 2000 + twoDigitYear;
    }
    return 1900 + twoDigitYear;
  }

  /**
   * Converts 3-letter month abbreviation to 0-based month index (JAN→0, FEB→1, etc.)
   */
  private int parseMonthName(String monthName) {
    String month = monthName.toUpperCase();
    switch (month) {
      case "JAN": return 0;
      case "FEB": return 1;
      case "MAR": return 2;
      case "APR": return 3;
      case "MAY": return 4;
      case "JUN": return 5;
      case "JUL": return 6;
      case "AUG": return 7;
      case "SEP": return 8;
      case "OCT": return 9;
      case "NOV": return 10;
      case "DEC": return 11;
      default: return 0;
    }
  }


  // ========== Grammar Definition ==========

  /**
   * Creates and returns the complete grammar for date parsing.
   * This mirrors the JavaScript DateParser.js grammar structure exactly.
   */
  private Grammar getGrammar() {
    Grammar grammar = new Grammar();

    // START symbol - entry point
    grammar.addSymbol("START", grammar.sym("dateOrDatetime"));

    // Main entry point - tries all formats including month names
    grammar.addSymbol("dateOrDatetime", new Alt(
      grammar.sym("date-monthname"),  // Month name formats first (unambiguous)
      grammar.sym("yyyymmdd"),
      grammar.sym("mmddyyyy"),
      grammar.sym("yymmdd")
    ));

    // Date with month names - ALL completely unambiguous
    grammar.addSymbol("date-monthname", new Alt(
      grammar.sym("ddmmmyyyy-sep"),
      grammar.sym("yyyyddmmm-sep"),
      grammar.sym("yyyyddmmm-compact"),
      grammar.sym("ddmmmyyyy-compact")
    ));

    // ========== Component Parsers ==========

    // year4: Exactly 4 digits
    grammar.addSymbol("year4", new Join(new Repeat(Range.create('0', '9'), null, 4, 4)));

    // year4_1900_2999: Years 1900-2999 only
    grammar.addSymbol("year4_1900_2999", new Join(new Alt(
      new Seq(Literal.create("1"), Literal.create("9"), Range.create('0', '9'), Range.create('0', '9')),
      new Seq(Literal.create("2"), Range.create('0', '9'), Range.create('0', '9'), Range.create('0', '9'))
    )));

    // year2: 2 digits
    grammar.addSymbol("year2", new Join(new Seq(Range.create('0', '9'), Range.create('0', '9'))));

    // month2: 01-12 (accept any 2 digits, validation in action)
    grammar.addSymbol("month2", new Join(new Seq(Range.create('0', '1'), Range.create('0', '9'))));

    // day2: 01-31 (accept any 2 digits, validation in action)
    grammar.addSymbol("day2", new Join(new Seq(Range.create('0', '3'), Range.create('0', '9'))));

    // hour2: 00-23 (accept any 2 digits, validation in action)
    grammar.addSymbol("hour2", new Join(new Seq(Range.create('0', '2'), Range.create('0', '9'))));

    // minute2: 00-59
    grammar.addSymbol("minute2", new Join(new Seq(Range.create('0', '5'), Range.create('0', '9'))));

    // second2: 00-59
    grammar.addSymbol("second2", new Join(new Seq(Range.create('0', '5'), Range.create('0', '9'))));

    // millisecond3: 3 digits
    grammar.addSymbol("millisecond3", new Join(new Repeat(Range.create('0', '9'), null, 3, 3)));

    // month3alpha: JAN, FEB, MAR, etc. (case insensitive)
    grammar.addSymbol("month3alpha", new Alt(
      new LiteralIC("JAN"), new LiteralIC("FEB"), new LiteralIC("MAR"),
      new LiteralIC("APR"), new LiteralIC("MAY"), new LiteralIC("JUN"),
      new LiteralIC("JUL"), new LiteralIC("AUG"), new LiteralIC("SEP"),
      new LiteralIC("OCT"), new LiteralIC("NOV"), new LiteralIC("DEC")
    ));

    // timezone: Z or +/-HH:MM or +/-HHMM or +/-HH
    grammar.addSymbol("timezone", new Alt(
      Literal.create("Z"),
      // +HH:MM format
      new Seq(
        new Chars("+-"),
        new Repeat(Range.create('0', '9'), null, 2, 2),
        Literal.create(":"),
        new Repeat(Range.create('0', '9'), null, 2, 2)
      ),
      // +HHMM format (no colon)
      new Seq(
        new Chars("+-"),
        new Repeat(Range.create('0', '9'), null, 4, 4)
      ),
      // +HH format (hours only)
      new Seq(
        new Chars("+-"),
        new Repeat(Range.create('0', '9'), null, 2, 2)
      )
    ));

    // ========== YYYYMMDD Formats ==========

    grammar.addSymbol("yyyymmdd", new Alt(
      grammar.sym("yyyymmddhhmmss-compact"),
      grammar.sym("yyyymmdd-compact"),
      grammar.sym("yyyymmdd-sep")
    ));

    // YYYYMMDD with separators and optional time
    grammar.addSymbol("yyyymmdd-sep", new Alt(
      // With milliseconds and timezone
      new Seq(
        grammar.sym("year4"), new Chars("-/"), grammar.sym("month2"), new Chars("-/"), grammar.sym("day2"),
        new Chars("T "), grammar.sym("hour2"), Literal.create(":"), grammar.sym("minute2"),
        Literal.create(":"), grammar.sym("second2"), Literal.create("."), grammar.sym("millisecond3"),
        new Optional(grammar.sym("timezone"))
      ),
      // With seconds and timezone
      new Seq(
        grammar.sym("year4"), new Chars("-/"), grammar.sym("month2"), new Chars("-/"), grammar.sym("day2"),
        new Chars("T "), grammar.sym("hour2"), Literal.create(":"), grammar.sym("minute2"),
        Literal.create(":"), grammar.sym("second2"),
        new Optional(grammar.sym("timezone"))
      ),
      // With minutes and timezone
      new Seq(
        grammar.sym("year4"), new Chars("-/"), grammar.sym("month2"), new Chars("-/"), grammar.sym("day2"),
        new Chars("T "), grammar.sym("hour2"), Literal.create(":"), grammar.sym("minute2"),
        new Optional(grammar.sym("timezone"))
      ),
      // Date only
      new Seq(
        grammar.sym("year4"), new Chars("-/"), grammar.sym("month2"), new Chars("-/"), grammar.sym("day2")
      )
    ));

    // YYYYMMDD compact: 8 digits
    grammar.addSymbol("yyyymmdd-compact", new Join(
      new Seq(grammar.sym("year4_1900_2999"), grammar.sym("month2"), grammar.sym("day2"))
    ));

    // YYYYMMDDHHMMSS compact: 14 digits
    grammar.addSymbol("yyyymmddhhmmss-compact", new Seq(
      grammar.sym("year4_1900_2999"), grammar.sym("month2"), grammar.sym("day2"),
      grammar.sym("hour2"), grammar.sym("minute2"), grammar.sym("second2")
    ));

    // ========== MMDDYYYY Formats ==========

    grammar.addSymbol("mmddyyyy", new Alt(
      grammar.sym("mmddyyyy-compact"),
      grammar.sym("mmddyyyy-sep")
    ));

    grammar.addSymbol("mmddyyyy-sep", new Alt(
      // With seconds and timezone
      new Seq(
        grammar.sym("month2"), new Chars("-/"), grammar.sym("day2"), new Chars("-/"), grammar.sym("year4"),
        Literal.create(" "), grammar.sym("hour2"), Literal.create(":"), grammar.sym("minute2"),
        Literal.create(":"), grammar.sym("second2"),
        new Optional(grammar.sym("timezone"))
      ),
      // With minutes and timezone
      new Seq(
        grammar.sym("month2"), new Chars("-/"), grammar.sym("day2"), new Chars("-/"), grammar.sym("year4"),
        Literal.create(" "), grammar.sym("hour2"), Literal.create(":"), grammar.sym("minute2"),
        new Optional(grammar.sym("timezone"))
      ),
      // Date only
      new Seq(
        grammar.sym("month2"), new Chars("-/"), grammar.sym("day2"), new Chars("-/"), grammar.sym("year4")
      )
    ));

    grammar.addSymbol("mmddyyyy-compact", new Join(new Repeat(Range.create('0', '9'), null, 8, 8)));

    // ========== YYMMDD Formats ==========

    grammar.addSymbol("yymmdd", new Alt(
      grammar.sym("yymmdd-compact"),
      grammar.sym("yymmdd-sep")
    ));

    grammar.addSymbol("yymmdd-sep", new Alt(
      // With seconds and timezone
      new Seq(
        grammar.sym("year2"), new Chars("-/"), grammar.sym("month2"), new Chars("-/"), grammar.sym("day2"),
        Literal.create(" "), grammar.sym("hour2"), Literal.create(":"), grammar.sym("minute2"),
        Literal.create(":"), grammar.sym("second2"),
        new Optional(grammar.sym("timezone"))
      ),
      // With minutes and timezone
      new Seq(
        grammar.sym("year2"), new Chars("-/"), grammar.sym("month2"), new Chars("-/"), grammar.sym("day2"),
        Literal.create(" "), grammar.sym("hour2"), Literal.create(":"), grammar.sym("minute2"),
        new Optional(grammar.sym("timezone"))
      ),
      // Date only
      new Seq(
        grammar.sym("year2"), new Chars("-/"), grammar.sym("month2"), new Chars("-/"), grammar.sym("day2")
      )
    ));

    grammar.addSymbol("yymmdd-compact", new Join(new Repeat(Range.create('0', '9'), null, 6, 6)));

    // ========== DDMMYYYY Formats (via opt_name only) ==========

    grammar.addSymbol("ddmmyyyy", new Alt(
      grammar.sym("ddmmyyyy-sep"),
      grammar.sym("ddmmyy-sep"),
      grammar.sym("ddmmyyyy-compact"),
      grammar.sym("ddmmyy-compact")
    ));

    grammar.addSymbol("ddmmyyyy-sep", new Alt(
      new Seq(
        grammar.sym("day2"), new Chars("-/"), grammar.sym("month2"), new Chars("-/"), grammar.sym("year4"),
        Literal.create(" "), grammar.sym("hour2"), Literal.create(":"), grammar.sym("minute2"),
        Literal.create(":"), grammar.sym("second2"),
        new Optional(grammar.sym("timezone"))
      ),
      new Seq(
        grammar.sym("day2"), new Chars("-/"), grammar.sym("month2"), new Chars("-/"), grammar.sym("year4"),
        Literal.create(" "), grammar.sym("hour2"), Literal.create(":"), grammar.sym("minute2"),
        new Optional(grammar.sym("timezone"))
      ),
      new Seq(
        grammar.sym("day2"), new Chars("-/"), grammar.sym("month2"), new Chars("-/"), grammar.sym("year4")
      )
    ));

    grammar.addSymbol("ddmmyyyy-compact", new Join(new Repeat(Range.create('0', '9'), null, 8, 8)));

    grammar.addSymbol("ddmmyy-sep", new Alt(
      new Seq(
        grammar.sym("day2"), new Chars("-/"), grammar.sym("month2"), new Chars("-/"), grammar.sym("year2"),
        Literal.create(" "), grammar.sym("hour2"), Literal.create(":"), grammar.sym("minute2"),
        Literal.create(":"), grammar.sym("second2"),
        new Optional(grammar.sym("timezone"))
      ),
      new Seq(
        grammar.sym("day2"), new Chars("-/"), grammar.sym("month2"), new Chars("-/"), grammar.sym("year2"),
        Literal.create(" "), grammar.sym("hour2"), Literal.create(":"), grammar.sym("minute2"),
        new Optional(grammar.sym("timezone"))
      ),
      new Seq(
        grammar.sym("day2"), new Chars("-/"), grammar.sym("month2"), new Chars("-/"), grammar.sym("year2")
      )
    ));

    grammar.addSymbol("ddmmyy-compact", new Join(new Repeat(Range.create('0', '9'), null, 6, 6)));

    // ========== YYYYDDMM Formats (via opt_name only) ==========

    grammar.addSymbol("yyyyddmm", new Alt(
      grammar.sym("yyyyddmm-compact"),
      grammar.sym("yyyyddmm-sep"),
      grammar.sym("yyddmm")
    ));

    grammar.addSymbol("yyyyddmm-sep", new Alt(
      new Seq(
        grammar.sym("year4"), new Chars("-/"), grammar.sym("day2"), new Chars("-/"), grammar.sym("month2"),
        Literal.create(" "), grammar.sym("hour2"), Literal.create(":"), grammar.sym("minute2"),
        Literal.create(":"), grammar.sym("second2"),
        new Optional(grammar.sym("timezone"))
      ),
      new Seq(
        grammar.sym("year4"), new Chars("-/"), grammar.sym("day2"), new Chars("-/"), grammar.sym("month2"),
        Literal.create(" "), grammar.sym("hour2"), Literal.create(":"), grammar.sym("minute2"),
        new Optional(grammar.sym("timezone"))
      ),
      new Seq(
        grammar.sym("year4"), new Chars("-/"), grammar.sym("day2"), new Chars("-/"), grammar.sym("month2")
      )
    ));

    grammar.addSymbol("yyyyddmm-compact", new Join(new Repeat(Range.create('0', '9'), null, 8, 8)));

    grammar.addSymbol("yyddmm", new Alt(
      grammar.sym("yyddmm-compact"),
      grammar.sym("yyddmm-sep")
    ));

    grammar.addSymbol("yyddmm-sep", new Alt(
      new Seq(
        grammar.sym("year2"), new Chars("-/"), grammar.sym("day2"), new Chars("-/"), grammar.sym("month2"),
        Literal.create(" "), grammar.sym("hour2"), Literal.create(":"), grammar.sym("minute2"),
        Literal.create(":"), grammar.sym("second2"),
        new Optional(grammar.sym("timezone"))
      ),
      new Seq(
        grammar.sym("year2"), new Chars("-/"), grammar.sym("day2"), new Chars("-/"), grammar.sym("month2"),
        Literal.create(" "), grammar.sym("hour2"), Literal.create(":"), grammar.sym("minute2"),
        new Optional(grammar.sym("timezone"))
      ),
      new Seq(
        grammar.sym("year2"), new Chars("-/"), grammar.sym("day2"), new Chars("-/"), grammar.sym("month2")
      )
    ));

    grammar.addSymbol("yyddmm-compact", new Join(new Repeat(Range.create('0', '9'), null, 6, 6)));

    // ========== Month Name Formats ==========

    grammar.addSymbol("yyyyddmmm-sep", new Seq(
      grammar.sym("year4"), new Chars("-/"), grammar.sym("day2"), new Chars("-/"), grammar.sym("month3alpha")
    ));

    grammar.addSymbol("yyyyddmmm-compact", new Seq(
      grammar.sym("year4"), grammar.sym("day2"), grammar.sym("month3alpha")
    ));

    grammar.addSymbol("ddmmmyyyy-sep", new Seq(
      grammar.sym("day2"), new Chars("-/"), grammar.sym("month3alpha"), new Chars("-/"), grammar.sym("year4")
    ));

    grammar.addSymbol("ddmmmyyyy-compact", new Seq(
      grammar.sym("day2"), grammar.sym("month3alpha"), grammar.sym("year4")
    ));

    // ========== Add Actions ==========
    addActions(grammar);

    return grammar;
  }

  /**
   * Add action handlers to convert parsed arrays to result maps
   */
  private void addActions(Grammar grammar) {
    final DateParser self = this;

    // YYYYMMDD-Sep action: [YYYY, sep, MM, sep, DD] or with time
    grammar.addAction("yyyymmdd-sep", (val, x) -> {
      Object[] v = (Object[]) val;
      Map<String, Object> result = new HashMap<>();
      result.put("year", Integer.parseInt((String) v[0]));
      result.put("month", Integer.parseInt((String) v[2]) - 1);  // 0-indexed
      result.put("day", Integer.parseInt((String) v[4]));

      // Check if time components exist
      if ( v.length > 5 && v[6] != null ) {
        result.put("hour", Integer.parseInt((String) v[6]));
        if ( v[8] != null ) result.put("minute", Integer.parseInt((String) v[8]));
        if ( v.length > 10 && v[10] != null ) result.put("second", Integer.parseInt((String) v[10]));
        if ( v.length > 12 && v[12] != null ) result.put("millisecond", Integer.parseInt((String) v[12]));

        // Check for timezone (last element if present)
        if ( v[v.length - 1] != null && !(v[v.length - 1] instanceof String) ) {
          result.put("timezone", self.flattenTimezone(v[v.length - 1]));
        } else if ( "Z".equals(v[v.length - 1]) ) {
          result.put("timezone", "Z");
        }
      }

      return result;
    });

    // YYYYMMDD-Compact action: "20250115"
    grammar.addAction("yyyymmdd-compact", (val, x) -> {
      String v = (String) val;
      Map<String, Object> result = new HashMap<>();
      result.put("year", Integer.parseInt(v.substring(0, 4)));
      result.put("month", Integer.parseInt(v.substring(4, 6)) - 1);
      result.put("day", Integer.parseInt(v.substring(6, 8)));
      return result;
    });

    // YYYYMMDDHHMMSS-Compact action: [year, month, day, hour, minute, second]
    grammar.addAction("yyyymmddhhmmss-compact", (val, x) -> {
      Object[] v = (Object[]) val;
      Map<String, Object> result = new HashMap<>();
      result.put("year", Integer.parseInt((String) v[0]));
      result.put("month", Integer.parseInt((String) v[1]) - 1);
      result.put("day", Integer.parseInt((String) v[2]));
      result.put("hour", Integer.parseInt((String) v[3]));
      result.put("minute", Integer.parseInt((String) v[4]));
      result.put("second", Integer.parseInt((String) v[5]));
      return result;
    });

    // MMDDYYYY-Sep action
    grammar.addAction("mmddyyyy-sep", (val, x) -> {
      Object[] v = (Object[]) val;
      Map<String, Object> result = new HashMap<>();
      result.put("year", Integer.parseInt((String) v[4]));
      result.put("month", Integer.parseInt((String) v[0]) - 1);
      result.put("day", Integer.parseInt((String) v[2]));

      if ( v.length > 5 && v[6] != null ) {
        result.put("hour", Integer.parseInt((String) v[6]));
        if ( v[8] != null ) result.put("minute", Integer.parseInt((String) v[8]));
        if ( v.length > 10 && v[10] != null ) result.put("second", Integer.parseInt((String) v[10]));

        if ( v[v.length - 1] != null && !(v[v.length - 1] instanceof String) ) {
          result.put("timezone", self.flattenTimezone(v[v.length - 1]));
        } else if ( "Z".equals(v[v.length - 1]) ) {
          result.put("timezone", "Z");
        }
      }

      return result;
    });

    // MMDDYYYY-Compact action: "01152025"
    grammar.addAction("mmddyyyy-compact", (val, x) -> {
      String v = (String) val;
      Map<String, Object> result = new HashMap<>();
      result.put("year", Integer.parseInt(v.substring(4, 8)));
      result.put("month", Integer.parseInt(v.substring(0, 2)) - 1);
      result.put("day", Integer.parseInt(v.substring(2, 4)));
      return result;
    });

    // YYMMDD-Sep action
    grammar.addAction("yymmdd-sep", (val, x) -> {
      Object[] v = (Object[]) val;
      int twoDigitYear = Integer.parseInt((String) v[0]);
      Map<String, Object> result = new HashMap<>();
      result.put("year", self.convertTwoDigitYear(twoDigitYear));
      result.put("month", Integer.parseInt((String) v[2]) - 1);
      result.put("day", Integer.parseInt((String) v[4]));

      if ( v.length > 5 && v[6] != null ) {
        result.put("hour", Integer.parseInt((String) v[6]));
        result.put("minute", Integer.parseInt((String) v[8]));
        if ( v.length > 10 && v[10] != null ) result.put("second", Integer.parseInt((String) v[10]));

        if ( v[v.length - 1] != null && !(v[v.length - 1] instanceof String) ) {
          result.put("timezone", self.flattenTimezone(v[v.length - 1]));
        } else if ( "Z".equals(v[v.length - 1]) ) {
          result.put("timezone", "Z");
        }
      }

      return result;
    });

    // YYMMDD-Compact action: "250115"
    grammar.addAction("yymmdd-compact", (val, x) -> {
      String v = (String) val;
      int twoDigitYear = Integer.parseInt(v.substring(0, 2));
      Map<String, Object> result = new HashMap<>();
      result.put("year", self.convertTwoDigitYear(twoDigitYear));
      result.put("month", Integer.parseInt(v.substring(2, 4)) - 1);
      result.put("day", Integer.parseInt(v.substring(4, 6)));
      return result;
    });

    // DDMMYYYY-Sep action
    grammar.addAction("ddmmyyyy-sep", (val, x) -> {
      Object[] v = (Object[]) val;
      Map<String, Object> result = new HashMap<>();
      result.put("year", Integer.parseInt((String) v[4]));
      result.put("month", Integer.parseInt((String) v[2]) - 1);
      result.put("day", Integer.parseInt((String) v[0]));

      if ( v.length > 5 && v[6] != null ) {
        result.put("hour", Integer.parseInt((String) v[6]));
        if ( v[8] != null ) result.put("minute", Integer.parseInt((String) v[8]));
        if ( v.length > 10 && v[10] != null ) result.put("second", Integer.parseInt((String) v[10]));

        if ( v[v.length - 1] != null && !(v[v.length - 1] instanceof String) ) {
          result.put("timezone", self.flattenTimezone(v[v.length - 1]));
        } else if ( "Z".equals(v[v.length - 1]) ) {
          result.put("timezone", "Z");
        }
      }

      return result;
    });

    // DDMMYYYY-Compact action: "15012025"
    grammar.addAction("ddmmyyyy-compact", (val, x) -> {
      String v = (String) val;
      Map<String, Object> result = new HashMap<>();
      result.put("year", Integer.parseInt(v.substring(4, 8)));
      result.put("month", Integer.parseInt(v.substring(2, 4)) - 1);
      result.put("day", Integer.parseInt(v.substring(0, 2)));
      return result;
    });

    // DDMMYY-Sep action
    grammar.addAction("ddmmyy-sep", (val, x) -> {
      Object[] v = (Object[]) val;
      int twoDigitYear = Integer.parseInt((String) v[4]);
      Map<String, Object> result = new HashMap<>();
      result.put("year", self.convertTwoDigitYear(twoDigitYear));
      result.put("month", Integer.parseInt((String) v[2]) - 1);
      result.put("day", Integer.parseInt((String) v[0]));

      if ( v.length > 5 && v[6] != null ) {
        result.put("hour", Integer.parseInt((String) v[6]));
        if ( v[8] != null ) result.put("minute", Integer.parseInt((String) v[8]));
        if ( v.length > 10 && v[10] != null ) result.put("second", Integer.parseInt((String) v[10]));

        if ( v[v.length - 1] != null && !(v[v.length - 1] instanceof String) ) {
          result.put("timezone", self.flattenTimezone(v[v.length - 1]));
        } else if ( "Z".equals(v[v.length - 1]) ) {
          result.put("timezone", "Z");
        }
      }

      return result;
    });

    // DDMMYY-Compact action: "150125"
    grammar.addAction("ddmmyy-compact", (val, x) -> {
      String v = (String) val;
      int twoDigitYear = Integer.parseInt(v.substring(4, 6));
      Map<String, Object> result = new HashMap<>();
      result.put("year", self.convertTwoDigitYear(twoDigitYear));
      result.put("month", Integer.parseInt(v.substring(2, 4)) - 1);
      result.put("day", Integer.parseInt(v.substring(0, 2)));
      return result;
    });

    // YYYYDDMM-Sep action
    grammar.addAction("yyyyddmm-sep", (val, x) -> {
      Object[] v = (Object[]) val;
      Map<String, Object> result = new HashMap<>();
      result.put("year", Integer.parseInt((String) v[0]));
      result.put("month", Integer.parseInt((String) v[4]) - 1);
      result.put("day", Integer.parseInt((String) v[2]));

      if ( v.length > 5 && v[6] != null ) {
        result.put("hour", Integer.parseInt((String) v[6]));
        if ( v[8] != null ) result.put("minute", Integer.parseInt((String) v[8]));
        if ( v.length > 10 && v[10] != null ) result.put("second", Integer.parseInt((String) v[10]));

        if ( v[v.length - 1] != null && !(v[v.length - 1] instanceof String) ) {
          result.put("timezone", self.flattenTimezone(v[v.length - 1]));
        } else if ( "Z".equals(v[v.length - 1]) ) {
          result.put("timezone", "Z");
        }
      }

      return result;
    });

    // YYYYDDMM-Compact action: "20251501"
    grammar.addAction("yyyyddmm-compact", (val, x) -> {
      String v = (String) val;
      Map<String, Object> result = new HashMap<>();
      result.put("year", Integer.parseInt(v.substring(0, 4)));
      result.put("month", Integer.parseInt(v.substring(6, 8)) - 1);
      result.put("day", Integer.parseInt(v.substring(4, 6)));
      return result;
    });

    // YYDDMM-Sep action
    grammar.addAction("yyddmm-sep", (val, x) -> {
      Object[] v = (Object[]) val;
      int twoDigitYear = Integer.parseInt((String) v[0]);
      Map<String, Object> result = new HashMap<>();
      result.put("year", self.convertTwoDigitYear(twoDigitYear));
      result.put("month", Integer.parseInt((String) v[4]) - 1);
      result.put("day", Integer.parseInt((String) v[2]));

      if ( v.length > 5 && v[6] != null ) {
        result.put("hour", Integer.parseInt((String) v[6]));
        if ( v[8] != null ) result.put("minute", Integer.parseInt((String) v[8]));
        if ( v.length > 10 && v[10] != null ) result.put("second", Integer.parseInt((String) v[10]));

        if ( v[v.length - 1] != null && !(v[v.length - 1] instanceof String) ) {
          result.put("timezone", self.flattenTimezone(v[v.length - 1]));
        } else if ( "Z".equals(v[v.length - 1]) ) {
          result.put("timezone", "Z");
        }
      }

      return result;
    });

    // YYDDMM-Compact action: "251501"
    grammar.addAction("yyddmm-compact", (val, x) -> {
      String v = (String) val;
      int twoDigitYear = Integer.parseInt(v.substring(0, 2));
      Map<String, Object> result = new HashMap<>();
      result.put("year", self.convertTwoDigitYear(twoDigitYear));
      result.put("month", Integer.parseInt(v.substring(4, 6)) - 1);
      result.put("day", Integer.parseInt(v.substring(2, 4)));
      return result;
    });

    // DDMMMYYYY-Sep action: [DD, sep, MMM, sep, YYYY]
    grammar.addAction("ddmmmyyyy-sep", (val, x) -> {
      Object[] v = (Object[]) val;
      Map<String, Object> result = new HashMap<>();
      result.put("year", Integer.parseInt((String) v[4]));
      result.put("month", self.parseMonthName((String) v[2]));
      result.put("day", Integer.parseInt((String) v[0]));
      return result;
    });

    // DDMMMYYYY-Compact action: [DD, MMM, YYYY]
    grammar.addAction("ddmmmyyyy-compact", (val, x) -> {
      Object[] v = (Object[]) val;
      Map<String, Object> result = new HashMap<>();
      result.put("year", Integer.parseInt((String) v[2]));
      result.put("month", self.parseMonthName((String) v[1]));
      result.put("day", Integer.parseInt((String) v[0]));
      return result;
    });

    // YYYYDDMMM-Sep action: [YYYY, sep, DD, sep, MMM]
    grammar.addAction("yyyyddmmm-sep", (val, x) -> {
      Object[] v = (Object[]) val;
      Map<String, Object> result = new HashMap<>();
      result.put("year", Integer.parseInt((String) v[0]));
      result.put("month", self.parseMonthName((String) v[4]));
      result.put("day", Integer.parseInt((String) v[2]));
      return result;
    });

    // YYYYDDMMM-Compact action: [YYYY, DD, MMM]
    grammar.addAction("yyyyddmmm-compact", (val, x) -> {
      Object[] v = (Object[]) val;
      Map<String, Object> result = new HashMap<>();
      result.put("year", Integer.parseInt((String) v[0]));
      result.put("month", self.parseMonthName((String) v[2]));
      result.put("day", Integer.parseInt((String) v[1]));
      return result;
    });
  }
}
