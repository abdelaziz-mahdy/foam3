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
  name: 'ColorMappingMixin',
  
  documentation: 'Mixin providing centralized color management for charts with user control over color mappings',
  
  properties: [
    {
      class: 'StringArray',
      of: 'Color',
      name: 'colors',
      label: 'Chart Colors',
      view: {
        class: 'foam.u2.view.ArrayView',
        valueView: 'foam.u2.view.ColorEditView'
      }
    }
  ],
  
  methods: [
    function getColorForCategory(categoryKey, colorIndex) {
      // Use the color from the array based on index
      if ( this.colors && this.colors.length > 0 ) {
        var colorObj = this.colors[colorIndex % this.colors.length];
        // foam.lang.Color automatically handles token resolution
        return colorObj;
      }
      
      // Fallback if no colors defined
      var defaultTokens = ['$green500', '$blue500', '$red500', '$yellow500'];
      return foam.CSS.returnTokenValue(defaultTokens[colorIndex % defaultTokens.length], this.cls_, this.__context__);
    },
    
    function addColorMappingToE(e) {
      // Helper method to add color controls to UI
      e.startContext({data: this}).
        add('Chart Colors: ', this.COLORS).
      endContext();
    }
  ]
});

foam.CLASS({
  package: 'foam.core.reflow.dashboard',
  name: 'DirectChartMixin',
  
  documentation: 'Mixin providing direct Chart.js integration for DAO agents',
  
  requires: [
    'org.chartjs.Bar2',
    'org.chartjs.Pie2', 
    'org.chartjs.Line2',
    'org.chartjs.Donut2',
    'org.chartjs.StackedBar2',
    'foam.mlang.sink.GroupBy',
    'foam.mlang.sink.GroupBySortOrder'
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
      
      // Create the chart first to get its default options
      var chart = ChartClass.create({
        data: chartData
      }, e.__subContext__);
      
      // Get the chart's existing options (preserves stacking config for StackedBar2)
      var existingOptions = chart.chartJSOptions || {};
      
      // Merge with default responsive settings and any additional config
      var chartJSOptions = {
        responsive: true,
        maintainAspectRatio: false,
        ...existingOptions  // Preserve chart's built-in options (like stacking)
      };
      
      if (config && config.options) {
        chartJSOptions = {...chartJSOptions, ...config.options};
      }
      
      // Apply the merged options back to the chart
      chart.chartJSOptions = chartJSOptions;
      // Debug logging (remove in production)
      // console.log('Chart.js config:', { type: chartType, data: chartData, options: chart.chartJSOptions });
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
      
      // Create Chart.js dataset with basic structure
      var dataset = {
        label: propLabel || 'Count',
        data: data
      };
      
      // Let the agent configure its own styling
      if ( this.configureDatasetStyling ) {
        this.configureDatasetStyling(dataset, labels, chartType);
      }
      
      return {
        labels: labels,
        datasets: [dataset]
      };
    },
    
    function createLimitedGroupBy(groupBy, sink, topN, sortDescending, includeOthers) {
      // Create GroupBy with unified groupLimit functionality
      var sortOrder = this.GroupBySortOrder.NONE;
      if ( topN > 0 ) {
        sortOrder = sortDescending ? this.GroupBySortOrder.DESC : this.GroupBySortOrder.ASC;
      }
      
      return this.GroupBy.create({
        arg1: groupBy,
        arg2: sink,
        groupLimit: topN > 0 ? topN : -1,
        sortOrder: sortOrder,
        includeOthers: includeOthers
      });
    },
    
    function convertLimitedGroupsToChartData(groups, propLabel, chartType) {
      var data = [];
      var labels = [];
      
      // Extract data from groups object (with built-in groupLimit functionality)
      for ( var key in groups ) {
        if ( groups.hasOwnProperty(key) ) {
          labels.push(key.toString());
          data.push(groups[key].value);
        }
      }
      
      // Create Chart.js dataset with basic structure
      var dataset = {
        label: propLabel || 'Count',
        data: data
      };
      
      // Let the agent configure its own styling
      if ( this.configureDatasetStyling ) {
        this.configureDatasetStyling(dataset, labels, chartType);
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
  name: 'CardRenderMixin',
  
  documentation: 'Mixin providing reusable card/tile rendering functionality for metrics and widgets',
  
  properties: [
    {
      class: 'Boolean',
      name: 'renderAsCard',
      label: 'Render as Card',
      value: true,
      help: 'If true, renders content in a styled card/tile. If false, renders simple display.'
    }
  ],
  
  methods: [
    function renderCardWrapper(e, contentRenderer, options) {
      // Helper method to render content either as card or simple display
      options = options || {};
      
      if ( this.renderAsCard ) {
        this.renderAsCardTile(e, contentRenderer, options);
      } else {
        this.renderAsSimpleDisplay(e, contentRenderer, options);
      }
    },
    
    function renderAsCardTile(e, contentRenderer, options) {
      var self = this;
      var cardE = e.start('div')
        .style({
          backgroundColor: foam.CSS.returnTokenValue('$backgroundPrimary', this.cls_, this.__context__),
          border: '1px solid ' + foam.CSS.returnTokenValue('$borderLight', this.cls_, this.__context__),
          borderRadius: foam.CSS.returnTokenValue('$inputBorderRadius', this.cls_, this.__context__),
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
          transition: 'all 0.2s ease',
          cursor: options.clickable ? 'pointer' : 'default',
          minHeight: '140px',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden'
        })
        .on('mouseenter', function() {
          if ( options.clickable ) {
            this.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)';
            this.style.transform = 'translateY(-1px)';
          }
        })
        .on('mouseleave', function() {
          if ( options.clickable ) {
            this.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)';
            this.style.transform = 'translateY(0)';
          }
        });
        
      // Card content container
      var contentE = cardE.start('div')
        .style({
          flex: '1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center'
        });
        
      // Call the content renderer with the content container
      contentRenderer.call(this, contentE);
      
      contentE.end(); // content div
      cardE.end(); // card div
    },
    
    function renderAsSimpleDisplay(e, contentRenderer, options) {
      // Simple display without card styling
      contentRenderer.call(this, e);
    },
    
    function renderMetricValue(e, label, value, options) {
      // Helper specifically for metric values
      options = options || {};
      
      var self = this;
      this.renderCardWrapper(e, function(contentE) {
        var container = contentE.start('div')
          .style({
            width: '100%',
            padding: self.renderAsCard ? '0' : '20px'
          });
          
        // Label display (above the number)
        container.start('div')
          .style({
            fontSize: self.renderAsCard ? '0.875rem' : '1rem',
            color: foam.CSS.returnTokenValue('$textSecondary', this.cls_, this.__context__),
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontWeight: foam.CSS.returnTokenValue('$font-medium', this.cls_, this.__context__),
            marginBottom: '8px'
          })
          .add(label)
        .end();
        
        // Value display (below the label)
        container.start('div')
          .style({
            fontSize: self.renderAsCard ? '3rem' : '2.5rem',
            fontWeight: foam.CSS.returnTokenValue('$font-bold', this.cls_, this.__context__),
            color: options.valueColor || foam.CSS.returnTokenValue('$primary500', this.cls_, this.__context__),
            lineHeight: '1',
            letterSpacing: '-0.025em'
          })
          .add(typeof value === 'number' ? value.toLocaleString() : value)
        .end();
        
        container.end(); // container div
      }, options);
    }
  ]
});

