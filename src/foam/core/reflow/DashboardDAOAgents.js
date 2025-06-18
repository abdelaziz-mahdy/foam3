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
      class: 'String',
      name: 'size',
      value: 'SMALL'
    }
  ],

  methods: [
    function execute(e) {
      var self = this;
      
      // Create context and visualization
      var context = this.createDashboardContext(e);
      var visualization = this.Count.create({
        dao: this.dao,
        size: this.VisualizationSize[this.size] || this.VisualizationSize.SMALL,
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
    'foam.dashboard.model.VisualizationSize'
  ],

  properties: [
    {
      name: 'prop',
      view: function(_, X) {
        return { class: 'foam.core.reflow.PropertyChoiceView', of: X.data.of };
      }
    },
    {
      class: 'String',
      name: 'size',
      value: 'MEDIUM'
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
      
      // Create context and visualization
      var context = this.createDashboardContext(e);
      var visualization = this.GroupBy.create({
        dao: this.dao,
        arg1: this.prop.name,
        size: this.VisualizationSize[this.size] || this.VisualizationSize.MEDIUM,
        label: 'Bar Chart: ' + this.prop.label,
        configView: null  // Hide the configuration dropdown
      }, context);
      
      // Find and render the Bar view
      var barView = this.findViewInVisualization(visualization, 'Bar');
      this.renderVisualizationCard(e, visualization, barView, self.block);
    },
    
    function addToE(e) {
      e.startContext({data: this}).
        start().
          style({display: 'flex', gap: '10px'}).
          add('Property: ', this.PROP).
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
      
      // Create context and visualization
      var context = this.createDashboardContext(e);
      var visualization = this.GroupBy.create({
        dao: this.dao,
        arg1: this.prop.name,
        size: this.VisualizationSize[this.size] || this.VisualizationSize.MEDIUM,
        label: 'Pie Chart: ' + this.prop.label,
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
      
      // Create context and visualization
      var context = this.createDashboardContext(e);
      var visualization = this.GroupBy.create({
        dao: this.dao,
        arg1: this.prop.name,
        size: this.VisualizationSize[this.size] || this.VisualizationSize.MEDIUM,
        label: 'Line Chart: ' + this.prop.label,
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
  name: 'DashboardTableDAOAgent',
  extends: 'foam.core.reflow.AbstractDAOAgent',
  mixins: ['foam.core.reflow.DashboardCardMixin'],

  requires: [
    'foam.dashboard.model.Table',
    'foam.dashboard.model.VisualizationSize'
  ],

  properties: [
    {
      class: 'Int',
      name: 'maxRows',
      value: 10
    },
    {
      class: 'String',
      name: 'size',
      value: 'LARGE'
    }
  ],

  methods: [
    function execute(e) {
      var self = this;
      
      // Create context and setup DAO
      var context = this.createDashboardContext(e);
      var limitedDAO = this.dao.limit(this.maxRows);
      
      // Create visualization
      var visualization = this.Table.create({
        dao: limitedDAO,
        size: this.VisualizationSize[this.size] || this.VisualizationSize.LARGE,
        label: 'Table: ' + this.of.model_.plural,
        configView: null  // Hide the configuration dropdown
      }, context);
      
      // Render the card with the Table view
      this.renderVisualizationCard(e, visualization, visualization.views[0][0], self.block);
    },
    
    function addToE(e) {
      e.startContext({data: this}).
        start().
          style({display: 'flex', gap: '10px'}).
          add('Max Rows: ', this.MAX_ROWS).
          add('Size: ', this.SIZE).
        end().
      endContext();
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
      factory: function() { return []; }
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

foam.CLASS({
  package: 'foam.core.reflow',
  name: 'DashboardUserGreetingDAOAgent',
  extends: 'foam.core.reflow.AbstractDAOAgent',
  mixins: ['foam.core.reflow.DashboardCardMixin'],

  requires: [
    'foam.dashboard.view.UserGreetingView',
    'foam.dashboard.view.Card'
  ],

  imports: [ 'user' ],

  properties: [
    {
      class: 'String',
      name: 'size',
      value: 'SMALL'
    }
  ],

  methods: [
    function execute(e) {
      var self = this;
      
      // Create context with user
      var context = this.createDashboardContext(e);
      context = context.createSubContext({
        user: this.user || { firstName: 'User' }
      });
      
      // Create a simple card with greeting
      var card = this.Card.create({ 
        data: {
          label: 'Welcome',
          size: { name: this.size.toUpperCase() },
          configView: null  // Hide the configuration dropdown
        }
      }, context);
      
      // Add the greeting view to the card's content
      this.addViewToCard(card, this.UserGreetingView, {});
      
      // Add the card to the element
      e.add(card);
      
      if (self.block.value) {
        self.block.value.value = 'greeting';
      } else {
        self.block.value = 'greeting';
      }
    }
  ]
});