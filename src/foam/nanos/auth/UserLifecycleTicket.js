/**
 * @license
 * Copyright 2024 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */
foam.CLASS({
  package: 'foam.nanos.auth',
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
      name: 'spid',
      section: 'infoSection',
      required: true,
      order: 2
    },
    {
      name: 'status',
      order: 5,
      createVisibility: 'HIDDEN'
    },
    {
      name: 'currentLifecycleState',
      class: 'foam.core.Enum',
      of: 'foam.nanos.auth.LifecycleState',
      value: foam.nanos.auth.LifecycleState.PENDING,
      section: 'infoSection',
      order: 7,
      view: async function(_, X) {
        var state = foam.nanos.auth.LifecycleState.PENDING;
        var lifecycleSlot = X.data.slot(createdFor => {
          X.userDAO.find(createdFor).then(function(user) {
            state = user.lifecycleState;
          });
        });
        return {
          class: 'foam.u2.view.ReadOnlyEnumView',
          of: 'foam.nanos.auth.LifecycleState',
          data$: state$
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
    // {
    //   name: 'comment',
    //   hidden: true
    // },
    {
      name: 'externalComment',
      hidden: true
    },
  //   {
  //     name: 'type',
  //     hidden: true
  //   }
  ]
})
