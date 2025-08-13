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
      e.start('div').style({marginBottom: '10px'})
        .add('Colors: ', this.COLORS)
      .end();
    }
  ]
});

foam.CLASS({
  package: 'foam.core.reflow.dashboard',
  name: 'ChartDisplayMixin',
  
  documentation: 'Mixin for common chart display options',
  
  requires: [
    'foam.core.reflow.dashboard.LegendPosition'
  ],
  
  properties: [
    {
      class: 'Boolean',
      name: 'responsive',
      label: 'Responsive',
      value: true
    },
    {
      class: 'Boolean',
      name: 'maintainAspectRatio',
      label: 'Maintain Aspect Ratio',
      value: true
    },
    {
      class: 'Int',
      name: 'height',
      label: 'Chart Height (px)',
      value: 300
    },
    {
      class: 'Int',
      name: 'width',
      label: 'Chart Width (px)',
      value: 400,
      help: 'Width in pixels (default: 400)'
    },
    {
      class: 'Boolean',
      name: 'showLegend',
      label: 'Show Legend',
      value: true
    },
    {
      class: 'Enum',
      of: 'foam.core.reflow.dashboard.LegendPosition',
      name: 'legendPosition',
      label: 'Legend Position',
      value: 'TOP',
      visibility: function(showLegend) {
        return showLegend ? foam.u2.DisplayMode.RW : foam.u2.DisplayMode.HIDDEN;
      }
    },
    {
      class: 'Boolean',
      name: 'showTooltips',
      label: 'Show Tooltips',
      value: true
    },
    {
      class: 'Boolean',
      name: 'showTooltipSum',
      label: 'Show Tooltip Sum',
      value: false,
      help: 'Show sum total in tooltip footer when multiple values are displayed'
    },
    {
      class: 'Boolean',
      name: 'animate',
      label: 'Enable Animation',
      value: true
    },
    {
      class: 'Int',
      name: 'animationDuration',
      label: 'Animation Duration (ms)',
      value: 1000,
      visibility: function(animate) {
        return animate ? foam.u2.DisplayMode.RW : foam.u2.DisplayMode.HIDDEN;
      }
    }
  ],
  
  methods: [
    function addChartDisplayToE(e) {
      var self = this;
      // Add chart display configuration fields to the UI
      e.start('div').style({marginBottom: '10px'})
        .add('Height: ', this.HEIGHT, 'px Width: ', this.WIDTH, 'px')
      .end()
      .start('div').style({marginBottom: '10px'})
        .add('Legend: ', this.SHOW_LEGEND)
        .add(self.dynamic(function(showLegend) {
          if (showLegend) {
            return this.add(' Position: ', self.LEGEND_POSITION);
          }
        }))
      .end()
      .start('div').style({marginBottom: '10px'})
        .add('Tooltips: ', this.SHOW_TOOLTIPS, ' Sum: ', this.SHOW_TOOLTIP_SUM, ' Animation: ', this.ANIMATE)
        .add(self.dynamic(function(animate) {
          if (animate) {
            return this.add(' Duration: ', self.ANIMATION_DURATION, 'ms');
          }
        }))
      .end()
      .start('div').style({marginBottom: '10px'})
        .add('Responsive: ', this.RESPONSIVE, ' Maintain Ratio: ', this.MAINTAIN_ASPECT_RATIO)
      .end();
    }
  ]
});

// DirectChartMixin removed - not used after refactoring to sink-based approach
// CardRenderMixin removed - metrics always render as cards


