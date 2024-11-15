/**
 * @license
 * Copyright 2024 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.nanos.auth.rule',
  name: 'DeleteOrDisableSink',
  extends: 'foam.dao.AbstractSink',

  documentation: 'Desgined to be used by the UserLifecycleTicket to delete or disable user associated models',

  javaImports: [
    'foam.core.FObject',
    'foam.core.X',
    'foam.dao.DAO',
    'foam.dao.ProxyDAO',
    'foam.dao.Sink',
    'foam.nanos.auth.LifecycleAware',
    'foam.nanos.auth.LifecycleState',
    'foam.nanos.auth.User',
    'foam.nanos.logger.Logger',
    'foam.nanos.logger.Loggers'
  ],

  javaCode: `
    public DeleteOrDisableSink(X x, User user, DAO dao) {
      setX(x);
      setUser(user);
      setDao(dao);
      setLogger(Loggers.logger(x, this, user.getId(), ((ProxyDAO) dao).getOf()));
    }
  `,

  properties: [
    {
      class: 'foam.dao.DAOProperty',
      name: 'dao'
    },
    {
      class: 'FObject',
      of: 'foam.nanos.auth.User',
      name: 'user'
    },
    {
      class: 'FObject',
      of: 'foam.nanos.logger.Logger',
      name: 'logger'
    }
  ],

  methods: [
    {
      name: 'put',
      javaCode: `
      FObject fObj = (FObject) ((FObject)obj).fclone();
      PropertyInfo prop = (PropertyInfo) fObj.getClassInfo().getAxiomByName("id");
      if ( fObj instanceof LifecycleAware ) {
        ((LifecycleAware) fObj).setLifecycleState(LifecycleState.DELETED);
        logger.debug("mark deleted", fObj.getClass().getSimpleName(), (prop != null ? prop.get(fObj) : ""));
        // dao.put_(x, obj);
      } else if ( fObj instanceof EnabledAware ) {
        ((EnabledAware) fObj).setEnabled(false);
        logger.debug("mark disabled", fObj.getClass().getSimpleName(), (prop != null ? prop.get(fObj) : ""));
        // dao.put_(x, obj);
      } else {
        logger.debug("deleted", fObj.getClass().getSimpleName(), (prop != null ? prop.get(fObj) : ""));
        // dao.remove_(x, obj);
      }
      `
    }
  ]
});
