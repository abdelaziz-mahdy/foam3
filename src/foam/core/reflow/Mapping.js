/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.ENUM({
  package: 'foam.core.reflow',
  name: 'MappingType',

  values: [
    {
      name: 'CONSTANT',
      label: 'Constant',
      documentation: 'Static value that is applied to all rows'
    },
    {
      name: 'FIELD',
      label: 'Field',
      documentation: 'Value comes from a field/column in the input data'
    },
    {
      name: 'DYNAMIC',
      label: 'Dynamic',
      documentation: 'Value computed from dynamic expression (uses FScript internally)'
    }
  ]
});

foam.CLASS({
  package: 'foam.core.reflow',
  name: 'Mapping',

  requires: [
    'foam.core.reflow.MappingType',
    'foam.core.reflow.MappingFScriptParser'
  ],

  imports: [ 'scope?' ],

  properties: [
    {
      class: 'String',
      name: 'id',
      documentation: 'The source field/column name'
    },
    {
      class: 'String', 
      name: 'property',
      documentation: 'The target property name'
    },
    {
      class: 'Enum',
      of: 'foam.core.reflow.MappingType',
      name: 'type',
      value: 'FIELD',
      documentation: 'The type of mapping: CONSTANT, FIELD, or DYNAMIC (all use FScript internally)'
    },
    {
      class: 'String',
      name: 'constantValue',
      documentation: 'Static value applied to all rows',
      visibility: function(type) {
        return foam.u2.DisplayMode[type === foam.core.reflow.MappingType.CONSTANT ? 'RW' : 'HIDDEN'];
      }
    },
    {
      class: 'String',
      name: 'fieldName',
      documentation: 'Name of the field/column in input data',
      view: function(_, X) {
        return {
          class: 'foam.u2.view.ChoiceView',
          placeholder: 'Select field',
          choices: X.data.fileHeaders ? X.data.fileHeaders.map(h => [h, h]) : []
        };
      },
      visibility: function(type) {
        return foam.u2.DisplayMode[type === foam.core.reflow.MappingType.FIELD ? 'RW' : 'HIDDEN'];
      }
    },
    {
      class: 'String',
      name: 'dynamicExpression',
      documentation: 'Dynamic expression for computation (converted to FScript internally)',
      help: 'Expression that can access row data fields directly. Examples: firstName + " " + lastName, age > 18 ? "Adult" : "Minor", email.toLowerCase(). Will be converted to FScript for frontend/backend compatibility.',
      view: { class: 'foam.u2.tag.TextArea', rows: 2, cols: 40 },
      visibility: function(type) {
        return foam.u2.DisplayMode[type === foam.core.reflow.MappingType.DYNAMIC ? 'RW' : 'HIDDEN'];
      }
    },
    {
      name: 'of',
      hidden: true
    },
    {
      name: 'fileHeaders',
      hidden: true,
      transient: true,
      factory: function() { return []; }
    }
  ],

  methods: [
    function process(obj, value, rowData) {
      if ( ! this.property ) return;
      
      // Generate FScript expression based on mapping type and evaluate it
      var fscriptExpression = this.generateFScriptExpression();
      
      if ( fscriptExpression ) {
        try {
          value = this.evaluateFScriptExpression(fscriptExpression, rowData);
        } catch (x) {
          console.warn('FScript expression evaluation failed:', x);
          value = '';
        }
      } else {
        value = '';
      }
      
      if ( foam.String.isInstance(value) && value != null && value !== undefined ) {
        value = value.trim();
      }
      
      if ( value !== '' && value != null && value !== undefined ) {
        var handler = this.of && this.of.getAxiomByName(this.property);
        obj[this.property] = handler.fromCSV(value);
      }
    },


    function generateFScriptExpression() {
      /**
       * Generate FScript expression based on the current mapping type and field values.
       * This allows us to maintain the existing UI/UX while using FScript internally.
       * 
       * @returns {string} The generated FScript expression
       */
      switch ( this.type ) {
        case this.MappingType.CONSTANT:
          // Generate quoted string literal for constants
          return this.constantValue ? '"' + this.constantValue.replace(/"/g, '\\"') + '"' : '""';
          
        case this.MappingType.FIELD:
          // Generate direct field reference
          return this.fieldName || '';
          
        case this.MappingType.DYNAMIC:
          // Convert JavaScript expression to FScript where possible
          return this.convertJavaScriptToFScript(this.dynamicExpression);
          
        default:
          return '';
      }
    },

    function convertJavaScriptToFScript(jsExpression) {
      /**
       * Convert JavaScript expressions to FScript equivalents where possible.
       * This handles common patterns and provides fallback for complex expressions.
       * 
       * @param {string} jsExpression - The JavaScript expression to convert
       * @returns {string} The FScript equivalent expression
       */
      if ( ! jsExpression ) return '';
      
      var fscriptExpr = jsExpression;
      
      // Simple conversions for common JavaScript patterns
      // Note: More sophisticated conversion could be added here
      
      // Convert .length to .len (FScript convention)
      fscriptExpr = fscriptExpr.replace(/\.length\b/g, '.len');
      
      // Convert .toLowerCase() to equivalent (if FScript supports it)
      // For now, keep as-is since FScript may support similar functions
      
      // Convert ternary operator to FScript if statement (basic cases)
      var ternaryMatch = fscriptExpr.match(/^\s*(.+?)\s*\?\s*(.+?)\s*:\s*(.+?)\s*$/);
      if ( ternaryMatch ) {
        var condition = ternaryMatch[1].trim();
        var trueValue = ternaryMatch[2].trim();
        var falseValue = ternaryMatch[3].trim();
        
        // Add quotes around string literals if they're not already quoted
        if ( trueValue.match(/^[a-zA-Z][a-zA-Z0-9]*$/) && !trueValue.match(/^(true|false|null|undefined)$/) ) {
          trueValue = '"' + trueValue + '"';
        }
        if ( falseValue.match(/^[a-zA-Z][a-zA-Z0-9]*$/) && !falseValue.match(/^(true|false|null|undefined)$/) ) {
          falseValue = '"' + falseValue + '"';
        }
        
        return 'if (' + condition + ') { ' + trueValue + ' } else { ' + falseValue + ' }';
      }
      
      return fscriptExpr;
    },

    function evaluateFScriptExpression(expression, rowData) {
      /**
       * Safely evaluate an FScript expression using the singleton parser.
       * This is much more efficient as it reuses the same parser instance.
       * 
       * @param {string} expression - The FScript expression to evaluate
       * @param {Object} rowData - The row data object containing field values
       * @returns {*} The result of the FScript expression evaluation
       */
      if ( ! expression ) return '';
      if ( ! rowData ) return '';
      
      try {
        // Use the singleton parser for efficient evaluation
        var parser = this.MappingFScriptParser.create();
        return parser.evaluateExpression(expression, rowData);
      } catch (x) {
        console.error('FScript evaluation error:', {
          expression: expression,
          rowData: rowData,
          error: x.message,
          stack: x.stack
        });
        throw x;
      }
    },



    function validateExpression(expression) {
      /**
       * Validate a JavaScript expression for basic safety.
       * This provides basic checks to catch common errors early.
       * 
       * @param {string} expression - The expression to validate
       * @throws {Error} If the expression appears unsafe or malformed
       */
      if ( ! expression || typeof expression !== 'string' ) {
        throw new Error('Expression must be a non-empty string');
      }
      
      // Check for potentially dangerous patterns
      var dangerousPatterns = [
        /\b(eval|Function|setTimeout|setInterval)\b/,
        /\b(document|window|global|process)\b/,
        /\b(require|import|export)\b/,
        /\b(__proto__|prototype)\b/,
        /\b(constructor)\b/
      ];
      
      dangerousPatterns.forEach(pattern => {
        if ( pattern.test(expression) ) {
          throw new Error('Expression contains potentially unsafe patterns');
        }
      });
      
      // Basic syntax check - try to parse as function body
      try {
        new Function('', 'return ' + expression);
      } catch (x) {
        throw new Error('Expression has invalid syntax: ' + x.message);
      }
    }
  ]
});