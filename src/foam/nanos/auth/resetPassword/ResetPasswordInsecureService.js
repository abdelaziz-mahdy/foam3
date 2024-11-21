/**
 * @license
 * Copyright 2024 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.nanos.auth.resetPassword',
  name: 'ResetPasswordInsecureService',
  implements: [ 'foam.nanos.auth.resetPassword.ResetPasswordService' ],

  documentation: `Password reset service for simple systems without access to email server.`,
  
  javaImports: [
    'foam.dao.DAO',
    'foam.nanos.auth.AuthorizationException',
    'foam.nanos.auth.Subject',
    'foam.nanos.auth.User',
    'foam.nanos.auth.UserNotFoundException',
    'foam.nanos.auth.UserPasswordHashingDAO',
    'foam.nanos.logger.Logger'
  ],

  methods: [
    {
      name: 'resetPasswordByCode',
      args: 'Context x, String identifier, String userName',
      javaCode: `
        // nop
      `
    },
    {
      name: 'resetPassword',
      javaCode: `
        Subject subject = (Subject) x.get("subject");
        User user = subject.getRealUser();
        DAO dao = ((DAO) x.get("localUserDAO"));
        user = (User) dao.find(user.getId());
        if ( user != null ) {
          user = (User) user.fclone();
          user.setDesiredPassword(newPasswordObj.getNewPassword());
          dao = new UserPasswordHashingDAO(x, dao);
          user = (User) dao.put(user);
        } else {
          throw new UserNotFoundException();
        }
      `
    }
  ]
});
