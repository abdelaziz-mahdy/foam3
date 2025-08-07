/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

/**
 * Dashboard DAOAgents for FLOW Integration
 * 
 * These agents adapt FOAM dashboard components to work with FLOW and DAOPrompt2.
 * They bridge the gap between FOAM's widget-based dashboard system and FLOW's 
 * command-based interactive document system.
 */

foam.CLASS({
  package: 'foam.core.reflow.dashboard',
  name: 'DirectChartMixin',
  
  documentation: 'Mixin providing direct Chart.js integration for DAO agents',
  
  requires: [
    'org.chartjs.Bar2',
    'org.chartjs.Pie2', 
    'org.chartjs.Line2',
    'org.chartjs.Donut2',
    'org.chartjs.StackedBar2'
  ],
  
  methods: [
    function renderDirectChart(e, chartType, chartData, config, block) {
      var ChartClass;
      switch(chartType) {
        case 'bar': ChartClass = this.Bar2; break;
        case 'stackedbar': ChartClass = this.StackedBar2; break;
        case 'pie': ChartClass = this.Pie2; break;
        case 'donut': ChartClass = this.Donut2; break;
        case 'line': ChartClass = this.Line2; break;
        default: throw new Error('Unknown chart type: ' + chartType);
      }
      
      // Ensure charts are responsive by default
      var chartJSOptions = {
        responsive: true,
        maintainAspectRatio: false
      };
      
      if (config && config.options) {
        chartJSOptions = {...chartJSOptions, ...config.options};
      }
      
      var chart = ChartClass.create({
        data: chartData,
        chartJSOptions: chartJSOptions
      }, e.__subContext__);
      
      // Wrap chart in responsive container
      e.start('div').
        style({
          position: 'relative',
          height: '300px',  // Fixed height for consistent layout
          width: '100%',
          overflow: 'hidden'
        }).
        add(chart).
      end();
      
      // Set block value
      if (block) {
        if (block.value) {
          block.value.value = chart;
        } else {
          block.value = chart;
        }
      }
      
      return chart;
    },
    
    function showPropertyRequiredMessage(e) {
      e.start('div').
        style({padding: '20px', textAlign: 'center', color: foam.CSS.returnTokenValue('$textTertiary', this.cls_, this.__context__)}).
        add('Please select a property to group by').
      end();
    },
    
    function convertGroupByToChartData(groupBy, propLabel, chartType) {
      var data = [];
      var labels = [];
      
      // Extract data from GroupBy sink
      for ( var key in groupBy.groups ) {
        if ( groupBy.groups.hasOwnProperty(key) ) {
          labels.push(key.toString());
          data.push(groupBy.groups[key].value);
        }
      }
      
      // Create Chart.js dataset with type-specific styling
      var dataset = {
        label: propLabel || 'Count',
        data: data
      };
      
      // Apply chart-type specific styling with CSS tokens
      switch(chartType) {
        case 'bar':
          dataset.backgroundColor = foam.CSS.returnTokenValue('$primary200', this.cls_, this.__context__);
          dataset.borderColor = foam.CSS.returnTokenValue('$primary400', this.cls_, this.__context__);
          dataset.borderWidth = 1;
          break;
          
        case 'stackedbar':
          dataset.backgroundColor = foam.CSS.returnTokenValue('$blue200', this.cls_, this.__context__);
          dataset.borderColor = foam.CSS.returnTokenValue('$blue400', this.cls_, this.__context__);
          dataset.borderWidth = 1;
          break;
          
        case 'pie':
        case 'donut':
          var tokenColors = ['$red200', '$blue200', '$yellow200', '$green200', '$purple200', '$orange200'];
          var colors = tokenColors.map(function(token) {
            return foam.CSS.returnTokenValue(token, this.cls_, this.__context__);
          }.bind(this));
          dataset.backgroundColor = colors.slice(0, data.length);
          break;
          
        case 'line':
          dataset.backgroundColor = foam.CSS.returnTokenValue('$green100', this.cls_, this.__context__);
          dataset.borderColor = foam.CSS.returnTokenValue('$green500', this.cls_, this.__context__);
          dataset.borderWidth = 2;
          dataset.fill = false;
          dataset.tension = 0.1;
          break;
      }
      
      return {
        labels: labels,
        datasets: [dataset]
      };
    }
  ]
});