foam.CLASS({
  package: 'foam.core.reflow.dashboard',
  name: 'DashboardBarChartDAOAgent',
  extends: 'foam.core.reflow.GroupByDAOAgent',
  mixins: [
    'foam.core.reflow.dashboard.ColorMappingMixin',
    'foam.core.reflow.dashboard.ChartDisplayMixin'
  ],

  requires: [
    'foam.core.reflow.dashboard.DashboardBarSink',
    'foam.core.reflow.ReactiveSectionedDetailView'
  ],

  sections: [
    {
      name: 'dataConfig',
      title: 'Data Configuration',
      order: 1,
      collapsable: true,
      properties: ['prop', 'sink', 'groupLimit', 'sortOrder', 'includeOthers', 'othersLabel']
    },
    {
      name: 'barChart',
      title: 'Bar Chart Settings',
      order: 2,
      collapsable: true,
      properties: ['horizontal', 'barThickness', 'timeUnit', 'showGridLines']
    },
    {
      name: 'axisLabels',
      title: 'Axis Labels',
      order: 3,
      collapsable: true,
      properties: ['xAxisLabel', 'yAxisLabel']
    },
    {
      name: 'display',
      title: 'Display Options',
      order: 4,
      collapsable: true,
      properties: ['responsive', 'maintainAspectRatio', 'height', 'width', 'showLegend', 'legendPosition', 'showTooltips', 'showTooltipSum', 'animate', 'animationDuration']
    },
    {
      name: 'colors',
      title: 'Color Configuration',
      order: 5,
      collapsable: true,
      properties: ['colors']
    }
  ],

  properties: [
    // Inherited from GroupByDAOAgent: prop, sink, groupLimit, sortOrder, includeOthers, othersLabel
    // From mixins: colors, chart display options
    {
      class: 'Enum',
      of: 'foam.core.reflow.dashboard.TimeUnit',
      name: 'timeUnit',
      label: 'Time Unit',
      value: 'DAY',
      section: 'barChart',
      help: 'Time unit for X-axis when using date/time properties',
      visibility: function(prop) {
        return prop && (foam.lang.Date.isInstance(prop) || foam.lang.DateTime.isInstance(prop)) ? 
          foam.u2.DisplayMode.RW : 
          foam.u2.DisplayMode.HIDDEN;
      }
    },
    {
      class: 'Boolean',
      name: 'horizontal',
      label: 'Horizontal Bars',
      section: 'barChart',
      value: false
    },
    {
      class: 'Float',
      name: 'barThickness',
      label: 'Bar Thickness',
      section: 'barChart',
      help: 'Thickness of bars (0 = auto)'
    },
    {
      class: 'String',
      name: 'xAxisLabel',
      label: 'X-Axis Label',
      section: 'axisLabels'
    },
    {
      class: 'String',
      name: 'yAxisLabel',
      label: 'Y-Axis Label',
      section: 'axisLabels'
    },
    {
      class: 'Boolean',
      name: 'showGridLines',
      label: 'Show Grid Lines',
      section: 'barChart',
      value: true
    }
  ],

  methods: [
    function createSink() {
      // Create sink with GroupBy configuration inherited from parent
      // Use the sink from parent GroupByDAOAgent if provided, otherwise COUNT
      var valueSink = this.sink ? this.sink.createSink() : this.COUNT();
      
      var sink = this.DashboardBarSink.create({
        arg1: this.prop,
        arg2: valueSink,
        groupLimit: this.groupLimit,
        sortOrder: this.sortOrder,
        includeOthers: this.includeOthers,
        othersLabel: this.othersLabel,
        colors: this.colors,
        timeUnit: this.timeUnit,
        horizontal: this.horizontal,
        barThickness: this.barThickness,
        xAxisLabel: this.xAxisLabel,
        yAxisLabel: this.yAxisLabel,
        showGridLines: this.showGridLines,
        responsive: this.responsive,
        maintainAspectRatio: this.maintainAspectRatio,
        height: this.height,
        width: this.width,
        showLegend: this.showLegend,
        legendPosition: this.legendPosition,
        showTooltips: this.showTooltips,
        showTooltipSum: this.showTooltipSum,
        animate: this.animate,
        animationDuration: this.animationDuration
      });
      
      return sink;
    },
    
    function addToE(e) {
      e.startContext({data: this})
        .tag(this.ReactiveSectionedDetailView, {
          data: this,
          showTitle: true
        })
      .endContext();
    }
  ]
});

