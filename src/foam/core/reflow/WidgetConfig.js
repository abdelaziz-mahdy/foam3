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
    'foam.mlang.sink.GroupBy'
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
      visibility: function(useWrapper) {
        return useWrapper ? 'RW' : 'HIDDEN';
      },
      view: {
        class: 'foam.u2.view.ChoiceView',
        choices: [
          ['foam.dashboard.view.Card', 'Card'],
          ['foam.dashboard.view.CardWrapper', 'Card Wrapper']
        ]
      },
      value: 'foam.dashboard.view.Card'
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

    function createView(context) {
      // Create the base view with its configuration
      var baseConfig = this.getBaseViewConfig();
      var baseView = foam.lookup(this.view).create(baseConfig, context);
      
      // If wrapper is enabled, wrap the base view
      if ( this.useWrapper && this.wrapperType ) {
        var wrapperConfig = {};
        
        if ( this.wrapperType === 'foam.dashboard.view.Card' ) {
          if ( this.wrapperLabel ) wrapperConfig.cardData = { label: this.wrapperLabel };
          wrapperConfig.content = baseView;
          return foam.lookup(this.wrapperType).create(wrapperConfig, context);
        } else if ( this.wrapperType === 'foam.dashboard.view.CardWrapper' ) {
          if ( this.wrapperLabel ) wrapperConfig.title = this.wrapperLabel;
          wrapperConfig.currentView = baseView;
          return foam.lookup(this.wrapperType).create(wrapperConfig, context);
        }
      }
      
      return baseView;
    },

    function getViewConfig() {
      // First, configure the base view
      var baseConfig = this.getBaseViewConfig();
      
      // If wrapper is enabled, wrap the base view
      if ( this.useWrapper && this.wrapperType ) {
        var wrapperConfig = {};
        
        if ( this.wrapperType === 'foam.dashboard.view.Card' ) {
          if ( this.wrapperLabel ) wrapperConfig.cardData = { label: this.wrapperLabel };
          wrapperConfig.content = { class: this.view, ...baseConfig };
        } else if ( this.wrapperType === 'foam.dashboard.view.CardWrapper' ) {
          if ( this.wrapperLabel ) wrapperConfig.title = this.wrapperLabel;
          wrapperConfig.currentView = { class: this.view, ...baseConfig };
        }
        
        return wrapperConfig;
      }
      
      return baseConfig;
    },

    function getBaseViewConfig() {
      var config = {};
      
      if ( this.VIEW_TYPES.CHART_VIEWS.includes(this.view) && this.dao ) {
        // Chart views need DAO data and chart configuration
        config.data = this.dao;
        
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
          }
        }
        
        // Add chart-specific configuration
        if ( this.chartTitle ) config.title = this.chartTitle;
        if ( this.xAxisLabel ) config.xAxisLabel = this.xAxisLabel;
        if ( this.yAxisLabel ) config.yAxisLabel = this.yAxisLabel;
        
      } else if ( this.VIEW_TYPES.DAO_VIEWS.includes(this.view) && this.dao ) {
        config.data = this.dao;
      } else if ( this.VIEW_TYPES.TEXT_VIEWS.includes(this.view) ) {
        if ( this.view === 'foam.u2.view.RichTextView' && this.text ) {
          config.data = this.text;
        }
      } else if ( this.VIEW_TYPES.DATA_VIEWS.includes(this.view) && this.dataObject ) {
        config.data = this.dataObject;
      } else if ( this.VIEW_TYPES.SIMPLE_VIEWS.includes(this.view) ) {
        // Simple views like UserGreetingView don't need external config
      }
      
      return config;
    },

    function toString() {
      return this.id + ' (' + this.view + ')';
    }
  ]
});