foam.CLASS({
  package: 'foam.core.reflow.dashboard', 
  name: 'LimitedGroupByMixin',
  
  documentation: 'Mixin providing top/bottom N group limitation with Others category support',
  
  properties: [
    {
      class: 'Int',
      name: 'topN',
      label: 'Top N Results',
      value: 0,
      help: 'Limit results to top N groups (0 for no limit)'
    },
    {
      class: 'Boolean',
      name: 'sortDescending',
      label: 'Sort Descending',
      value: true,
      help: 'If true, show top values (highest first). If false, show bottom values (lowest first).',
      visibility: function(topN) {
        return topN > 0 ? 'RW' : 'HIDDEN';
      }
    },
    {
      class: 'Boolean',
      name: 'includeOthers',
      label: 'Include Others',
      value: false,
      help: 'If true, includes an "Others" category aggregating remaining groups',
      visibility: function(topN) {
        return topN > 0 ? 'RW' : 'HIDDEN';
      }
    }
  ],
  
  methods: [
    function createGroupBySinkWithLimits(groupByProp, valueSink) {
      // Create GroupBy with unified groupLimit functionality
      var sortOrder = this.GroupBySortOrder.NONE;
      if ( this.topN > 0 ) {
        sortOrder = this.sortDescending ? this.GroupBySortOrder.DESC : this.GroupBySortOrder.ASC;
      }
      
      return this.GroupBy.create({
        arg1: groupByProp,
        arg2: valueSink,
        groupLimit: this.topN > 0 ? this.topN : -1,
        sortOrder: sortOrder,
        includeOthers: this.includeOthers
      });
    },
    
    function extractGroupsFromResult(groupByResult) {
      // Extract groups from GroupBy result (groupLimit functionality is built-in)
      return groupByResult.groups;
    },
    
    function addLimitPropertiesToE(e, prefix) {
      // Helper method to add limit properties to UI
      prefix = prefix || '';
      e.add(prefix + 'Top N: ', this.TOP_N);
      e.add(prefix + 'Sort Descending: ', this.SORT_DESCENDING);  
      e.add(prefix + 'Include Others: ', this.INCLUDE_OTHERS);
    }
  ]
});


