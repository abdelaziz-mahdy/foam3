/**
 * @license
 * Copyright 2017, 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.box',
  name: 'SessionReplyBox',
  extends: 'foam.box.ProxyBox',

  requires: [
    'foam.box.RPCErrorMessage'
  ],

  imports: [
    'auth?',
    'ctrl',
    'group',
    'loginSuccess?',
    'requestLogin?',
    'sessionTimer',
    'subject',
    'window'
  ],

  messages: [
    {
      name: 'REFRESH_MSG',
      message: 'Your session has expired. The page will now be refreshed so that you can log in again.',
    }
  ],

  properties: [
    {
      name: 'message',
      type: 'Object'
    },
    {
      name: 'clientBox',
    }
  ],

  methods: [
    {
      name: 'send',
      code: async function send(message, replyBox) {
        var self = this;
        if (
          this.RPCErrorMessage.isInstance(message) &&
          message.data.id === 'foam.core.auth.AuthenticationException'
        ) {
          if (!this.auth$) {
            return;
          }
          // If the user is already logged in when this happens, then we know
          // that something occurred on the backend to destroy this user's
          // session. Therefore we reset the client state and ask them to log
          // in again.
          var promptlogin = await this.auth.check(null, 'auth.promptlogin');
          var authResult  = await this.auth.check(null, '*');

          if ( this.loginSuccess && ( ! promptlogin || authResult ) ) {
            if ( this.ctrl ) this.ctrl.remove();
            // Set loginSuccess to false so that if multiple requests are sent with no authentication, alert is called only once
            this.loginSuccess = false;
            debugger;
//            alert(this.REFRESH_MSG);
            (this.window || window).location.reload();
            return;
          }

          this.requestLogin().then(function() {
            debugger;
            self.clientBox.send(self.message, self.delegate);
          });
        } else {
          // fetch the soft session limit from group, and then start the timer
          if ( this.group && this.group.id !== '' && this.group.softSessionLimit !== 0 ) {
            this.sessionTimer.startTimer(this.group.softSessionLimit);
          }

          this.delegate.send(message, replyBox);
        }
      }
    }
  ]
});
