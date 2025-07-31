/**
 * @license
 * Copyright 2019 The FOAM Authors. All Rights Reserved.
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
      of: 'foam.dashboard.model.MetricOperation',
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
      var ExpressionsSingleton = foam.mlang.ExpressionsSingleton.create();
      
      switch(this.operation) {
        case 'COUNT':
          return this.Count.create();
        case 'SUM':
          return this.Sum.create({
            arg1: this.property 
          });
        case 'MIN':
          return this.Min.create({
            arg1: this.property
          });
        case 'MAX':
          return this.Max.create({
            arg1: this.property
          });
        case 'AVG':
          return this.Average.create({
            arg1: this.property
          });
        default:
          return this.Count.create();
      }
    }
  ]
});

foam.ENUM({
  package: 'foam.dashboard.model',
  name: 'MetricOperation',
  
  values: [
    { name: 'COUNT', label: 'Count' },
    { name: 'SUM',   label: 'Sum' },
    { name: 'MIN',   label: 'Minimum' },
    { name: 'MAX',   label: 'Maximum' },
    { name: 'AVG',   label: 'Average' }
  ]
});