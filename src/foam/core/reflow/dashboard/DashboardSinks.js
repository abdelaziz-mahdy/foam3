/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

/**
 * Dashboard Sink Classes for FLOW Integration
 * 
 * These sinks follow the same pattern as foam.u2.mlang.Pie - they extend
 * GroupBy/GridBy and render charts using expression properties and toE/addToE methods.
 */

foam.CLASS({
  package: 'foam.core.reflow.dashboard',
  name: 'DashboardBarSink',
  extends: 'foam.mlang.sink.GroupBy',
  
  requires: [
    'org.chartjs.Bar2'
  ],
  
  properties: [
    {
      name: 'chart_',
      expression: function(groups) {
        var labels = [];
        var data = [];
        
        for ( var key in groups ) {
          if ( groups.hasOwnProperty(key) ) {
            labels.push(key.toString());
            data.push(groups[key].value);
          }
        }
        
        var chartData = {
          labels: labels,
          datasets: [{
            data: data,
            backgroundColor: foam.CSS.returnTokenValue('$primary200', this.cls_, this.__context__),
            borderColor: foam.CSS.returnTokenValue('$primary400', this.cls_, this.__context__),
            borderWidth: 1
          }]
        };
        
        return this.Bar2.create({
          data: chartData,
          chartJSOptions: {
            responsive: true,
            maintainAspectRatio: false
          }
        });
      }
    }
  ],
  
  methods: [
    function toE(_, x) { return x.E().add(this.chart_$); },
    function addToE(e) { e.add(this.chart_$); }
  ]
});

foam.CLASS({
  package: 'foam.core.reflow.dashboard',
  name: 'DashboardPieSink',
  extends: 'foam.mlang.sink.GroupBy',
  
  requires: [
    'org.chartjs.Pie2'
  ],
  
  properties: [
    {
      class: 'Boolean',
      name: 'showPercentages',
      value: false
    },
    {
      name: 'labelPosition',
      value: 'TOP'
    },
    {
      name: 'colors'
    },
    {
      name: 'chart_',
      expression: function(groups, showPercentages, labelPosition) {
        var labels = [];
        var data = [];
        var colors = [];
        
        var index = 0;
        for ( var key in groups ) {
          if ( groups.hasOwnProperty(key) ) {
            labels.push(key.toString());
            data.push(groups[key].value);
            
            // Generate colors
            if ( this.colors && this.colors.length > 0 ) {
              colors.push(this.colors[index % this.colors.length]);
            } else {
              // Default color generation
              var hue = (index / Math.max(1, Object.keys(groups).length - 1)) * 360;
              colors.push('hsl(' + hue + ', 70%, 50%)');
            }
            index++;
          }
        }
        
        var chartData = {
          labels: labels,
          datasets: [{
            data: data,
            backgroundColor: colors
          }]
        };
        
        var options = {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: (labelPosition || 'TOP').toLowerCase()
            }
          }
        };
        
        if ( showPercentages ) {
          options.plugins.legend.onClick = null;
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
                  fontColor: undefined,
                  index: i
                };
              });
            }
          };
        }
        
        return this.Pie2.create({
          data: chartData,
          chartJSOptions: options
        });
      }
    }
  ],
  
  methods: [
    function toE(_, x) { return x.E().add(this.chart_$); },
    function addToE(e) { e.add(this.chart_$); }
  ]
});

