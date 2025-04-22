/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */


foam.CLASS({

  package: 'foam.u2.view',
  name: 'MultiSelectView',
  extends: 'foam.u2.View',

  documentation: `
      The choices are in [value, label, isSelected ] quartets.

      However the client can simply pass in [value, label] and it will adapt to a [value, label, isSelected, choiceMode ] format
  `,

  css: `
    ^ .foam-u2-ActionView-options {
      padding: 10px;
      border: 1px solid $grey400;
      cursor: pointer;
      min-width: 400px;
      display: flex;
      flex-direction: row-reverse;
      align-items: center;
      justify-content: space-between;
      background-color: $white;
      color: $black;
      border-radius: 4px;
  }
  ^ .foam-u2-ActionView-options:hover {
    background-color: $white !important;
    color: $black !important;
  }
  ^choices-holder {
      background: $white!important;
      color: $black !important;
      opacity: 1 !important;
      border: 1px solid $grey400;
      border-radius: 4px;
      margin-top: 5px;
      display: flex;
      flex-direction: column;
      gap: 2rem;
      padding: 10px;
  }
  ^input-holder {
      display: flex;
      align-items: center;
      gap: 1rem;
      color: $black;
      width: 100%;
  }
  ^checkbox-input {
      -webkit-appearance: none;
      appearance: none;
      border-radius: 2px;
      border: solid 1px $grey400;
      height: 1.275em;
      margin: 7px 0;
      padding: 0px;
      transition: background-color 140ms, border-color 140ms;
      width: 1.275em;
      flex-shrink: 0;
      cursor: pointer;
  }
  ^checkbox-input:checked {
      background-color: $primary500;
      border-color: $primary500;
  }
  ^checkbox-input:checked:disabled {
      border-color: $grey600;
      background-color: $grey600;
      fill: white;
  }
  ^checkbox-input:checked:after {
      position:relative;
      top: 1px;
      content: url("/images/checkmark-white.svg");
  }
  `,

  requires: [
      'foam.u2.md.OverlayDropdown'
  ],

  messages: [
      { name: 'OPTIONS_MSG', message: 'options' },
      { name: 'CHOOSE_1_OF_FOLLOWING_OPTIONS', message: 'Choose one of the following options' },
      { name: 'CHOOSE_AT_LEAST_1_OPTION', message: 'Choose at least one option' },
      { name: 'CHOOSE_AT_LEAST', message: 'Choose at least' },
      { name: 'CHOOSE_EXACTLY', message: 'Choose exactly' },
      { name: 'CHOOSE', message: 'Choose' }
  ],

  properties: [
      {
          name: 'placeholder'
      },
      {
          class: 'Function',
          name: 'onSelect'
      },
      {
          name: 'choices',
          documentation: `
              An array of choices which are single choice is denoted as [value, label, isFinal]
          `,
          factory: function() {
              return [];
          },
          adapt: function(old, nu) {
              if ( foam.Object.isInstance(nu) ) {
                  var out = [];
                  for ( var key in nu ) {
                    if ( nu.hasOwnProperty(key) ) out.push([ key, nu[key] ]);
                  }
                  return out;
              }
      
              nu = foam.Array.shallowClone(nu);
      
              // Upgrade single values to [value, value].
              for ( var i = 0; i < nu.length; i++ ) {
                  if ( ! Array.isArray(nu[i]) ) {
                    nu[i] = [ nu[i], nu[i] ];
                  }
              }
              return nu;
          }
      },
      {
          name: 'data',
          factory: function() {
            return [];
          }
      },
  ],

  actions: [
    {
      name: 'options',
      themeIcon: 'dropdown',
      code: async function() {
        self = this;
        let selectCreateModal = this.OverlayDropdown.create({
            closeOnLeave: true,
            lockToParentWidth: true
          })
            .addClass(this.myClass('select-modal'))
            .start().addClass(this.myClass('choices-holder'))
                .add(this.dynamic(function(choices, data) {
                    return choices.map(choice => {
                        var isSelected = data?.includes(choice[1]);
                        var inputId = 'u' + choice.$UID;
                        this
                            .start().addClass(self.myClass('input-holder'))
                              .tag(foam.u2.CheckBox, { data: isSelected, label: choice[0] })
                              .on('change', function (evt) {
                                        self.onSelect(choice[1]);
                                    })
                                
                        .end();
                        
                    });
                }))
            .end();

        this.parentNode.add(selectCreateModal)
    }  
    }
  ],
  methods: [
      function render() {
          var self = this;
          this.startContext({ data: this })
            .tag(this.OPTIONS, {label: this.placeholder ?? 'Options'})
          .endContext()
      } 

  ]

})