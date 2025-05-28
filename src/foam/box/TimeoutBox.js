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
  name: 'TimeoutException',
  implements: ['foam.lang.Exception']
});

foam.CLASS({
  package: 'foam.box',
  name: 'TimeoutBox',
  //  implements: ['foam.box.Box'],
  extends: 'foam.box.ProxyBox',
  requires: [
    'foam.box.TimeoutException',
    'foam.box.Message'
  ],
  properties: [
    {
      class: 'Int',
      name: 'timeout',
      // TODO: change this back to 5s once we have the cacheDAO.
      value: 60000,
      preSet: function(old, nu) {
        // TODO: Try to detect CPF-1625
        if ( nu < 5000 ) {
          console.warn("Setting timeout to low value", nu);
          return 5000;
        }
        return nu;
      }
    }
  ],
  methods: [
    function send(msg) {
      var replyBox = msg.attributes.replyBox;

      if ( ! replyBox ) {
        this.delegate.send(msg);
        return;
      }

      msg = msg.clone();

      var tooLate = false;
      var timer = setTimeout(function() {
        tooLate = true;
        replyBox.send(this.Message.create({
          object: this.TimeoutException.create()
        }));
      }.bind(this), this.timeout);

      var self = this;

      msg.attributes.replyBox = {
        delegate: replyBox,
        send: function(msg) {
          if ( ! tooLate ) {
            clearTimeout(timer);
            this.delegate.send(msg);
            return;
          }

          self.timeout *= 2;
        },
        outputJSON: function(o) {
          o.output(this.delegate);
        }
      };

      this.delegate.send(msg);
    }
  ]
});