foam.CLASS({
  package: 'foam.core.reflow.dashboard',
  name: 'DashboardStackedBarChartDAOAgent',
  extends: 'foam.core.reflow.GridByDAOAgent',
  mixins: [
    'foam.core.reflow.dashboard.ColorMappingMixin',
    'foam.core.reflow.dashboard.ChartDisplayMixin'
  ],

  requires: [
    'foam.core.reflow.dashboard.DashboardStackedBarSink',
    'foam.core.reflow.ReactiveSectionedDetailView'
  ],

  sections: [
    {
      name: 'dataConfig',
      title: 'Data Configuration',
      order: 1,
      collapsable: true,
      properties: ['prop2', 'prop1', 'sink', 'timeUnit']
    },
    {
      name: 'stackedBarChart',
      title: 'Stacked Bar Settings',
      order: 2,
      collapsable: true,
      properties: ['horizontal', 'showGridLines']
    },
    {
      name: 'axisLabels',
      title: 'Axis Labels',
      order: 3,
      collapsable: true,
      properties: ['xAxisLabel', 'yAxisLabel']
    },
    {
      name: 'display',
      title: 'Display Options',
      order: 4,
      collapsable: true,
      properties: ['responsive', 'maintainAspectRatio', 'height', 'width', 'showLegend', 'legendPosition', 'showTooltips', 'showTooltipSum', 'animate', 'animationDuration']
    },
    {
      name: 'colors',
      title: 'Color Configuration',
      order: 5,
      collapsable: true,
      properties: ['colors']
    }
  ],

  properties: [
    // Inherited from GridByDAOAgent: prop1 (yFunc), prop2 (xFunc), sink
    // From mixins: colors, chart display options
    {
      class: 'Enum',
      of: 'foam.core.reflow.dashboard.TimeUnit',
      name: 'timeUnit',
      label: 'Time Unit',
      value: 'DAY',
      help: 'Time unit for X-axis when using date/time properties',
      visibility: function(prop2) {
        return prop2 && (foam.lang.Date.isInstance(prop2) || foam.lang.DateTime.isInstance(prop2)) ? 
          foam.u2.DisplayMode.RW : 
          foam.u2.DisplayMode.HIDDEN;
      }
    },
    {
      class: 'Boolean',
      name: 'horizontal',
      label: 'Horizontal Stacks',
      value: false
    },
    {
      class: 'String',
      name: 'xAxisLabel',
      label: 'X-Axis Label'
    },
    {
      class: 'String',
      name: 'yAxisLabel',
      label: 'Y-Axis Label'
    },
    {
      class: 'Boolean',
      name: 'showGridLines',
      label: 'Show Grid Lines',
      value: true
    }
  ],

  methods: [
    function createSink() {
      // Use the sink from parent GridByDAOAgent if provided, otherwise COUNT
      var valueSink = this.sink ? this.sink.createSink() : this.COUNT();
      
      return this.DashboardStackedBarSink.create({
        yFunc: this.prop1,
        xFunc: this.prop2,
        acc: valueSink,
        colors: this.colors,
        timeUnit: this.timeUnit,
        horizontal: this.horizontal,
        xAxisLabel: this.xAxisLabel,
        yAxisLabel: this.yAxisLabel,
        showGridLines: this.showGridLines,
        responsive: this.responsive,
        maintainAspectRatio: this.maintainAspectRatio,
        height: this.height,
        width: this.width,
        showLegend: this.showLegend,
        legendPosition: this.legendPosition,
        showTooltips: this.showTooltips,
        showTooltipSum: this.showTooltipSum,
        animate: this.animate,
        animationDuration: this.animationDuration
      });
    },
    
    function addToE(e) {
      e.startContext({data: this})
        .tag(this.ReactiveSectionedDetailView, {
          data: this,
          showTitle: true
        })
      .endContext();
    }
  ]
});

