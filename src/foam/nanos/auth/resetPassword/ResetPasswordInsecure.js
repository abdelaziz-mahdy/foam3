
/**
 * @license
 * Copyright 2024 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.nanos.auth.resetPassword',
  name: 'ResetPasswordInsecure',
  extends: 'foam.nanos.auth.resetPassword.ResetPassword',

  documentation: 'Reset Password directly without code or token. Used by simple foam apps with no acces to email server.',

  imports: [
    'ctrl',
    'resetPasswordInsecureService',
    'notify'
  ],

  requires: [
    'foam.log.LogLevel',
    'foam.nanos.auth.User',
    'foam.nanos.auth.resetPassword.ResetPasswordByCode'
  ],

  messages: [
    { name: 'INSTRUCTION', message: 'Set a new password for your account' },
  ],

  actions: [
    {
      name: 'resetPassword',
      label: 'Confirm',
      buttonStyle: 'PRIMARY',
      section: 'resetPasswordSection',
      isEnabled: function(errors_) {
        return ! errors_;
      },
      isAvailable: function(showSubmitAction) {
        return showSubmitAction;
      },
      code: function(X) {
        const user = this.User.create({
          desiredPassword: this.newPassword
        });
        const rp = this.ResetPasswordByCode.create({
          newPassword: this.newPassword
        });
        this.resetPasswordInsecureService.resetPassword(null, rp).then((_) => {
          // this.finalRedirectionCall();
          this.window.history.replaceState(null, null, this.window.location.origin);
          this.pushMenu("");
          this.notify(this.SUCCESS_MSG_TITLE, this.SUCCESS_MSG, this.LogLevel.INFO, true);
        }).catch((err) => {
          this.notify(err.data, this.ERROR_MSG, this.LogLevel.ERROR, true);
        });
      }
    }
  ]
});
