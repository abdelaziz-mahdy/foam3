/**
 * @license
 * Copyright 2024 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.nanos.auth.ruler',
  name: 'UserLifecycleDeletedDAO',
  extends: 'foam.dao.ProxyDAO',

  documentation: `When a user attempts to delete themselves, set user to disabled and open a UserLifecycleTicket for an operator to properly delete the user`,

  javaImports: [
    'foam.core.Detachable',
    'foam.core.X',
    'foam.dao.DAO',
    'foam.dao.AbstractSink',
    'foam.dao.Sink',
    'static foam.mlang.MLang.*',
    'foam.nanos.auth.AuthService',
    'foam.nanos.auth.LifecycleState',
    'foam.nanos.auth.User',
    'foam.nanos.logger.Loggers',
    'foam.nanos.session.Session'
  ],

  javaCode: `
  public UserLifecycleDeletedDAO(X x, DAO delegate) {
    setX(x);
    setDelegate(delegate);
  }
  `,

  methods: [
    {
      name: 'put_',
      javaCode: `
      User user = (User) obj;
      if ( user.getLifecycleState() != LifecycleState.DELETED ) {
        return getDelegate().put_(x, obj);
      }

      User old = (User) getDelegate().find(user.getId());
      if ( old.getLifecycleState() == LifecycleState.DELETED ) {
        return getDelegate().put_(x, obj);
      }

      user.setLifecycleState(LifecycleState.DISABLED);

      user = (User) getDelegate().put_(x, user);

      try {
        // create ticket
        UserLifecycleTicket ticket = new UserLifecycleTicket();
        ticket.setCreatedFor(user.getId());
        ticket.setSpid(user.getSpid());
        ticket.setRequestedLifecycleState(LifecycleState.DELETED);
        ticket.setTitle("(User initiated) "+user.getNote());
        ((DAO) getX().get("ticketDAO")).put_(getX(), ticket);
      } catch (Throwable t) {
        Loggers.logger(x, this).error("Failed to create UserLifecycleTicket", t);
      }

      try {
        // and logout user for now
        AuthService auth = (AuthService) x.get("auth");
        ((DAO) getX().get("sessionDAO")).where(
            OR(
              EQ(Session.USER_ID, user.getId()),
              EQ(Session.AGENT_ID, user.getId())
            )
          ).select(new AbstractSink() {
            @Override
            public void put(Object obj, Detachable sub) {
              Session session = (Session) obj;
              auth.logout(session.getContext());
            }
          });
      } catch (Throwable t) {
        Loggers.logger(x, this).error("Failed to logout", t);
      }

      return user;
      `
    }
  ]
});