foam.CLASS({
  package: 'foam.core.reflow.dashboard',
  name: 'DashboardCountDAOAgent', 
  extends: 'foam.core.reflow.AbstractSinkDAOAgent',
  mixins: ['foam.core.reflow.dashboard.DirectChartMixin'],

  requires: [
    'foam.mlang.sink.Count'
  ],

  properties: [
    {
      class: 'String',
      name: 'label',
      value: 'Count'
    }
  ],

  methods: [
    function execute(e) {
      var self = this;
      
      // Count the DAO records directly
      this.dao.select(this.Count.create()).then(function(count) {
        // Create a simple count display
        e.start('div').
          style({
            padding: '20px',
            textAlign: 'center', 
            fontSize: '2em',
            fontWeight: foam.CSS.returnTokenValue('$font-bold', this.cls_, this.__context__),
            border: '1px solid ' + foam.CSS.returnTokenValue('$borderLight', this.cls_, this.__context__),
            borderRadius: foam.CSS.returnTokenValue('$inputBorderRadius', this.cls_, this.__context__),
            backgroundColor: foam.CSS.returnTokenValue('$backgroundTertiary', this.cls_, this.__context__)
          }).
          add(self.label + ': ' + count.value).
        end();
        
        // Set block value
        if (self.block) {
          if (self.block.value) {
            self.block.value.value = count.value;
          } else {
            self.block.value = count.value;
          }
        }
      });
    }
  ]
});

foam.CLASS({
  package: 'foam.core.reflow.dashboard',
  name: 'DashboardBarChartDAOAgent',
  extends: 'foam.core.reflow.AbstractSinkDAOAgent',
  mixins: ['foam.core.reflow.dashboard.DirectChartMixin'],

  requires: [
    'foam.mlang.sink.GroupBy',
    'foam.mlang.sink.Count',
    'foam.mlang.sink.Sum',
    'foam.mlang.sink.Min',
    'foam.mlang.sink.Max',
    'foam.mlang.sink.Average',
    'foam.core.reflow.dashboard.MetricOperation'
  ],

  properties: [
    {
      name: 'groupBy',
      label: 'Group By',
      view: function(_, X) {
        return { 
          class: 'foam.core.reflow.PropertyChoiceView', 
          forCls: X.data.dao.of
        };
      }
    },
    {
      class: 'Enum',
      of: 'foam.core.reflow.dashboard.MetricOperation',
      name: 'operation',
      label: 'Metric Operation',
      value: 'COUNT'
    },
    {
      name: 'valueProp',
      label: 'Value Property',
      view: function(_, X) {
        return { 
          class: 'foam.core.reflow.PropertyChoiceView', 
          forCls: X.data.dao.of
        };
      },
      visibility: function(operation) {
        return operation !== 'COUNT' ? 'RW' : 'HIDDEN';
      }
    }
  ],

  methods: [
    function execute(e) {
      var self = this;
      
      if ( ! this.groupBy ) {
        this.showPropertyRequiredMessage(e);
        return;
      }
      
      if ( this.operation !== 'COUNT' && ! this.valueProp ) {
        e.start('div').
          style({padding: '20px', textAlign: 'center', color: foam.CSS.returnTokenValue('$textTertiary', this.cls_, this.__context__)}).
          add('Please select a Value property for ' + this.operation.label + ' operation').
        end();
        return;
      }
      
      // Create the appropriate sink based on operation
      var sink = this.operation.createSink(this.valueProp);
      
      // Group data by property and render bar chart
      this.dao.select(this.GroupBy.create({
        arg1: this.groupBy,
        arg2: sink
      })).then(function(groupBy) {
        var chartData = self.convertGroupByToChartData(groupBy, self.getDisplayLabel(), 'bar');
        self.renderDirectChart(e, 'bar', chartData, null, self.block);
      });
    },
    
    function getDisplayLabel() {
      if ( this.operation === 'COUNT' ) {
        return this.groupBy.label + ' Count';
      }
      return this.operation.label + ' of ' + (this.valueProp ? this.valueProp.label : 'Value') + ' by ' + this.groupBy.label;
    },
    
    function addToE(e) {
      e.startContext({data: this}).
        start().
          style({display: 'flex', gap: '10px', flexWrap: 'wrap'}).
          add('Group By: ', this.GROUP_BY).
          add('Operation: ', this.OPERATION).
          add('Value Property: ', this.VALUE_PROP).
        end().
      endContext();
    }
  ]
});

