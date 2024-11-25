/**
 * @license
 * Copyright 2024 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.nanos.auth.ruler',
  name: 'UserLifecycleTicketRuleAction',

  documentation: 'Change User Lifecycle state with consideration of associated data.',

  implements: [
    'foam.nanos.ruler.RuleAction'
  ],

  javaImports: [
    'foam.core.ContextAgent',
    'foam.core.Detachable',
    'foam.core.FObject',
    'foam.core.PropertyInfo',
    'foam.core.X',
    'foam.dao.Sink',
    'foam.dao.DAO',
    'static foam.mlang.MLang.AND',
    'static foam.mlang.MLang.EQ',
    'static foam.mlang.MLang.OR',
    'foam.nanos.auth.EnabledAware',
    'foam.nanos.auth.LifecycleAware',
    'foam.nanos.auth.LifecycleState',
    'foam.nanos.auth.User',
    'foam.nanos.session.Session',
    'foam.nanos.crunch.UserCapabilityJunction',
    'foam.nanos.logger.Logger',
    'foam.nanos.logger.Loggers',
    'foam.nanos.logger.PrefixLogger',
    'foam.nanos.ticket.Ticket',
    'java.util.ArrayList',
    'java.util.List'
  ],

  constants: [
    {
      name: 'UPDATED_LIST',
      type: 'String',
      value: "UPDATED_LIST"
    }
  ],

  methods: [
    {
      name: 'applyAction',
      javaCode: `
        agency.submit(x, new ContextAgent() {
          @Override
          public void execute(X x) {
            X rulerX = ruler.getX();
            User admin = new User();
            admin.setId(1);
            admin.setGroup("admin");
            X systemX = foam.util.Auth.sudo(ruler.getX(), admin);
            UserLifecycleTicket ticket = (UserLifecycleTicket) obj;
            DAO dao = (DAO) rulerX.get("userDAO");
            User user = (User) dao.find(ticket.getCreatedFor());

            LifecycleState old = user.getLifecycleState();
            LifecycleState nu = ticket.getRequestedLifecycleState();

            // TODO: if re-activating a user, need to check that
            // username has not been re-used.

            try {
              if ( old != nu ) {
                updateUserAssociations(
                  systemX
                    .put("logger", new PrefixLogger(new Object[] { "UserLifecycleTicket", user.getId() }, (Logger) x.get("logger")))
                    .put(UserLifecycleTicket.class, ticket),
                  user, nu);
                user = (User) user.fclone();
                user.setLifecycleState(nu);
                ((Logger) x.get("logger")).info("UserLifecycleTicket", user.getId(), old, nu);
                ((DAO) ruler.getX().get("localUserDAO")).put(user);
              }
              ticket.setMessage(null);
              ticket.setStatus("CLOSED");
            } catch (Throwable t) {
              ticket.setMessage(t.getMessage());
              if ( nu == LifecycleState.DISABLED ||
                   nu == LifecycleState.DELETED ) {
                user.setLoginEnabled(false);
                ((Logger) x.get("logger")).warning("UserLifecycleTicket", user.getId(), "disable login", t.getMessage());
                ((DAO) ruler.getX().get("localUserDAO")).put(user);
              }
            }
          }
        }, "UserLifecycleTicketRuleAction");
      `
    },
    {
      documentation: 'Hook for application refinements',
      name: 'updateUserAssociations',
      args: 'X x, User user, LifecycleState state',
      javaCode: `
      updateSessions(x, user, state);
      updateUCJs(x, user, state);
      updateCredentials(x, user, state);
      updateReferralCodes(x, user, state);
      updatePushRegistrations(x, user, state);
      updateDocuments(x, user, state);
      `
    },
    {
      name: 'updateSessions',
      args: 'X x, User user, LifecycleState state',
      javaCode: `
      if ( state == LifecycleState.DISABLED ||
           state == LifecycleState.DELETED )  {
        ((DAO) x.get("sessionDAO")).where(
          OR(
            EQ(Session.USER_ID, user.getId()),
            EQ(Session.AGENT_ID, user.getId())
          )).removeAll();
      }
      `
    },
    {
      name: 'updateUCJs',
      args: 'X x, User user, LifecycleState state',
      javaCode: `
      ((foam.dao.ManyToManyRelationship) user.getCapabilities(x)).getDAO().select(
        new UserLifecycleTicketSink(x, state, "userCapabilityJunctionDAO"));
      `
    },
    {
      name: 'updateCredentials',
      args: 'X x, User user, LifecycleState state',
      javaCode: `
      user.getCredentials(x).select(
        new UserLifecycleTicketSink(x, state, "credentialDAO"));
      `
    },
    {
      name: 'updateReferralCodes',
      args: 'X x, User user, LifecycleState state',
      javaCode: `
      user.getReferralCodes(x).select(
        new UserLifecycleTicketSink(x, state, "referralCodeDAO"));
      `
    },
    {
      name: 'updateDocuments',
      args: 'X x, User user, LifecycleState state',
      javaCode: `
      // user.getRepoDocuments()
      `
    },
    {
      name: 'updatePushRegistrations',
      args: 'X x, User user, LifecycleState state',
      javaCode: `
      user.getPushRegistrations(x).select(
        new UserLifecycleTicketSink(x, state, "pushRegistrationDAO"));
      `
    },
  ]
});
