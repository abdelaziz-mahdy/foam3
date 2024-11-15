/**
 * @license
 * Copyright 2024 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */
foam.CLASS({
  package: 'foam.nanos.auth.ruler',
  name: 'UserLifecycleTicket',
  extends: 'foam.nanos.ticket.Ticket',

  documentation: `Ticket to coordinate the changing of a User's lifecycle state.  Changing to 'DELETED', for example, will also mark associated UCJs as deleted.`,

  implements: [
    'foam.mlang.Expressions'
  ],

  javaImports: [
    'foam.dao.DAO',
    'foam.nanos.auth.User'
  ],

  properties: [
    {
      name: 'status',
      order: 5,
      createVisibility: 'HIDDEN'
    },
    {
      name: 'state',
      hidden: true,
      transient: true
    },
    {
      name: 'currentLifecycleState',
      class: 'foam.core.Enum',
      of: 'foam.nanos.auth.LifecycleState',
      value: foam.nanos.auth.LifecycleState.PENDING,
      transient: true,
      visibility: 'RO',
      section: 'infoSection',
      order: 7,
      view: function(_, X) {
        X.data.state = foam.nanos.auth.LifecycleState.PENDING;
        X.data.createdFor$.sub(function() {
          X.userDAO.find(X.data.createdFor).then(function(user) {
            X.data.state = user.lifecycleState;
          });
        });
        return {
          class: 'foam.u2.view.ReadOnlyEnumView',
          of: 'foam.nanos.auth.LifecycleState',
          data$: X.data.state$
        };
      }
    },
    {
      name: 'requestedLifecycleState',
      class: 'foam.core.Enum',
      of: 'foam.nanos.auth.LifecycleState',
      value: foam.nanos.auth.LifecycleState.DELETED,
      section: 'infoSection',
      order: 8,
    },
    {
      name: 'assignedTo',
      hidden: true
    },
    {
      name: 'assignedToGroup',
      hidden: true
    },
    {
      name: 'externalComment',
      hidden: true
    }
  ]
})