foam.CLASS({
  package: 'foam.core.reflow.dashboard',
  name: 'DashboardStackedBarChartDAOAgent',
  extends: 'foam.core.reflow.AbstractSinkDAOAgent',
  mixins: ['foam.core.reflow.dashboard.DirectChartMixin'],

  requires: [
    'foam.mlang.sink.GroupBy',
    'foam.mlang.sink.Count',
    'foam.mlang.sink.Sum',
    'foam.mlang.sink.Min',
    'foam.mlang.sink.Max',
    'foam.mlang.sink.Average',
    'foam.core.reflow.dashboard.MetricOperation'
  ],

  properties: [
    {
      name: 'xGroupBy',
      label: 'X Group By',
      view: function(_, X) {
        return { 
          class: 'foam.core.reflow.PropertyChoiceView', 
          forCls: X.data.dao.of
        };
      }
    },
    {
      name: 'yGroupBy',
      label: 'Y Group By',
      view: function(_, X) {
        return { 
          class: 'foam.core.reflow.PropertyChoiceView', 
          forCls: X.data.dao.of
        };
      }
    },
    {
      class: 'Enum',
      of: 'foam.core.reflow.dashboard.MetricOperation',
      name: 'operation',
      label: 'Metric Operation',
      value: 'COUNT'
    },
    {
      name: 'valueProp',
      label: 'Value Property',
      view: function(_, X) {
        return { 
          class: 'foam.core.reflow.PropertyChoiceView', 
          forCls: X.data.dao.of
        };
      },
      visibility: function(operation) {
        return operation !== 'COUNT' ? 'RW' : 'HIDDEN';
      }
    }
  ],

  methods: [
    function execute(e) {
      var self = this;
      
      if ( ! this.xGroupBy || ! this.yGroupBy ) {
        e.start('div').
          style({padding: '20px', textAlign: 'center', color: foam.CSS.returnTokenValue('$textTertiary', this.cls_, this.__context__)}).
          add('Please select both X and Y group by properties').
        end();
        return;
      }
      
      if ( this.operation !== 'COUNT' && ! this.valueProp ) {
        e.start('div').
          style({padding: '20px', textAlign: 'center', color: foam.CSS.returnTokenValue('$textTertiary', this.cls_, this.__context__)}).
          add('Please select a Value property for ' + this.operation.label + ' operation').
        end();
        return;
      }
      
      // Create the appropriate sink based on operation
      var sink = this.operation.createSink(this.valueProp);
      
      // Group data by both properties for stacked chart
      this.dao.select(this.GroupBy.create({
        arg1: this.xGroupBy,
        arg2: this.GroupBy.create({
          arg1: this.yGroupBy,
          arg2: sink
        })
      })).then(function(outerGroupBy) {
        var chartData = self.convertToStackedChartData(outerGroupBy);
        self.renderDirectChart(e, 'stackedbar', chartData, null, self.block);
      });
    },
    
    function convertToStackedChartData(outerGroupBy) {
      var labels = [];
      var stackGroups = {};
      
      // First pass: collect all categories and stack values
      for ( var category in outerGroupBy.groups ) {
        if ( outerGroupBy.groups.hasOwnProperty(category) ) {
          labels.push(category.toString());
          var innerGroupBy = outerGroupBy.groups[category];
          
          for ( var stackValue in innerGroupBy.groups ) {
            if ( innerGroupBy.groups.hasOwnProperty(stackValue) ) {
              if ( ! stackGroups[stackValue] ) {
                stackGroups[stackValue] = {};
              }
              stackGroups[stackValue][category] = innerGroupBy.groups[stackValue].value;
            }
          }
        }
      }
      
      // Create datasets for each stack
      var datasets = [];
      var colorIndex = 0;
      var tokenColors = ['$blue200', '$green200', '$red200', '$yellow200', '$purple200', '$orange200'];
      
      for ( var stackValue in stackGroups ) {
        if ( stackGroups.hasOwnProperty(stackValue) ) {
          var data = [];
          
          // Fill data array for each category
          labels.forEach(function(category) {
            data.push(stackGroups[stackValue][category] || 0);
          });
          
          var color = foam.CSS.returnTokenValue(tokenColors[colorIndex % tokenColors.length], this.cls_, this.__context__);
          var borderColor = color.replace('200', '400'); // Darker border
          
          datasets.push({
            label: stackValue.toString(),
            data: data,
            backgroundColor: color,
            borderColor: borderColor,
            borderWidth: 1
          });
          
          colorIndex++;
        }
      }
      
      return {
        labels: labels,
        datasets: datasets
      };
    },
    
    function addToE(e) {
      e.startContext({data: this}).
        start().
          style({display: 'flex', gap: '10px', flexWrap: 'wrap'}).
          add('X Group By: ', this.X_GROUP_BY).
          add('Y Group By: ', this.Y_GROUP_BY).
          add('Operation: ', this.OPERATION).
          add('Value Property: ', this.VALUE_PROP).
        end().
      endContext();
    }
  ]
});