foam.CLASS({
  package: 'foam.core.reflow.dashboard',
  name: 'DashboardDonutSink',
  extends: 'foam.core.reflow.dashboard.DashboardPieSink',
  
  requires: [
    'org.chartjs.Donut2'
  ],
  
  properties: [
    {
      name: 'chart_',
      expression: function(groups, showPercentages, labelPosition) {
        // Use the same logic as pie but with Donut2
        var labels = [];
        var data = [];
        var colors = [];
        
        var index = 0;
        for ( var key in groups ) {
          if ( groups.hasOwnProperty(key) ) {
            labels.push(key.toString());
            data.push(groups[key].value);
            
            if ( this.colors && this.colors.length > 0 ) {
              colors.push(this.colors[index % this.colors.length]);
            } else {
              var hue = (index / Math.max(1, Object.keys(groups).length - 1)) * 360;
              colors.push('hsl(' + hue + ', 70%, 50%)');
            }
            index++;
          }
        }
        
        var chartData = {
          labels: labels,
          datasets: [{
            data: data,
            backgroundColor: colors
          }]
        };
        
        var options = {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: (labelPosition || 'TOP').toLowerCase()
            }
          }
        };
        
        if ( showPercentages ) {
          options.plugins.legend.onClick = null;
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
                  fontColor: undefined,
                  index: i
                };
              });
            }
          };
        }
        
        return this.Donut2.create({
          data: chartData,
          chartJSOptions: options
        });
      }
    }
  ]
});

foam.CLASS({
  package: 'foam.core.reflow.dashboard',
  name: 'DashboardStackedBarSink',
  extends: 'foam.core.reflow.GridBy',
  
  requires: [
    'org.chartjs.StackedBar2'
  ],
  
  properties: [
    {
      name: 'colors'
    },
    {
      name: 'chart_',
      expression: function(groups, cols, rows) {
        var labels = [];
        var stackGroups = {};
        
        // Extract labels from columns
        for ( var col in cols ) {
          if ( cols.hasOwnProperty(col) ) {
            labels.push(col.toString());
          }
        }
        
        // Group data by stack (rows)
        for ( var row in rows ) {
          if ( rows.hasOwnProperty(row) ) {
            stackGroups[row] = {};
            for ( var col in cols ) {
              if ( cols.hasOwnProperty(col) ) {
                var key = row + ':' + col;
                stackGroups[row][col] = groups[key] ? groups[key].value : 0;
              }
            }
          }
        }
        
        var datasets = [];
        var colorIndex = 0;
        
        for ( var stackValue in stackGroups ) {
          if ( stackGroups.hasOwnProperty(stackValue) ) {
            var data = [];
            
            labels.forEach(function(col) {
              data.push(stackGroups[stackValue][col] || 0);
            });
            
            var color;
            if ( this.colors && this.colors.length > 0 ) {
              color = this.colors[colorIndex % this.colors.length];
            } else {
              var hue = (colorIndex / Math.max(1, Object.keys(stackGroups).length - 1)) * 360;
              color = 'hsl(' + hue + ', 70%, 50%)';
            }
            
            datasets.push({
              label: stackValue.toString(),
              data: data,
              backgroundColor: color,
              borderColor: color.replace('50%', '40%'), // Darker border
              borderWidth: 1
            });
            
            colorIndex++;
          }
        }
        
        return this.StackedBar2.create({
          data: {
            labels: labels,
            datasets: datasets
          },
          chartJSOptions: {
            responsive: true,
            maintainAspectRatio: false
          }
        });
      }
    }
  ],
  
  methods: [
    function toE(_, x) { return x.E().add(this.chart_$); },
    function addToE(e) { e.add(this.chart_$); }
  ]
});

foam.CLASS({
  package: 'foam.core.reflow.dashboard',
  name: 'DashboardLineSink',
  extends: 'foam.dao.ArraySink',
  
  requires: [
    'org.chartjs.Line2'
  ],
  
  properties: [
    {
      name: 'xProp'
    },
    {
      name: 'yProp'
    },
    {
      name: 'groupBy'
    },
    {
      name: 'colors'
    },
    {
      name: 'chart_',
      expression: function(array) {
        var data = [];
        var self = this;
        
        // Convert records to {x, y} points
        array.forEach(function(obj) {
          var xVal = obj[self.xProp.name];
          var yVal = obj[self.yProp.name];
          
          if ( xVal != null && yVal != null ) {
            var processedXVal = self.xProp.chartJsFormatter ? 
                               self.xProp.chartJsFormatter(xVal) : xVal;
            data.push({x: processedXVal, y: yVal});
          }
        });
        
        // Sort by X value
        data.sort(function(a, b) {
          return parseFloat(a.x) - parseFloat(b.x);
        });
        
        var chartData = {
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
        
        return this.Line2.create({
          data: chartData,
          chartJSOptions: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: {
                title: { display: true, text: this.xProp.label }
              },
              y: {
                title: { display: true, text: this.yProp.label }
              }
            }
          }
        });
      }
    }
  ],
  
  methods: [
    function toE(_, x) { return x.E().add(this.chart_$); },
    function addToE(e) { e.add(this.chart_$); }
  ]
});

