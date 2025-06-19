/**
 * @license
 * Copyright 2020 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.u2',
  name: 'DeleteModal',
  extends: 'foam.u2.View',

  documentation: 'View for deleting any object',

  requires: [
    'foam.log.LogLevel'
  ],

  imports: [
    'notify?',
    'ctrl?'
  ],

  css: `
    ^ {
      border-radius: 3px;
      background-color: #fff;
      /* Don't let the modal exceed the screen size, minus some margin. */
      max-width: calc(100vw - 48px);
      max-height: calc(100vh - 116px);
      overflow-y: auto;
      /* The line below accounts for the top nav bar. */
    }
    ^main {
      padding: 24px;
    }
    ^main > h2:first-child {
      margin-top: 0;
    }
    ^ .buttons {
      padding: 24px;
      box-sizing: border-box;
      display: flex;
      justify-content: flex-end;
    }
  `,

  messages: [
    { name: 'TITLE', message: 'Delete ' },
    { name: 'CONFIRM_DELETE_1', message: 'Are you sure you want to delete' },
    { name: 'SUCCESS_MSG', message: ' deleted' },
    { name: 'FAIL_MSG', message: 'Failed to delete' }
  ],

  properties: [
    {
      class: 'foam.dao.DAOProperty',
      name: 'dao'
    },
    {
      class: 'Function',
      name: 'onDelete'
    },
    {
      class: 'FObjectProperty',
      name: 'data'
    },
    {
      class: 'String',
      name: 'label'
    }
  ],

  methods: [
    function render() {
      this.SUPER();
      this
        .addClass(this.myClass())
        .start()
          .addClass(this.myClass('main'))
          .start('h2')
            .add(this.TITLE).add(this.label ? this.label : this.data.model_.label).add('?')
          .end()
          .start('p')
            .add(`${this.CONFIRM_DELETE_1} `).add(this.label ? this.label : `${this.data.toSummary()}`).add('?')
          .end()
        .end()
        .start()
          .addClass('buttons')
          .startContext({ data: this })
            .tag(this.CANCEL, { buttonStyle: 'SECONDARY' })
            .tag(this.DELETE, { isDestructive: true })
          .endContext()
        .end();
    },

    function isAuthorizationException(err) {
      return err && (
        err.name === 'AuthorizationException' ||
        (err.exception && err.exception.cls_ && err.exception.cls_.name === 'AuthorizationException') ||
        (err.data && err.data.cls_ && err.data.cls_.name === 'AuthorizationException') ||
        (err.instance_ && err.instance_.data && err.instance_.data.id === 'foam.core.auth.AuthorizationException')
      );
    },

    function safeNotify(message, submessage, severity, transient) {
      // Try multiple ways to show notification
      if ( this.notify ) {
        this.notify(message, submessage, severity, transient);
      } else if ( this.ctrl && this.ctrl.notify ) {
        this.ctrl.notify(message, submessage, severity, transient);
      } else if ( this.__context__ && this.__context__.notify ) {
        this.__context__.notify(message, submessage, severity, transient);
      } else {
        // Fallback to console
        console.error('Notification:', message, submessage);
      }
    }
  ],

  actions: [
    {
      name: 'delete',
      label: 'Delete',
      code: function(X) {
        this.dao.remove(this.data).then((o) => {
          if ( foam.comics.v2.userfeedback.UserFeedbackAware.isInstance(o) && o.userFeedback ){
            var currentFeedback = o.userFeedback;
            while ( currentFeedback ){
              this.safeNotify(currentFeedback.message, '', this.LogLevel.INFO, true);
              currentFeedback = currentFeedback.next;
            }
          } else {
            this.safeNotify(this.data.model_.label + this.SUCCESS_MSG, '', this.LogLevel.INFO, true);
          }
          this.onDelete();
        }).catch((err) => {
          if ( err.exception && err.exception.userFeedback  ) {
            var currentFeedback = err.exception.userFeedback;
            while ( currentFeedback ) {
              this.safeNotify(currentFeedback.message, '', this.LogLevel.INFO, true);
              currentFeedback = currentFeedback.next;
            }
          } else if ( this.isAuthorizationException(err) ) {
            this.safeNotify('Access Denied: You are not authorized to delete this item', '', this.LogLevel.ERROR, true);
          } else {
            this.safeNotify(err.message || this.FAIL_MSG, '', this.LogLevel.ERROR, true);
          }
        });
        X.closeDialog();
      }
    },
    {
      name: 'cancel',
      label: 'Cancel',
      code: function(X) {
        X.closeDialog();
      }
    }
  ]
});