foam.CLASS({
  package: 'foam.core.reflow.dashboard',
  name: 'DashboardPieChartDAOAgent',
  extends: 'foam.core.reflow.dashboard.DashboardBarChartDAOAgent',

  properties: [
    {
      class: 'Boolean',
      name: 'showPercentages',
      value: false
    },
    {
      class: 'Enum',
      of: 'foam.core.reflow.dashboard.LabelPosition',
      name: 'labelPosition',
      value: 'TOP'
    }
  ],

  methods: [
    function execute(e) {
      var self = this;
      
      if ( ! this.groupBy ) {
        this.showPropertyRequiredMessage(e);
        return;
      }
      
      if ( this.operation !== 'COUNT' && ! this.valueProp ) {
        e.start('div').
          style({padding: '20px', textAlign: 'center', color: foam.CSS.returnTokenValue('$textTertiary', this.cls_, this.__context__)}).
          add('Please select a Value property for ' + this.operation.label + ' operation').
        end();
        return;
      }
      
      // Create the appropriate sink based on operation
      var sink = this.operation.createSink(this.valueProp);
      
      this.dao.select(this.GroupBy.create({
        arg1: this.groupBy,
        arg2: sink
      })).then(function(groupBy) {
        var chartData = self.convertGroupByToChartData(groupBy, self.getDisplayLabel(), 'pie');
        var config = self.createPieConfig();
        self.renderDirectChart(e, 'pie', chartData, config, self.block);
      });
    },

    function createPieConfig() {
      var self = this;
      var legendPosition = this.labelPosition.name.toLowerCase();
      
      var options = {
        plugins: {
          legend: {
            position: legendPosition
          }
        }
      };

      if (this.showPercentages) {
        // Disable legend clicks completely - Chart.js way
        options.plugins.legend.onClick = null;
        
        // Add percentages to legend labels
        options.plugins.legend.labels = {
          generateLabels: function(chart) {
            var dataset = chart.data.datasets[0];
            var total = dataset.data.reduce(function(sum, val) { return sum + val; }, 0);
            
            return chart.data.labels.map(function(label, i) {
              var percentage = ((dataset.data[i] / total) * 100).toFixed(1);
              var style = chart.getDatasetMeta(0).controller.getStyle(i);
              
              return {
                text: percentage + '% ' + label,
                fillStyle: style.backgroundColor,
                fontColor: undefined, // Use default font color
                index: i
              };
            });
          }
        };
        
        // Also update tooltip to show percentage
        options.plugins.tooltip = {
          callbacks: {
            label: function(context) {
              var total = context.dataset.data.reduce(function(sum, value) {
                return sum + value;
              }, 0);
              var percentage = ((context.raw / total) * 100).toFixed(1);
              return context.label + ': ' + context.raw + ' (' + percentage + '%)';
            }
          }
        };
      }

      return { options: options, plugins: [] };
    },

    function addToE(e) {
      e.startContext({data: this}).
        start().
          style({display: 'flex', gap: '10px', flexWrap: 'wrap'}).
          add('Group By: ', this.GROUP_BY).
          add('Operation: ', this.OPERATION).
          add('Value Property: ', this.VALUE_PROP).
          add('Show Percentages: ', this.SHOW_PERCENTAGES).
          add('Label Position: ', this.LABEL_POSITION).
        end().
      endContext();
    }
  ]
});


