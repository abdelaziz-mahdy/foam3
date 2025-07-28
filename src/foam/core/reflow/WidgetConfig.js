/**
 * @license
 * Copyright 2022 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.core.reflow',
  name: 'WidgetConfig',
  mixins: ['com.paytic.flow.DAOResolverMixin'],

  requires: [
    'foam.mlang.sink.GroupBy',
    'foam.dashboard.model.VisualizationSize'
  ],

  constants: {
    VIEW_TYPES: {
      // Chart views that need DAO and chart-specific configuration (x/y axis, formatters)
      CHART_VIEWS: [
        'foam.dashboard.view.Bar',
        'foam.dashboard.view.Line', 
        'foam.dashboard.view.Pie'
      ],
      // DAO views that need DAO but not chart configuration
      DAO_VIEWS: [
        'foam.dashboard.view.Count',
        'foam.dashboard.view.DAOTable'
      ],
      // Text-based views that need content
      TEXT_VIEWS: [
        'foam.u2.view.RichTextView'
      ],
      // Views that need a data object (not DAO)
      DATA_VIEWS: [
        'foam.u2.DetailView',
        'foam.u2.CitationView'
      ],
      // Self-contained views that don't need external configuration
      SIMPLE_VIEWS: [
        'foam.dashboard.view.UserGreetingView'
      ]
    }
  },

  properties: [
    {
      class: 'String',
      name: 'id',
      // hidden: true,
      // expression: function() {
      //   return this.__id__;
      // },
      documentation: 'Unique identifier for the widget'
    },
    {
      class: 'String', 
      name: 'view',
      documentation: 'View class name or reference for the widget',
      view: {
        class: 'foam.u2.view.ChoiceView',
        choices: [
          ['foam.u2.DetailView', 'Detail View'],
          ['foam.u2.CitationView', 'Citation View'],
          ['foam.u2.view.RichTextView', 'Rich Text'],
          ['foam.dashboard.view.Bar', 'Bar Chart'],
          ['foam.dashboard.view.Line', 'Line Chart'],
          ['foam.dashboard.view.Pie', 'Pie Chart'],
          ['foam.dashboard.view.Count', 'Count Display'],
          ['foam.dashboard.view.DAOTable', 'DAO Table'],
          ['foam.dashboard.view.UserGreetingView', 'User Greeting']
        ]
      }
    },
    {
      class: 'String',
      name: 'daoKey',
      documentation: 'DAO key for data-driven widgets',
      visibility: function(view) {
        return (this.VIEW_TYPES.DAO_VIEWS.includes(view) || this.VIEW_TYPES.CHART_VIEWS.includes(view)) ? 'RW' : 'HIDDEN';
      },
      view: function() {
        return {
          class: 'foam.u2.DAOChoicesListView'
        };
      }
    },
    {
      name: 'dao',
      required: false,
      hidden: true,
      transient: true,
      expression: function(daoKey) {
        return this.resolveDAOFromKey(daoKey);
      },
    },
    {
      class: 'String',
      name: 'text',
      documentation: 'Text content for text-based widgets',
      visibility: function(view) {
        return this.VIEW_TYPES.TEXT_VIEWS.includes(view) ? 'RW' : 'HIDDEN';
      },
      value: '<p>Sample rich text content</p>'
    },
    {
      class: 'Boolean',
      name: 'useWrapper',
      documentation: 'Enable wrapper around the configured view'
    },
    {
      class: 'String',
      name: 'wrapperType',
      documentation: 'Type of wrapper to use',
      hidden: true,
      value: 'foam.dashboard.view.CardWrapper'
    },
    {
      class: 'String',
      name: 'wrapperLabel',
      documentation: 'Label/title for wrapper',
      visibility: function(useWrapper) {
        return useWrapper ? 'RW' : 'HIDDEN';
      }
    },
    {
      class: 'String',
      name: 'cardSize',
      documentation: 'Size for card/wrapper views',
      visibility: function(useWrapper) {
        return useWrapper ? 'RW' : 'HIDDEN';
      },
      view: {
        class: 'foam.u2.view.ChoiceView',
        choices: [
          ['TINY', 'Tiny (176px × 358px)'],
          ['SMALL', 'Small (312px × ~)'],
          ['SMEDIUM', 'Small-Medium (312px × 358px)'],
          ['MEDIUM', 'Medium (424px × 356px)'],
          ['LMEDIUM', 'Large-Medium (570px × 450px)'],
          ['LARGE', 'Large (936px × 528px)'],
          ['XLARGE', 'Extra Large (1580px × 698px)']
        ]
      },
      value: 'MEDIUM'
    },
    {
      class: 'FObjectProperty',
      name: 'dataObject',
      documentation: 'Data object for views that need a specific object',
      visibility: function(view) {
        return this.VIEW_TYPES.DATA_VIEWS.includes(view) ? 'RW' : 'HIDDEN';
      }
    },
    {
      class: 'String',
      name: 'xProperty',
      documentation: 'X-axis property name for chart views',
      visibility: function(view, dao) {
        return this.VIEW_TYPES.CHART_VIEWS.includes(view) && dao && dao.of ? 'RW' : 'HIDDEN';
      },
      postSet: function(_, value) {
        console.log('X Property set to:', value);
      },
      view: function(_, X) {
        return {
          class: 'foam.core.reflow.PropertyChoiceView',
          forCls: X.data.dao.of,
        };
      }
    },
    {
      class: 'String', 
      name: 'yProperty',
      documentation: 'Y-ax`is property name for chart views',
      visibility: function(view, dao) {
        return this.VIEW_TYPES.CHART_VIEWS.includes(view) && dao && dao.of ? 'RW' : 'HIDDEN';
      },
      view: function(_, X) {
        return {
          class: 'foam.core.reflow.PropertyChoiceView',
          forCls: X.data.dao.of,        };
      }
    },
    {
      class: 'String',
      name: 'chartTitle',
      documentation: 'Title for chart views', 
      visibility: function(view) {
        return this.VIEW_TYPES.CHART_VIEWS.includes(view) ? 'RW' : 'HIDDEN';
      }
    },
    {
      class: 'String',
      name: 'xAxisLabel',
      documentation: 'X-axis label for chart views',
      visibility: function(view) {
        return this.VIEW_TYPES.CHART_VIEWS.includes(view) ? 'RW' : 'HIDDEN';
      }
    },
    {
      class: 'String',
      name: 'yAxisLabel', 
      documentation: 'Y-axis label for chart views',
      visibility: function(view) {
        return this.VIEW_TYPES.CHART_VIEWS.includes(view) ? 'RW' : 'HIDDEN';
      }
    },
    {
      class: 'Int',
      name: 'column',
      documentation: 'Column span for default width',
      value: 6,
      min: 1,
      max: 12
    },
    // {
    //   class: 'Int',
    //   name: 'SMColumn',
    //   documentation: 'Column span for small screens',
    //   value: 12,
    //   min: 1,
    //   max: 12
    // },
    // {
    //   class: 'Int',
    //   name: 'MDColumn',
    //   documentation: 'Column span for medium screens',
    //   min: 1,
    //   max: 12
    // },
    // {
    //   class: 'Int',
    //   name: 'LGColumn',
    //   documentation: 'Column span for large screens',
    //   min: 1,
    //   max: 12
    // }
  ],

  methods: [

    function onDAOChangeListener() {
      // Override in subclasses if needed
    },

    function getViewSpec() {
      // Return a view spec like the menu system uses
      if ( this.useWrapper && this.wrapperType ) {
        // If wrapper is enabled, get the full wrapper config
        var spec = {
          class: this.wrapperType
        };
        
        // Add wrapper configuration from getViewConfig
        var wrapperConfig = this.getViewConfig();
        Object.assign(spec, wrapperConfig);
        
        console.log('WidgetConfig.getViewSpec - returning wrapped spec:', spec);
        return spec;
      } else {
        // No wrapper, return base view spec
        var spec = {
          class: this.view
        };
        
        // Add configuration from getBaseViewConfig
        var baseConfig = this.getBaseViewConfig();
        Object.assign(spec, baseConfig);
        
        console.log('WidgetConfig.getViewSpec - returning base spec:', spec);
        return spec;
      }
    },

    function createView() {
      // This method is deprecated - use getViewSpec() with startContext().start() instead
      console.warn('WidgetConfig.createView is deprecated - use getViewSpec() with container.startContext().start()');
      return null;
    },

    function getViewConfig() {
      // First, configure the base view
      var baseConfig = this.getBaseViewConfig();
      
      // If wrapper is enabled, wrap the base view
      if ( this.useWrapper && this.wrapperType ) {
        var wrapperConfig = {};
        
        // CardWrapper expects size property to be set
        wrapperConfig.size = this.VisualizationSize[this.cardSize] || this.VisualizationSize.MEDIUM;
        if ( this.wrapperLabel ) wrapperConfig.title = this.wrapperLabel;
        wrapperConfig.currentView = { class: this.view, ...baseConfig };
        
        return wrapperConfig;
      }
      
      return baseConfig;
    },

    function getBaseViewConfig() {
      var config = {};
      
      console.log('WidgetConfig.getBaseViewConfig - view:', this.view, 'dao:', this.dao);
      
      if ( this.VIEW_TYPES.CHART_VIEWS.includes(this.view) && this.dao ) {
        // Chart views need DAO data and chart configuration
        config.data = this.dao;
        console.log('WidgetConfig.getBaseViewConfig - CHART_VIEW, setting data to dao:', this.dao);
        
        // Create dataProperties for chart formatting
        if ( this.xProperty && this.yProperty && this.dao.of ) {
          var xProp = this.dao.of.getAxiomByName(this.xProperty);
          var yProp = this.dao.of.getAxiomByName(this.yProperty);
          
          if ( xProp && yProp ) {
            // Create a GroupBy sink that chart views expect
            config.data = this.GroupBy.create({
              arg1: xProp,
              arg2: yProp
            });
            console.log('WidgetConfig.getBaseViewConfig - CHART_VIEW, setting data to GroupBy:', config.data);
          }
        }
        
        // Add chart-specific configuration
        if ( this.chartTitle ) config.title = this.chartTitle;
        if ( this.xAxisLabel ) config.xAxisLabel = this.xAxisLabel;
        if ( this.yAxisLabel ) config.yAxisLabel = this.yAxisLabel;
        
      } else if ( this.VIEW_TYPES.DAO_VIEWS.includes(this.view) && this.dao ) {
        config.data = this.dao;
        console.log('WidgetConfig.getBaseViewConfig - DAO_VIEW, setting data to dao:', this.dao);
      } else if ( this.VIEW_TYPES.TEXT_VIEWS.includes(this.view) ) {
        if ( this.view === 'foam.u2.view.RichTextView' && this.text ) {
          config.data = this.text;
          console.log('WidgetConfig.getBaseViewConfig - TEXT_VIEW, setting data to text:', this.text);
        }
      } else if ( this.VIEW_TYPES.DATA_VIEWS.includes(this.view) && this.dataObject ) {
        config.data = this.dataObject;
        console.log('WidgetConfig.getBaseViewConfig - DATA_VIEW, setting data to dataObject:', this.dataObject);
      } else if ( this.VIEW_TYPES.SIMPLE_VIEWS.includes(this.view) ) {
        // Simple views like UserGreetingView don't need external config
        console.log('WidgetConfig.getBaseViewConfig - SIMPLE_VIEW, no data needed');
      } else {
        console.log('WidgetConfig.getBaseViewConfig - NO MATCH for view type, no data set');
      }
      
      console.log('WidgetConfig.getBaseViewConfig - final config:', config);
      return config;
    },

    function toString() {
      return this.id + ' (' + this.view + ')';
    }
  ]
});