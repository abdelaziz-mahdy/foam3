/**
 * @license
 * Copyright 2020 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.nanos.auth.login',
  name: 'LoginView',
  extends: 'foam.u2.View',

  imports: [
    'appConfig',
    'clientLoginService',
    'currentMenu?',
    'loginVariables',
    'logAnalyticEvent',
    'oidcProviderDAO',
    'params',
    'stack'
  ],

  requires: [
    'foam.nanos.app.AppBadgeView',
    'foam.nanos.auth.login.SignIn',
    'foam.nanos.auth.login.SignUp',
    'foam.u2.stack.StackBlock'
  ],

  css: `
  ^ .foam-u2-ActionView {
    width: 100%;
  }


  .foam-u2-dialog-ApplicationPopup ^content-form {
    width: 100%;
    padding: 2vw 0;
  }

  /* ON DATA */
  ^content-form {
    width: 100%;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 2rem;
    align-self: center;
    padding: 2rem;
  }

  /* ON ALL FOOTER TEXT */
  ^ .text-with-pad {
    margin-right: 0.2em;
  }
  ^center-footer {
    text-align: center;
  }
  ^ .align-end {
    text-align: end;
  }

  ^disclaimer {
    text-align: center;
  }

  ^tc-link {
    background: none;
    border: 1px solid transparent;
    color: $primary400;
    text-decoration: none;
  }
  ^legal {
    position: absolute;
    bottom: 1.2rem;
    margin: 0 1rem;
    text-align: center;
    font-size: 0.8rem;
    width: 100%;
  }

  ^center-footer > ^signupLink {
    margin-bottom: 2rem;
  }
  `,

  constants: [
    { name: 'SIGN_IN', value: 0 },
    { name: 'SIGN_UP', value: 1 }
  ],

  properties: [
    {
      name: 'data',
      factory: () => {
       return {};
      },
      view: { class: 'foam.u2.detail.VerticalDetailView' }
    },
    {
      name: 'param',
      factory: function() {
        return {};
      }
    },
    {
      name: 'mode_',
      value: 0,
      hidden: true
    },
    {
      class: 'String',
      name: 'modelCls_',
      documentation: `
        If modelCls_ is provided, the data can be created directly from this instead of mode
      `,
      expression: function(mode_) {
        if ( mode_ === this.SIGN_UP ) {
          return this.SignUp.id;
        } else {
          return this.SignIn.id;
        }
      }
    },
    { class: 'Boolean', name: 'showTitle', value: true },
    { class: 'Boolean', name: 'showAction', value: true }
  ],

  messages: [
    { name: 'GO_BACK', message: 'Go to ' },
    { name: 'SWITCH_TO_SIGN_UP_TXT', message: 'Not a user yet?' },
    { name: 'SWITCH_TO_SIGN_IN_TXT', message: 'Already have an account?' },
    { name: 'DISCLAIMER_TEXT', message: 'By signing up, you accept our ' }
  ],

  methods: [
    {
      name: 'detach',
      code: function() {
        this.SUPER();
        this.data.detach();
      }
    },

    function configData() {
      // Use passed in values or default loginVariables defined on ApplicationControllers
      this.param = Object.assign(this.loginVariables, this.param);
      try {
        var cls = foam.lookup(this.modelCls_);

        if ( this.data &&  cls.isInstance(this.data) ) return;

        this.data = cls.create(this.param, this);
      } catch (err) {
        console.warn('Error occurred when looking up modelCls_', this.modelCls_, err);
      }
    },

    function render() {
      this.SUPER();
      var self = this;
      if ( this.currentMenu ) {
        this.logAnalyticEvent({ name: "VIEW_LOAD_LoginView_" + this.currentMenu.id });
      } else {
        this.logAnalyticEvent({ name: "VIEW_LOAD_LoginView" });
      }
      // CREATE DATA VIEW
      this
        .addClass(self.myClass())
        // Title txt and Data
        .callIf(self.showTitle, function() { this.start().addClass('h300').add(self.data.TITLE).end(); })
        .addClass(self.myClass('content-form'))
        .start('form')
          .setID('login')
          .startContext({ data: this }).tag(this.DATA).endContext()
        // signin signup action
          .start()
            .add(this.slot(function(showAction, mode_) {
              return self.E().callIf(showAction, function() {
                this
                  .startContext({ data: self })
                    .start().addClass('align-end').callIf(mode_ == self.SIGN_IN && showAction, function() { this.start(self.RESET_PASSWORD)
                      .attr('type', 'button').end(); }).end()
                    .callIfElse(
                      mode_ == self.SIGN_IN,
                      function() { this.start(self.SIGN_IN_ACTION).attrs({ type: 'submit', form: 'login' }).end(); },
                      function() { this.start(self.SIGN_UP_ACTION).attrs({ type: 'submit', form: 'login' }).end(); }
                    )
                  .endContext();
              });
            }))
          .end()
        .end()
        .start().style({ display: 'contents' })
          .callIf(self.oidcProviderDAO, function() {
            this.
              select(self.oidcProviderDAO, function(provider) {
                if ( ! provider ) return;
                let action = foam.core.Action.create({
                  name: 'signIn',
                  label: provider.description,
                  code: async function () {
                    await self.clientLoginService.signInWithOIDC(provider);
                  }
                });

                return self.E().style({ display: 'contents' }).startContext({ data: self.data }).add(action).endContext();
              });
          })
        .end()
        .add(
          this.slot(function(showAction, data$disclaimer, appConfig, mode_) {
            self.configData();
            var disclaimer = self.E().style({ display: 'contents' }).callIf(data$disclaimer && appConfig, function() {
              this.start()
                .addClass(self.myClass('disclaimer'))
                .add(self.DISCLAIMER_TEXT)
                .start('a')
                  .addClasses([self.myClass('tc-link'), 'h600'])
                  .add(appConfig.termsAndCondLabel)
                  .attrs({
                    href: appConfig.termsAndCondLink,
                    target: '_blank'
                  })
                .end()
                .add(' and ')
                .start('a')
                  .addClasses([self.myClass('tc-link'), 'h600'])
                  .add(appConfig.privacy)
                  .attrs({
                    href: appConfig.privacyUrl,
                    target: '_blank'
                  })
                .end()
              .end();
            });

            return self.E().style({ display: 'contents' }).callIfElse(showAction, 
              function() {
                this
                  .start()
                    .startContext({ data: self })
                    .addClass(self.myClass('center-footer'))
                    // first footer
                    .start()
                      .addClass(self.myClass('signupLink'))
                      .start('span')
                        .addClass('text-with-pad')
                        .callIfElse(
                          self.mode_ == self.SIGN_IN,
                          function() { this.add(self.SWITCH_TO_SIGN_UP_TXT); },
                          function() { this.add(self.SWITCH_TO_SIGN_IN_TXT); }
                        )
                      .end()
                      .start('span')
                        .callIfElse(
                          self.mode_ == self.SIGN_IN,
                          function() { this.add(self.SWITCH_TO_SIGN_UP); },
                          function() { this.add(self.SWITCH_TO_SIGN_IN); }
                        )
                      .end()
                    .end()
                    .endContext()
                  .end();
              },
              function() {
                this.start().add(disclaimer).end();
              }
            ).callIf(showAction, function () {
              this.tag(self.AppBadgeView, {isReferral: self.data.referralToken || self.params['utm_id']});
            });
          })
        );
    }
  ],

  actions: [
    {
      name: 'signInAction',
      label: 'Sign in',
      buttonStyle: 'PRIMARY',
      isEnabled: function(data, data$errors_) {
        return data && ! data$errors_;
      },
      code: function(X) {
        this.clientLoginService.signin(X, this.data);
      }
    },
    {
      name: 'signUpAction',
      label: 'Get started',
      buttonStyle: 'PRIMARY',
      isEnabled: function(data, data$errors_) {
        return data && ! data$errors_;
      },
      code: function(X) {
        this.clientLoginService.signup(X, this.data);
      }
    },
    {
      name: 'switchToSignIn',
      label: 'Sign in',
      buttonStyle: 'TEXT',
      code: function(X) {
        X.data.mode_ = 0;
      }
    },
    {
      name: 'switchToSignUp',
      label: 'Create an account',
      buttonStyle: 'TEXT',
      code: function(X) {
        X.data.mode_ = 1;
      }
    },
    {
      name: 'resetPassword',
      label: 'Forgot password?',
      buttonStyle: 'LINK',
      code: function(X) {
        X.stack.push(this.StackBlock.create({
          view: {
            class: 'foam.nanos.auth.ChangePasswordView',
            modelOf: 'foam.nanos.auth.RetrievePassword'
          }
        }));
      }
    }
  ]
});