foam.CLASS({
  package: 'foam.core.reflow.dashboard',
  name: 'DashboardDonutChartDAOAgent',
  extends: 'foam.core.reflow.dashboard.DashboardPieChartDAOAgent',

  methods: [
    function execute(e) {
      var self = this;
      
      if ( ! this.groupBy ) {
        this.showPropertyRequiredMessage(e);
        return;
      }
      
      if ( this.operation !== 'COUNT' && ! this.valueProp ) {
        e.start('div').
          style({padding: '20px', textAlign: 'center', color: foam.CSS.returnTokenValue('$textTertiary', this.cls_, this.__context__)}).
          add('Please select a Value property for ' + this.operation.label + ' operation').
        end();
        return;
      }
      
      // Create the appropriate sink based on operation
      var sink = this.operation.createSink(this.valueProp);
      
      this.dao.select(this.GroupBy.create({
        arg1: this.groupBy,
        arg2: sink
      })).then(function(groupBy) {
        var chartData = self.convertGroupByToChartData(groupBy, self.getDisplayLabel(), 'donut');
        var config = self.createPieConfig(); // Reuse pie config method
        self.renderDirectChart(e, 'donut', chartData, config, self.block);
      });
    }
  ]
});

foam.CLASS({
  package: 'foam.core.reflow.dashboard',
  name: 'DashboardLineChartDAOAgent',
  extends: 'foam.core.reflow.AbstractSinkDAOAgent',
  mixins: ['foam.core.reflow.dashboard.DirectChartMixin'],

  requires: [
    'foam.mlang.sink.GroupBy',
    'foam.mlang.sink.Count'
  ],

  properties: [
    {
      name: 'xProp',
      view: function(_, X) {
        return { 
          class: 'foam.core.reflow.PropertyChoiceView', 
          forCls: X.data.dao.of
        };
      }
    },
    {
      name: 'yProp', 
      view: function(_, X) {
        return { 
          class: 'foam.core.reflow.PropertyChoiceView', 
          forCls: X.data.dao.of
        };
      }
    }
  ],

  methods: [
    function execute(e) {
      var self = this;
      
      if ( ! this.xProp || ! this.yProp ) {
        e.start('div').
          style({padding: '20px', textAlign: 'center', color: foam.CSS.returnTokenValue('$textTertiary', this.cls_, this.__context__)}).
          add('Please select both X and Y properties').
        end();
        return;
      }
      
      // Get all records and create X vs Y line chart
      this.dao.select().then(function(arraySink) {
        var chartData = self.convertRecordsToLineChart(arraySink.array);
        
        // Configure Chart.js options with proper date handling
        var isXAxisDate = self.xProp.chartJsFormatter && 
                         (foam.lang.Date.isInstance(self.xProp) || 
                          foam.lang.DateTime.isInstance(self.xProp));
        
        var options = {
          scales: {
            x: {
              type: isXAxisDate ? 'time' : 'linear',
              title: { display: true, text: self.xProp.label }
            },
            y: {
              title: { display: true, text: self.yProp.label }
            }
          },
          plugins: { legend: { display: true } }
        };
        
        // Add time scale configuration for date axes
        if (isXAxisDate) {
          options.scales.x.time = {
            displayFormats: {
              day: 'MMM dd',
              month: 'MMM yyyy'
            },
            tooltipFormat: 'MMM dd, yyyy'
          };
        }
        
        self.renderDirectChart(e, 'line', chartData, {options: options}, self.block);
      });
    },
    
    function convertRecordsToLineChart(records) {
      var data = [];
      var self = this;
      
      // Check if X-axis property has FOAM3 date formatting
      var isXAxisDate = self.xProp.chartJsFormatter && 
                       (foam.lang.Date.isInstance(self.xProp) || 
                        foam.lang.DateTime.isInstance(self.xProp));
      
      // Convert records to {x, y} points with proper FOAM3 date handling
      records.forEach(function(obj) {
        var xVal = obj[self.xProp.name];
        var yVal = obj[self.yProp.name];
        
        if ( xVal != null && yVal != null ) {
          // Use FOAM3 chartJsFormatter for proper date conversion
          var processedXVal = self.xProp.chartJsFormatter ? 
                             self.xProp.chartJsFormatter(xVal) : xVal;
          
          data.push({x: processedXVal, y: yVal});
        }
      });
      
      // Sort by X value for proper line connection
      data.sort(function(a, b) {
        // Handle date comparison if needed
        if (isXAxisDate) {
          return new Date(a.x) - new Date(b.x);
        }
        return a.x - b.x;
      });
      
      return {
        datasets: [{
          label: this.yProp.label + ' vs ' + this.xProp.label,
          data: data,
          backgroundColor: foam.CSS.returnTokenValue('$green100', this.cls_, this.__context__),
          borderColor: foam.CSS.returnTokenValue('$green500', this.cls_, this.__context__),
          borderWidth: 2,
          fill: false,
          tension: 0.1
        }]
      };
    },
    
    function addToE(e) {
      e.startContext({data: this}).
        start().
          style({display: 'flex', gap: '10px', flexWrap: 'wrap'}).
          add('X Property: ', this.X_PROP).
          add('Y Property: ', this.Y_PROP).
        end().
      endContext();
    }
  ]
});