foam.CLASS({
  package: 'foam.core.reflow.dashboard',
  name: 'DashboardBarChartDAOAgent',
  extends: 'foam.core.reflow.AbstractSinkDAOAgent',
  mixins: [
    'foam.core.reflow.dashboard.DirectChartMixin',
    'foam.core.reflow.dashboard.LimitedGroupByMixin'
  ],

  requires: [
    'foam.mlang.sink.GroupBy',
    'foam.mlang.sink.GroupBySortOrder',
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
    async function execute(e) {
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
      var groupBySink = this.createGroupBySinkWithLimits(this.groupBy, sink);
      
      var groupByResult = await this.dao.select(groupBySink);
      var groups = this.extractGroupsFromResult(groupByResult);
      var chartData = this.convertLimitedGroupsToChartData(groups, this.getDisplayLabel(), 'bar');
      this.renderDirectChart(e, 'bar', chartData, null, this.block);
    },
    
    function getDisplayLabel() {
      if ( this.operation === 'COUNT' ) {
        return this.groupBy.label + ' Count';
      }
      return this.operation.label + ' of ' + (this.valueProp ? this.valueProp.label : 'Value') + ' by ' + this.groupBy.label;
    },
    
    function configureDatasetStyling(dataset, labels, chartType) {
      // Bar chart specific styling
      dataset.backgroundColor = foam.CSS.returnTokenValue('$primary200', this.cls_, this.__context__);
      dataset.borderColor = foam.CSS.returnTokenValue('$primary400', this.cls_, this.__context__);
      dataset.borderWidth = 1;
    },
    
    function addToE(e) {
      e.startContext({data: this}).
        start().
          style({display: 'flex', gap: '10px', flexWrap: 'wrap'}).
          add('Group By: ', this.GROUP_BY).
          add('Operation: ', this.OPERATION).
          add('Value Property: ', this.VALUE_PROP);
          
      // Add limit properties using mixin helper
      this.addLimitPropertiesToE(e.start(), '');
      
      e.end().
      endContext();
    }
  ]
});