foam.CLASS({
  package: 'foam.core.reflow.dashboard',
  name: 'DashboardPieChartDAOAgent',
  extends: 'foam.core.reflow.GroupByDAOAgent',
  mixins: [
    'foam.core.reflow.dashboard.ColorMappingMixin',
    'foam.core.reflow.dashboard.ChartDisplayMixin'
  ],

  requires: [
    'foam.core.reflow.dashboard.DashboardPieSink',
    'foam.core.reflow.ReactiveSectionedDetailView'
  ],

  sections: [
    {
      name: 'dataConfig',
      title: 'Data Configuration',
      order: 1,
      collapsable: true,
      properties: ['prop', 'sink', 'groupLimit', 'sortOrder', 'includeOthers', 'othersLabel']
    },
    {
      name: 'pieChart',
      title: 'Pie Chart Settings',
      order: 2,
      collapsable: true,
      properties: ['showPercentages', 'cutoutPercentage', 'clockwise', 'rotation']
    },
    {
      name: 'display',
      title: 'Display Options',
      order: 3,
      collapsable: true,
      properties: ['responsive', 'maintainAspectRatio', 'height', 'width', 'showLegend', 'legendPosition', 'showTooltips', 'showTooltipSum', 'animate', 'animationDuration']
    },
    {
      name: 'colors',
      title: 'Color Configuration',
      order: 4,
      collapsable: true,
      properties: ['colors']
    }
  ],

  properties: [
    // Inherited from GroupByDAOAgent: prop, sink, groupLimit, sortOrder, includeOthers, othersLabel
    // From mixins: colors, chart display options
    {
      class: 'Boolean',
      name: 'showPercentages',
      label: 'Show Percentages',
      value: false
    },
    {
      class: 'Float',
      name: 'cutoutPercentage',
      label: 'Cutout %',
      value: 0,
      help: 'For donut effect (0-100)'
    },
    {
      class: 'Boolean',
      name: 'clockwise',
      label: 'Clockwise',
      value: true
    },
    {
      class: 'Float',
      name: 'rotation',
      label: 'Rotation Angle',
      value: -90,
      help: 'Starting angle in degrees'
    }
  ],

  methods: [
    function createSink() {
      // Create sink with GroupBy configuration inherited from parent
      // Use the sink from parent GroupByDAOAgent if provided, otherwise COUNT
      var valueSink = this.sink ? this.sink.createSink() : this.COUNT();
      
      // Default to DESC sort order for pie charts to show highest values first
      var sink = this.DashboardPieSink.create({
        arg1: this.prop,
        arg2: valueSink,
        groupLimit: this.groupLimit,
        sortOrder: this.sortOrder,
        includeOthers: this.includeOthers,
        othersLabel: this.othersLabel,
        colors: this.colors,
        showPercentages: this.showPercentages,
        cutoutPercentage: this.cutoutPercentage,
        clockwise: this.clockwise,
        rotation: this.rotation,
        responsive: this.responsive,
        maintainAspectRatio: this.maintainAspectRatio,
        height: this.height,
        width: this.width,
        showLegend: this.showLegend,
        legendPosition: this.legendPosition,
        showTooltips: this.showTooltips,
        showTooltipSum: this.showTooltipSum,
        animate: this.animate,
        animationDuration: this.animationDuration
      });

      return sink;
    },
    
    function addToE(e) {
      e.startContext({data: this})
        .tag(this.ReactiveSectionedDetailView, {
          data: this,
          showTitle: true
        })
      .endContext();
    }
  ]
});


// DashboardDonutChartDAOAgent removed - use DashboardPieChartDAOAgent with cutoutPercentage instead

