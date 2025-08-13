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
    // GroupBy properties (inherited but exposed here for clarity)
    { name: 'groupLimit', value: 0, help: 'Limit number of groups (0 = no limit)' },
    { name: 'sortOrder', value: 'DESC', help: 'Sort order for groups' },
    { name: 'includeOthers', value: false, help: 'Include "Others" category for remaining groups' },
    { name: 'othersLabel', value: 'Others', help: 'Label for the "Others" category' },
    // Chart-specific properties
    { name: 'colors' },
    { name: 'timeUnit' },
    { name: 'horizontal', value: false },
    { name: 'barThickness' },
    { name: 'datasetLabel', value: '', help: 'Label for the dataset (shown in legend if enabled)' },
    { name: 'xAxisLabel' },
    { name: 'yAxisLabel' },
    { name: 'showGridLines', value: true },
    // Display properties
    { name: 'responsive', value: true },
    { name: 'maintainAspectRatio', value: false },
    { name: 'height', value: 300 },
    { 
      name: 'width', 
      value: 400
    },
    { name: 'showLegend', value: false },  // Bar charts typically don't need legend for single dataset
    { name: 'legendPosition', value: 'TOP' },
    { name: 'showTooltips', value: true },
    { name: 'showTooltipSum', value: false, help: 'Show sum total in tooltip footer' },
    { name: 'animate', value: true },
    { name: 'animationDuration', value: 1000 },
    {
      name: 'chart_',
      expression: function(groups, colors, timeUnit, horizontal, barThickness, datasetLabel, xAxisLabel, yAxisLabel, 
                          showGridLines, responsive, maintainAspectRatio, showLegend, 
                          legendPosition, showTooltips, showTooltipSum, animate, animationDuration) {
        
        var labels = [];
        var data = [];
        var backgroundColors = [];
        var borderColors = [];
        
        // Check if we're dealing with dates using the groupBy property
        var isDateAxis = this.arg1 && (foam.lang.Date.isInstance(this.arg1) || foam.lang.DateTime.isInstance(this.arg1));
        
        var index = 0;
        for ( var key in groups ) {
          if ( groups.hasOwnProperty(key) ) {
            // Use chartJsFormatter if available, otherwise use the key as-is
            var label = this.arg1 && this.arg1.chartJsFormatter ? 
                        this.arg1.chartJsFormatter(key) : key;
            labels.push(label);
            data.push(groups[key].value);
            
            // Color handling
            var color;
            if ( colors && colors.length > 0 ) {
              color = colors[index % colors.length];
            } else {
              color = foam.CSS.returnTokenValue('$primary200', this.cls_, this.__context__);
            }
            backgroundColors.push(color);
            // Safely create border color - if color contains '200', replace with '400', otherwise use the same color
            var borderColor = color;
            if ( typeof color === 'string' && color.includes('200') ) {
              borderColor = color.replace('200', '400');
            }
            borderColors.push(borderColor);
            index++;
          }
        }
        
        
        var chartData = {
          labels: labels,
          datasets: [{
            label: datasetLabel || 'Values',  // Use configurable label or default to 'Values'
            data: data,
            backgroundColor: backgroundColors,
            borderColor: borderColors,
            borderWidth: 1
            // Don't set barThickness if it's 0 or undefined, let Chart.js use defaults
          }]
        };
        
        var chartJSOptions = {
          responsive: responsive,
          maintainAspectRatio: maintainAspectRatio,
          indexAxis: horizontal ? 'y' : 'x',
          plugins: {
            legend: {
              display: showLegend,
              position: legendPosition ? legendPosition.toString().toLowerCase() : 'top'
            },
            tooltip: {
              enabled: showTooltips,
              callbacks: showTooltipSum ? {
                footer: function(tooltipItems) {
                  var sum = 0;
                  tooltipItems.forEach(function(tooltipItem) {
                    sum += tooltipItem.parsed.y || tooltipItem.parsed.x || 0;
                  });
                  return 'Sum: ' + sum.toLocaleString();
                }
              } : undefined
            }
          },
          animation: animate ? {
            duration: animationDuration
          } : false,
          scales: {
            x: {
              title: {
                display: !!xAxisLabel,
                text: xAxisLabel
              },
              grid: {
                display: showGridLines
              }
            },
            y: {
              title: {
                display: !!yAxisLabel,
                text: yAxisLabel
              },
              grid: {
                display: showGridLines
              }
            }
          }
        };
        
        // Configure time scale if dealing with date/time properties
        // Use the isDateAxis flag we set earlier when detecting date keys
        if ( isDateAxis ) {
          chartJSOptions.scales.x.type = 'time';
          chartJSOptions.scales.x.time = {
            unit: timeUnit.chartJsUnit || 'day',
            displayFormats: {}
          };
          
          // Set display format for the selected time unit
          if ( timeUnit.displayFormat ) {
            chartJSOptions.scales.x.time.displayFormats[timeUnit.chartJsUnit || 'day'] = timeUnit.displayFormat;
          }
          
          // Configure tooltip format
          if ( timeUnit.tooltipFormat ) {
            chartJSOptions.scales.x.time.tooltipFormat = timeUnit.tooltipFormat;
          }
        }
        
        var barChart = this.Bar2.create({
          data: chartData,
          chartJSOptions: chartJSOptions,
          width: this.width,
          height: this.height
        });
        
        
        return barChart;
      }
    }
  ],
  
  methods: [
    function toE(_, x) { 
      return x.E().add(this.chart_$);
    },
    function addToE(e) { 
      e.add(this.chart_$);
    }
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
    // GroupBy properties (inherited but exposed here for clarity)
    { name: 'groupLimit', value: 10, help: 'Limit number of slices (0 = no limit)' },
    { name: 'sortOrder', value: 'DESC', help: 'Sort order for slices' },
    { name: 'includeOthers', value: true, help: 'Include "Others" slice for remaining groups' },
    { name: 'othersLabel', value: 'Others', help: 'Label for the "Others" slice' },
    // Pie-specific properties
    { name: 'colors' },
    { name: 'showPercentages', value: false },
    { name: 'cutoutPercentage', value: 0 },
    { name: 'clockwise', value: true },
    { name: 'rotation', value: -90 },
    // Display properties
    { name: 'responsive', value: true },
    { name: 'maintainAspectRatio', value: false },
    { name: 'height', value: 300 },
    { 
      name: 'width', 
      factory: function() { 
        // Default to 0 which means auto-width (100% of container)
        // But when rendered in a canvas, we need a real width
        return 400; 
      }
    },    { name: 'showLegend', value: true },
    { name: 'legendPosition', value: 'TOP' },
    { name: 'showTooltips', value: true },
    { name: 'showTooltipSum', value: false, help: 'Show sum total in tooltip footer' },
    { name: 'animate', value: true },
    { name: 'animationDuration', value: 1000 },
    {
      name: 'chart_',
      expression: function(groups, colors, showPercentages, cutoutPercentage, clockwise, rotation,
                          responsive, maintainAspectRatio, showLegend, 
                          legendPosition, showTooltips, showTooltipSum, animate, animationDuration) {
        
        var labels = [];
        var data = [];
        var backgroundColors = [];
        
        var index = 0;
        for ( var key in groups ) {
          if ( groups.hasOwnProperty(key) ) {
            labels.push(key.toString());
            data.push(groups[key].value);
            
            // Generate colors
            if ( colors && colors.length > 0 ) {
              backgroundColors.push(colors[index % colors.length]);
            } else {
              // Default color generation
              var hue = (index / Math.max(1, Object.keys(groups).length - 1)) * 360;
              backgroundColors.push('hsl(' + hue + ', 70%, 50%)');
            }
            index++;
          }
        }
        
        
        var chartData = {
          labels: labels,
          datasets: [{
            data: data,
            backgroundColor: backgroundColors
          }]
        };
        
        var options = {
          responsive: responsive,
          maintainAspectRatio: maintainAspectRatio,
          cutout: cutoutPercentage + '%',
          rotation: rotation,
          circumference: clockwise ? 360 : -360,
          plugins: {
            legend: {
              display: showLegend,
              position: legendPosition ? legendPosition.toString().toLowerCase() : 'top'
            },
            tooltip: {
              enabled: showTooltips,
              callbacks: showTooltipSum ? {
                footer: function(tooltipItems) {
                  var sum = 0;
                  tooltipItems.forEach(function(tooltipItem) {
                    sum += tooltipItem.parsed || 0;
                  });
                  return 'Sum: ' + sum.toLocaleString();
                }
              } : undefined
            },
            datalabels: {
              display: true,
              color: 'white',
              font: {
                weight: 'bold'
              }
            }
          },
          animation: animate ? {
            duration: animationDuration,
            animateRotate: true,
            animateScale: true
          } : false
        };
        
        if ( showPercentages ) {
          options.plugins.legend.labels = {
            generateLabels: function(chart) {
              var dataset = chart.data.datasets[0];
              var total = dataset.data.reduce(function(sum, val) { return sum + val; }, 0);
              
              return chart.data.labels.map(function(label, i) {
                var percentage = total > 0 ? ((dataset.data[i] / total) * 100).toFixed(1) : '0.0';
                var style = chart.getDatasetMeta(0).controller ? 
                           chart.getDatasetMeta(0).controller.getStyle(i) : 
                           { backgroundColor: dataset.backgroundColor[i] };
                
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
          chartJSOptions: options,
          width: this.width,
          height: this.height
        });
      }
    }
  ],
  
  methods: [
    function toE(_, x) { 
      return x.E().add(this.chart_$);
    },
    function addToE(e) { 
      e.add(this.chart_$);
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
    // Stacked bar-specific properties
    { name: 'colors' },
    { name: 'timeUnit' },
    { name: 'horizontal', value: false },
    { name: 'xAxisLabel' },
    { name: 'yAxisLabel' },
    { name: 'showGridLines', value: true },
    // Display properties
    { name: 'responsive', value: true },
    { name: 'maintainAspectRatio', value: false },
    { name: 'height', value: 300 },
    { name: 'width', value: 400 },
    { name: 'showLegend', value: true },
    { name: 'legendPosition', value: 'TOP' },
    { name: 'showTooltips', value: true },
    { name: 'showTooltipSum', value: false, help: 'Show sum total in tooltip footer' },
    { name: 'animate', value: true },
    { name: 'animationDuration', value: 1000 },
    {
      name: 'chart_',
      expression: function(cols, rows, colors, timeUnit, horizontal, xAxisLabel, yAxisLabel,
                          showGridLines, responsive, maintainAspectRatio,
                          showLegend, legendPosition, showTooltips, showTooltipSum, animate, animationDuration) {
        var colGroups = cols && cols.groups ? cols.groups : {};
        var rowGroups = rows && rows.groups ? rows.groups : {};
        
        var labels = [];
        var datasets = [];
        
        // The GridBy creates a 2D structure:
        // cols.groups = x-axis categories  
        // rows.groups = stack groups (y-axis grouping)
        // Each intersection contains the aggregated value
        
        // Get the actual groups from the GroupBy objects
        var colGroups = cols && cols.groups ? cols.groups : {};
        var rowGroups = rows && rows.groups ? rows.groups : {};
        
        // Check if we're dealing with dates on x-axis using the xFunc property
        var isDateAxis = this.xFunc && (foam.lang.Date.isInstance(this.xFunc) || foam.lang.DateTime.isInstance(this.xFunc));
        
        // Extract labels from columns (x-axis categories)
        for ( var col in colGroups ) {
          if ( colGroups.hasOwnProperty(col) ) {
            // Use chartJsFormatter if available on xFunc, otherwise use the key as-is
            var label = this.xFunc && this.xFunc.chartJsFormatter ? 
                        this.xFunc.chartJsFormatter(col) : col;
            labels.push(label);
          }
        }
        
        // Build datasets - one for each row (stack group)
        var colorIndex = 0;
        for ( var rowKey in rowGroups ) {
          if ( rowGroups.hasOwnProperty(rowKey) ) {
            var data = [];
            var rowGroup = rowGroups[rowKey];
            
            // For each column, get the value for this row
            for ( var colKey in colGroups ) {
              if ( colGroups.hasOwnProperty(colKey) ) {
                // Access the value at [row][col] intersection
                var value = 0;
                // The row group should have its own groups property with column keys
                if ( rowGroup && rowGroup.groups && rowGroup.groups[colKey] ) {
                  // The value is stored in the accumulator's value property
                  value = rowGroup.groups[colKey].value || 0;
                }
                data.push(value);
              }
            }
            
            // Generate color for this dataset
            var color;
            if ( colors && colors.length > 0 ) {
              color = colors[colorIndex % colors.length];
            } else {
              var hue = (colorIndex / Math.max(1, Object.keys(rowGroups).length - 1)) * 360;
              color = 'hsl(' + hue + ', 70%, 50%)';
            }
            
            datasets.push({
              label: rowKey.toString(),
              data: data,
              backgroundColor: color,
              borderColor: typeof color === 'string' && color.includes('hsl') ? 
                          color.replace('50%', '40%') : color,
              borderWidth: 1
            });
            
            colorIndex++;
          }
        }
        
        
        var chartJSOptions = {
          responsive: responsive,
          maintainAspectRatio: maintainAspectRatio,
          indexAxis: horizontal ? 'y' : 'x',
          plugins: {
            legend: {
              display: showLegend,
              position: legendPosition ? legendPosition.toString().toLowerCase() : 'top'
            },
            tooltip: {
              enabled: showTooltips,
              mode: 'index',
              intersect: false,
              callbacks: showTooltipSum ? {
                footer: function(tooltipItems) {
                  var sum = 0;
                  tooltipItems.forEach(function(tooltipItem) {
                    sum += tooltipItem.parsed.y || 0;
                  });
                  return 'Sum: ' + sum.toLocaleString();
                }
              } : undefined
            },
            datalabels: {
              display: true,
              color: 'white',
              font: {
                weight: 'bold'
              }
            }
          },
          animation: animate ? {
            duration: animationDuration
          } : false,
          scales: {
            x: {
              stacked: true,
              title: {
                display: !!xAxisLabel,
                text: xAxisLabel
              },
              grid: {
                display: showGridLines
              }
            },
            y: {
              stacked: true,
              title: {
                display: !!yAxisLabel,
                text: yAxisLabel
              },
              grid: {
                display: showGridLines
              }
            }
          }
        };
        
        // Configure time scale if dealing with date/time properties
        // Check if xFunc is a date/time property
        var isTimeScale = this.xFunc && (foam.lang.Date.isInstance(this.xFunc) || foam.lang.DateTime.isInstance(this.xFunc));
        
        if ( isTimeScale && timeUnit ) {
          chartJSOptions.scales.x.type = 'time';
          chartJSOptions.scales.x.time = {
            unit: timeUnit.chartJsUnit || 'day',
            displayFormats: {}
          };
          
          // Set display format for the selected time unit
          if ( timeUnit.displayFormat ) {
            chartJSOptions.scales.x.time.displayFormats[timeUnit.chartJsUnit || 'day'] = timeUnit.displayFormat;
          }
          
          // Configure tooltip format
          if ( timeUnit.tooltipFormat ) {
            chartJSOptions.scales.x.time.tooltipFormat = timeUnit.tooltipFormat;
          }
        }
        
        return this.StackedBar2.create({
          data: {
            labels: labels,
            datasets: datasets
          },
          chartJSOptions: chartJSOptions,
          width: this.width,
          height: this.height
        });
      }
    }
  ],
  
  methods: [
    function toE(_, x) { 
      return x.E().add(this.chart_$);
    },
    function addToE(e) { 
      e.add(this.chart_$);
    }
  ]
});

foam.CLASS({
  package: 'foam.core.reflow.dashboard',
  name: 'DashboardLineSink',
  extends: 'foam.dao.ArraySink',
  
  requires: [
    'org.chartjs.Line2',
    'foam.mlang.sink.GroupBy'
  ],
  
  properties: [
    // Line-specific properties
    { name: 'xProp' },
    { name: 'yProp' },
    { name: 'groupBy' },
    { name: 'aggregationSink' },
    { name: 'timeUnit' },
    { name: 'colors' },
    { name: 'xAxisLabel' },
    { name: 'yAxisLabel' },
    { name: 'fill', value: false },
    { name: 'tension', value: 0.1 },
    { name: 'stepped', value: false },
    { name: 'showPoints', value: true },
    { name: 'pointRadius', value: 3 },
    { name: 'showGridLines', value: true },
    // Display properties
    { name: 'responsive', value: true },
    { name: 'maintainAspectRatio', value: false },
    { name: 'height', value: 300 },
    { 
      name: 'width', 
      factory: function() { 
        // Default to 0 which means auto-width (100% of container)
        // But when rendered in a canvas, we need a real width
        return 400; 
      }
    },    
    { name: 'showLegend', value: true },
    { name: 'legendPosition', value: 'TOP' },
    { name: 'showTooltips', value: true },
    { name: 'showTooltipSum', value: false, help: 'Show sum total in tooltip footer (for multiple lines)' },
    { name: 'animate', value: true },
    { name: 'animationDuration', value: 1000 },
    {
      name: 'chart_',
      expression: function(array, xProp, yProp, groupBy, aggregationSink, timeUnit, colors, xAxisLabel, yAxisLabel,
                          fill, tension, stepped, showPoints, pointRadius, showGridLines,
                          responsive, maintainAspectRatio, showLegend, legendPosition,
                          showTooltips, showTooltipSum, animate, animationDuration) {
        var self = this;
        var datasets = [];
        
        if ( !xProp || !yProp ) {
          return null;
        }
        
        if ( groupBy ) {
          // Group data for multiple lines
          var groups = {};
          array.forEach(function(obj) {
            var groupKey = obj[groupBy.name] || 'Default';
            if ( !groups[groupKey] ) {
              groups[groupKey] = [];
            }
            groups[groupKey].push(obj);
          });
          
          var colorIndex = 0;
          for ( var key in groups ) {
            if ( groups.hasOwnProperty(key) ) {
              var data = [];
              
              // If we have aggregationSink, group by X values and aggregate Y values
              if ( aggregationSink ) {
                // Group by X value within this line group
                var xGroups = {};
                groups[key].forEach(function(obj) {
                  var xVal = obj[xProp.name];
                  var yVal = obj[yProp.name];
                  
                  if ( xVal != null && yVal != null ) {
                    var xKey = xVal;
                    // For dates, use consistent key format
                    if ( foam.lang.Date.isInstance(xProp) || foam.lang.DateTime.isInstance(xProp) ) {
                      xKey = new Date(xVal).toISOString();
                    }
                    
                    if ( !xGroups[xKey] ) {
                      xGroups[xKey] = {
                        x: xVal,
                        sink: aggregationSink.createSink(yProp)
                      };
                    }
                    // Put the object into the sink for aggregation
                    xGroups[xKey].sink.put(obj);
                  }
                });
                
                // Extract aggregated values
                for ( var xKey in xGroups ) {
                  if ( xGroups.hasOwnProperty(xKey) ) {
                    var processedXVal = xGroups[xKey].x;
                    if ( foam.lang.Date.isInstance(xProp) || foam.lang.DateTime.isInstance(xProp) ) {
                      if ( typeof processedXVal === 'number' || typeof processedXVal === 'string' ) {
                        processedXVal = new Date(processedXVal);
                      }
                    } else if ( xProp.chartJsFormatter ) {
                      processedXVal = xProp.chartJsFormatter(processedXVal);
                    }
                    data.push({x: processedXVal, y: xGroups[xKey].sink.value});
                  }
                }
              } else {
                // No aggregation - use raw values
                groups[key].forEach(function(obj) {
                  var xVal = obj[xProp.name];
                  var yVal = obj[yProp.name];
                  
                  if ( xVal != null && yVal != null ) {
                    var processedXVal = xVal;
                    if ( foam.lang.Date.isInstance(xProp) || foam.lang.DateTime.isInstance(xProp) ) {
                      if ( typeof xVal === 'number' || typeof xVal === 'string' ) {
                        processedXVal = new Date(xVal);
                      }
                    } else if ( xProp.chartJsFormatter ) {
                      processedXVal = xProp.chartJsFormatter(xVal);
                    }
                    data.push({x: processedXVal, y: yVal});
                  }
                });
              }
              
              // Sort by X value
              data.sort(function(a, b) {
                // Handle Date objects
                if ( a.x instanceof Date && b.x instanceof Date ) {
                  return a.x.getTime() - b.x.getTime();
                }
                return parseFloat(a.x) - parseFloat(b.x);
              });
              
              var color;
              if ( colors && colors.length > 0 ) {
                color = colors[colorIndex % colors.length];
              } else {
                var hue = (colorIndex / Math.max(1, Object.keys(groups).length - 1)) * 360;
                color = 'hsl(' + hue + ', 70%, 50%)';
              }
              
              datasets.push({
                label: key,
                data: data,
                backgroundColor: fill ? color : 'transparent',
                borderColor: color,
                borderWidth: 2,
                fill: fill,
                tension: tension,
                stepped: stepped,
                pointRadius: showPoints ? pointRadius : 0,
                pointHoverRadius: showPoints ? pointRadius + 2 : 0
              });
              
              colorIndex++;
            }
          }
        } else {
          // Single line
          var data = [];
          array.forEach(function(obj) {
            var xVal = obj[xProp.name];
            var yVal = obj[yProp.name];
            
            if ( xVal != null && yVal != null ) {
              // For date/time properties, ensure we have a proper Date object or timestamp
              var processedXVal = xVal;
              if ( foam.core.Date.isInstance(xProp) || foam.core.DateTime.isInstance(xProp) ) {
                // Convert to Date object if it's a timestamp or string
                if ( typeof xVal === 'number' || typeof xVal === 'string' ) {
                  processedXVal = new Date(xVal);
                }
              } else if ( xProp.chartJsFormatter ) {
                processedXVal = xProp.chartJsFormatter(xVal);
              }
              data.push({x: processedXVal, y: yVal});
            }
          });
          
          // Sort by X value
          data.sort(function(a, b) {
            return parseFloat(a.x) - parseFloat(b.x);
          });
          
          var lineColor = colors && colors[0] ? colors[0] : 
                         foam.CSS.returnTokenValue('$green500', this.cls_, this.__context__);
          
          datasets.push({
            label: (yProp.label || yProp.name) + ' vs ' + (xProp.label || xProp.name),
            data: data,
            backgroundColor: fill ? lineColor : 'transparent',
            borderColor: lineColor,
            borderWidth: 2,
            fill: fill,
            tension: tension,
            stepped: stepped,
            pointRadius: showPoints ? pointRadius : 0,
            pointHoverRadius: showPoints ? pointRadius + 2 : 0
          });
        }
        
        // Check if xProp is a date/time type
        var isTimeScale = xProp && (foam.lang.Date.isInstance(xProp) || foam.lang.DateTime.isInstance(xProp));
        
        var chartJSOptions = {
          responsive: responsive,
          maintainAspectRatio: maintainAspectRatio,
          plugins: {
            legend: {
              display: showLegend && (datasets.length > 1 || showLegend),
              position: (legendPosition || 'TOP').toString().toLowerCase()            },
            tooltip: {
              enabled: showTooltips,
              mode: datasets.length > 1 ? 'index' : 'nearest',
              intersect: false,
              callbacks: showTooltipSum && datasets.length > 1 ? {
                footer: function(tooltipItems) {
                  var sum = 0;
                  tooltipItems.forEach(function(tooltipItem) {
                    sum += tooltipItem.parsed.y || 0;
                  });
                  return 'Sum: ' + sum.toLocaleString();
                }
              } : undefined
            }
          },
          animation: animate ? {
            duration: animationDuration
          } : false,
          scales: {
            x: {
              title: { 
                display: true, 
                text: xAxisLabel || (xProp ? xProp.label : '')
              },
              grid: {
                display: showGridLines
              }
            },
            y: {
              title: { 
                display: true, 
                text: yAxisLabel || (yProp ? yProp.label : '')
              },
              grid: {
                display: showGridLines
              }
            }
          }
        };
        
        // Configure time scale if dealing with date/time properties
        if ( isTimeScale && timeUnit ) {
          chartJSOptions.scales.x.type = 'time';
          chartJSOptions.scales.x.time = {
            unit: timeUnit.chartJsUnit || 'day',
            displayFormats: {}
          };
          
          // Set display format for the selected time unit
          if ( timeUnit.displayFormat ) {
            chartJSOptions.scales.x.time.displayFormats[timeUnit.chartJsUnit || 'day'] = timeUnit.displayFormat;
          }
          
          // Configure tooltip format
          if ( timeUnit.tooltipFormat ) {
            chartJSOptions.scales.x.time.tooltipFormat = timeUnit.tooltipFormat;
          }
        }
        
        return this.Line2.create({
          data: { datasets: datasets },
          chartJSOptions: chartJSOptions,
          width: this.width,
          height: this.height
        });
      }
    }
  ],
  
  methods: [
    function toE(_, x) { 
      if ( !this.chart_ ) return x.E().add('Please select X and Y properties');
      return x.E().add(this.chart_$);
    },
    function addToE(e) { 
      if ( !this.chart_ ) {
        e.add('Please select X and Y properties');
        return;
      }
      e.add(this.chart_$);
    }
  ]
});

foam.CLASS({
  package: 'foam.core.reflow.dashboard',
  name: 'DashboardMetricSink',
  extends: 'foam.dao.AbstractSink',
  
  requires: [
    'foam.mlang.sink.Count'
  ],
  
  properties: [
    { name: 'operation' },
    { name: 'prop' },
    { name: 'label', value: 'Metric' },
    { name: 'showCount', value: true },
    { name: 'valueColor' },
    { name: 'unit' },
    { name: 'decimalPlaces', value: 0 },
    { name: 'metricSink_', hidden: true },
    { name: 'countSink_', hidden: true },
    {
      name: 'metric_',
      expression: function(metricSink_, countSink_, label, showCount, valueColor, unit, decimalPlaces) {
        var value = metricSink_ ? metricSink_.value : 0;
        var count = countSink_ ? countSink_.value : null;
        
        // Format value with decimal places
        if ( typeof value === 'number' ) {
          value = value.toFixed(decimalPlaces);
          if ( decimalPlaces === 0 ) {
            value = parseInt(value).toLocaleString();
          } else {
            value = parseFloat(value).toLocaleString(undefined, {
              minimumFractionDigits: decimalPlaces,
              maximumFractionDigits: decimalPlaces
            });
          }
        }
        
        // Add unit if specified
        if ( unit ) {
          value = unit.startsWith(' ') || unit.endsWith(' ') ? 
                  value + unit : value + ' ' + unit;
        }
        
        var displayLabel = label || 
                          (this.prop ? this.operation.label + ' of ' + this.prop.label : this.operation.label);
        
        return {
          label: displayLabel,
          value: value,
          count: count,
          showCount: showCount,
          valueColor: valueColor || foam.CSS.returnTokenValue('$primary500', this.cls_, this.__context__)
        };
      }
    }
  ],
  
  methods: [
    function init() {
      this.SUPER();
      
      if ( this.operation ) {
        this.metricSink_ = this.operation.createSink(this.prop);
      }
      
      // Always create count sink to track number of records
      this.countSink_ = this.Count.create();
    },
    
    function put(obj, sub) {
      if ( this.metricSink_ ) {
        this.metricSink_.put(obj, sub);
      }
      if ( this.countSink_ ) {
        this.countSink_.put(obj, sub);
      }
    },
    
    function toE(_, x) {
      var self = this;
      return x.E().add(this.metric_$.map(function(metric) {
        var e = foam.u2.Element.create();
        
        
        // Label
        e.start('div')
          .style({
            fontSize: '0.875rem',
            color: foam.CSS.returnTokenValue('$textSecondary', self.cls_, self.__context__),
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontWeight: 'medium',
            marginBottom: '8px'
          })
          .add(metric.label)
        .end();
        
        // Value
        e.start('div')
          .style({
            fontSize: '3rem',
            fontWeight: 'bold',
            color: metric.valueColor,
            lineHeight: '1'
          })
          .add(metric.value)
        .end();
        
        // Count - show how many records were processed
        if ( metric.showCount && metric.count !== null ) {
          e.start('div')
            .style({
              fontSize: '0.75rem',
              marginTop: '8px',
              color: foam.CSS.returnTokenValue('$textSecondary', self.cls_, self.__context__),
              fontWeight: 'normal'
            })
            .add('from ' + metric.count.toLocaleString() + ' records')
          .end();
        }
        
        e.end();
        return e;
      }));
    },
    
    function addToE(e) {
      var self = this;
      e.add(this.metric_$.map(function(metric) {
        var container = foam.u2.Element.create();
        
    
        
        // Label
        container.start('div')
          .style({
            fontSize: '0.875rem',
            color: foam.CSS.returnTokenValue('$textSecondary', self.cls_, self.__context__),
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontWeight: 'medium',
            marginBottom: '8px'
          })
          .add(metric.label)
        .end();
        
        // Value
        container.start('div')
          .style({
            fontSize: '3rem',
            fontWeight: 'bold',
            color: metric.valueColor,
            lineHeight: '1'
          })
          .add(metric.value)
        .end();
        
        // Count - show how many records were processed
        if ( metric.showCount && metric.count !== null ) {
          container.start('div')
            .style({
              fontSize: '0.75rem',
              marginTop: '8px',
              color: foam.CSS.returnTokenValue('$textSecondary', self.cls_, self.__context__),
              fontWeight: 'normal'
            })
            .add('from ' + metric.count.toLocaleString() + ' records')
          .end();
        }
        
        container.end();
        return container;
      }));
    },
    
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