foam.CLASS({
  package: 'foam.core.reflow.dashboard',
  name: 'DashboardStackedBarChartDAOAgent',
  extends: 'foam.core.reflow.AbstractSinkDAOAgent',
  mixins: [
    'foam.core.reflow.dashboard.DirectChartMixin',
    'foam.core.reflow.dashboard.LimitedGroupByMixin',
    'foam.core.reflow.dashboard.ColorMappingMixin'
  ],

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
      name: 'stackBy',
      label: 'Stack By',
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
    async function execute(e) {
      if ( ! this.xGroupBy || ! this.stackBy ) {
        e.start('div').
          style({padding: '20px', textAlign: 'center', color: foam.CSS.returnTokenValue('$textTertiary', this.cls_, this.__context__)}).
          add('Please select both X Group By and Stack By properties').
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
      var outerGroupBy = await this.dao.select(this.GroupBy.create({
        arg1: this.xGroupBy,
        arg2: this.GroupBy.create({
          arg1: this.stackBy,
          arg2: sink
        })
      }));
      var chartData = this.convertToStackedChartData(outerGroupBy);
      this.renderDirectChart(e, 'stackedbar', chartData, null, this.block);
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
      
      for ( var stackValue in stackGroups ) {
        if ( stackGroups.hasOwnProperty(stackValue) ) {
          var data = [];
          
          // Fill data array for each category
          labels.forEach(function(category) {
            data.push(stackGroups[stackValue][category] || 0);
          });
          
          var color = this.getColorForCategory(stackValue, colorIndex);
          var borderColor = color.replace('500', '600'); // Darker border for 500 colors
          
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
          add('Stack By: ', this.STACK_BY).
          add('Operation: ', this.OPERATION).
          add('Value Property: ', this.VALUE_PROP);
      
      // Add color mapping controls for stack categories
      this.addColorMappingToE(e.start());
      
      e.end().
      endContext();
    }
  ]
});

foam.CLASS({
  package: 'foam.core.reflow.dashboard',
  name: 'DashboardPieChartDAOAgent',
  extends: 'foam.core.reflow.dashboard.DashboardBarChartDAOAgent',
  mixins: ['foam.core.reflow.dashboard.ColorMappingMixin'],

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
    async function execute(e) {
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
      
      // Group data by property with limits and render pie chart
      var groupBySink = this.createGroupBySinkWithLimits(this.groupBy, sink);
      
      var groupByResult = await this.dao.select(groupBySink);
      var groups = this.extractGroupsFromResult(groupByResult);
      var chartData = this.convertLimitedGroupsToChartData(groups, this.getDisplayLabel(), 'pie');
      var config = this.createPieConfig();
      this.renderDirectChart(e, 'pie', chartData, config, this.block);
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
    
    function configureDatasetStyling(dataset, labels, chartType) {
      // Pie/Donut chart specific styling using ColorMappingMixin
      var colors = [];
      for ( var i = 0; i < labels.length; i++ ) {
        colors.push(this.getColorForCategory(labels[i], i));
      }
      dataset.backgroundColor = colors;
    },

    function addToE(e) {
      e.startContext({data: this}).
        start().
          style({display: 'flex', gap: '10px', flexWrap: 'wrap'}).
          add('Group By: ', this.GROUP_BY).
          add('Operation: ', this.OPERATION).
          add('Value Property: ', this.VALUE_PROP).
          add('Show Percentages: ', this.SHOW_PERCENTAGES).
          add('Label Position: ', this.LABEL_POSITION);
          
      // Add limit properties using mixin helper  
      this.addLimitPropertiesToE(e.start(), '');
      
      // Add color mapping controls for pie slices
      this.addColorMappingToE(e.start());
      
      e.end().
      endContext();
    }
  ]
});


foam.CLASS({
  package: 'foam.core.reflow.dashboard',
  name: 'DashboardDonutChartDAOAgent',
  extends: 'foam.core.reflow.dashboard.DashboardPieChartDAOAgent',

  methods: [
    async function execute(e) {
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
      
      // Group data by property with limits and render donut chart
      var groupBySink = this.createGroupBySinkWithLimits(this.groupBy, sink);
      
      var groupByResult = await this.dao.select(groupBySink);
      var groups = this.extractGroupsFromResult(groupByResult);
      var chartData = this.convertLimitedGroupsToChartData(groups, this.getDisplayLabel(), 'donut');
      var config = this.createPieConfig(); // Reuse pie config method
      this.renderDirectChart(e, 'donut', chartData, config, this.block);
    }
  ]
});

foam.CLASS({
  package: 'foam.core.reflow.dashboard',
  name: 'DashboardLineChartDAOAgent',
  extends: 'foam.core.reflow.AbstractSinkDAOAgent',
  mixins: [
    'foam.core.reflow.dashboard.DirectChartMixin',
    'foam.core.reflow.dashboard.ColorMappingMixin'
  ],

  requires: [
    'foam.mlang.sink.GroupBy',
    'foam.mlang.sink.Count',
    'foam.mlang.sink.Sum',
    'foam.mlang.sink.Min',
    'foam.mlang.sink.Max',
    'foam.mlang.sink.Average',
    'foam.dao.ArraySink',
    'org.chartjs.Lib',
    'foam.core.reflow.dashboard.TimeUnit',
    'foam.core.reflow.dashboard.MetricOperation'
  ],

  properties: [
    {
      name: 'xProp',
      label: 'X Property',
      view: function(_, X) {
        return { 
          class: 'foam.core.reflow.PropertyChoiceView', 
          forCls: X.data.dao.of
        };
      }
    },
    {
      name: 'yProp', 
      label: 'Y Property',
      view: function(_, X) {
        return { 
          class: 'foam.core.reflow.PropertyChoiceView', 
          forCls: X.data.dao.of
        };
      }
    },
    {
      name: 'groupBy',
      label: 'Group By (for multiple lines)',
      help: 'Optional: Group data by this property to create multiple lines, one for each category',
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
      label: 'Y-Axis Operation',
      value: 'COUNT',
      help: 'Operation to apply when grouping data points with same X value',
      visibility: function(groupBy) {
        return groupBy ? 'RW' : 'HIDDEN';
      }
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
      visibility: function(operation, groupBy) {
        return groupBy && operation !== 'COUNT' ? 'RW' : 'HIDDEN';
      }
    },
    {
      class: 'Enum',
      of: 'foam.core.reflow.dashboard.TimeUnit',
      name: 'timeUnit',
      label: 'Time Unit',
      value: 'DAY',
      help: 'Time unit for X-axis when using date/time properties',
      visibility: function(xProp) {
        return xProp && (foam.core.Date.isInstance(xProp) || foam.core.DateTime.isInstance(xProp)) ? 'RW' : 'HIDDEN';
      }
    }
  ],

  methods: [
    async function execute(e) {
      if ( ! this.xProp || ! this.yProp ) {
        e.start('div').
          style({padding: '20px', textAlign: 'center', color: foam.CSS.returnTokenValue('$textTertiary', this.cls_, this.__context__)}).
          add('Please select both X and Y properties').
        end();
        return;
      }
      
      var chartData;
      
      if ( this.groupBy ) {
        // Multiline chart: group data by the groupBy property with operations
        if ( this.operation !== 'COUNT' && ! this.valueProp ) {
          e.start('div').
            style({padding: '20px', textAlign: 'center', color: foam.CSS.returnTokenValue('$textTertiary', this.cls_, this.__context__)}).
            add('Please select a Value property for ' + this.operation.label + ' operation').
          end();
          return;
        }
        chartData = await this.createMultilineChartData();
      } else {
        // Single line chart: original behavior
        var arraySink = await this.dao.select();
        chartData = this.convertRecordsToLineChart(arraySink.array);
      }
      
      // Configure Chart.js options with proper date handling
      var isXAxisDate = this.xProp.chartJsFormatter && 
                       (foam.lang.Date.isInstance(this.xProp) || 
                        foam.lang.DateTime.isInstance(this.xProp));
      
      var options = {
        scales: {
          x: {
            type:  isXAxisDate ? 'time' : 'linear',
            title: { display: true, text: this.xProp.label }
          },
          y: {
            title: { display: true, text: this.yProp.label }
          }
        },
        plugins: { legend: { display: true } }
      };
      
      // Add time scale configuration for date axes
      if (isXAxisDate) {
        var timeUnitValue = this.TimeUnit[this.timeUnit];
        options.scales.x.time = {
          unit: timeUnitValue.chartJsUnit,
          displayFormats: {},
          tooltipFormat: timeUnitValue.tooltipFormat
        };
        
        // Set the display format for the selected unit
        options.scales.x.time.displayFormats[timeUnitValue.chartJsUnit] = timeUnitValue.displayFormat;
        
        // Enable time parsing with proper locale
        options.adapters = {
          date: {
            locale: 'en-US' // Default locale, can be customized
          }
        };
      }
      this.renderDirectChart(e, 'line', chartData, {options: options}, this.block);
    },
    
    async function createMultilineChartData() {
      // Check if operation requires a value property
      if ( this.operation !== 'COUNT' && ! this.valueProp ) {
        return { datasets: [] }; // Empty dataset if configuration is incomplete
      }
      
      // Create appropriate sink based on operation
      var valueSink = this.operation.createSink(this.valueProp);
      
      // Group by category first, then within each category group by X property
      var categoryGroupBy = this.GroupBy.create({
        arg1: this.groupBy,
        arg2: this.GroupBy.create({
          arg1: this.xProp,
          arg2: valueSink
        })
      });
      
      var groupByResult = await this.dao.select(categoryGroupBy);
      var datasets = [];
      var colorIndex = 0;
      
      // Create a dataset for each category
      for ( var categoryKey in groupByResult.groups ) {
        if ( groupByResult.groups.hasOwnProperty(categoryKey) ) {
          var xGroupByResult = groupByResult.groups[categoryKey];
          var lineData = this.convertGroupByToLineData(xGroupByResult);
          
          if ( lineData.length > 0 ) {
            var color = this.getColorForCategory(categoryKey, colorIndex);
            
            datasets.push({
              label: categoryKey.toString(),
              data: lineData,
              backgroundColor: color + '20', // Add some transparency
              borderColor: color,
              borderWidth: 2,
              fill: false,
              tension: 0.1,
              pointBackgroundColor: color,
              pointBorderColor: color,
              pointRadius: 3,
              pointHoverRadius: 5
            });
            
            colorIndex++;
          }
        }
      }
      
      return {
        datasets: datasets
      };
    },
    
    function convertGroupByToLineData(xGroupByResult) {
      var data = [];
      var self = this;
      
      // Check if X-axis property has FOAM3 date formatting
      var isXAxisDate = self.xProp.chartJsFormatter && 
                       (foam.lang.Date.isInstance(self.xProp) || 
                        foam.lang.DateTime.isInstance(self.xProp));
      
      // Convert GroupBy result to {x, y} points
      for ( var xKey in xGroupByResult.groups ) {
        if ( xGroupByResult.groups.hasOwnProperty(xKey) ) {
          var xVal = xKey;
          var yVal = xGroupByResult.groups[xKey].value;
          
          if ( xVal != null && yVal != null ) {
            // Use FOAM3 chartJsFormatter for proper date conversion
            var processedXVal = self.xProp.chartJsFormatter ? 
                               self.xProp.chartJsFormatter(xVal) : xVal;
            
            // For linear scales, ensure x values are numbers, not formatted strings
            if ( !isXAxisDate && typeof processedXVal === 'string' ) {
              // Remove commas and convert to number for linear scales
              processedXVal = parseFloat(processedXVal.replace(/,/g, ''));
            }
            
            data.push({x: processedXVal, y: yVal});
          }
        }
      }
      
      // Sort by X value for proper line connection
      data.sort(function(a, b) {
        // Handle date comparison if needed
        if (isXAxisDate) {
          return new Date(a.x) - new Date(b.x);
        }
        // Ensure numeric comparison for linear scales
        return parseFloat(a.x) - parseFloat(b.x);
      });
      
      return data;
    },
    
    function convertRecordsToLineData(records) {
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
          
          // For linear scales, ensure x values are numbers, not formatted strings
          if ( !isXAxisDate && typeof processedXVal === 'string' ) {
            // Remove commas and convert to number for linear scales
            processedXVal = parseFloat(processedXVal.replace(/,/g, ''));
          }
          
          data.push({x: processedXVal, y: yVal});
        }
      });
      
      // Sort by X value for proper line connection
      data.sort(function(a, b) {
        // Handle date comparison if needed
        if (isXAxisDate) {
          return new Date(a.x) - new Date(b.x);
        }
        // Ensure numeric comparison for linear scales
        return parseFloat(a.x) - parseFloat(b.x);
      });
      
      return data;
    },
    
    function convertRecordsToLineChart(records) {
      // Use the new helper method for consistency
      var data = this.convertRecordsToLineData(records);
      
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
    
    function configureDatasetStyling(dataset, labels, chartType) {
      // Line chart specific styling
      dataset.backgroundColor = foam.CSS.returnTokenValue('$green100', this.cls_, this.__context__);
      dataset.borderColor = foam.CSS.returnTokenValue('$green500', this.cls_, this.__context__);
      dataset.borderWidth = 2;
      dataset.fill = false;
      dataset.tension = 0.1;
    },
    
    function addToE(e) {
      e.startContext({data: this}).
        start().
          style({display: 'flex', gap: '10px', flexWrap: 'wrap'}).
          add('X Property: ', this.X_PROP).
          add('Y Property: ', this.Y_PROP).
          add('Group By: ', this.GROUP_BY).
          add('Y-Axis Operation: ', this.OPERATION).
          add('Value Property: ', this.VALUE_PROP).
          add('Time Unit: ', this.TIME_UNIT);
          
      // Add color mapping controls when groupBy is set  
      if ( this.groupBy ) {
        this.addColorMappingToE(e.start());
      }
      
      e.end().
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
    },
    {
      class: 'Boolean',
      name: 'showCount',
      label: 'Show Count',
      value: false,
      help: 'Display the record count next to the metric value'
    }
  ],

  methods: [
    async function execute(e) {
      if (this.operation !== 'COUNT' && !this.prop) {
        this.showPropertyRequiredMessage(e);
        return;
      }

      var sink = this.operation.createSink(this.prop);
      var result = await this.dao.select(sink);
      
      // Get count if showCount is enabled
      var count = null;
      if ( this.showCount && this.operation !== 'COUNT' ) {
        var countResult = await this.dao.select(this.Count.create());
        count = countResult.value;
      }
      
      // Label display
      e.start('div')
        .add(this.getDisplayLabel())
      .end();
      
      // Value display
      e.start('div')
        .add(typeof result.value === 'number' ? result.value.toLocaleString() : result.value)
      .end();
      
      // Add count below value in smaller font if enabled
      if ( this.showCount ) {
        if ( this.operation === 'COUNT' ) {
          // For COUNT operation, don't show count again
        } else if ( count !== null ) {
          e.start('div')
            .style({
              fontSize: '0.75em',
              marginTop: '4px',
              color: foam.CSS.returnTokenValue('$textSecondary', this.cls_, this.__context__),
              fontWeight: 'normal'
            })
            .add(count.toLocaleString() + ' records')
          .end();
        }
      }

      if (this.block) {
        if (this.block.value) {
          this.block.value.value = result.value;
        } else {
          this.block.value = result.value;
        }
      }
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
          add('Show Count: ', this.SHOW_COUNT).
        end().
      endContext();
    }
  ]
});
