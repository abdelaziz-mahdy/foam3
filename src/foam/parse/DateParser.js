/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.parse',
  name: 'DateParser',
  extends: 'foam.parse.DateGrammar',

  documentation: `
    Comprehensive date and datetime parser that handles all formats from DateUtil.js.
    Extends DateGrammar and adds actions for converting parsed results to Date objects.
    Supports both date-only and datetime formats.

    Usage:
      var parser = foam.parse.DateParser.create();
      var date = parser.parseString('2025-01-15');
      var datetime = parser.parseString('2025-01-15T14:30:45');
  `,

  constants: {
    INVALID_DATE: new Date(NaN)
  },

  properties: [
    {
      name: 'dateParseMode',
      value: 'DATETIME'
    }
  ],

  methods: [
    function buildDate(mode, year, month, day, hour, minute, second, ms, tz) {
      var offset, utcTime;
      switch ( mode ) {
        case 'DATE':
          return new Date(Date.UTC(year, month, day, 12, 0, 0, 0));
        case 'DATETIME':
          if ( tz ) {
            offset = this.parseTimezone(tz);
            utcTime = Date.UTC(year, month, day,
              hour >= 0 ? hour : 12, minute >= 0 ? minute : 0,
              second >= 0 ? second : 0, ms >= 0 ? ms : 0);
            return new Date(utcTime - offset * 60000);
          }
          return new Date(year, month, day,
            hour >= 0 ? hour : 12, minute >= 0 ? minute : 0,
            second >= 0 ? second : 0, ms >= 0 ? ms : 0);
        case 'DATETIME_UTC':
          utcTime = Date.UTC(year, month, day,
            hour >= 0 ? hour : 0, minute >= 0 ? minute : 0,
            second >= 0 ? second : 0, ms >= 0 ? ms : 0);
          if ( tz ) utcTime -= this.parseTimezone(tz) * 60000;
          return new Date(utcTime);
        default:
          return new Date(NaN);
      }
    },

    function parseIntOrDefault(v, idx, defaultVal) {
      if ( ! v || v.length <= idx || v[idx] === undefined || v[idx] === null ) return defaultVal;
      return parseInt(v[idx]);
    },

    function extractTimezone(v) {
      if ( ! v || v.length === 0 ) return null;
      var last = v[v.length - 1];
      if ( last === undefined || last === null ) return null;
      if ( last === 'Z' ) return 'Z';
      if ( typeof last !== 'string' ) return this.flattenTimezone(last);
      return null;
    },
    // YYYYMMDD with separators: YYYY-MM-DD, YYYY/MM/DD with optional time
    // v = [YYYY, sep, MM, sep, DD] or [YYYY, sep, MM, sep, DD, T/space, HH, :, MM, :, SS, ., fractionalSecs, timezone]
    function yyyymmddsepAction(v) {
      var ms = -1;
      if ( v[12] !== undefined ) {
        var fracStr = v[12];
        if ( fracStr.length <= 3 ) {
          ms = parseInt(fracStr.padEnd(3, '0'));
        } else {
          ms = parseInt(fracStr.substring(0, 3));
        }
      }
      return this.buildDate(this.dateParseMode,
        parseInt(v[0]),
        parseInt(v[2]) - 1,
        parseInt(v[4]),
        this.parseIntOrDefault(v, 6, -1),
        this.parseIntOrDefault(v, 8, -1),
        this.parseIntOrDefault(v, 10, -1),
        ms,
        this.extractTimezone(v));
    },

    // YYYYMMDD compact: 8 digits "20250115" or "20250115 143045" or "20250115 14:30" or "20250115 14:30:45"
    // v = "20250115" OR v = ["20250115", sep, HH, MM, SS] (compact time) OR v = ["20250115", sep, HH, :, MM, optional([:, SS]), optional(timezone)] (time with colons)
    function yyyymmddcompactAction(v) {
      var dateStr = typeof v === 'string' ? v : v[0];
      var hour = -1, minute = -1, second = -1, tz = null;

      if ( Array.isArray(v) && v.length > 2 ) {
        if ( v[3] && v[3] !== ':' ) {
          hour = parseInt(v[2]);
          minute = parseInt(v[3]);
          second = parseInt(v[4]);
        } else {
          hour = parseInt(v[2]);
          minute = parseInt(v[4]);
          if ( v[5] && Array.isArray(v[5]) ) {
            second = parseInt(v[5][1]);
          }
          tz = this.extractTimezone(v);
        }
      }

      return this.buildDate(this.dateParseMode,
        parseInt(dateStr.substring(0, 4)),
        parseInt(dateStr.substring(4, 6)) - 1,
        parseInt(dateStr.substring(6, 8)),
        hour, minute, second, -1, tz);
    },

    // YYYYMMDDHHMMSS compact: 14 digits with time
    // v = [year, month, day, hour, minute, second]
    function yyyymmddhhmmsscompactAction(v) {
      return this.buildDate(this.dateParseMode,
        parseInt(v[0]),
        parseInt(v[1]) - 1,
        parseInt(v[2]),
        parseInt(v[3]),
        parseInt(v[4]),
        parseInt(v[5]),
        -1, null);
    },

    // MMDDYYYY with separators: MM-DD-YYYY, MM/DD/YYYY with optional time
    // v = [MM, sep, DD, sep, YYYY] or [MM, sep, DD, sep, YYYY, space, HH, :, MM, :, SS, ., fractionalSecs, timezone]
    function mmddyyyysepAction(v) {
      var ms = -1;
      if ( v[12] !== undefined ) {
        var fracStr = v[12];
        if ( fracStr.length <= 3 ) {
          ms = parseInt(fracStr.padEnd(3, '0'));
        } else {
          ms = parseInt(fracStr.substring(0, 3));
        }
      }
      return this.buildDate(this.dateParseMode,
        parseInt(v[4]),
        parseInt(v[0]) - 1,
        parseInt(v[2]),
        this.parseIntOrDefault(v, 6, -1),
        this.parseIntOrDefault(v, 8, -1),
        this.parseIntOrDefault(v, 10, -1),
        ms,
        this.extractTimezone(v));
    },

    // MMDDYYYY compact: 8 digits "01152025" or "01152025 143045" or "01152025 14:30" or "01152025 14:30:45"
    // v = "01152025" OR v = ["01152025", sep, HH, MM, SS] (compact time) OR v = ["01152025", sep, HH, :, MM, optional([:, SS]), optional(timezone)] (time with colons)
    function mmddyyyycompactAction(v) {
      var dateStr = typeof v === 'string' ? v : v[0];
      var hour = -1, minute = -1, second = -1, tz = null;

      if ( Array.isArray(v) && v.length > 2 ) {
        if ( v[3] && v[3] !== ':' ) {
          hour = parseInt(v[2]);
          minute = parseInt(v[3]);
          second = parseInt(v[4]);
        } else {
          hour = parseInt(v[2]);
          minute = parseInt(v[4]);
          if ( v[5] && Array.isArray(v[5]) ) {
            second = parseInt(v[5][1]);
          }
          tz = this.extractTimezone(v);
        }
      }

      return this.buildDate(this.dateParseMode,
        parseInt(dateStr.substring(4, 8)),
        parseInt(dateStr.substring(0, 2)) - 1,
        parseInt(dateStr.substring(2, 4)),
        hour, minute, second, -1, tz);
    },

    // YYMMDD with separators: YY-MM-DD, YY/MM/DD with optional time and timezone
    // v = [YY, sep, MM, sep, DD] or [YY, sep, MM, sep, DD, space, HH, :, MM, :, SS, ., fractionalSecs, timezone]
    function yymmddsepAction(v) {
      var twoDigitYear = parseInt(v[0]);
      var ms = -1;
      if ( v[12] !== undefined ) {
        var fracStr = v[12];
        if ( fracStr.length <= 3 ) {
          ms = parseInt(fracStr.padEnd(3, '0'));
        } else {
          ms = parseInt(fracStr.substring(0, 3));
        }
      }
      return this.buildDate(this.dateParseMode,
        this.convertTwoDigitYear(twoDigitYear),
        parseInt(v[2]) - 1,
        parseInt(v[4]),
        this.parseIntOrDefault(v, 6, -1),
        this.parseIntOrDefault(v, 8, -1),
        this.parseIntOrDefault(v, 10, -1),
        ms,
        this.extractTimezone(v));
    },

    // YYMMDD compact: 6 digits "250115"
    // v = "250115"
    function yymmddcompactAction(v) {
      var twoDigitYear = parseInt(v.substring(0, 2));
      return this.buildDate(this.dateParseMode,
        this.convertTwoDigitYear(twoDigitYear),
        parseInt(v.substring(2, 4)) - 1,
        parseInt(v.substring(4, 6)),
        -1, -1, -1, -1, null);
    },

    // MMDDYY with separators: MM-DD-YY, MM/DD/YY with optional time
    // v = [MM, sep, DD, sep, YY] or [MM, sep, DD, sep, YY, space, HH, :, MM, :, SS, ., fractionalSecs, timezone]
    function mmddyysepAction(v) {
      var twoDigitYear = parseInt(v[4]);
      var ms = -1;
      if ( v[12] !== undefined ) {
        var fracStr = v[12];
        if ( fracStr.length <= 3 ) {
          ms = parseInt(fracStr.padEnd(3, '0'));
        } else {
          ms = parseInt(fracStr.substring(0, 3));
        }
      }
      return this.buildDate(this.dateParseMode,
        this.convertTwoDigitYear(twoDigitYear),
        parseInt(v[0]) - 1,
        parseInt(v[2]),
        this.parseIntOrDefault(v, 6, -1),
        this.parseIntOrDefault(v, 8, -1),
        this.parseIntOrDefault(v, 10, -1),
        ms,
        this.extractTimezone(v));
    },

    // MMDDYY compact: 6 digits "011525"
    // v = "011525"
    function mmddyycompactAction(v) {
      var twoDigitYear = parseInt(v.substring(4, 6));
      return this.buildDate(this.dateParseMode,
        this.convertTwoDigitYear(twoDigitYear),
        parseInt(v.substring(0, 2)) - 1,
        parseInt(v.substring(2, 4)),
        -1, -1, -1, -1, null);
    },

    // DDMMYYYY with separators: DD-MM-YYYY, DD/MM/YYYY with optional time
    // v = [DD, sep, MM, sep, YYYY] or [DD, sep, MM, sep, YYYY, space, HH, :, MM, :, SS, ., fractionalSecs, timezone]
    function ddmmyyyysepAction(v) {
      var ms = -1;
      if ( v[12] !== undefined ) {
        var fracStr = v[12];
        if ( fracStr.length <= 3 ) {
          ms = parseInt(fracStr.padEnd(3, '0'));
        } else {
          ms = parseInt(fracStr.substring(0, 3));
        }
      }
      return this.buildDate(this.dateParseMode,
        parseInt(v[4]),
        parseInt(v[2]) - 1,
        parseInt(v[0]),
        this.parseIntOrDefault(v, 6, -1),
        this.parseIntOrDefault(v, 8, -1),
        this.parseIntOrDefault(v, 10, -1),
        ms,
        this.extractTimezone(v));
    },

    // DDMMYYYY compact: 8 digits "15012025" or "15012025 143045" or "15012025 14:30" or "15012025 14:30:45"
    // v = "15012025" OR v = ["15012025", sep, HH, MM, SS] (compact time) OR v = ["15012025", sep, HH, :, MM, optional([:, SS]), optional(timezone)] (time with colons)
    function ddmmyyyycompactAction(v) {
      var dateStr = typeof v === 'string' ? v : v[0];
      var hour = -1, minute = -1, second = -1, tz = null;

      if ( Array.isArray(v) && v.length > 2 ) {
        if ( v[3] && v[3] !== ':' ) {
          hour = parseInt(v[2]);
          minute = parseInt(v[3]);
          second = parseInt(v[4]);
        } else {
          hour = parseInt(v[2]);
          minute = parseInt(v[4]);
          if ( v[5] && Array.isArray(v[5]) ) {
            second = parseInt(v[5][1]);
          }
          tz = this.extractTimezone(v);
        }
      }

      return this.buildDate(this.dateParseMode,
        parseInt(dateStr.substring(4, 8)),
        parseInt(dateStr.substring(2, 4)) - 1,
        parseInt(dateStr.substring(0, 2)),
        hour, minute, second, -1, tz);
    },

    // DDMMYY with separators: DD-MM-YY, DD/MM/YY with optional time
    // v = [DD, sep, MM, sep, YY] or [DD, sep, MM, sep, YY, space, HH, :, MM, :, SS, ., fractionalSecs, timezone]
    function ddmmyysepAction(v) {
      var twoDigitYear = parseInt(v[4]);
      var ms = -1;
      if ( v[12] !== undefined ) {
        var fracStr = v[12];
        if ( fracStr.length <= 3 ) {
          ms = parseInt(fracStr.padEnd(3, '0'));
        } else {
          ms = parseInt(fracStr.substring(0, 3));
        }
      }
      return this.buildDate(this.dateParseMode,
        this.convertTwoDigitYear(twoDigitYear),
        parseInt(v[2]) - 1,
        parseInt(v[0]),
        this.parseIntOrDefault(v, 6, -1),
        this.parseIntOrDefault(v, 8, -1),
        this.parseIntOrDefault(v, 10, -1),
        ms,
        this.extractTimezone(v));
    },

    // DDMMYY compact: 6 digits "150125"
    // v = "150125"
    function ddmmyycompactAction(v) {
      var twoDigitYear = parseInt(v.substring(4, 6));
      return this.buildDate(this.dateParseMode,
        this.convertTwoDigitYear(twoDigitYear),
        parseInt(v.substring(2, 4)) - 1,
        parseInt(v.substring(0, 2)),
        -1, -1, -1, -1, null);
    },

    // YYYYDDMM with separators: YYYY-DD-MM, YYYY/DD/MM with optional time
    // v = [YYYY, sep, DD, sep, MM] or [YYYY, sep, DD, sep, MM, space, HH, :, MM, :, SS, ., fractionalSecs, timezone]
    function yyyyddmmsepAction(v) {
      var ms = -1;
      if ( v[12] !== undefined ) {
        var fracStr = v[12];
        if ( fracStr.length <= 3 ) {
          ms = parseInt(fracStr.padEnd(3, '0'));
        } else {
          ms = parseInt(fracStr.substring(0, 3));
        }
      }
      return this.buildDate(this.dateParseMode,
        parseInt(v[0]),
        parseInt(v[4]) - 1,
        parseInt(v[2]),
        this.parseIntOrDefault(v, 6, -1),
        this.parseIntOrDefault(v, 8, -1),
        this.parseIntOrDefault(v, 10, -1),
        ms,
        this.extractTimezone(v));
    },

    // YYYYDDMM compact: 8 digits "20251501" or "20251501 143045" or "20251501 14:30" or "20251501 14:30:45"
    // v = "20251501" OR v = ["20251501", sep, HH, MM, SS] (compact time) OR v = ["20251501", sep, HH, :, MM, optional([:, SS]), optional(timezone)] (time with colons)
    function yyyyddmmcompactAction(v) {
      var dateStr = typeof v === 'string' ? v : v[0];
      var hour = -1, minute = -1, second = -1, tz = null;

      if ( Array.isArray(v) && v.length > 2 ) {
        if ( v[3] && v[3] !== ':' ) {
          hour = parseInt(v[2]);
          minute = parseInt(v[3]);
          second = parseInt(v[4]);
        } else {
          hour = parseInt(v[2]);
          minute = parseInt(v[4]);
          if ( v[5] && Array.isArray(v[5]) ) {
            second = parseInt(v[5][1]);
          }
          tz = this.extractTimezone(v);
        }
      }

      return this.buildDate(this.dateParseMode,
        parseInt(dateStr.substring(0, 4)),
        parseInt(dateStr.substring(6, 8)) - 1,
        parseInt(dateStr.substring(4, 6)),
        hour, minute, second, -1, tz);
    },

    // YYDDMM with separators: YY-DD-MM, YY/DD/MM with optional time
    // v = [YY, sep, DD, sep, MM] or [YY, sep, DD, sep, MM, space, HH, :, MM, :, SS, ., fractionalSecs, timezone]
    function yyddmmsepAction(v) {
      var twoDigitYear = parseInt(v[0]);
      var ms = -1;
      if ( v[12] !== undefined ) {
        var fracStr = v[12];
        if ( fracStr.length <= 3 ) {
          ms = parseInt(fracStr.padEnd(3, '0'));
        } else {
          ms = parseInt(fracStr.substring(0, 3));
        }
      }
      return this.buildDate(this.dateParseMode,
        this.convertTwoDigitYear(twoDigitYear),
        parseInt(v[4]) - 1,
        parseInt(v[2]),
        this.parseIntOrDefault(v, 6, -1),
        this.parseIntOrDefault(v, 8, -1),
        this.parseIntOrDefault(v, 10, -1),
        ms,
        this.extractTimezone(v));
    },

    // YYDDMM compact: 6 digits "251501"
    // v = "251501"
    function yyddmmcompactAction(v) {
      var twoDigitYear = parseInt(v.substring(0, 2));
      return this.buildDate(this.dateParseMode,
        this.convertTwoDigitYear(twoDigitYear),
        parseInt(v.substring(4, 6)) - 1,
        parseInt(v.substring(2, 4)),
        -1, -1, -1, -1, null);
    },

    // DDMMMYYYY with separators: DD-MMM-YYYY, DD/MMM/YYYY
    // v = [DD, sep, MMM, sep, YYYY]
    function ddmmmyyyysepAction(v) {
      return this.buildDate(this.dateParseMode,
        parseInt(v[4]),
        this.parseMonthName(v[2]),
        parseInt(v[0]),
        -1, -1, -1, -1, null);
    },

    // DDMMMYYYY compact: DDMMMYYYY "31JAN2025"
    // v = [DD, MMM, YYYY]
    function ddmmmyyyycompactAction(v) {
      return this.buildDate(this.dateParseMode,
        parseInt(v[2]),
        this.parseMonthName(v[1]),
        parseInt(v[0]),
        -1, -1, -1, -1, null);
    },

    // MMM dd yyyy with spaces: "Jan 02 2025"
    // v = [MMM, ' ', DD, ' ', YYYY]
    function mmmddyyyyspaceAction(v) {
      return this.buildDate(this.dateParseMode,
        parseInt(v[4]),
        this.parseMonthName(v[0]),
        parseInt(v[2]),
        -1, -1, -1, -1, null);
    },

    // DD MMM YYYY with spaces: "15 JAN 2025"
    // v = [DD, ' ', MMM, ' ', YYYY]
    function ddmmmyyyyspaceAction(v) {
      return this.buildDate(this.dateParseMode,
        parseInt(v[4]),
        this.parseMonthName(v[2]),
        parseInt(v[0]),
        -1, -1, -1, -1, null);
    },

    // YYYYDDMMM with separators: YYYY-DD-MMM, YYYY/DD/MMM
    // v = [YYYY, sep, DD, sep, MMM]
    function yyyyddmmmsepAction(v) {
      return this.buildDate(this.dateParseMode,
        parseInt(v[0]),
        this.parseMonthName(v[4]),
        parseInt(v[2]),
        -1, -1, -1, -1, null);
    },

    // YYYYDDMMM compact: YYYYDDMMM "202531JAN"
    // v = [YYYY, DD, MMM]
    function yyyyddmmmcompactAction(v) {
      return this.buildDate(this.dateParseMode,
        parseInt(v[0]),
        this.parseMonthName(v[2]),
        parseInt(v[1]),
        -1, -1, -1, -1, null);
    },

    function flattenTimezone(tzArray) {
      if ( ! tzArray ) return null;
      if ( tzArray === 'Z' ) return 'Z';

      // tzArray formats:
      // +HH:MM -> ['+', ['0', '5'], ':', ['3', '0']]
      // +HHMM -> ['+', ['0', '5', '3', '0']]
      // +HH -> ['+', ['0', '5']]
      var result = '';
      for ( var i = 0; i < tzArray.length; i++ ) {
        if ( Array.isArray(tzArray[i]) ) {
          result += tzArray[i].join('');
        } else if ( tzArray[i] !== undefined ) {
          result += tzArray[i];
        }
      }
      return result;
    },

    function parseTimezone(tz) {
      if ( ! tz || tz === 'Z' ) return 0;

      var sign = tz[0] === '+' ? 1 : -1;
      var nums = tz.slice(1).replace(':', ''); // Remove colon if present

      var hours, minutes;
      if ( nums.length >= 4 ) {
        // HHMM format
        hours = parseInt(nums.slice(0, 2));
        minutes = parseInt(nums.slice(2, 4));
      } else if ( nums.length === 2 ) {
        // HH format (no minutes)
        hours = parseInt(nums);
        minutes = 0;
      } else {
        // Invalid format
        return 0;
      }

      return sign * (hours * 60 + minutes);
    },

    function validateDate(date, str) {
      // Check if date is NaN
      if ( isNaN(date.getTime()) ) {
        date = foam.Date.MAX_DATE;
        console.warn("Invalid date: " + str + "; assuming " + date.toISOString() + ".");
        return date;
      }

      // Allow JavaScript's native date normalization (e.g., 2025-13-01 -> 2026-01-01)
      return date;
    },

    function validateDateUTC(date, str) {
      // Check if date is NaN
      if ( isNaN(date.getTime()) ) {
        date = foam.Date.MAX_DATE;
        console.warn("Invalid date: " + str + "; assuming " + date.toISOString() + ".");
        return date;
      }

      // Allow JavaScript's native date normalization (e.g., 2025-13-01 -> 2026-01-01)
      return date;
    },

    function convertTwoDigitYear(twoDigitYear) {
      // Fixed pivot at 50:
      // Years 00-49 map to 2000-2049
      // Years 50-99 map to 1950-1999
      if ( twoDigitYear < 50 ) {
        return 2000 + twoDigitYear;
      }
      return 1900 + twoDigitYear;
    },

    function parseMonthName(monthName) {
      // Convert to uppercase for case-insensitive matching
      var month = monthName.toUpperCase();
      var months = {
        'JAN': 0, 'FEB': 1, 'MAR': 2, 'APR': 3,
        'MAY': 4, 'JUN': 5, 'JUL': 6, 'AUG': 7,
        'SEP': 8, 'OCT': 9, 'NOV': 10, 'DEC': 11
      };
      return months[month] !== undefined ? months[month] : 0;
    },

    function parseString(str, opt_name) {
      if ( ! str || str.trim() === '' ) {
        return this.validateDate(this.INVALID_DATE, str);
      }
      str = str.trim();

      // For parseString, detect mode based on result - use DATETIME as default
      this.dateParseMode = 'DATETIME';

      this.ps.setString(str);
      var start = this.getSymbol(opt_name || 'START');
      var parseResult = this.ps.apply(start, this);

      if ( ! parseResult ) {
        return this.validateDate(this.INVALID_DATE, str);
      }

      if ( parseResult.pos < str.length ) {
        console.warn('DateParser: Partial parse in parseString. Input:', str);
      }

      return parseResult.value;
    },

    function parseDateString(str, opt_name) {
      if ( ! str || str.trim() === '' ) {
        return this.validateDate(this.INVALID_DATE, str);
      }
      str = str.trim();
      this.dateParseMode = 'DATE';

      this.ps.setString(str);
      var start = this.getSymbol(opt_name || 'START');
      var parseResult = this.ps.apply(start, this);

      if ( ! parseResult ) {
        return this.validateDate(this.INVALID_DATE, str);
      }

      return parseResult.value;
    },

    function parseDateTime(str, opt_name) {
      if ( ! str || str.trim() === '' ) {
        return this.validateDate(this.INVALID_DATE, str);
      }
      str = str.trim();
      this.dateParseMode = 'DATETIME';

      this.ps.setString(str);
      var start = this.getSymbol(opt_name || 'START');
      var parseResult = this.ps.apply(start, this);

      if ( ! parseResult ) {
        return this.validateDate(this.INVALID_DATE, str);
      }

      if ( parseResult.pos < str.length ) {
        console.warn('DateParser: Partial parse in parseDateTime. Input:', str);
        return this.validateDate(this.INVALID_DATE, str);
      }

      return parseResult.value;
    },

    function parseDateTimeUTC(str, opt_name) {
      if ( ! str || str.trim() === '' ) {
        return this.validateDateUTC(this.INVALID_DATE, str);
      }
      str = str.trim();
      this.dateParseMode = 'DATETIME_UTC';

      this.ps.setString(str);
      var start = this.getSymbol(opt_name || 'START');
      var parseResult = this.ps.apply(start, this);

      if ( ! parseResult ) {
        return this.validateDateUTC(this.INVALID_DATE, str);
      }

      if ( parseResult.pos < str.length ) {
        console.warn('DateParser: Partial parse in parseDateTimeUTC. Input:', str);
        return this.validateDateUTC(this.INVALID_DATE, str);
      }

      return parseResult.value;
    }
  ]
});
