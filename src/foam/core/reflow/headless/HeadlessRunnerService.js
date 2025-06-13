/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.core.reflow.headless',
  name: 'HeadlessRunner',

  documentation: 'Represents a headless flow runner instance',

  properties: [
    {
      class: 'String',
      name: 'id',
      documentation: 'Unique identifier for this runner'
    },
    {
      class: 'String', 
      name: 'flowName',
      documentation: 'Name of the flow being executed'
    },
    {
      class: 'String',
      name: 'sessionId', 
      documentation: 'Session ID for the flow execution'
    },
    {
      class: 'DateTime',
      name: 'startTime',
      documentation: 'When the runner was started'
    },
    {
      class: 'Object',
      name: 'process',
      transient: true,
      javaType: 'Process',
      documentation: 'The Chrome process (Java-side only)'
    }
  ]
});

foam.INTERFACE({
  package: 'foam.core.reflow.headless',
  name: 'HeadlessRunnerService',

  skeleton: true,
  client: true,
  proxy: true,

  documentation: 'Service for managing headless flow runner instances',

  methods: [
    {
      name: 'addRunner',
      documentation: 'Add a new headless runner and return its ID',
      async: true,
      type: 'String',
      args: 'String flowName, String sessionId'
    },
    {
      name: 'removeRunner',
      documentation: 'Remove a headless runner by ID',
      async: true,
      type: 'boolean',
      args: 'String runnerId'
    },
    {
      name: 'hasRunner',
      documentation: 'Check if a runner exists',
      async: true,
      type: 'boolean',
      args: 'String runnerId'
    },
    {
      name: 'getRunningCount',
      documentation: 'Get the number of currently running instances',
      async: true,
      type: 'int'
    },
    {
      name: 'setProcess',
      documentation: 'Set the process for a runner (internal use)',
      args: 'String runnerId, Object process'
    },
    {
      name: 'cleanup',
      documentation: 'Clean up completed processes'
    }
  ]
});