foam.CLASS({
  package: 'foam.core.reflow.dashboard',
  name: 'DashboardMetricDAOAgent',
  extends: 'foam.core.reflow.AbstractSinkDAOAgent',

  requires: [
    'foam.mlang.sink.Count',
    'foam.mlang.sink.Sum',
    'foam.mlang.sink.Min',
    'foam.mlang.sink.Max',
    'foam.mlang.sink.Average',
    'foam.core.reflow.dashboard.MetricOperation'
  ],

  properties: [
    {
      class: 'Enum',
      of: 'foam.core.reflow.dashboard.MetricOperation',
      name: 'operation',
      value: 'COUNT'
    },
    {
      name: 'prop',
      view: function(_, X) {
        return { 
          class: 'foam.core.reflow.PropertyChoiceView', 
          forCls: X.data.dao.of
        };
      }
    },
    {
      class: 'String',
      name: 'label',
      value: 'Metric'
    }
  ],

  methods: [
    function execute(e) {
      var self = this;
      
      if (this.operation !== 'COUNT' && !this.prop) {
        this.showPropertyRequiredMessage(e);
        return;
      }

      var sink = this.operation.createSink(this);
      this.dao.select(sink).then(function(result) {
        e.start('div').
          style({
            padding: '20px',
            textAlign: 'center',
            fontSize: '2em',
            fontWeight: 'bold',
            border: '1px solid ' + foam.CSS.returnTokenValue('$borderLight', this.cls_, this.__context__),
            borderRadius: foam.CSS.returnTokenValue('$inputBorderRadius', this.cls_, this.__context__),
            backgroundColor: foam.CSS.returnTokenValue('$backgroundTertiary', this.cls_, this.__context__)
          }).
          add(self.getDisplayLabel() + ': ' + result.value).
        end();

        if (self.block) {
          if (self.block.value) {
            self.block.value.value = result.value;
          } else {
            self.block.value = result.value;
          }
        }
      });
    },

    function getDisplayLabel() {
      return this.label || 
             (this.prop ? this.operation.label + ' of ' + this.prop.label : this.operation.label);
    },

    function showPropertyRequiredMessage(e) {
      e.start('div').
        style({padding: '20px', textAlign: 'center', color: foam.CSS.returnTokenValue('$textTertiary', this.cls_, this.__context__)}).
        add('Please select a property for ' + this.operation.label + ' operation').
      end();
    },

    function addToE(e) {
      e.startContext({data: this}).
        start().
          style({display: 'flex', gap: '10px', flexWrap: 'wrap'}).
          add('Operation: ', this.OPERATION).
          add('Property: ', this.PROP).
          add('Label: ', this.LABEL).
        end().
      endContext();
    }
  ]
});

