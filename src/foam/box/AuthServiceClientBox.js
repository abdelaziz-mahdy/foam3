/**
 * @license
 * Copyright 2018 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.box',
  name: 'AuthServiceClientBox',
  extends: 'foam.box.ProxyBox',

  documentation: 'ClientBox which does not wrap replyBox in SessionReplyBox',

  requires: [
    'foam.box.SessionedMessage'
  ],

  imports: [ 'sessionID' ],

  constants: [
    {
      name: 'SESSION_KEY',
      value: 'sessionId'
    }
  ],

  methods: [
    {
      name: 'send',
      code: function send(message, replyBox) {
        this.delegate.send(this.SessionedMessage.create({
          sessionId: this.sessionID,
          message,
        }), replyBox);
      }
    }
  ]
});
