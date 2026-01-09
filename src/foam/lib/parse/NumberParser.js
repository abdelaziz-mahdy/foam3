/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.lib.parse',
  name: 'NumberParser',

  documentation: `
    Locale-aware number parser and formatter using Intl API.
    Handles parsing numbers with locale-specific decimal and grouping separators.
  `,

  properties: [
    {
      class: 'String',
      name: 'locale',
      documentation: 'Locale identifier (e.g., "en-US", "fr-FR", "de-DE")',
      factory: function() {
        return typeof Intl !== 'undefined' ?
          Intl.NumberFormat().resolvedOptions().locale :
          'en-US';
      }
    },
    {
      class: 'String',
      name: 'initializedLocale',
      documentation: 'Tracks which locale was last initialized to support lazy initialization',
      hidden: true,
      transient: true
    },
    {
      class: 'String',
      name: 'groupSeparator',
      documentation: 'Thousands grouping separator character detected from locale (e.g., "," for en-US, "." for de-DE, " " for fr-FR)',
      hidden: true,
      transient: true
    },
    {
      class: 'String',
      name: 'decimalSeparator',
      documentation: 'Decimal separator character detected from locale (e.g., "." for en-US, "," for de-DE and fr-FR)',
      hidden: true,
      transient: true
    },
    {
      name: 'numeralMap',
      documentation: 'Function that maps locale-specific numeral characters to standard digits (for non-Arabic numeral locales)',
      hidden: true,
      transient: true
    }
  ],

  methods: [
    function initSeparators() {
      if ( typeof Intl === 'undefined' ) {
        // Fallback for environments without Intl
        this.groupSeparator = ',';
        this.decimalSeparator = '.';
        this.numeralMap = null;
        this.initializedLocale = this.locale;
        return;
      }

      try {
        // Use Intl.NumberFormat to detect locale-specific separators
        // Format a known number and extract the separators from the parts
        var parts = new Intl.NumberFormat(this.locale).formatToParts(12345.6);

        var groupPart = parts.find(d => d.type === 'group');
        var decimalPart = parts.find(d => d.type === 'decimal');

        this.groupSeparator = groupPart ? groupPart.value : ',';
        this.decimalSeparator = decimalPart ? decimalPart.value : '.';

        // Create numeral map for locales with non-Arabic numerals
        var numerals = [...new Intl.NumberFormat(this.locale, {useGrouping: false}).format(9876543210)].reverse();
        var index = new Map(numerals.map((d, i) => [d, i]));
        this.numeralMap = d => index.get(d);

        // Mark this locale as initialized
        this.initializedLocale = this.locale;
      } catch (e) {
        // Fallback if locale is invalid
        this.groupSeparator = ',';
        this.decimalSeparator = '.';
        this.numeralMap = null;
        this.initializedLocale = this.locale;
      }
    },

    function parse(str) {
      /**
       * Parses a locale-formatted number string.
       * @param str The number string to parse
       * @return The parsed number, or NaN if invalid
       */
      if ( ! str || typeof str !== 'string' ) return NaN;

      str = str.trim();
      if ( str === '' ) return NaN;

      // Ensure separators are initialized for current locale (lazy initialization)
      if ( this.initializedLocale !== this.locale ) {
        this.initSeparators();
      }

      // Remove all spaces (regular and non-breaking) - they're only used as grouping separators
      str = str.replace(/[\u00A0 ]/g, '');

      // Remove other grouping separators (comma, period, etc.) - but not if it's a space (already removed)
      var groupSep = this.groupSeparator;
      if ( groupSep && groupSep !== ' ' && groupSep !== '\u00A0' ) {
        var groupRegex = new RegExp('[' + this.escapeRegex(groupSep) + ']', 'g');
        str = str.replace(groupRegex, '');
      }

      // Count decimal separators - should be at most one
      var decimalSep = this.decimalSeparator;
      var decimalEscaped = this.escapeRegex(decimalSep);
      var decimalCount = (str.match(new RegExp(decimalEscaped, 'g')) || []).length;
      if ( decimalCount > 1 ) return NaN;

      // Replace decimal separator with standard period
      var decimalRegex = new RegExp('[' + decimalEscaped + ']');
      str = str.replace(decimalRegex, '.');

      // Map numerals if needed (for non-Arabic numeral locales)
      if ( this.numeralMap ) {
        var numeralRegex = new RegExp('[' + this.getNumeralPattern() + ']', 'g');
        str = str.replace(numeralRegex, this.numeralMap);
      }

      var result = parseFloat(str);
      return result;
    },

    function format(num, options) {
      /**
       * Formats a number according to the locale.
       * @param num The number to format
       * @param options Formatting options (precision, etc.)
       * @return The formatted number string
       */
      if ( typeof num !== 'number' || isNaN(num) ) return '';

      if ( typeof Intl === 'undefined' ) {
        // Simple fallback without Intl
        return options && options.minimumFractionDigits !== undefined ?
          num.toFixed(options.minimumFractionDigits) :
          num.toString();
      }

      try {
        return new Intl.NumberFormat(this.locale, options).format(num);
      } catch (e) {
        return num.toString();
      }
    },

    function escapeRegex(str) {
      /**
       * Escapes special regex characters in a string.
       * @param str String to escape
       * @return Escaped string safe for regex
       */
      return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    },

    function getNumeralPattern() {
      /**
       * Gets all numeral characters for the current locale.
       * @return String of all numeral characters
       */
      if ( ! this.numeralMap || typeof Intl === 'undefined' ) return '';
      return [...new Intl.NumberFormat(this.locale, {useGrouping: false}).format(9876543210)].join('');
    }
  ]
});
