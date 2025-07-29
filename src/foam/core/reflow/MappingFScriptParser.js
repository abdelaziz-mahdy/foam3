/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.core.reflow',
  name: 'MappingFScriptParser',
  extends: 'foam.parse.FScriptParser',

  documentation: 'Singleton FScript parser optimized for mapping operations with reusable instance.',

  axioms: [
    foam.pattern.Singleton.create()
  ],

  properties: [
    {
      name: 'cachedDataClass_',
      documentation: 'Cached generic data class for all mapping operations'
    },
    {
      name: 'fieldCache_',
      factory: function() { return {}; },
      documentation: 'Cache of known field names to avoid repeated class updates'
    }
  ],

  methods: [
    function init() {
      this.SUPER();
      
      // Create a minimal base class - we'll add properties dynamically
      this.cachedDataClass_ = foam.CLASS({
        package: 'foam.core.reflow.mapping',
        name: 'DynamicCSVRowData',
        properties: []
      });
      
      // Set the 'of' property to our cached data class
      this.of = this.cachedDataClass_;
    },

    function evaluateExpression(expression, rowData) {
      /**
       * Optimized expression evaluation using the singleton parser.
       * Dynamically adds new field properties as needed.
       * 
       * @param {string} expression - The FScript expression to evaluate
       * @param {Object} rowData - The row data object containing field values
       * @returns {*} The result of the FScript expression evaluation
       */
      if ( ! expression ) return '';
      if ( ! rowData ) return '';
      
      try {
        // Ensure all fields in rowData are available as properties
        this.ensureFieldsExist(rowData);
        
        // Parse the FScript expression using the updated parser
        var fscriptExpr = this.parseString(expression);
        
        if ( ! fscriptExpr ) {
          throw new Error('Failed to parse FScript expression: ' + expression);
        }
        
        // Create a data proxy with the row data
        var dataProxy = this.createDataProxy(rowData);
        
        // Evaluate the parsed FScript expression
        var result = fscriptExpr.f(dataProxy);
        
        return result;
      } catch (x) {
        console.error('MappingFScriptParser evaluation error:', {
          expression: expression,
          rowData: rowData,
          error: x.message
        });
        throw x;
      }
    },

    function ensureFieldsExist(rowData) {
      /**
       * Dynamically add properties to the cached class for any new fields.
       * This ensures FScript can resolve all field references.
       * 
       * @param {Object} rowData - The row data containing field names
       */
      var fieldNames = Object.keys(rowData);
      var needsUpdate = false;
      
      for ( var i = 0; i < fieldNames.length; i++ ) {
        var fieldName = fieldNames[i];
        
        // Check if we've already added this field
        if ( ! this.fieldCache_[fieldName] ) {
          // Determine property type based on the value
          var fieldValue = rowData[fieldName];
          var propertyType = 'String'; // Default
          
          if ( typeof fieldValue === 'number' ) {
            propertyType = Number.isInteger(fieldValue) ? 'Int' : 'Float';
          } else if ( typeof fieldValue === 'boolean' ) {
            propertyType = 'Boolean';
          } else if ( fieldValue instanceof Date ) {
            propertyType = 'DateTime';
          }
          
          // Add the property to the class
          this.cachedDataClass_.installAxiom(foam.lang.Property.create({
            class: propertyType,
            name: fieldName
          }));
          
          // Mark this field as cached
          this.fieldCache_[fieldName] = true;
          needsUpdate = true;
        }
      }
      
      // If we added new properties, we need to refresh the parser's grammar
      if ( needsUpdate ) {
        // Clear the grammar cache to force regeneration with new fields
        delete this.instance_.grammar_;
      }
    },

    function createDataProxy(rowData) {
      /**
       * Create a data proxy object that maps rowData to the cached class structure.
       * All fields should now exist as properties since ensureFieldsExist was called.
       * 
       * @param {Object} rowData - The row data to proxy
       * @returns {Object} A proxy object for FScript evaluation
       */
      var proxy = this.cachedDataClass_.create();
      
      // Map all row data fields to the proxy - all fields should exist as properties now
      var fieldNames = Object.keys(rowData);
      for ( var i = 0; i < fieldNames.length; i++ ) {
        var fieldName = fieldNames[i];
        proxy[fieldName] = rowData[fieldName];
      }
      
      return proxy;
    }
  ]
});