foam.CLASS({
  package: 'foam.core.reflow.dashboard',
  name: 'DashboardGridDAOAgent',
  extends: 'foam.core.reflow.AbstractSinkDAOAgent',

  properties: [
    {
      class: 'FObjectArray',
      of: 'foam.core.reflow.AbstractSinkDAOAgent',
      name: 'widgets',
      factory: function() { return []; },
      view: {
        class: 'foam.u2.view.FObjectArrayView',
        valueView: {
          class: 'foam.u2.view.FObjectView',
          choices: [
            ['foam.core.reflow.dashboard.DashboardMetricDAOAgent', 'Metric - Single number (count/sum/avg/min/max)'],
            ['foam.core.reflow.dashboard.DashboardBarChartDAOAgent', 'Bar Chart - Compare values across categories'],
            ['foam.core.reflow.dashboard.DashboardStackedBarChartDAOAgent', 'Stacked Bar - Compare categories with subcategories'],
            ['foam.core.reflow.dashboard.DashboardPieChartDAOAgent', 'Pie Chart - Show proportional breakdown'],
            ['foam.core.reflow.dashboard.DashboardDonutChartDAOAgent', 'Donut Chart - Pie chart with center space'],
            ['foam.core.reflow.dashboard.DashboardLineChartDAOAgent', 'Line Chart - Show trends between two values']
          ],
          config: {
            'of': { 
              visibility: 'HIDDEN' 
            }
          }
        }
      }
    },
    {
      class: 'Int',
      name: 'columns',
      value: 2
    }
  ],

  methods: [
    function execute(e) {
      var self = this;
      
      var actualColumns = Math.min(self.columns, self.widgets.length);
      var gridContainer = e.start('div').
        style({
          display: 'grid',
          gridTemplateColumns: `repeat(${actualColumns}, 1fr)`,
          gap: '16px',
          padding: '16px',
          maxWidth: '100%',
          width: '100%',
          boxSizing: 'border-box',
          overflow: 'hidden'
        });
      
      // Pre-allocate containers to maintain order during async rendering
      var widgetContainers = [];
      for (var i = 0; i < self.widgets.length; i++) {
        var container = gridContainer.start('div').
          style({
            minWidth: '0',
            overflow: 'hidden',
            boxSizing: 'border-box'
          });
        widgetContainers.push(container);
      }
      
      // Render each widget in its designated container
      self.widgets.forEach(function(widget, index) {
        widget.dao = self.dao;
        widget.execute(widgetContainers[index]);
        widgetContainers[index].end();
      });
      
      gridContainer.end();
      
      if (self.block.value) {
        self.block.value.value = self.widgets;
      } else {
        self.block.value = self.widgets;
      }
    },
    
    function addToE(e) {
      e.startContext({data: this}).
        start().
          style({display: 'flex', gap: '10px', flexDirection: 'column'}).
          start().
            style({display: 'flex', gap: '10px'}).
            add('Columns: ', this.COLUMNS).
          end().
          start().
            add('Widgets: ', this.WIDGETS).
          end().
        end().
      endContext();
    }
  ]
});

