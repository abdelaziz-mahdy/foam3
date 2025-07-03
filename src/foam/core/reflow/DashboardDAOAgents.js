/**
 * @license
 * Copyright 2024 The FOAM Authors. All Rights Reserved.
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
  package: 'foam.core.reflow',
  name: 'DashboardCardMixin',
  
  documentation: 'Mixin providing common dashboard card functionality for DAO agents',
  
  methods: [
    function createDashboardContext(e) {
      // Create a minimal dashboard controller for context
      var dashboardController = {
        sub: function() { return { detach: function() {} }; }
      };
      
      // Create context with dashboardController
      return e.__subContext__.createSubContext({
        dashboardController: dashboardController
      });
    },
    
    function createVisualizationCard(visualization, context) {
      // Create a card to display the visualization
      return visualization.toE(null, context);
    },
    
    function addViewToCard(card, viewClass, visualization) {
      // Add the actual view to the card's content (in card's context for imports)
      card.add(foam.u2.ViewSpec.createView(viewClass, {
        data: visualization
      }, card, card.__subContext__));
    },
    
    function findViewInVisualization(visualization, viewName) {
      // Find a specific view by name in the visualization's views array
      var view = visualization.views.find(function(v) { return v[1] === viewName; });
      return view ? view[0] : visualization.views[0][0];
    },
    
    function renderVisualizationCard(e, visualization, viewClass, block) {
      var context = this.createDashboardContext(e);
      var card = this.createVisualizationCard(visualization, context);
      this.addViewToCard(card, viewClass, visualization);
      e.add(card);
      
      // Set block value
      if (block) {
        if (block.value) {
          block.value.value = visualization;
        } else {
          block.value = visualization;
        }
      }
    }
  ]
});

foam.CLASS({
  package: 'foam.core.reflow',
  name: 'DashboardCountDAOAgent',
  extends: 'foam.core.reflow.AbstractDAOAgent',
  mixins: ['foam.core.reflow.DashboardCardMixin'],

  requires: [
    'foam.dashboard.model.Count',
    'foam.dashboard.model.VisualizationSize'
  ],

  properties: [
    {
      class: 'Enum',
      of: 'foam.dashboard.model.VisualizationSize',
      name: 'size',
      value: 'SMALL',
      view: {
        class: 'foam.u2.view.ChoiceView',
        choices: [
          ['TINY', 'Tiny (176px × 358px) - Minimal display'],
          ['SMALL', 'Small (312px × ~) - Compact view'],
          ['SMEDIUM', 'Small-Medium (312px × 358px) - Balanced compact'],
          ['MEDIUM', 'Medium (424px × 356px) - Standard size'],
          ['LMEDIUM', 'Large-Medium (570px × 450px) - Expanded view'],
          ['LARGE', 'Large (936px × 528px) - Full display'],
          ['XLARGE', 'Extra Large (1580px × 698px) - Maximum display']
        ]
      }
    }
  ],

  methods: [
    function execute(e) {
      var self = this;
      
      // Create context and visualization
      var context = this.createDashboardContext(e);
      var visualization = this.Count.create({
        dao: this.dao,
        size: this.size,
        label: 'Count',
        configView: null  // Hide the configuration dropdown
      }, context);
      
      // Render the card with the Count view
      this.renderVisualizationCard(e, visualization, visualization.views[0][0], self.block);
    }
  ]
});

foam.CLASS({
  package: 'foam.core.reflow',
  name: 'DashboardBarChartDAOAgent',
  extends: 'foam.core.reflow.AbstractDAOAgent',
  mixins: ['foam.core.reflow.DashboardCardMixin'],

  requires: [
    'foam.dashboard.model.GroupBy',
    'foam.dashboard.model.VisualizationSize',
    'foam.mlang.sink.Count',
    'foam.mlang.sink.Sum',
    'foam.mlang.sink.Average',
    'foam.mlang.sink.Min',
    'foam.mlang.sink.Max'
  ],

  properties: [
    {
      name: 'prop',
      view: function(_, X) {
        return { 
          class: 'foam.core.reflow.PropertyChoiceView', 
          foCls: X.data.dao.of
        };
      }
    },
    {
      class: 'String',
      name: 'aggregation',
      value: 'COUNT',
      view: {
        class: 'foam.u2.view.ChoiceView',
        choices: [
          ['COUNT', 'Count - Count number of records in each group'],
          ['SUM', 'Sum - Add up values for each group'],
          ['AVG', 'Average - Calculate average value for each group'],
          ['MIN', 'Minimum - Find smallest value in each group'],
          ['MAX', 'Maximum - Find largest value in each group']
        ]
      }
    },
    {
      name: 'aggregationProp',
      view: function(_, X) {
        return { 
          class: 'foam.core.reflow.PropertyChoiceView', 
          forCls: X.data.dao.of,
          predicate: function(p) {
            // Only show numeric properties for aggregation
            return foam.lang.Int.isInstance(p) || 
                   foam.lang.Long.isInstance(p) || 
                   foam.lang.Float.isInstance(p) || 
                   foam.lang.Double.isInstance(p);
          }
        };
      },
      visibility: function(aggregation) {
        return aggregation !== 'COUNT' ? 'RW' : 'HIDDEN';
      }
    },
    {
      class: 'Enum',
      of: 'foam.dashboard.model.VisualizationSize',
      name: 'size',
      value: 'MEDIUM',
      view: {
        class: 'foam.u2.view.ChoiceView',
        choices: [
          ['TINY', 'Tiny (176px × 358px) - Minimal display'],
          ['SMALL', 'Small (312px × ~) - Compact view'],
          ['SMEDIUM', 'Small-Medium (312px × 358px) - Balanced compact'],
          ['MEDIUM', 'Medium (424px × 356px) - Standard size'],
          ['LMEDIUM', 'Large-Medium (570px × 450px) - Expanded view'],
          ['LARGE', 'Large (936px × 528px) - Full display'],
          ['XLARGE', 'Extra Large (1580px × 698px) - Maximum display']
        ]
      }
    }
  ],

  methods: [
    function execute(e) {
      var self = this;
      
      // Don't create visualization if no property is selected
      if ( ! this.prop ) {
        e.start('div').
          style({padding: '20px', textAlign: 'center', color: '#666'}).
          add('Please select a property to group by').
        end();
        return;
      }
      
      // Create the aggregation sink based on user selection
      var aggregationSink;
      switch(this.aggregation) {
        case 'COUNT':
          aggregationSink = this.Count.create();
          break;
        case 'SUM':
          aggregationSink = this.aggregationProp ? this.Sum.create({arg1: this.aggregationProp}) : this.Count.create();
          break;
        case 'AVG':
          aggregationSink = this.aggregationProp ? this.Average.create({arg1: this.aggregationProp}) : this.Count.create();
          break;
        case 'MIN':
          aggregationSink = this.aggregationProp ? this.Min.create({arg1: this.aggregationProp}) : this.Count.create();
          break;
        case 'MAX':
          aggregationSink = this.aggregationProp ? this.Max.create({arg1: this.aggregationProp}) : this.Count.create();
          break;
        default:
          aggregationSink = this.Count.create();
      }

      // Create context and visualization
      var context = this.createDashboardContext(e);
      var visualization = this.GroupBy.create({
        dao: this.dao,
        arg1: this.prop.name,
        arg2: aggregationSink,
        size: this.size,
        label: 'Bar Chart: ' + this.prop.label + ' (' + this.aggregation + (this.aggregationProp ? ' of ' + this.aggregationProp.label : '') + ')',
        configView: null  // Hide the configuration dropdown
      }, context);
      
      // Find and render the Bar view
      var barView = this.findViewInVisualization(visualization, 'Bar');
      this.renderVisualizationCard(e, visualization, barView, self.block);
    },
    
    function addToE(e) {
      e.startContext({data: this}).
        start().
          style({display: 'flex', gap: '10px', flexWrap: 'wrap'}).
          add('Property: ', this.PROP).
          add('Aggregation: ', this.AGGREGATION).
          add('Agg. Property: ', this.AGGREGATION_PROP).
          add('Size: ', this.SIZE).
        end().
      endContext();
    }
  ]
});

foam.CLASS({
  package: 'foam.core.reflow',
  name: 'DashboardPieChartDAOAgent',
  extends: 'foam.core.reflow.DashboardBarChartDAOAgent',

  methods: [
    function execute(e) {
      var self = this;
      
      // Don't create visualization if no property is selected
      if ( ! this.prop ) {
        e.start('div').
          style({padding: '20px', textAlign: 'center', color: '#666'}).
          add('Please select a property to group by').
        end();
        return;
      }
      
      // Create the aggregation sink based on user selection
      var aggregationSink;
      switch(this.aggregation) {
        case 'COUNT':
          aggregationSink = this.Count.create();
          break;
        case 'SUM':
          aggregationSink = this.aggregationProp ? this.Sum.create({arg1: this.aggregationProp}) : this.Count.create();
          break;
        case 'AVG':
          aggregationSink = this.aggregationProp ? this.Average.create({arg1: this.aggregationProp}) : this.Count.create();
          break;
        case 'MIN':
          aggregationSink = this.aggregationProp ? this.Min.create({arg1: this.aggregationProp}) : this.Count.create();
          break;
        case 'MAX':
          aggregationSink = this.aggregationProp ? this.Max.create({arg1: this.aggregationProp}) : this.Count.create();
          break;
        default:
          aggregationSink = this.Count.create();
      }

      // Create context and visualization
      var context = this.createDashboardContext(e);
      var visualization = this.GroupBy.create({
        dao: this.dao,
        arg1: this.prop.name,
        arg2: aggregationSink,
        size: this.size,
        label: 'Pie Chart: ' + this.prop.label + ' (' + this.aggregation + (this.aggregationProp ? ' of ' + this.aggregationProp.label : '') + ')',
        configView: null  // Hide the configuration dropdown
      }, context);
      
      // Find and render the Pie view
      var pieView = this.findViewInVisualization(visualization, 'Pie');
      this.renderVisualizationCard(e, visualization, pieView, self.block);
    }
  ]
});

foam.CLASS({
  package: 'foam.core.reflow',
  name: 'DashboardLineChartDAOAgent',
  extends: 'foam.core.reflow.DashboardBarChartDAOAgent',

  methods: [
    function execute(e) {
      var self = this;
      
      // Don't create visualization if no property is selected
      if ( ! this.prop ) {
        e.start('div').
          style({padding: '20px', textAlign: 'center', color: '#666'}).
          add('Please select a property to group by').
        end();
        return;
      }
      
      // Create the aggregation sink based on user selection
      var aggregationSink;
      switch(this.aggregation) {
        case 'COUNT':
          aggregationSink = this.Count.create();
          break;
        case 'SUM':
          aggregationSink = this.aggregationProp ? this.Sum.create({arg1: this.aggregationProp}) : this.Count.create();
          break;
        case 'AVG':
          aggregationSink = this.aggregationProp ? this.Average.create({arg1: this.aggregationProp}) : this.Count.create();
          break;
        case 'MIN':
          aggregationSink = this.aggregationProp ? this.Min.create({arg1: this.aggregationProp}) : this.Count.create();
          break;
        case 'MAX':
          aggregationSink = this.aggregationProp ? this.Max.create({arg1: this.aggregationProp}) : this.Count.create();
          break;
        default:
          aggregationSink = this.Count.create();
      }

      // Create context and visualization
      var context = this.createDashboardContext(e);
      var visualization = this.GroupBy.create({
        dao: this.dao,
        arg1: this.prop.name,
        arg2: aggregationSink,
        size: this.size,
        label: 'Line Chart: ' + this.prop.label + ' (' + this.aggregation + (this.aggregationProp ? ' of ' + this.aggregationProp.label : '') + ')',
        configView: null  // Hide the configuration dropdown
      }, context);
      
      // Find and render the Line view
      var lineView = this.findViewInVisualization(visualization, 'Line');
      this.renderVisualizationCard(e, visualization, lineView, self.block);
    }
  ]
});

foam.CLASS({
  package: 'foam.core.reflow',
  name: 'DashboardGridDAOAgent',
  extends: 'foam.core.reflow.AbstractDAOAgent',

  requires: [
    'foam.dashboard.view.Dashboard',
    'foam.dashboard.view.Card'
  ],

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
            ['foam.core.reflow.DashboardCountDAOAgent', 'Count - Shows total number of records'],
            ['foam.core.reflow.DashboardBarChartDAOAgent', 'Bar Chart - Displays data grouped by property'],
            ['foam.core.reflow.DashboardPieChartDAOAgent', 'Pie Chart - Shows proportional data distribution'],
            ['foam.core.reflow.DashboardLineChartDAOAgent', 'Line Chart - Displays trends over property values']
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
      
      // Create a container for the dashboard widgets
      e.start('div').
        style({
          display: 'grid',
          gridTemplateColumns: `repeat(${self.columns}, 1fr)`,
          gap: '16px',
          padding: '16px'
        }).
        forEach(self.widgets, function(widget) {
          this.start('div');
          widget.dao = self.dao;
          widget.execute(this);
          this.end();
        }).
      end();
      
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

