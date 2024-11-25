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
    'foam.nanos.auth.User',
    'java.util.ArrayList',
    'java.util.List'
  ],

  imports: [
    'userDAO',
    'sessionDAO'
  ],

  requires: [
    'foam.nanos.auth.User',
    'foam.nanos.session.Session'
  ],

  properties: [
    {
      name: 'status',
      order: 5,
      createVisibility: 'HIDDEN'
    },
    {
      name: 'statusChoices',
      hidden: true,
      factory: function() {
        var s = [];
        if ( 'CLOSED' == this.status ) {
          s.push(['OPEN', 'OPEN']);
        } else {
          s.push(this.status);
          s.push(['CLOSED', 'CLOSED']);
        }
        return s;
      }
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
        if ( ! X.data.createdFor ) {
          X.data.createdFor$.sub(function() {
            X.userDAO.find(X.data.createdFor).then(function(user) {
              X.data.state = user.lifecycleState;
            });
            X.sessionDAO.find(X.data.EQ(X.data.Session.USER_ID, X.data.createdFor)).then(function(session) {
              if ( ! session )
                return;
              X.data.loggedIn = session.uses > 0 && session.remoteHost;
              X.data.lastActivity = Date.now() - session.lastUsed.getTime();
            });
          });
        } else {
          X.userDAO.find(X.data.createdFor).then(function(user) {
            X.data.state = user.lifecycleState;
          });
          X.sessionDAO.find(X.data.EQ(X.data.Session.USER_ID, X.data.createdFor)).then(function(session) {
            if ( ! session )
              return;
            X.data.loggedIn = session.uses > 0 && session.remoteHost;
            X.data.lastActivity = Date.now() - session.lastUsed.getTime();
          });
        }
        return {
          class: 'foam.u2.view.ReadOnlyEnumView',
          of: 'foam.nanos.auth.LifecycleState',
          data$: X.data.state$
        };
      }
    },
    {
      name: 'loggedIn',
      class: 'Boolean',
      value: false,
      transient: true,
      visibility: 'RO',
      section: 'infoSection',
      order: 8
    },
    {
      name: 'lastActivity',
      class: 'Duration',
      transient: true,
      visibility: 'RO',
      section: 'infoSection',
      order: 9
    },
    {
      name: 'requestedLifecycleState',
      class: 'foam.core.Enum',
      of: 'foam.nanos.auth.LifecycleState',
      value: foam.nanos.auth.LifecycleState.DELETED,
      section: 'infoSection',
      order: 10
    },
    {
      name: 'message',
      class: 'String',
      createVisibility: 'HIDDEN',
      updateVisibility: 'RO',
      readVisibility: 'RO',
      section: 'infoSection',
      order: 11
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
    },
    {
      name: 'updated',
      class: 'List',
      javaFactory: 'return new ArrayList();',
      createVisibility: 'HIDDEN',
      readVisibility: 'RO',
      updateVisibility: 'RO',
      section: 'infoSection',
      order: 12
    }
  ]
})
