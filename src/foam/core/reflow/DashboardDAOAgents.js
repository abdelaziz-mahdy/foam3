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
  name: 'DashboardCountDAOAgent',
  extends: 'foam.core.reflow.AbstractDAOAgent',

  requires: [
    'foam.dashboard.view.Count',
    'foam.u2.borders.CardBorder',
    'foam.mlang.sink.Count as CountSink'
  ],

  properties: [
    {
      class: 'String',
      name: 'size',
      value: 'SMALL'
    }
  ],


  methods: [
    function createSink() { 
      return this.CountSink.create();
    },
    
    function execute(e) {
      var self = this;
      
      return this.dao.select(this.createSink()).then(countSink => {
        var card = e.start(self.CardBorder);
        
        card.start('div')
          .style({'font-weight': 'bold', 'margin-bottom': '10px', 'color': '#333'})
          .add('Count')
        .end();
        
        card.startContext({
          data: { data: countSink },
          visualizationWidth: 200,
          visualizationHeight: 80
        });
        
        card.add(self.Count.create());
        card.endContext();
        
        card.end();
        
        if (self.block.value) {
          self.block.value.value = countSink.value;
        } else {
          self.block.value = countSink.value;
        }
      });
    }
  ]
});


foam.CLASS({
  package: 'foam.core.reflow',
  name: 'DashboardBarChartDAOAgent',
  extends: 'foam.core.reflow.AbstractDAOAgent',

  requires: [
    'foam.dashboard.view.Bar',
    'foam.u2.borders.CardBorder'
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
    function createSink() {
      return this.prop ? this.GROUP_BY(this.prop, this.COUNT()) : this.COUNT();
    },
    
    function execute(e) {
      var self = this;
      
      return this.dao.select(this.createSink()).then(sink => {
        var card = e.start(self.CardBorder);
        
        card.start('div')
          .style({'font-weight': 'bold', 'margin-bottom': '10px', 'color': '#333'})
          .add('Bar Chart' + (self.prop ? ': ' + self.prop.label : ''))
        .end();
        
        card.startContext({
          data: { data: sink },
          visualizationWidth: 360,
          visualizationHeight: 220
        });
        
        card.add(self.Bar.create());
        card.endContext();
        
        card.end();
        
        if (self.block.value) {
          self.block.value.value = sink;
        } else {
          self.block.value = sink;
        }
      });
    },
    
    function addToE(e) {
      e.startContext({data: this}).
        start().
          style({display: 'flex', gap: '10px'}).
          add('Property: ', this.PROP).
          add('Size: ', this.SIZE);
    }
  ]
});


foam.CLASS({
  package: 'foam.core.reflow',
  name: 'DashboardPieChartDAOAgent',
  extends: 'foam.core.reflow.DashboardBarChartDAOAgent',

  requires: [
    'foam.dashboard.view.Pie',
    'foam.u2.borders.CardBorder'
  ],

  methods: [
    function execute(e) {
      var self = this;
      
      return this.dao.select(this.createSink()).then(sink => {
        var card = e.start(self.CardBorder);
        
        card.start('div')
          .style({'font-weight': 'bold', 'margin-bottom': '10px', 'color': '#333'})
          .add('Pie Chart' + (self.prop ? ': ' + self.prop.label : ''))
        .end();
        
        card.startContext({
          data: { data: sink },
          visualizationWidth: 360,
          visualizationHeight: 220
        });
        
        card.add(self.Pie.create());
        card.endContext();
        
        card.end();
        
        if (self.block.value) {
          self.block.value.value = sink;
        } else {
          self.block.value = sink;
        }
      });
    }
  ]
});


foam.CLASS({
  package: 'foam.core.reflow',
  name: 'DashboardLineChartDAOAgent',
  extends: 'foam.core.reflow.DashboardBarChartDAOAgent',

  requires: [
    'foam.dashboard.view.Line',
    'foam.u2.borders.CardBorder'
  ],

  methods: [
    function execute(e) {
      var self = this;
      
      return this.dao.select(this.createSink()).then(sink => {
        var card = e.start(self.CardBorder);
        
        card.start('div')
          .style({'font-weight': 'bold', 'margin-bottom': '10px', 'color': '#333'})
          .add('Line Chart' + (self.prop ? ': ' + self.prop.label : ''))
        .end();
        
        card.startContext({
          data: { data: sink },
          visualizationWidth: 360,
          visualizationHeight: 220
        });
        
        card.add(self.Line.create());
        card.endContext();
        
        card.end();
        
        if (self.block.value) {
          self.block.value.value = sink;
        } else {
          self.block.value = sink;
        }
      });
    }
  ]
});


foam.CLASS({
  package: 'foam.core.reflow',
  name: 'DashboardTableDAOAgent',
  extends: 'foam.core.reflow.TableDAOAgent',

  requires: [
    'foam.u2.borders.CardBorder'
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
      
      var card = e.start(self.CardBorder);
      
      card.start('div')
        .style({'font-weight': 'bold', 'margin-bottom': '10px', 'color': '#333'})
        .add('Table: ' + this.of.model_.plural)
      .end();
      
      // Use the parent TableDAOAgent execution but wrap in card
      this.SUPER(card);
      
      card.end();
    },
    
    function addToE(e) {
      e.startContext({data: this}).
        start().
          style({display: 'flex', gap: '10px'}).
          add('Max Rows: ', this.MAX_ROWS).
          add('Size: ', this.SIZE);
    }
  ]
});


foam.CLASS({
  package: 'foam.core.reflow',
  name: 'DashboardGridDAOAgent',
  extends: 'foam.core.reflow.AbstractDAOAgent',

  requires: [
    'foam.dashboard.view.DashboardView',
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
      var dashboardContainer = e.start('div').
        style({
          display: 'grid',
          gridTemplateColumns: `repeat(${self.columns}, 1fr)`,
          gap: '16px',
          padding: '16px'
        });
      
      // Execute each widget and add to dashboard
      self.widgets.forEach(widget => {
        var widgetContainer = dashboardContainer.start('div');
        widget.dao = self.dao;
        widget.execute(widgetContainer);
        widgetContainer.end();
      });
      
      dashboardContainer.end();
      
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
          end();
    }
  ]
});


foam.CLASS({
  package: 'foam.core.reflow',
  name: 'DashboardUserGreetingDAOAgent',
  extends: 'foam.core.reflow.AbstractDAOAgent',

  requires: [
    'foam.dashboard.view.UserGreetingView',
    'foam.u2.borders.CardBorder'
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
      
      var card = e.start(self.CardBorder);
      
      card.startContext({
        user: this.user || { firstName: 'User' }
      });
      
      card.add(self.UserGreetingView.create());
      card.endContext();
      
      card.end();
      
      if (self.block.value) {
        self.block.value.value = 'greeting';
      } else {
        self.block.value = 'greeting';
      }
    }
  ]
});