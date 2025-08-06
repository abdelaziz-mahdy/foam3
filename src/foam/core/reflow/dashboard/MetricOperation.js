/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.ENUM({
  package: 'foam.core.reflow.dashboard',
  name: 'MetricOperation',

  documentation: 'Operations available for dashboard metrics',

  properties: [
    {
      name: 'createSink',
      value: function(agent) {
        console.warn('createSink not implemented for MetricOperation', this.name);
      }
    }
  ],

  values: [
    { 
      name: 'COUNT', 
      label: 'Count',
      createSink: function(agent) {
        return agent.Count.create();
      }
    },
    { 
      name: 'SUM',   
      label: 'Sum',
      createSink: function(agent) {
        return agent.Sum.create({ arg1: agent.prop });
      }
    },
    { 
      name: 'MIN',   
      label: 'Min',
      createSink: function(agent) {
        return agent.Min.create({ arg1: agent.prop });
      }
    },
    { 
      name: 'MAX',   
      label: 'Max',
      createSink: function(agent) {
        return agent.Max.create({ arg1: agent.prop });
      }
    },
    { 
      name: 'AVG',   
      label: 'Avg',
      createSink: function(agent) {
        return agent.Average.create({ arg1: agent.prop });
      }
    }
  ]
});