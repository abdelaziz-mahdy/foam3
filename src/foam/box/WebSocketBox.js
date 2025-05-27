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
  name: 'WebSocketBox',

  requires: [
    'foam.net.web.WebSocket',
    'foam.json.Parser',
    'foam.box.Message',
    'foam.box.SubBox',
    'foam.box.SubBoxMessage',
    'foam.box.ReturnBox',
    'foam.box.RawWebSocketBox'
  ],

  imports: [
    'window'
  ],

  exports: [
    'subBox'
  ],

  constants: [
    {
      name: 'NEXT_ID',
      value: [0]
    }
  ],

  axioms: [
    foam.pattern.Multiton.create({
      property: 'uri'
    })
  ],

  properties: [
    {
      name: 'uri',
    },
    {
      name: 'replyBoxes',
      factory: function() {
        return {};
      }
    },
    {
      class: 'FObjectProperty',
      of: 'foam.json.Parser',
      name: 'parser',
      generateJava: false,
      factory: function() {
        return this.Parser.create({
          strict:          true,
        });
      },
    },
    {
      name: 'delegate',
      factory: function() {
        /* ignoreWarning */
        var ws = this.WebSocket.create({
          uri: this.prepareURL(this.uri),
        });

        ws.message.sub(this.onMessage);

        return ws.connect().then(function(ws) {
          ws.disconnected.sub(function(sub) {
            sub.detach();
            this.delegate = undefined;
          }.bind(this));

          return this.RawWebSocketBox.create({ socket: ws });
        }.bind(this), function(e) {
          // Failed to connect, clear the delegate so that the next send
          // will reconnect.
          this.delegate = undefined;
        }.bind(this));
      }
    }
  ],

  methods: [
    {
      name: 'subBox',
      code: function(dst, once = true) {
        var name = this.NEXT_ID[0]++;
        
        var box = this.SubBox.create({
          name,
          delegate: this.ReturnBox.create()
        });
        
        this.replyBoxes[name] = once ? {
          send: (msg) => {
            this.replyBoxes[name] = undefined;
            dst.send(msg);
          }
        } : dst;
        
        return box;
      }
    },
    function prepareURL(url) {
      /* Add window's origin if url is not complete. */
      if ( this.window && url.indexOf(':') == -1 ) {
        var protocol = "ws://";
        if ( this.window.location.protocol === "https:" ) {
          protocol = "wss://";
        }

        return protocol + this.window.location.hostname +
          ( this.window.location.port ? ':' + ( parseInt(this.window.location.port) + 1 ) : '' ) +
          '/' + url;
      }

      return url;
    },

    {
      name: 'send',
      code: function send(msg) {
        this.delegate.then(function(d) {
          d.send(msg);
        }.bind(this), function(e) {
          replyBox?.send(foam.box.Message.create({ object: e }));
        });
      }
    }
  ],

  listeners: [
    {
      name: 'onMessage',
      code: function(s, _, msgStr) {
        try {
          var msg = this.parser.parseString(msgStr, this.__context__);

          if ( ! this.Message.isInstance(msg) ) {
            console.warn('Got non-message', msg.cls_.id);
            console.warn('  payload was: ', msgStr);
            return;
          }

          if ( !this.SubBoxMessage.isInstance(msg.object) ) {
            console.warn('Got a non sub box message from the weboscket,', msgStr);
            return;
          }
          
          var name = msg.object.name;
          var delegate = this.replyBoxes[name]
          if ( delegate ) {
            msg.object = msg.object.object;
            delegate.send(msg);
          } else {
            if ( msg.attributes.replyBox ) {
              msg.attributes.replyBox.send(
                this.Message.create({
                  object: this.NoSuchNameException.create({ name: name })
                }));
            }
          }
        } catch (e) {
          console.error("WSS Error:", e);
        }
      }
    }
  ]
});
