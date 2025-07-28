/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.dashboard.model',
  name: 'XYVisualization',
  extends: 'foam.dashboard.model.Visualization',
  
  documentation: 'Custom visualization that supports both X and Y axis properties for proper charting',
  
  requires: [
    'foam.mlang.sink.GroupBy',
    'foam.mlang.sink.Plot',
    'foam.mlang.Constant',
    'foam.dashboard.view.Table', 
    'foam.dashboard.view.Line',
    'foam.u2.ContextSensitiveDetailView as DetailView'
  ],
  
  properties: [
    {
      class: 'String',
      name: 'xProperty',
      documentation: 'X-axis property name'
    },
    {
      class: 'String', 
      name: 'yProperty',
      documentation: 'Y-axis property name'
    },
    {
      name: 'views',
      factory: function() {
        return [
          [ this.Line, 'Line' ],
          [ this.Table, 'Table' ],
          [ this.DetailView, 'Configure' ]
        ];
      }
    },
    {
      name: 'sink',
      expression: function(xProperty, yProperty, dao) {
        if ( ! dao || ! dao.of ) return null;
        if ( ! xProperty ) return null;
        
        // Get the x-axis property axiom
        var xProp = dao.of.getAxiomByName(xProperty);
        if ( ! xProp ) {
          console.warn('X Property not found:', xProperty);
          return null;
        }
        
        // For XY charts, we need both X and Y properties
        if ( yProperty ) {
          var yProp = dao.of.getAxiomByName(yProperty);
          if ( ! yProp ) {
            console.warn('Y Property not found:', yProperty);
            return null;
          }
          
          // Use GroupBy sink with Plot as arg2 for X/Y plotting that works with charts
          // This creates the data structure expected by AbstractChartCView
          return this.GroupBy.create({
            arg1: xProp,  // Group by X-axis values
            arg2: this.Plot.create({
              args: [ this.Constant.create({ value: '' }), yProp ] // Plot Y values
            })
          });
        }
        
        // If no Y property, we can't do X/Y plotting
        console.warn('XYVisualization requires both X and Y properties');
        return null;
      }
    }
  ]
});