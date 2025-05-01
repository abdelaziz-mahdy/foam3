/**
 * @license
 * Copyright 2024 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.core.so',
  name: 'SystemNotificationBorder',
  extends: 'foam.u2.Element',
  documentation: `
    A message border that renders at the bottom of the child view. Displaying SystemNotification messages in an InlineNotificationMessage
  `,
  requires: [
    'foam.log.LogLevel',
    'foam.core.so.SystemNotification',
    'foam.u2.dialog.InlineNotificationMessage'
  ],
  imports: [
    'systemNotificationService'
  ],
  css: `
    ^ {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    ^close-icon {
      position: absolute;
      right: 0.5em;
      top: 0.5em;
      padding: 0;
    }
    ^iconButton {
      width: 2rem;
      height: 2rem;
      padding: 0;
      float: right;
    }
  `,
  properties: [
    {
      class: 'String',
      name: 'key'
    },
    {
      class: 'FObjectArray',
      of: 'foam.core.so.SystemNotification',
      name: 'systemNotifications'
    }
  ],
  methods: [
    async function init() {
      this.systemNotifications = await this.systemNotificationService.getSystemNotifications(null, this.key);
    },

    function render() {
      var self = this;
      this.addClass()
      .start('', {}, this.content$).style({ display: 'contents' }).end()
      .add(this.dynamic(function(systemNotifications) {
        if ( ! systemNotifications.length ) return;
        systemNotifications.forEach(sn => {
          if ( ! sn.dismissed ) {
            this.start(self.InlineNotificationMessage, { type: sn.severity.name })
              .add(sn.message)
              .callIf(sn.dismissible, function() {
                this.startContext({ data: this, sn: sn })
                  .addClass(this.myClass('close-icon'))
                  .start(self.REMOVE_NOTIFICATION, { buttonStyle: 'TERTIARY', label: '' })
                    .addClass(self.myClass('iconButton'))
                  .end()
                .endContext();
              })
              .end();
          }
        });
      }));
      this.content = this.futureContent_;
    }
  ],

  actions: [
    {
      name: 'removeNotification',
      themeIcon: 'close',
      icon: 'images/ic-cancelblack.svg',
      code: function(X) {
        localStorage.setItem(X.sn.dismissId, 'dismissed');
        this.remove();
      }
    }
  ]
});
