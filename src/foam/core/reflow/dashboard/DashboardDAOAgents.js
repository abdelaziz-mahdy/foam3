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
  name: 'DashboardBarChartDAOAgent',
  extends: 'foam.core.reflow.GroupByDAOAgent',

  requires: [
    'foam.core.reflow.dashboard.DashboardBarSink',
    'foam.core.reflow.dashboard.MetricOperation'
  ],

  properties: [
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
          forCls: X.data.of
        };
      },
      visibility: function(operation) {
        return operation !== 'COUNT' ? 'RW' : 'HIDDEN';
      }
    }
  ],

  methods: [
    function createSink() {
      // Return the dashboard bar chart sink directly, which extends GroupBy
      var valueSink = this.operation.createSink(this.valueProp);
      return this.DashboardBarSink.create({
        arg1: this.prop,
        arg2: valueSink
      });
    },
    
    function addToE(e) {
      e.startContext({data: this}).start().style({display: 'flex'}).
        add('Op:', this.OPERATION, ' Prop:', this.VALUE_PROP);
    },
  ]
});

foam.CLASS({
  package: 'foam.core.reflow.dashboard',
  name: 'DashboardStackedBarChartDAOAgent',
  extends: 'foam.core.reflow.GridByDAOAgent',
  mixins: [
    'foam.core.reflow.dashboard.ColorMappingMixin'
  ],

  requires: [
    'foam.core.reflow.dashboard.DashboardStackedBarSink',
    'foam.core.reflow.dashboard.MetricOperation'
  ],

  properties: [
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
          forCls: X.data.of
        };
      },
      visibility: function(operation) {
        return operation !== 'COUNT' ? 'RW' : 'HIDDEN';
      }
    }
  ],

  methods: [
    function createSink() {
      var valueSink = this.operation.createSink(this.valueProp);
      
      return this.DashboardStackedBarSink.create({
        yFunc: this.prop1,  // Use inherited prop1 from GridByDAOAgent
        xFunc: this.prop2,  // Use inherited prop2 from GridByDAOAgent
        acc: valueSink,
        colors: this.colors
      });
    },
    
    function addToE(e) {
      e.startContext({data: this}).start().style({display: 'flex'})
        .add('Op:', this.OPERATION, ' Prop:', this.VALUE_PROP);
    }
  ]
});

foam.CLASS({
  package: 'foam.core.reflow.dashboard',
  name: 'DashboardPieChartDAOAgent',
  extends: 'foam.core.reflow.dashboard.DashboardBarChartDAOAgent',
  mixins: ['foam.core.reflow.dashboard.ColorMappingMixin'],

  requires: [
    'foam.core.reflow.dashboard.DashboardPieSink'
  ],

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
    function createSink() {
      // Return the dashboard pie chart sink directly
      var valueSink = this.operation.createSink(this.valueProp);
      return this.DashboardPieSink.create({
        arg1: this.prop,
        arg2: valueSink,
        showPercentages: this.showPercentages,
        labelPosition: this.labelPosition,
        colors: this.colors
      });
    },
    
    function addToE(e) {
      e.startContext({data: this}).start().style({display: 'flex'}).
        add('%:', this.SHOW_PERCENTAGES, ' Pos:', this.LABEL_POSITION);
    },  ]
});


foam.CLASS({
  package: 'foam.core.reflow.dashboard',
  name: 'DashboardDonutChartDAOAgent',
  extends: 'foam.core.reflow.dashboard.DashboardPieChartDAOAgent',

  requires: [
    'foam.core.reflow.dashboard.DashboardDonutSink'
  ],

  methods: [
    function createSink() {
      // Return the dashboard donut chart sink directly
      var valueSink = this.operation.createSink(this.valueProp);
      return this.DashboardDonutSink.create({
        arg1: this.prop,
        arg2: valueSink,
        showPercentages: this.showPercentages,
        labelPosition: this.labelPosition,
        colors: this.colors
      });
    }
  ]
});

foam.CLASS({
  package: 'foam.core.reflow.dashboard',
  name: 'DashboardLineChartDAOAgent',
  extends: 'foam.core.reflow.AbstractSinkDAOAgent',
  mixins: [
    'foam.core.reflow.dashboard.ColorMappingMixin'
  ],

  requires: [
    'foam.core.reflow.dashboard.DashboardLineSink',
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
    function createSink() {
      if ( ! this.xProp || ! this.yProp ) {
        return this.ArraySink.create();
      }
      
      return this.DashboardLineSink.create({
        xProp: this.xProp,
        yProp: this.yProp,
        groupBy: this.groupBy,
        operation: this.operation,
        valueProp: this.valueProp,
        timeUnit: this.timeUnit,
        colors: this.colors,
        TimeUnit: this.TimeUnit
      });
    },
    
    function value(s) {
      return s;
    },  ]
});

foam.CLASS({
  package: 'foam.core.reflow.dashboard',
  name: 'DashboardMetricDAOAgent',
  extends: 'foam.core.reflow.AbstractSinkDAOAgent',

  requires: [
    'foam.core.reflow.dashboard.DashboardMetricSink',
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
          forCls: X.data.of
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
    },
    {
      class: 'Boolean',
      name: 'renderAsCard',
      label: 'Render as Card',
      value: true,
      help: 'If true, renders content in a styled card/tile. If false, renders simple display.'
    }
  ],

  methods: [
    function createSink() {
      if (this.operation !== 'COUNT' && !this.prop) {
        return this.ArraySink.create();
      }
      
      return this.DashboardMetricSink.create({
        operation: this.operation,
        prop: this.prop,
        label: this.label,
        showCount: this.showCount,
        renderAsCard: this.renderAsCard
      });
    },
    
    function value(s) {
      if ( s && s.metricSink_ ) {
        return s.metricSink_.value;
      }
      return s;
    },  ]
});
