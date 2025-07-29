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
      documentation: 'Value computed from pure FScript expression with rowData context access'
    }
  ]
});

foam.CLASS({
  package: 'foam.core.reflow',
  name: 'Mapping',

  requires: [
    'foam.core.reflow.MappingType',
    'foam.parse.FScriptParser'
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
      documentation: 'The type of mapping: CONSTANT, FIELD, or DYNAMIC (evaluation delegated to pure FScript)'
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
      documentation: 'Pure FScript expression for computation with rowData context access',
      help: 'Pure FScript expression that can access row data in two ways: 1) Direct field access: firstName, lastName, age 2) Via rowData object: rowData.firstName, rowData["Field Name"]. Examples: firstName + " " + lastName, if (age > 18) { "Adult" } else { "Minor" }, rowData["Email Address"]',
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
      
      // Generate pure FScript expression based on mapping type
      var fscriptExpression = this.generateFScriptExpression();
      
      if ( fscriptExpression ) {
        try {
          // All evaluation is now done in pure FScript
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
       * Generate pure FScript expression based on the current mapping type.
       * All evaluation is delegated to FScript - no JavaScript conversion.
       * 
       * @returns {string} The pure FScript expression
       */
      switch ( this.type ) {
        case this.MappingType.CONSTANT:
          // Generate quoted string literal for constants
          return this.constantValue ? '"' + this.constantValue.replace(/"/g, '\\"') + '"' : '""';
          
        case this.MappingType.FIELD:
          // Generate direct field reference for FScript
          return this.fieldName || '';
          
        case this.MappingType.DYNAMIC:
          // Return the expression as pure FScript (no conversion)
          return this.dynamicExpression || '';
          
        default:
          return '';
      }
    },


    function evaluateFScriptExpression(expression, rowData) {
      /**
       * Delegate all expression evaluation to standard FScriptParser.
       * Pass rowData directly as context to the parser.
       * 
       * @param {string} expression - The pure FScript expression to evaluate
       * @param {Object} rowData - The row data object containing field values
       * @returns {*} The result of the FScript expression evaluation
       */
      if ( ! expression ) return '';
      if ( ! rowData ) return '';
      
      try {
        // Create FScript parser with rowData as context
        var parser = this.FScriptParser.create(null, rowData);
        
        // Parse and evaluate the expression
        var parsedExpr = parser.parseString(expression);
        if ( ! parsedExpr ) {
          throw new Error('Failed to parse FScript expression: ' + expression);
        }
        
        return parsedExpr.f(rowData);
      } catch (x) {
        console.error('FScript evaluation error:', {
          expression: expression,
          rowData: rowData,
          error: x.message,
          stack: x.stack
        });
        throw x;
      }
    }
  ]
});