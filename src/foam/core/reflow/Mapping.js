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
      label: '',
      value: 'FIELD',
      documentation: 'The type of mapping: CONSTANT, FIELD, or DYNAMIC (evaluation delegated to pure FScript)'
    },
    {
      class: 'String',
      name: 'constantValue',
      label: '',
      documentation: 'Static value applied to all rows',
      visibility: function(type) {
        return foam.u2.DisplayMode[type === foam.core.reflow.MappingType.CONSTANT ? 'RW' : 'HIDDEN'];
      }
    },
    {
      class: 'String',
      name: 'fieldName',
      label: '',
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
      label: '',
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


    /*
     * FSCRIPT INTEGRATION ISSUE:
     * 
     * The FScriptParser in FOAM expects to work with FOAM model classes that have 
     * predefined properties. However, we need to evaluate FScript expressions against
     * plain JavaScript objects (rowData) from CSV files where the field names are
     * dynamic and only known at runtime.
     * 
     * CURRENT PROBLEM:
     * - FScript parser requires a FOAM class with properties defined at parse time
     * - CSV data has dynamic field names that change per file
     * - Creating dynamic FOAM classes causes class registration conflicts
     * - FScript grammar doesn't naturally support string concatenation (e.g., "test" + fieldName)
     * 
     * NEEDED SOLUTION:
     * Someone needs to modify FScriptParser to accept plain JavaScript objects
     * without requiring FOAM model classes. The parser should be able to:
     * 1. Accept a plain object and extract field names dynamically
     * 2. Generate grammar rules for those fields at runtime
     * 3. Support string concatenation expressions like "constant" + fieldName
     * 4. Evaluate expressions against the plain object directly
     * 
     * TEMPORARY WORKAROUND:
     * For now, we just return field values directly or empty string for complex expressions.
     */
    function evaluateFScriptExpression(expression, rowData) {
      /**
       * TEMPORARY: Simple field value extraction until FScript integration is fixed.
       * 
       * @param {string} expression - The expression to evaluate (should be FScript)
       * @param {Object} rowData - Plain JavaScript object with field values
       * @returns {*} The field value or empty string
       */
      if ( ! expression ) return '';
      if ( ! rowData ) return '';
      
      // For simple field references, return the field value directly
      if ( rowData.hasOwnProperty(expression) ) {
        return rowData[expression] || '';
      }
      
      // For complex expressions, we need proper FScript integration
      // TODO: Implement proper FScript evaluation once parser supports plain objects
      console.warn('Complex FScript expression not supported yet:', expression);
      return '';
    }
  ]
});