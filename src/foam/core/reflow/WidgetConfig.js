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
    'foam.mlang.sink.Count',
    'foam.mlang.sink.Sum',
    'foam.mlang.sink.Average',
    'foam.mlang.sink.Min',
    'foam.mlang.sink.Max',
    'foam.dashboard.model.VisualizationSize',
    'foam.dashboard.model.GroupBy as DashboardGroupBy',
    'foam.dashboard.model.Count as DashboardCount',
    'foam.dashboard.model.XYVisualization'
  ],

  constants: {
    VIEW_TYPES: {
      // Dashboard visualization models that need DAO
      DASHBOARD_MODELS: [
        'foam.dashboard.model.Count',
        'foam.dashboard.model.GroupBy',
        'foam.dashboard.model.XYVisualization'
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
          ['foam.dashboard.model.Count', 'Count Display'],
          ['foam.dashboard.model.GroupBy', 'Grouped Charts (Pie, Bar with aggregation)'],
          ['foam.dashboard.model.XYVisualization', 'X/Y Charts (Line, Table with X/Y data)'],
          ['foam.dashboard.view.UserGreetingView', 'User Greeting']
        ]
      }
    },
    {
      class: 'String',
      name: 'chartView',
      documentation: 'Which chart view to display',
      visibility: function(view) {
        return (view === 'foam.dashboard.model.GroupBy' || view === 'foam.dashboard.model.XYVisualization') ? 'RW' : 'HIDDEN';
      },
      expression: function(view) {
        // Set default based on the view type
        if ( view === 'foam.dashboard.model.GroupBy' ) {
          return 'Pie';
        } else if ( view === 'foam.dashboard.model.XYVisualization' ) {
          return 'Line';
        }
        return 'Pie';
      },
      view: function(args, X) {
        return {
          class: 'foam.u2.view.ChoiceView',
          choices$: X.data.view$.map(function(viewType) {
            if ( viewType === 'foam.dashboard.model.GroupBy' ) {
              return [
                ['Pie', 'Pie Chart'],
                ['Bar', 'Bar Chart']
              ];
            } else if ( viewType === 'foam.dashboard.model.XYVisualization' ) {
              return [
                ['Line', 'Line Chart'],
                ['Table', 'Table View']
              ];
            }
            return [];
          })
        };
      }
    },
    {
      class: 'String',
      name: 'daoKey',
      documentation: 'DAO key for data-driven widgets',
      visibility: function(view) {
        return this.VIEW_TYPES.DASHBOARD_MODELS.includes(view) ? 'RW' : 'HIDDEN';
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
        var dao = this.resolveDAOFromKey(daoKey);
        console.log('WidgetConfig: Resolved DAO for key:', daoKey, '-> DAO:', dao, 'DAO.of:', dao?.of);
        return dao;
      },
    },
    {
      class: 'Boolean',
      name: 'useWrapper',
      documentation: 'Enable wrapper around the configured view',
      value: true,
      visibility: function(view) {
        // Dashboard models (Count, GroupBy) already have their own card wrappers
        return this.VIEW_TYPES.DASHBOARD_MODELS.includes(view) ? 'HIDDEN' : 'RW';
      }
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
      class: 'String',
      name: 'xProperty',
      documentation: 'X-axis property name for chart views',
      visibility: function(view, dao) {
        return (view === 'foam.dashboard.model.GroupBy' || view === 'foam.dashboard.model.XYVisualization') && dao && dao.of ? 'RW' : 'HIDDEN';
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
      documentation: 'Y-axis property name for chart views',
      visibility: function(view, dao) {
        // Show Y property only for XY visualization charts
        return view === 'foam.dashboard.model.XYVisualization' && dao && dao.of ? 'RW' : 'HIDDEN';
      },
      required: function(view) {
        // Y property is required for XY visualization
        return view === 'foam.dashboard.model.XYVisualization';
      },
      view: function(_, X) {
        return {
          class: 'foam.core.reflow.PropertyChoiceView',
          forCls: X.data.dao.of
        };
      }
    },
    {
      class: 'String',
      name: 'chartTitle',
      documentation: 'Title for chart views', 
      visibility: function(view) {
        return view === 'foam.dashboard.view.GroupBy' ? 'RW' : 'HIDDEN';
      }
    },
    {
      class: 'String',
      name: 'xAxisLabel',
      documentation: 'X-axis label for chart views',
      visibility: function(view) {
        return view === 'foam.dashboard.view.GroupBy' ? 'RW' : 'HIDDEN';
      }
    },
    {
      class: 'String',
      name: 'yAxisLabel', 
      documentation: 'Y-axis label for chart views',
      visibility: function(view) {
        return view === 'foam.dashboard.view.GroupBy' ? 'RW' : 'HIDDEN';
      }
    },
    {
      class: 'String',
      name: 'aggregation',
      documentation: 'Aggregation type for chart views',
      value: 'COUNT',
      visibility: function(view) {
        // Show aggregation only for GroupBy charts
        return view === 'foam.dashboard.model.GroupBy' ? 'RW' : 'HIDDEN';
      },
      view: {
        class: 'foam.u2.view.ChoiceView',
        choices: [
          ['COUNT', 'Count - Number of records'],
          ['SUM', 'Sum - Total of values'],
          ['AVG', 'Average - Mean value'],
          ['MIN', 'Minimum - Smallest value'],
          ['MAX', 'Maximum - Largest value']
        ]
      }
    },
    {
      class: 'String',
      name: 'aggregationProperty',
      documentation: 'Property to aggregate (for SUM, AVG, MIN, MAX)',
      visibility: function(view, aggregation) {
        // Show aggregation property only for GroupBy charts when aggregation is not COUNT
        return view === 'foam.dashboard.model.GroupBy' && aggregation !== 'COUNT' ? 'RW' : 'HIDDEN';
      },
      view: function(_, X) {
        return {
          class: 'foam.core.reflow.PropertyChoiceView',
          forCls: X.data.dao.of,
          predicate: function(p) {
            // Only show numeric properties
            return foam.lang.Int.isInstance(p) || 
                   foam.lang.Long.isInstance(p) || 
                   foam.lang.Float.isInstance(p) || 
                   foam.lang.Double.isInstance(p);
          }
        };
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
      // For dashboard models, we need special handling
      if ( this.VIEW_TYPES.DASHBOARD_MODELS.includes(this.view) ) {
        var config = this.getBaseViewConfig();
        if ( config.visualization ) {
          // For GroupBy models, find the selected chart view
          if ( this.view === 'foam.dashboard.model.GroupBy' ) {
            var view = config.visualization.views.find(function(v) { 
              return v[1] === config.currentView; 
            }.bind(this));
            if ( view ) {
              return { class: view[0] };
            }
          }
          // For Count models, use the first view (which is the count display)
          return { class: config.visualization.views[0][0] };
        }
      }
      
      // For non-dashboard views with wrapper
      if ( this.useWrapper && this.wrapperType ) {
        var spec = {
          class: this.wrapperType
        };
        var wrapperConfig = this.getViewConfig();
        Object.assign(spec, wrapperConfig);
        return spec;
      }
      
      // Simple views
      return { class: this.view };
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
      
      if ( this.VIEW_TYPES.DASHBOARD_MODELS.includes(this.view) ) {
        if ( ! this.dao ) {
          console.warn('No DAO available for dashboard widget:', this.view);
          return config;
        }
        if ( ! this.dao.of ) {
          console.warn('DAO has no model (of property):', this.dao);
          return config;
        }
        if ( this.view === 'foam.dashboard.model.Count' ) {
          // Use DashboardCount for count display
          var countVisualization = this.DashboardCount.create({
            dao: this.dao,
            size: this.cardSize ? this.VisualizationSize[this.cardSize] : this.VisualizationSize.SMALL,
            label: this.chartTitle || 'Count',
            configView: null  // Hide the configuration dropdown
          });
          
          config.data = countVisualization;
          config.visualization = countVisualization;
          config.currentView = this.chartView;  // Will be ignored for Count
          
        } else if ( this.view === 'foam.dashboard.model.GroupBy' ) {
          if ( this.xProperty && this.dao && this.dao.of ) {
            // Extract just the property name from fully qualified name
            var xPropertyName = this.xProperty;
            if ( xPropertyName.includes('.') ) {
              xPropertyName = xPropertyName.split('.').pop();
            }
            
            var yPropertyName = this.yProperty;
            if ( yPropertyName && yPropertyName.includes('.') ) {
              yPropertyName = yPropertyName.split('.').pop();
            }
            
            // Validate that the x property exists on the model
            var xProp = this.dao.of.getAxiomByName(xPropertyName);
            if ( ! xProp ) {
              console.warn('X Property not found on model:', xPropertyName, 'from xProperty:', this.xProperty);
              return config;
            }
            
            
            // Use DashboardGroupBy for aggregation charts (Pie, Bar)
            var visualization = this.DashboardGroupBy.create({
              dao: this.dao,
              arg1: xPropertyName,
              size: this.cardSize ? this.VisualizationSize[this.cardSize] : this.VisualizationSize.MEDIUM,
              label: this.chartTitle || xPropertyName + ' (' + this.aggregation + ')',
              configView: null  // Hide the configuration dropdown
            });
            
            console.log('Created DashboardGroupBy:', visualization, 'sink:', visualization.sink);
            console.log('DashboardGroupBy views:', visualization.views);
            console.log('Setting currentView to:', this.chartView);
            
            // Set currentView safely - only if it matches a view in the views array
            var matchingView = visualization.views.find(function(v) { return v[1] === this.chartView; }.bind(this));
            if ( matchingView ) {
              visualization.currentView = this.chartView;
            } else {
              console.warn('ChartView', this.chartView, 'not found in views array:', visualization.views.map(function(v) { return v[1]; }));
              // Fallback to first view
              visualization.currentView = visualization.views[0][1];
            }
            
            config.data = visualization;
            config.visualization = visualization;
            config.currentView = this.chartView;
          }
        
        } else if ( this.view === 'foam.dashboard.model.XYVisualization' ) {
          if ( this.xProperty && this.dao && this.dao.of ) {
            // Extract simple property names
            var xPropertyName = this.xProperty.includes('.') ? 
              this.xProperty.split('.').pop() : this.xProperty;
            var yPropertyName = this.yProperty && this.yProperty.includes('.') ? 
              this.yProperty.split('.').pop() : this.yProperty;
            
            // Validate x property exists
            var xProp = this.dao.of.getAxiomByName(xPropertyName);
            if ( ! xProp ) {
              console.warn('X Property not found on model:', xPropertyName);
              return config;
            }
            
            // Validate y property if provided
            if ( yPropertyName ) {
              var yProp = this.dao.of.getAxiomByName(yPropertyName);
              if ( ! yProp ) {
                console.warn('Y Property not found on model:', yPropertyName);
                return config;
              }
            }
            
            // Use XYVisualization for true X/Y plotting
            var visualization = this.XYVisualization.create({
              dao: this.dao,
              xProperty: xPropertyName,
              yProperty: yPropertyName,
              size: this.cardSize ? this.VisualizationSize[this.cardSize] : this.VisualizationSize.MEDIUM,
              label: this.chartTitle || xPropertyName + (yPropertyName ? ' vs ' + yPropertyName : ''),
              configView: null
            });
            
            console.log('Created XYVisualization:', visualization, 'sink:', visualization.sink);
            console.log('XYVisualization views:', visualization.views);
            console.log('Setting currentView to:', this.chartView);
            
            // Set currentView safely - only if it matches a view in the views array
            var matchingView = visualization.views.find(function(v) { return v[1] === this.chartView; }.bind(this));
            if ( matchingView ) {
              visualization.currentView = this.chartView;
            } else {
              console.warn('ChartView', this.chartView, 'not found in views array:', visualization.views.map(function(v) { return v[1]; }));
              // Fallback to first view
              visualization.currentView = visualization.views[0][1];
            }
            
            config.data = visualization;
            config.visualization = visualization;
            config.currentView = this.chartView;
          }
        }
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