foam.CLASS({
  package: 'foam.core.reflow.dashboard',
  name: 'DashboardLineChartDAOAgent',
  extends: 'foam.core.reflow.AbstractSinkDAOAgent',
  mixins: [
    'foam.core.reflow.dashboard.ColorMappingMixin',
    'foam.core.reflow.dashboard.ChartDisplayMixin'
  ],

  requires: [
    'foam.core.reflow.dashboard.DashboardLineSink',
    'foam.core.reflow.dashboard.TimeUnit',
    'foam.mlang.sink.GroupBy',
    'foam.core.reflow.ReactiveSectionedDetailView'
  ],

  sections: [
    {
      name: 'dataConfig',
      title: 'Data Configuration',
      order: 1,
      collapsable: true,
      properties: ['xProp', 'yProp', 'groupBy', 'aggregationSink', 'timeUnit']
    },
    {
      name: 'lineChart',
      title: 'Line Chart Settings',
      order: 2,
      collapsable: true,
      properties: ['fill', 'tension', 'stepped', 'showPoints', 'pointRadius', 'showGridLines']
    },
    {
      name: 'axisLabels',
      title: 'Axis Labels',
      order: 3,
      collapsable: true,
      properties: ['xAxisLabel', 'yAxisLabel']
    },
    {
      name: 'display',
      title: 'Display Options',
      order: 4,
      collapsable: true,
      properties: ['responsive', 'maintainAspectRatio', 'height', 'width', 'showLegend', 'legendPosition', 'showTooltips', 'showTooltipSum', 'animate', 'animationDuration']
    },
    {
      name: 'colors',
      title: 'Color Configuration',
      order: 5,
      collapsable: true,
      properties: ['colors']
    }
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
      label: 'Group By (Multiple Lines)',
      help: 'Optional: Group data by this property to create multiple lines',
      view: function(_, X) {
        return { 
          class: 'foam.core.reflow.PropertyChoiceView', 
          forCls: X.data.dao.of
        };
      }
    },
    {
      name: 'aggregationSink',
      label: 'Aggregation',
      view: { class: 'foam.core.reflow.SinkView', choice: 'Average' },
      help: 'How to aggregate Y values when grouping',
      visibility: function(groupBy) {
        return groupBy ? foam.u2.DisplayMode.RW : foam.u2.DisplayMode.HIDDEN;
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
        return xProp && (foam.lang.Date.isInstance(xProp) || foam.lang.DateTime.isInstance(xProp)) ? 
          foam.u2.DisplayMode.RW : 
          foam.u2.DisplayMode.HIDDEN;
      }
    },
    {
      class: 'String',
      name: 'xAxisLabel',
      label: 'X-Axis Label'
    },
    {
      class: 'String',
      name: 'yAxisLabel',
      label: 'Y-Axis Label'
    },
    {
      class: 'Boolean',
      name: 'fill',
      label: 'Fill Area',
      value: false
    },
    {
      class: 'Float',
      name: 'tension',
      label: 'Line Tension',
      value: 0.1,
      help: 'Bezier curve tension (0 = straight lines)'
    },
    {
      class: 'Boolean',
      name: 'stepped',
      label: 'Stepped Line',
      value: false
    },
    {
      class: 'Boolean',
      name: 'showPoints',
      label: 'Show Points',
      value: true
    },
    {
      class: 'Float',
      name: 'pointRadius',
      label: 'Point Radius',
      value: 3,
      visibility: function(showPoints) {
        return showPoints ? foam.u2.DisplayMode.RW : foam.u2.DisplayMode.HIDDEN;
      }
    },
    {
      class: 'Boolean',
      name: 'showGridLines',
      label: 'Show Grid Lines',
      value: true
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
        aggregationSink: this.aggregationSink,
        timeUnit: this.timeUnit,
        colors: this.colors,
        xAxisLabel: this.xAxisLabel,
        yAxisLabel: this.yAxisLabel,
        fill: this.fill,
        tension: this.tension,
        stepped: this.stepped,
        showPoints: this.showPoints,
        pointRadius: this.pointRadius,
        showGridLines: this.showGridLines,
        responsive: this.responsive,
        maintainAspectRatio: this.maintainAspectRatio,
        height: this.height,
        width: this.width,
        showLegend: this.showLegend,
        legendPosition: this.legendPosition,
        showTooltips: this.showTooltips,
        showTooltipSum: this.showTooltipSum,
        animate: this.animate,
        animationDuration: this.animationDuration
      });
    },
    
    function value(s) {
      return s;
    },
    
    function addToE(e) {
      e.startContext({data: this})
        .tag(this.ReactiveSectionedDetailView, {
          data: this,
          showTitle: true
        })
      .endContext();
    }
  ]
});

