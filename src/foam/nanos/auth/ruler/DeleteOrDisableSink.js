/**
 * @license
 * Copyright 2024 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.nanos.auth.ruler',
  name: 'DeleteOrDisableSink',
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
    public DeleteOrDisableSink(X x, String daoKey) {
      setX(x);
      setDaoKey(daoKey);
    }

    public DeleteOrDisableSink(X x, LifecycleState state, String daoKey) {
      setX(x);
      setDaoKey(daoKey);
      setLifecycleState(state);
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
      PropertyInfo prop = (PropertyInfo) ((FObject)obj).getClassInfo().getAxiomByName("id");
      String id = prop != null ? String.valueOf(prop.get(obj)) : "N/A";
      StringBuilder sb = new StringBuilder();
      sb.append(getDaoKey());
      sb.append(",");
      sb.append(obj.getClass().getSimpleName());
      sb.append(",");
      sb.append(id);

      List updated = (List) x.get(UserLifecycleTicketRuleAction.UPDATED_LIST);
      DAO dao = (DAO) x.get(getDaoKey());
      if ( dao == null ) {
        logger.error("DAO not found", getDaoKey(), sb.toString(), "not updated");
        return;
      }
      if ( obj instanceof LifecycleAware ) {
        LifecycleAware aware = ((LifecycleAware) obj);
        if ( aware.getLifecycleState() != getLifecycleState() ) {
          aware = (LifecycleAware) ((FObject)aware).fclone();
          aware.setLifecycleState(getLifecycleState());
          sb.append(",");
          sb.append("LifecycleAware");
          sb.append(",");
          sb.append(getLifecycleState());
          // dao.put_(x, aware);
          logger.debug(sb.toString());
          if ( updated != null )
            updated.add(sb.toString());
        }
      } else if ( obj instanceof EnabledAware ) {
        EnabledAware aware = (EnabledAware) obj;
        if ( aware.getEnabled() ) {
          aware = (EnabledAware) ((FObject)aware).fclone();
          aware.setEnabled(false);
          sb.append(",");
          sb.append("EnabledAware");
          sb.append(",");
          sb.append("false");
          // dao.put_(x, aware);
          logger.debug(sb.toString());
          if ( updated != null )
            updated.add(sb.toString());
        }
      } else {
        sb.append(",");
        sb.append("DAO");
        sb.append(",");
        sb.append("remove");
        // dao.remove_(x, obj);
        logger.debug(sb.toString());
        if ( updated != null )
          updated.add(sb.toString());
      }
      `
    }
  ]
});
