/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.core.reflow',
  name: 'ReflowDashboardData',
  mixins: ['com.paytic.flow.DAOResolverMixin'],

  requires: [
    'foam.core.reflow.WidgetConfig'
  ],

  messages: [
    { name: 'TITLE', message: 'Dashboard' }
  ],

  properties: [
    {
      class: 'String',
      name: 'viewTitle',
      factory: function() {
        return this.TITLE;
      }
    },
    'dashboardTitle',
    {
      name: 'main',
      documentation: 'Should be set to true on the most top-level dashboard.',
      value: false,
      hidden: true
    },
    {
      name: 'width',
      documentation: 'The fixed number of grid columns for the dashboard.',
      value: 'repeat(12, 1fr)',
      hidden: true
    },
    {
      name: 'height',
      documentation: 'The fixed number of grid rows for the dashboard.',
      value: 'min-content',
      hidden: true
    },
    {
      name: 'gap',
      documentation: 'The px gap between dashboard widgets.',
      value: '1.6em',
      hidden: true
    },
    {
      class: 'FObjectArray',
      of: 'foam.core.reflow.WidgetConfig',
      name: 'widgets',
      documentation: 'Array of widget configurations for the dashboard.',
      postSet: function(oldValue, newValue) {
        var self = this;
        
        // Detach old widget listeners
        if ( oldValue ) {
          oldValue.forEach(function(widget) {
            widget.detach && widget.detach();
          });
        }
        
        // Subscribe to new widget property changes
        if ( newValue ) {
          newValue.forEach(function(widget) {
            widget.sub && widget.sub('propertyChange', function() {
              self.pub('propertyChange', 'widgets');
            });
          });
        }
        
        // // Publish property change for widget array changes
        // this.pub('propertyChange', 'widgets');
      }
    },
  ],

  methods: [
    function init() {
      this.SUPER();
      var self = this;
      
      // Set up listeners for existing widgets
      (this.widgets || []).forEach(function(widget) {
        widget.sub && widget.sub('propertyChange', function() {
          self.pub('propertyChange', 'widgets');
        });
      });
      
      // Trigger initial property change
      this.pub('propertyChange', 'widgets');
    },

    function clearWidgets() {
      // Detach all widget listeners
      (this.widgets || []).forEach(function(widget) {
        widget.detach && widget.detach();
      });
      this.widgets = [];
      this.pub('propertyChange', 'widgets');
    },

    function updateLayout() {
      // Trigger layout recalculation
      this.pub('propertyChange', 'widgets');
    }
  ],

  actions: [
    {
      name: 'refreshLayout',
      label: 'Refresh Layout',
      code: function() {
        this.updateLayout();
      }
    },
    {
      name: 'resetWidgets',
      label: 'Reset Widgets',
      code: function() {
        this.clearWidgets();
      }
    }
  ]
});