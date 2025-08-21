/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.core.test',
  name: 'TestRun',

  implements: [
    'foam.core.auth.CreatedAware',
    'foam.core.auth.LastModifiedAware'
  ],

  tableColumns: [
    'created',
    'language',
    'passed',
    'failed',
    'total'
  ],

  properties: [
    {
      name: 'id',
      class: 'String',
      createVisibility: 'HIDDEN',
      updateVisibility: 'RO',
      readVisibility: 'RO'
    },
    {
      name: 'suite',
      class: 'String'
    },
    {
      name: 'tests',
      class: 'String',
      value: 'all'
    },
    {
      class: 'Enum',
      of: 'foam.core.script.Language',
      name: 'language',
      value: 'BEANSHELL'
    },
    {
      name: 'completed',
      class: 'Boolean'
    },
    {
      name: 'units',
      class: 'Int'
    },
    {
      name: 'total',
      class: 'Int'
    },
    {
      name: 'passed',
      class: 'Int'
    },
    {
      name: 'failed',
      class: 'Int'
    },
    {
      name: 'failures',
      class: 'String',
      view: {
        class: 'foam.u2.tag.TextArea',
        rows: 5, cols: 60,
      }
    }
  ]
});
