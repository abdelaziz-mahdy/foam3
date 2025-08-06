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
    'org.chartjs.Donut2'
  ],
  
  methods: [
    function renderDirectChart(e, chartType, chartData, config, block) {
      var ChartClass;
      switch(chartType) {
        case 'bar': ChartClass = this.Bar2; break;
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
        style({padding: '20px', textAlign: 'center', color: '#666'}).
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
      
      // Apply chart-type specific styling
      switch(chartType) {
        case 'bar':
          dataset.backgroundColor = 'rgba(54, 162, 235, 0.5)';
          dataset.borderColor = 'rgba(54, 162, 235, 1)';
          dataset.borderWidth = 1;
          break;
          
        case 'pie':
        case 'donut':
          var colors = ['rgba(255, 99, 132, 0.5)', 'rgba(54, 162, 235, 0.5)', 
                       'rgba(255, 205, 86, 0.5)', 'rgba(75, 192, 192, 0.5)',
                       'rgba(153, 102, 255, 0.5)', 'rgba(255, 159, 64, 0.5)'];
          dataset.backgroundColor = colors.slice(0, data.length);
          break;
          
        case 'line':
          dataset.backgroundColor = 'rgba(75, 192, 192, 0.2)';
          dataset.borderColor = 'rgba(75, 192, 192, 1)';
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
  extends: 'foam.core.reflow.AbstractDAOAgent',
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
            fontWeight: 'bold',
            border: '1px solid #ddd',
            borderRadius: '4px',
            backgroundColor: '#f9f9f9'
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
  extends: 'foam.core.reflow.AbstractDAOAgent',
  mixins: ['foam.core.reflow.dashboard.DirectChartMixin'],

  requires: [
    'foam.mlang.sink.GroupBy',
    'foam.mlang.sink.Count'
  ],

  properties: [
    {
      name: 'prop',
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
      
      if ( ! this.prop ) {
        this.showPropertyRequiredMessage(e);
        return;
      }
      
      // Group data by property and render bar chart
      this.dao.select(this.GroupBy.create({
        arg1: this.prop,
        arg2: this.Count.create()
      })).then(function(groupBy) {
        var chartData = self.convertGroupByToChartData(groupBy, self.prop.label, 'bar');
        self.renderDirectChart(e, 'bar', chartData, null, self.block);
      });
    },
    
    function addToE(e) {
      e.startContext({data: this}).
        start().
          style({display: 'flex', gap: '10px', flexWrap: 'wrap'}).
          add('Property: ', this.PROP).
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
      
      if ( ! this.prop ) {
        this.showPropertyRequiredMessage(e);
        return;
      }
      
      this.dao.select(this.GroupBy.create({
        arg1: this.prop,
        arg2: this.Count.create()
      })).then(function(groupBy) {
        var chartData = self.convertGroupByToChartData(groupBy, self.prop.label, 'pie');
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
          add('Property: ', this.PROP).
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
      
      if ( ! this.prop ) {
        this.showPropertyRequiredMessage(e);
        return;
      }
      
      this.dao.select(this.GroupBy.create({
        arg1: this.prop,
        arg2: this.Count.create()
      })).then(function(groupBy) {
        var chartData = self.convertGroupByToChartData(groupBy, self.prop.label, 'donut');
        var config = self.createDonutConfig();
        self.renderDirectChart(e, 'donut', chartData, config, self.block);
      });
    },

    function createDonutConfig() {
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
                // fontColor: undefined, // Use default font color
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
          add('Property: ', this.PROP).
          add('Show Percentages: ', this.SHOW_PERCENTAGES).
          add('Label Position: ', this.LABEL_POSITION).
        end().
      endContext();
    }
  ]
});

foam.CLASS({
  package: 'foam.core.reflow.dashboard',
  name: 'DashboardLineChartDAOAgent',
  extends: 'foam.core.reflow.AbstractDAOAgent',
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
          style({padding: '20px', textAlign: 'center', color: '#666'}).
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
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderColor: 'rgba(75, 192, 192, 1)',
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
  extends: 'foam.core.reflow.AbstractDAOAgent',

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
            border: '1px solid #ddd',
            borderRadius: '4px',
            backgroundColor: '#f9f9f9'
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
        style({padding: '20px', textAlign: 'center', color: '#666'}).
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
  extends: 'foam.core.reflow.AbstractDAOAgent',

  properties: [
    {
      class: 'FObjectArray',
      of: 'foam.core.reflow.AbstractDAOAgent',
      name: 'widgets',
      factory: function() { return []; },
      view: {
        class: 'foam.u2.view.FObjectArrayView',
        valueView: {
          class: 'foam.u2.view.FObjectView',
          choices: [
            ['foam.core.reflow.dashboard.DashboardCountDAOAgent', 'Count - Shows total number of records'],
            ['foam.core.reflow.dashboard.DashboardMetricDAOAgent', 'Metric - Shows count, sum, min, max, or average'],
            ['foam.core.reflow.dashboard.DashboardBarChartDAOAgent', 'Bar Chart - Displays data grouped by property'],
            ['foam.core.reflow.dashboard.DashboardPieChartDAOAgent', 'Pie Chart - Shows proportional data distribution'],
            ['foam.core.reflow.dashboard.DashboardDonutChartDAOAgent', 'Donut Chart - Shows proportional data with center hole'],
            ['foam.core.reflow.dashboard.DashboardLineChartDAOAgent', 'Line Chart - Displays trends over property values']
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

