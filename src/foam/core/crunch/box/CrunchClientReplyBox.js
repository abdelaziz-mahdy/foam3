/**
 * @license
 * Copyright 2020 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.core.crunch.box',
  name: 'CrunchClientReplyBox',
  extends: 'foam.box.ProxyBox',

  documentation: `
    This box decorates reply boxes sent to CrunchClientBox.
  `,

  requires: [
    'foam.box.RPCErrorMessage',
    'foam.box.RemoteException',
    'foam.box.RPCReturnMessage',
    'foam.core.crunch.CapabilityIntercept'
  ],

  imports: [
    'crunchController'
  ],

  properties: [
    {
      class: 'Object',
      name: 'message',
    },
    {
      class: 'FObjectProperty',
      name: 'clientBox',
      type: 'foam.box.Box'
    }
  ],

  methods: [
    {
      name: 'send',
      code: function send(message, replyBox) {
        var self = this;
        if (
          this.RPCErrorMessage.isInstance(message) &&
          this.RemoteException.isInstance(message.data) &&
          this.CapabilityIntercept.isInstance(message.data.exception)
        ) {
          var intercept = message.data.exception;
          intercept.message = message.data.message;

          // Configure events CapabilityIntercept completion
          intercept.resolve = function (value) {
            self.delegate.send(self.RPCReturnMessage.create({ data: value }))
          };
          intercept.reject = function (value) {
            self.delegate.send(new Error(value));
          };
          intercept.resend = function () {
            self.clientBox.send(self.message, self);
          };

          // Ask CrunchController to handle the intercept
          this.crunchController.handleIntercept(intercept);
          return;
        }

        this.delegate.send(message, replyBox);
      }
    }
  ]
});
