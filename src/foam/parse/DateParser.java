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

  public enum DateParseMode { DATE, STRING, DATETIME, DATETIME_UTC }

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
      StringPStream ps = new StringPStream(str);

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

    str = str.trim();
    StringPStream sps = new StringPStream(str);
    ParserContext x = new ParserContextImpl();
    x.set("dateParseMode", DateParseMode.STRING);  // STRING mode: date-only → noon GMT, with time → local time

    PStream parseResult = grammar_.parse(sps, x, opt_name);
    if ( parseResult == null || parseResult.value() == null ) {
      throw new RuntimeException("Unsupported Date format: " + str);
    }

    return (Date) parseResult.value();
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

    str = str.trim();
    StringPStream sps = new StringPStream(str);
    ParserContext x = new ParserContextImpl();
    x.set("dateParseMode", DateParseMode.DATE);

    PStream parseResult = grammar_.parse(sps, x, opt_name);
    if ( parseResult == null || parseResult.value() == null ) {
      throw new RuntimeException("Unsupported Date format: " + str);
    }

    return (Date) parseResult.value();
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
    StringPStream sps = new StringPStream(str);
    ParserContext x = new ParserContextImpl();
    x.set("dateParseMode", DateParseMode.DATETIME);

    PStream parseResult = grammar_.parse(sps, x, opt_name);
    if ( parseResult == null || parseResult.value() == null ) {
      throw new RuntimeException("Unsupported DateTime format: " + str);
    }

    return (Date) parseResult.value();
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
    StringPStream sps = new StringPStream(str);
    ParserContext x = new ParserContextImpl();
    x.set("dateParseMode", DateParseMode.DATETIME_UTC);

    PStream parseResult = grammar_.parse(sps, x, opt_name);
    if ( parseResult == null || parseResult.value() == null ) {
      throw new RuntimeException("Unsupported DateTime format: " + str);
    }

    return (Date) parseResult.value();
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

  /**
   * Build a Date object from parsed components based on mode
   */
  private Date buildDate(DateParseMode mode, int year, int month, int day,
                         int hour, int minute, int second, int ms, String tz) {
    Calendar cal;
    switch (mode) {
      case DATE:
        // Always noon GMT - for parseDateString
        cal = Calendar.getInstance(TimeZone.getTimeZone("GMT"));
        cal.clear();
        cal.set(year, month, day, 12, 0, 0);
        return cal.getTime();
      case STRING:
        // For parseString: date-only → noon GMT, with time → local time
        if ( hour < 0 && minute < 0 && second < 0 ) {
          // No time components - return noon GMT
          cal = Calendar.getInstance(TimeZone.getTimeZone("GMT"));
          cal.clear();
          cal.set(year, month, day, 12, 0, 0);
          return cal.getTime();
        }
        // Has time - return local time
        if ( tz != null ) {
          int offset = parseTimezone(tz);
          cal = Calendar.getInstance(TimeZone.getTimeZone("GMT"));
          cal.clear();
          cal.set(year, month, day, hour >= 0 ? hour : 0,
                  minute >= 0 ? minute : 0, second >= 0 ? second : 0);
          if ( ms >= 0 ) cal.set(Calendar.MILLISECOND, ms);
          cal.add(Calendar.MINUTE, -offset);
          return cal.getTime();
        }
        cal = Calendar.getInstance();
        cal.clear();
        cal.set(year, month, day, hour >= 0 ? hour : 0,
                minute >= 0 ? minute : 0, second >= 0 ? second : 0);
        if ( ms >= 0 ) cal.set(Calendar.MILLISECOND, ms);
        return cal.getTime();
      case DATETIME:
        // Always local time with default hour 12 - for parseDateTime
        if ( tz != null ) {
          int offset = parseTimezone(tz);
          cal = Calendar.getInstance(TimeZone.getTimeZone("GMT"));
          cal.clear();
          cal.set(year, month, day, hour >= 0 ? hour : 12,
                  minute >= 0 ? minute : 0, second >= 0 ? second : 0);
          if ( ms >= 0 ) cal.set(Calendar.MILLISECOND, ms);
          cal.add(Calendar.MINUTE, -offset);
          return cal.getTime();
        }
        cal = Calendar.getInstance();
        cal.clear();
        cal.set(year, month, day, hour >= 0 ? hour : 12,
                minute >= 0 ? minute : 0, second >= 0 ? second : 0);
        if ( ms >= 0 ) cal.set(Calendar.MILLISECOND, ms);
        return cal.getTime();
      case DATETIME_UTC:
        // Always UTC - for parseDateTimeUTC
        cal = Calendar.getInstance(TimeZone.getTimeZone("GMT"));
        cal.clear();
        cal.set(year, month, day, hour >= 0 ? hour : 0,
                minute >= 0 ? minute : 0, second >= 0 ? second : 0);
        if ( ms >= 0 ) cal.set(Calendar.MILLISECOND, ms);
        if ( tz != null ) cal.add(Calendar.MINUTE, -parseTimezone(tz));
        return cal.getTime();
      default:
        return null;
    }
  }

  /**
   * Parse integer from array or return default value
   */
  private int parseIntOrDefault(Object[] v, int idx, int defaultVal) {
    if ( v.length <= idx || v[idx] == null ) return defaultVal;
    return Integer.parseInt((String) v[idx]);
  }

  /**
   * Extract timezone from parsed value array
   */
  private String extractTimezone(Object[] v) {
    if ( v.length == 0 ) return null;
    Object last = v[v.length - 1];
    if ( last == null ) return null;
    if ( "Z".equals(last) ) return "Z";
    if ( !(last instanceof String) ) return flattenTimezone(last);
    return null;
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
   * Add action handlers to convert parsed arrays to Date objects
   */
  private void addActions(Grammar grammar) {
    final DateParser self = this;

    // YYYYMMDD-Sep action: [YYYY, sep, MM, sep, DD] or with time
    grammar.addAction("yyyymmdd-sep", (val, x) -> {
      Object[] v = (Object[]) val;
      DateParseMode mode = (DateParseMode) x.get("dateParseMode");
      return self.buildDate(mode,
        Integer.parseInt((String) v[0]),
        Integer.parseInt((String) v[2]) - 1,
        Integer.parseInt((String) v[4]),
        self.parseIntOrDefault(v, 6, -1),
        self.parseIntOrDefault(v, 8, -1),
        self.parseIntOrDefault(v, 10, -1),
        self.parseIntOrDefault(v, 12, -1),
        self.extractTimezone(v));
    });

    // YYYYMMDD-Compact action: "20250115"
    grammar.addAction("yyyymmdd-compact", (val, x) -> {
      String v = (String) val;
      DateParseMode mode = (DateParseMode) x.get("dateParseMode");
      return self.buildDate(mode,
        Integer.parseInt(v.substring(0, 4)),
        Integer.parseInt(v.substring(4, 6)) - 1,
        Integer.parseInt(v.substring(6, 8)),
        -1, -1, -1, -1, null);
    });

    // YYYYMMDDHHMMSS-Compact action: [year, month, day, hour, minute, second]
    grammar.addAction("yyyymmddhhmmss-compact", (val, x) -> {
      Object[] v = (Object[]) val;
      DateParseMode mode = (DateParseMode) x.get("dateParseMode");
      return self.buildDate(mode,
        Integer.parseInt((String) v[0]),
        Integer.parseInt((String) v[1]) - 1,
        Integer.parseInt((String) v[2]),
        Integer.parseInt((String) v[3]),
        Integer.parseInt((String) v[4]),
        Integer.parseInt((String) v[5]),
        -1, null);
    });

    // MMDDYYYY-Sep action
    grammar.addAction("mmddyyyy-sep", (val, x) -> {
      Object[] v = (Object[]) val;
      DateParseMode mode = (DateParseMode) x.get("dateParseMode");
      return self.buildDate(mode,
        Integer.parseInt((String) v[4]),
        Integer.parseInt((String) v[0]) - 1,
        Integer.parseInt((String) v[2]),
        self.parseIntOrDefault(v, 6, -1),
        self.parseIntOrDefault(v, 8, -1),
        self.parseIntOrDefault(v, 10, -1),
        -1,
        self.extractTimezone(v));
    });

    // MMDDYYYY-Compact action: "01152025"
    grammar.addAction("mmddyyyy-compact", (val, x) -> {
      String v = (String) val;
      DateParseMode mode = (DateParseMode) x.get("dateParseMode");
      return self.buildDate(mode,
        Integer.parseInt(v.substring(4, 8)),
        Integer.parseInt(v.substring(0, 2)) - 1,
        Integer.parseInt(v.substring(2, 4)),
        -1, -1, -1, -1, null);
    });

    // YYMMDD-Sep action
    grammar.addAction("yymmdd-sep", (val, x) -> {
      Object[] v = (Object[]) val;
      DateParseMode mode = (DateParseMode) x.get("dateParseMode");
      int twoDigitYear = Integer.parseInt((String) v[0]);
      return self.buildDate(mode,
        self.convertTwoDigitYear(twoDigitYear),
        Integer.parseInt((String) v[2]) - 1,
        Integer.parseInt((String) v[4]),
        self.parseIntOrDefault(v, 6, -1),
        self.parseIntOrDefault(v, 8, -1),
        self.parseIntOrDefault(v, 10, -1),
        -1,
        self.extractTimezone(v));
    });

    // YYMMDD-Compact action: "250115"
    grammar.addAction("yymmdd-compact", (val, x) -> {
      String v = (String) val;
      DateParseMode mode = (DateParseMode) x.get("dateParseMode");
      int twoDigitYear = Integer.parseInt(v.substring(0, 2));
      return self.buildDate(mode,
        self.convertTwoDigitYear(twoDigitYear),
        Integer.parseInt(v.substring(2, 4)) - 1,
        Integer.parseInt(v.substring(4, 6)),
        -1, -1, -1, -1, null);
    });

    // DDMMYYYY-Sep action
    grammar.addAction("ddmmyyyy-sep", (val, x) -> {
      Object[] v = (Object[]) val;
      DateParseMode mode = (DateParseMode) x.get("dateParseMode");
      return self.buildDate(mode,
        Integer.parseInt((String) v[4]),
        Integer.parseInt((String) v[2]) - 1,
        Integer.parseInt((String) v[0]),
        self.parseIntOrDefault(v, 6, -1),
        self.parseIntOrDefault(v, 8, -1),
        self.parseIntOrDefault(v, 10, -1),
        -1,
        self.extractTimezone(v));
    });

    // DDMMYYYY-Compact action: "15012025"
    grammar.addAction("ddmmyyyy-compact", (val, x) -> {
      String v = (String) val;
      DateParseMode mode = (DateParseMode) x.get("dateParseMode");
      return self.buildDate(mode,
        Integer.parseInt(v.substring(4, 8)),
        Integer.parseInt(v.substring(2, 4)) - 1,
        Integer.parseInt(v.substring(0, 2)),
        -1, -1, -1, -1, null);
    });

    // DDMMYY-Sep action
    grammar.addAction("ddmmyy-sep", (val, x) -> {
      Object[] v = (Object[]) val;
      DateParseMode mode = (DateParseMode) x.get("dateParseMode");
      int twoDigitYear = Integer.parseInt((String) v[4]);
      return self.buildDate(mode,
        self.convertTwoDigitYear(twoDigitYear),
        Integer.parseInt((String) v[2]) - 1,
        Integer.parseInt((String) v[0]),
        self.parseIntOrDefault(v, 6, -1),
        self.parseIntOrDefault(v, 8, -1),
        self.parseIntOrDefault(v, 10, -1),
        -1,
        self.extractTimezone(v));
    });

    // DDMMYY-Compact action: "150125"
    grammar.addAction("ddmmyy-compact", (val, x) -> {
      String v = (String) val;
      DateParseMode mode = (DateParseMode) x.get("dateParseMode");
      int twoDigitYear = Integer.parseInt(v.substring(4, 6));
      return self.buildDate(mode,
        self.convertTwoDigitYear(twoDigitYear),
        Integer.parseInt(v.substring(2, 4)) - 1,
        Integer.parseInt(v.substring(0, 2)),
        -1, -1, -1, -1, null);
    });

    // YYYYDDMM-Sep action
    grammar.addAction("yyyyddmm-sep", (val, x) -> {
      Object[] v = (Object[]) val;
      DateParseMode mode = (DateParseMode) x.get("dateParseMode");
      return self.buildDate(mode,
        Integer.parseInt((String) v[0]),
        Integer.parseInt((String) v[4]) - 1,
        Integer.parseInt((String) v[2]),
        self.parseIntOrDefault(v, 6, -1),
        self.parseIntOrDefault(v, 8, -1),
        self.parseIntOrDefault(v, 10, -1),
        -1,
        self.extractTimezone(v));
    });

    // YYYYDDMM-Compact action: "20251501"
    grammar.addAction("yyyyddmm-compact", (val, x) -> {
      String v = (String) val;
      DateParseMode mode = (DateParseMode) x.get("dateParseMode");
      return self.buildDate(mode,
        Integer.parseInt(v.substring(0, 4)),
        Integer.parseInt(v.substring(6, 8)) - 1,
        Integer.parseInt(v.substring(4, 6)),
        -1, -1, -1, -1, null);
    });

    // YYDDMM-Sep action
    grammar.addAction("yyddmm-sep", (val, x) -> {
      Object[] v = (Object[]) val;
      DateParseMode mode = (DateParseMode) x.get("dateParseMode");
      int twoDigitYear = Integer.parseInt((String) v[0]);
      return self.buildDate(mode,
        self.convertTwoDigitYear(twoDigitYear),
        Integer.parseInt((String) v[4]) - 1,
        Integer.parseInt((String) v[2]),
        self.parseIntOrDefault(v, 6, -1),
        self.parseIntOrDefault(v, 8, -1),
        self.parseIntOrDefault(v, 10, -1),
        -1,
        self.extractTimezone(v));
    });

    // YYDDMM-Compact action: "251501"
    grammar.addAction("yyddmm-compact", (val, x) -> {
      String v = (String) val;
      DateParseMode mode = (DateParseMode) x.get("dateParseMode");
      int twoDigitYear = Integer.parseInt(v.substring(0, 2));
      return self.buildDate(mode,
        self.convertTwoDigitYear(twoDigitYear),
        Integer.parseInt(v.substring(4, 6)) - 1,
        Integer.parseInt(v.substring(2, 4)),
        -1, -1, -1, -1, null);
    });

    // DDMMMYYYY-Sep action: [DD, sep, MMM, sep, YYYY]
    grammar.addAction("ddmmmyyyy-sep", (val, x) -> {
      Object[] v = (Object[]) val;
      DateParseMode mode = (DateParseMode) x.get("dateParseMode");
      return self.buildDate(mode,
        Integer.parseInt((String) v[4]),
        self.parseMonthName((String) v[2]),
        Integer.parseInt((String) v[0]),
        -1, -1, -1, -1, null);
    });

    // DDMMMYYYY-Compact action: [DD, MMM, YYYY]
    grammar.addAction("ddmmmyyyy-compact", (val, x) -> {
      Object[] v = (Object[]) val;
      DateParseMode mode = (DateParseMode) x.get("dateParseMode");
      return self.buildDate(mode,
        Integer.parseInt((String) v[2]),
        self.parseMonthName((String) v[1]),
        Integer.parseInt((String) v[0]),
        -1, -1, -1, -1, null);
    });

    // YYYYDDMMM-Sep action: [YYYY, sep, DD, sep, MMM]
    grammar.addAction("yyyyddmmm-sep", (val, x) -> {
      Object[] v = (Object[]) val;
      DateParseMode mode = (DateParseMode) x.get("dateParseMode");
      return self.buildDate(mode,
        Integer.parseInt((String) v[0]),
        self.parseMonthName((String) v[4]),
        Integer.parseInt((String) v[2]),
        -1, -1, -1, -1, null);
    });

    // YYYYDDMMM-Compact action: [YYYY, DD, MMM]
    grammar.addAction("yyyyddmmm-compact", (val, x) -> {
      Object[] v = (Object[]) val;
      DateParseMode mode = (DateParseMode) x.get("dateParseMode");
      return self.buildDate(mode,
        Integer.parseInt((String) v[0]),
        self.parseMonthName((String) v[2]),
        Integer.parseInt((String) v[1]),
        -1, -1, -1, -1, null);
    });
  }
}
