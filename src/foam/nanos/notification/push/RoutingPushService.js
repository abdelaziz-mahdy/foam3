/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.nanos.notification.push',
  name: 'RoutingPushService',

  implements: [
    'foam.nanos.notification.push.PushService'
  ],

  methods: [
    {
      name: 'sendPushById',
      javaCode:
        `        
        var  userDAO = (foam.dao.DAO) getX().get("localUserDAO");
        var user    = (foam.nanos.auth.User) userDAO.find(id);

        sendPush(user, title, body);

        return true;
      `
    },
    {
      name: 'sendPush',
      javaCode: `
        if ( user == null || title.isEmpty() ) {
          throw new RuntimeException("Invalid Parameters: Missing user or title"); 
        }
        
        System.err.println("Push to User: " + user.getId());
        var pushRegistrationDAO = user.getPushRegistrations(getX());
        
        var   subs = ((foam.dao.ArraySink) pushRegistrationDAO.select(new foam.dao.ArraySink())).getArray();
        var msgMap = new java.util.HashMap<String, String>()
          {
              {
                  put("title", title);
                  put("body", body);
              }
          };
        
        for ( Object obj : subs ) {
          PushRegistration sub = (PushRegistration) obj;
          send(sub, msgMap);
        }
        
        return true;
      `
    },
    {
      name: 'send',
      args: 'PushRegistration sub, java.util.HashMap msgMap',
      type: 'Void',
      javaCode: `
        if ( sub instanceof foam.nanos.notification.push.iOSNativePushRegistration ) {
          var service = (APNSPushService) getX().get("APNSpushService");
          if ( service == null ) {
            throw new RuntimeException("Missing Apple Push Notification Service in Context");
          }
          service.send((iOSNativePushRegistration) sub, msgMap);
        } else { 
          var service = (WebPushService) getX().get("WebPushService");
          if ( service == null ) {
            throw new RuntimeException("Missing Web Push Notification Service in Context");
          }
          service.send(sub, msgMap);
        }      `
    }
  ]
});
