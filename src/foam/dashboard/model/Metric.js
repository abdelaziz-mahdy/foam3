/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.dashboard.model',
  name: 'Metric',
  extends: 'foam.dashboard.model.Visualization',

  requires: [
    'foam.dashboard.view.Metric as MetricView',
    'foam.mlang.sink.Count',
    'foam.mlang.sink.Sum',
    'foam.mlang.sink.Min',
    'foam.mlang.sink.Max',
    'foam.mlang.sink.Average',
    'foam.mlang.predicate.False',
    'foam.parse.QueryParser',
    'foam.u2.ContextSensitiveDetailView as DetailView'
  ],

  classes: [
    {
      name: 'MetricOperation',
      extends: 'foam.lang.AbstractEnum',
      
      properties: [
        {
          name: 'createSink',
          value: function(metric) {
            return metric.Count.create();
          }
        }
      ],
      
      values: [
        { 
          name: 'COUNT', 
          label: 'Count',
          createSink: function(metric) {
            return metric.Count.create();
          }
        },
        { 
          name: 'SUM',   
          label: 'Sum',
          createSink: function(metric) {
            return metric.Sum.create({
              arg1: metric.property 
            });
          }
        },
        { 
          name: 'MIN',   
          label: 'Minimum',
          createSink: function(metric) {
            return metric.Min.create({
              arg1: metric.property
            });
          }
        },
        { 
          name: 'MAX',   
          label: 'Maximum',
          createSink: function(metric) {
            return metric.Max.create({
              arg1: metric.property
            });
          }
        },
        { 
          name: 'AVG',   
          label: 'Average',
          createSink: function(metric) {
            return metric.Average.create({
              arg1: metric.property
            });
          }
        }
      ]
    }
  ],

  properties: [
    {
      name: 'views',
      factory: function() {
        return [
          [ this.MetricView,  'Metric' ],
          [ this.DetailView, 'Configure' ]
        ];
      }
    },
    {
      class: 'Enum',
      of: this.MetricOperation,
      name: 'operation',
      value: 'COUNT'
    },
    {
      class: 'foam.mlang.ExprProperty',
      name: 'property',
      documentation: 'Property to calculate metric on (for SUM, MIN, MAX, AVG operations)'
    },
    {
      name: 'sink',
      factory: function() {
        return this.createSink();
      }
    }
  ],

  methods: [
    function createSink() {
      return this.operation.createSink(this);
    }
  ]
});