foam.CLASS({
  package: 'foam.core.reflow.dashboard',
  name: 'DashboardMetricSink',
  extends: 'foam.dao.AbstractSink',
  
  properties: [
    {
      name: 'operation'
    },
    {
      name: 'prop'
    },
    {
      name: 'label',
      value: 'Metric'
    },
    {
      name: 'showCount',
      value: false
    },
    {
      name: 'renderAsCard',
      value: true
    },
    {
      name: 'metricSink_'
    },
    {
      name: 'countSink_'
    },
    {
      name: 'display_',
      expression: function(metricSink_, countSink_, label, showCount, renderAsCard) {
        var value = metricSink_ ? metricSink_.value : 0;
        var count = countSink_ ? countSink_.value : null;
        
        var displayLabel = label || 
                          (this.prop ? this.operation.label + ' of ' + this.prop.label : this.operation.label);
        
        var container = foam.u2.Element.create();
        
        if ( renderAsCard ) {
          container.style({
            backgroundColor: foam.CSS.returnTokenValue('$backgroundPrimary', this.cls_, this.__context__),
            border: '1px solid ' + foam.CSS.returnTokenValue('$borderLight', this.cls_, this.__context__),
            borderRadius: foam.CSS.returnTokenValue('$inputBorderRadius', this.cls_, this.__context__),
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            minHeight: '140px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center'
          });
        }
        
        // Label
        container.start('div')
          .style({
            fontSize: '0.875rem',
            color: foam.CSS.returnTokenValue('$textSecondary', this.cls_, this.__context__),
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontWeight: 'medium',
            marginBottom: '8px'
          })
          .add(displayLabel)
        .end();
        
        // Value
        container.start('div')
          .style({
            fontSize: '3rem',
            fontWeight: 'bold',
            color: foam.CSS.returnTokenValue('$primary500', this.cls_, this.__context__),
            lineHeight: '1'
          })
          .add(typeof value === 'number' ? value.toLocaleString() : value)
        .end();
        
        // Count if enabled
        if ( showCount && count !== null && this.operation && this.operation.name !== 'COUNT' ) {
          container.start('div')
            .style({
              fontSize: '0.75em',
              marginTop: '4px',
              color: foam.CSS.returnTokenValue('$textSecondary', this.cls_, this.__context__),
              fontWeight: 'normal'
            })
            .add(count.toLocaleString() + ' records')
          .end();
        }
        
        return container;
      }
    }
  ],
  
  methods: [
    function init() {
      this.SUPER();
      
      if ( this.operation ) {
        this.metricSink_ = this.operation.createSink(this.prop);
      }
      
      if ( this.showCount && this.operation && this.operation.name !== 'COUNT' ) {
        this.countSink_ = foam.mlang.sink.Count.create();
      }
    },
    
    function put(obj, sub) {
      if ( this.metricSink_ ) {
        this.metricSink_.put(obj, sub);
      }
      if ( this.countSink_ ) {
        this.countSink_.put(obj, sub);
      }
    },
    
    function toE(_, x) { return x.E().add(this.display_$); },
    function addToE(e) { e.add(this.display_$); },
    
    function eof() {
      if ( this.metricSink_ && this.metricSink_.eof ) {
        this.metricSink_.eof();
      }
      if ( this.countSink_ && this.countSink_.eof ) {
        this.countSink_.eof();
      }
    },
    
    function reset(sub) {
      if ( this.metricSink_ ) {
        this.metricSink_.reset(sub);
      }
      if ( this.countSink_ ) {
        this.countSink_.reset(sub);
      }
    }
  ]
});