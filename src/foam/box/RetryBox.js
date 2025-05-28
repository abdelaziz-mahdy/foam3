/**
 * @license
 * Copyright 2017 The FOAM Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

foam.CLASS({
  package: 'foam.box',
  name: 'RetryReplyBox',
  extends: 'foam.box.ProxyBox',

  requires: [
    'foam.lang.Exception'
  ],

  properties: [
    {
      name: 'attempt',
      value: 0
    },
    {
      name: 'maxAttempts'
    },
    {
      name: 'message'
    },
    {
      name: 'destination'
    }
  ],
  methods: [
    {
      name: 'send',
      code: function send(msg) {
        if ( this.Exception.isInstance(msg.object) && ( this.maxAttempts == -1 || this.attempt < this.maxAttempts ) ) {
          // console.log('********************************************* ATTEMPT', this.attempt);
          this.attempt++;
          this.destination.send(this.message);
          return;
        }

        this.delegate && this.delegate.send(msg);
      }
    },
    function outputJSON(outputter) {
      // this is a client only decorator, just send the delegate when serializing
      return outputter.output(this.delegate);
    }
  ]
});


foam.CLASS({
  package: 'foam.box',
  name: 'RetryBox',
  extends: 'foam.box.ProxyBox',

  requires: [
    'foam.box.BackoffBox',
    'foam.box.RetryReplyBox'
  ],

  properties: [
    'attempts',
    {
      name: 'maxAttempts',
      documentation: 'Set to -1 to infinitely retry.',
      value: 3
    },
    {
      name: 'maxDelay',
      value: 20000
    }
  ],

  methods: [
    function send(originalMessage) {
      var msg = originalMessage.clone();


      var delay = 100;
      var maxDelay = this.maxDelay;
      var attempt = 0;
      var self = this;

      if ( msg.attributes.replyBox ) {
        var delegate = this.delegate;
        var originalReplyBox = msg.attributes.replyBox;
        
        msg = msg.shallowClone();
        msg.attributes.replyBox = {
          send: function(replyMsg) {
            if ( foam.lang.Exception.isInstance(replyMsg.object) &&
                 ( self.maxAttempts == -1 || ++attempt < self.maxAttempts ) ) {
              setTimeout(function() {
                delegate.send(msg);
              }, delay);
              delay = Math.min(delay * 2, maxDelay);
              return;
            }
            originalReplyBox.send(replyMsg);
          },
          outputJSON: function(o) {
            o.output(originalReplyBox)
          }
        }
      }

      this.delegate.send(msg);
    }
  ]
});
