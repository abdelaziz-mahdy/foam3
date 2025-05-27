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
  name: 'RawWebSocketBox',
  implements: ['foam.box.Box'],
  requires: [
    'foam.box.ReplyBox',
    'foam.box.ReturnBox',
    'foam.box.SubBox',
    {
      path: 'foam.json.Outputter',
      flags: ['js']
    }
  ],

  javaCode: `
    protected static final ThreadLocal<foam.lib.formatter.FObjectFormatter> formatter_ = new ThreadLocal<foam.lib.formatter.FObjectFormatter>() {
      @Override
      protected foam.lib.formatter.JSONFObjectFormatter initialValue() {
        foam.lib.formatter.JSONFObjectFormatter formatter = new foam.lib.formatter.JSONFObjectFormatter();
        // Needed because JS JSON parser doesn't support unquoted keys.
        formatter.setQuoteKeys(true);
        formatter.setOutputShortNames(true);
        formatter.setOutputDefaultValues(false);
        formatter.setPropertyPredicate(new foam.lib.AndPropertyPredicate(new foam.lib.PropertyPredicate[] {new foam.lib.NetworkPropertyPredicate(), new foam.lib.PermissionedPropertyPredicate()}));
        return formatter;
      }

      @Override
      public foam.lib.formatter.FObjectFormatter get() {
        foam.lib.formatter.FObjectFormatter formatter = super.get();
        formatter.reset();
        return formatter;
      }
    };

    protected static final ThreadLocal<foam.util.UIDGenerator> uidGenerator_ = new ThreadLocal<foam.util.UIDGenerator>() {
      @Override
      protected foam.util.UIDGenerator initialValue() {
        return new foam.util.AUIDGenerator(null, "websockets");
      }
    };
  `,

  properties: [
    {
      class: 'Object',
      name: 'socket',
      javaType: 'foam.net.WebSocket'
    },
    {
      class: 'FObjectProperty',
      of: 'foam.json.Outputter',
      swiftType: 'foam_swift_parse_json_output_Outputter',
      name: 'outputter',
      generateJava: false,
      factory: function() {
        return this.Outputter.create().copyFrom(foam.json.Network);
      }
    },
  ],

  methods: [
    {
      name: 'send',
      code: function send(msg) {
        var payload = this.outputter.stringify(msg);
        try {
          this.socket.send(payload);
        } catch(e) {
          replyBox && replyBox.send(foam.box.Message.create({ object: e }));
        }
      },
      javaCode: `
// TODO: Clone message or something when it clones safely.
foam.box.Box replyBox = (foam.box.Box)msg.getAttributes().get("replyBox");

if ( replyBox != null ) {
  foam.box.Box exportReplyBox = new foam.box.SubBox.Builder(getX())
    .setName(uidGenerator_.get().generate())
    .setDelegate(new foam.box.ReturnBox())
    .build();

  msg.getAttributes().put("replyBox", exportReplyBox);
}


foam.lib.formatter.FObjectFormatter formatter = formatter_.get();
formatter.setX(getX());
formatter.output(msg);

// restore old reply box in case this message is in a retry box or something
msg.getAttributes().put("replyBox", replyBox);

String payload = formatter.builder().toString();
formatter.setX(null);

try {
  getSocket().send(payload);
} catch ( java.io.IOException e ) {
  throw new RuntimeException(e);
}
`
    }
  ],
});