foam.CLASS({
  package: 'foam.core.reflow.dashboard',
  name: 'DashboardMetricDAOAgent',
  extends: 'foam.core.reflow.AbstractSinkDAOAgent',

  requires: [
    'foam.core.reflow.dashboard.DashboardMetricSink',
    'foam.core.reflow.dashboard.MetricOperation',
    'foam.core.reflow.ReactiveSectionedDetailView'
  ],

  sections: [
    {
      name: 'metricConfig',
      title: 'Metric Configuration',
      order: 1,
      collapsable: true,
      properties: ['operation', 'prop', 'label', 'unit', 'decimalPlaces']
    },
    {
      name: 'display',
      title: 'Display Options',
      order: 2,
      collapsable: true,
      properties: ['icon', 'alignment', 'showCount', 'valueColor']
    }
  ],

  properties: [
    {
      class: 'Enum',
      of: 'foam.core.reflow.dashboard.MetricOperation',
      name: 'operation',
      label: 'Operation',
      value: 'COUNT'
    },
    {
      name: 'prop',
      label: 'Property',
      view: function(_, X) {
        return { 
          class: 'foam.core.reflow.PropertyChoiceView', 
          forCls: X.data.dao ? X.data.dao.of : X.data.of
        };
      },
      visibility: function(operation) {
        // FOAM makes this reactive automatically when operation changes
        return operation && operation.name !== 'COUNT' ? 
          foam.u2.DisplayMode.RW : 
          foam.u2.DisplayMode.HIDDEN;
      }
    },
    {
      class: 'String',
      name: 'label',
      label: 'Display Label',
      value: 'Metric'
    },
    {
      class: 'String',
      name: 'icon',
      label: 'Icon',
      help: 'Theme icon name to display above the metric value (e.g., "chart", "users", "dollar")'
    },
    {
      class: 'Enum',
      name: 'alignment',
      label: 'Alignment',
      of: 'foam.core.reflow.dashboard.MetricAlignment',
      value: 'CENTER'
    },
    {
      class: 'Boolean',
      name: 'showCount',
      label: 'Show Record Count',
      value: true,
      help: 'Display how many records were used in the calculation'
    },
    {
      class: 'String',
      name: 'valueColor',
      label: 'Value Color',
      help: 'Color for the metric value (CSS color or token)',
      view: 'foam.u2.view.ColorEditView'
    },
    {
      class: 'String',
      name: 'unit',
      label: 'Unit',
      help: 'Unit to display after value (e.g., $, %, ms)'
    },
    {
      class: 'Int',
      name: 'decimalPlaces',
      label: 'Decimal Places',
      value: 0,
      help: 'Number of decimal places to show'
    }
  ],

  methods: [
    function createSink() {
      return this.DashboardMetricSink.create({
        operation: this.operation,
        prop: this.prop,
        label: this.label,
        showCount: this.showCount,
        valueColor: this.valueColor,
        unit: this.unit,
        decimalPlaces: this.decimalPlaces
      });
    },
    
    function addToE(e) {
      e.startContext({data: this})
        .tag(this.ReactiveSectionedDetailView, {
          data: this,
          showTitle: true
        })
      .endContext();
    }
  ]
});
