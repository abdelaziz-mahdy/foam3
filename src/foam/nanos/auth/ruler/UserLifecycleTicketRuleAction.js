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
    'foam.nanos.auth.EnabledAware',
    'foam.nanos.auth.LifecycleAware',
    'foam.nanos.auth.LifecycleState',
    'foam.nanos.auth.User',
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
            UserLifecycleTicket ticket = (UserLifecycleTicket) obj;
            DAO dao = (DAO) rulerX.get("userDAO");
            User user = (User) dao.find(ticket.getCreatedFor());

            LifecycleState old = user.getLifecycleState();
            LifecycleState nu = ticket.getRequestedLifecycleState();

            if ( old != nu ) {
              List updated = new ArrayList();
              updateUserAssociations(
                rulerX
                  .put("logger", new PrefixLogger(new Object[] { "UserLifecycleTicket", user.getId() }, (Logger) x.get("logger")))
                  .put(UPDATED_LIST, updated),
                user, nu);
              user = (User) user.fclone();
              user.setLifecycleState(nu);
              ((Logger) x.get("logger")).info("UserLifecycleTicket", user.getId(), old, nu);
              // ((DAO) rulerX.get("localUserDAO")).put(user);
              // TODO: ticket.setUpdated(updated);
            }
            ticket.setStatus("CLOSED");
          }
        }, "UserLifecycleTicketRuleAction");
      `
    },
    {
      documentation: 'Hook for application refinements',
      name: 'updateUserAssociations',
      args: 'X x, User user, LifecycleState state',
      javaCode: `
      updateUCJs(x, user, state);
      updateCredentials(x, user, state);
      updateReferralCodes(x, user, state);
      updatePushRegistrations(x, user, state);
      updateDocuments(x, user, state);
      `
    },
    {
      name: 'updateUCJs',
      args: 'X x, User user, LifecycleState state',
      javaCode: `
      if ( state != LifecycleState.DELETED ) return;
      ((foam.dao.ManyToManyRelationship) user.getCapabilities(x)).getDAO().select(
        new DeleteOrDisableSink(x, "userCapabilityJunctionDAO"));
      `
    },
    {
      name: 'updateCredentials',
      args: 'X x, User user, LifecycleState state',
      javaCode: `
      if ( state != LifecycleState.DELETED ) return;
      user.getCredentials(x).select(
        new DeleteOrDisableSink(x, "credentialDAO"));
      `
    },
    {
      name: 'updateReferralCodes',
      args: 'X x, User user, LifecycleState state',
      javaCode: `
      if ( state != LifecycleState.DELETED ) return;
      user.getReferralCodes(x).select(
        new DeleteOrDisableSink(x, "referralCodeDAO"));
      `
    },
    {
      name: 'updateDocuments',
      args: 'X x, User user, LifecycleState state',
      javaCode: `
      if ( state != LifecycleState.DELETED ) return;
      // user.getRepoDocuments()
      `
    },
    {
      name: 'updatePushRegistrations',
      args: 'X x, User user, LifecycleState state',
      javaCode: `
      if ( state != LifecycleState.DELETED ) return;
      user.getPushRegistrations(x).select(
        new DeleteOrDisableSink(x, "pushRegistrationDAO"));
      `
    },
  ]
});
