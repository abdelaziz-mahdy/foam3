/**
 * @license
 * Copyright 2024 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.nanos.auth.ruler',
  name: 'UserLifecycleTicketSink',
  extends: 'foam.dao.AbstractSink',

  documentation: 'Desgined to be used by the UserLifecycleTicket to delete or disable user associated models',

  javaImports: [
    'foam.core.FObject',
    'foam.core.PropertyInfo',
    'foam.core.X',
    'foam.dao.DAO',
    'foam.dao.ProxyDAO',
    'foam.dao.Sink',
    'foam.nanos.auth.EnabledAware',
    'foam.nanos.auth.LifecycleAware',
    'foam.nanos.auth.LifecycleState',
    'foam.nanos.auth.User',
    'foam.nanos.logger.Logger',
    'foam.nanos.logger.Loggers',
    'java.util.List'
  ],

  javaCode: `
    public UserLifecycleTicketSink(X x, String daoKey) {
      setX(x);
      setDaoKey(daoKey);
    }

    public UserLifecycleTicketSink(X x, LifecycleState state, String daoKey) {
      setX(x);
      setLifecycleState(state);
      setDaoKey(daoKey);
    }
  `,

  properties: [
    {
      class: 'String',
      name: 'daoKey'
    },
    {
      class: 'Enum',
      of: 'foam.nanos.auth.LifecycleState',
      name: 'lifecycleState',
      value: 'DELETED'
    }
  ],

  methods: [
    {
      name: 'put',
      javaCode: `
      X x = getX();
      Logger logger = (Logger) x.get("logger");
      Object id = obj instanceof Identifiable ? ((Identifiable) obj).getPrimaryKey() : null;
      UserLifecycleTicket ticket = x.get(UserLifecycleTicket.class);
      UserLifecycleTicketUpdate update = new UserLifecycleTicketUpdate();
      update.setDaoKey(getDaoKey());
      update.setOf(((FObject)obj).getClassInfo());
      update.setId(id);
      DAO dao = (DAO) x.get(getDaoKey());
      if ( dao == null ) {
        logger.error("DAO not found", getDaoKey(), update, "not updated");
        return;
      }
      if ( obj instanceof LifecycleAware ) {
        LifecycleAware aware = ((LifecycleAware) obj);
        if ( aware.getLifecycleState() != getLifecycleState() ) {
          aware = (LifecycleAware) ((FObject)aware).fclone();
          update.setPreviousState(aware.getLifecycleState());
          aware.setLifecycleState(getLifecycleState());
          update.setCurrentState(aware.getLifecycleState());
          dao.put_(x, (FObject) aware);
          logger.debug(update);
          ticket.getUpdated().add(update);
        }
      } else if ( obj instanceof EnabledAware ) {
        EnabledAware aware = (EnabledAware) obj;
        aware = (EnabledAware) ((FObject)aware).fclone();
        update.setPreviousState(aware.getEnabled());
        if ( getLifecycleState() == LifecycleState.ACTIVE &&
             ! aware.getEnabled() ) {
          aware.setEnabled(true);
        } else if ( ( getLifecycleState() == LifecycleState.DELETED ||
                      getLifecycleState() == LifecycleState.DISABLED ) &&
                    aware.getEnabled() ) {
          aware.setEnabled(false);
        } else {
          return;
        }
        update.setCurrentState(aware.getEnabled());
        dao.put_(x, (FObject) aware);
        logger.debug(update);
        ticket.getUpdated().add(update);
      } else if ( getLifecycleState() == LifecycleState.DELETED ) {
        update.setPreviousState(true);
        update.setCurrentState(null);

        // TODO: Enable after testing
        // dao.remove_(x, obj);
        logger.warning("UserLifecycleTicket,DELETED,delete,disabled");
        // logger.debug(update);
        // ticket.getUpdated().add(update);
      }
      `
    }
  ]
});
