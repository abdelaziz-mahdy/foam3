/**
 * @license
 * Copyright 2022 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.core.reflow',
  name: 'ReflowDashboardData',
  mixins: ['com.paytic.flow.DAOResolverMixin'],

  requires: [
    'foam.core.reflow.WidgetConfig'
  ],

  topics: ['onUpdate'],

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
      factory: function() {
        return [];
      }
    },
  ],

  methods: [
    function addWidget(widget) {
      if ( ! foam.core.reflow.WidgetConfig.isInstance(widget) ) {
        widget = this.WidgetConfig.create(widget);
      }
      this.widgets = this.widgets.concat([widget]);
      this.pub('onUpdate');
    },

    function removeWidget(widgetId) {
      this.widgets = this.widgets.filter(w => w.id !== widgetId);
      this.pub('onUpdate');
    },

    function updateWidget(widgetId, updates) {
      var widget = this.widgets.find(w => w.id === widgetId);
      if ( widget ) {
        Object.keys(updates).forEach(key => {
          widget[key] = updates[key];
        });
        this.pub('onUpdate');
      }
    },

    function getWidget(widgetId) {
      return this.widgets.find(w => w.id === widgetId);
    },

    function clearWidgets() {
      this.widgets = [];
      this.pub('onUpdate');
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