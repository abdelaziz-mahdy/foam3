/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.core.reflow',
  name: 'Prompt',

  requires: ['foam.layout.Section'],

  imports: [ 'params' ],

  sections: [
    {
      name: 'config',
      title: 'Configuration',
      properties: [
        { name: 'urlParameter' },
        { name: 'propType' },
        {
          name: 'prop',
          view: {
            class: 'foam.u2.detail.VerticalDetailView',
            propertyWhitelist: [ 
              {  name: 'label', onKey: true },
              {  name: 'supportingLabel', onKey: true }
            ]
          }
        },
        { name: 'value' }
      ]
    }
  ],

  properties: [
    {
      class: 'String',
      name: 'label'
    },
    {
      class: 'String',
      name: 'urlParameter'
    },
    {
      class: 'Class',
      name: 'propType',
      label: 'Input Type',
      onKey: false,
      factory: function() { return 'String'; },
    },
    {
      class: 'FObjectProperty',
      of: 'foam.lang.Property',
      generateJava: false,
      name: 'prop',
      label: 'Input Customization',
    },
    {
      name: 'value',
      view: { class: 'foam.u2.view.AnyView', enableChoice: false },
      transient: true
    }
  ],

  methods: [
    function init() {
      this.SUPER();
      this.onPropTypeChange();
      if ( this.params && this.params[this.urlParameter] != undefined ) {
        this.value = this.params[this.urlParameter];
      }
    },

    function addToE(e) {
      let self = this;

      // Small map trickery to hook up all configurable properties of property to the propertyView
      // Means that the configuration params only need to be configured once.
      let configSection = this.Section.create().fromSectionAxiom(this.cls_.getAxiomByName('config'), this.cls_);
      let props = configSection?.properties.find(v => v.name == 'prop')?.view.propertyWhitelist;
      
      e.add(this.dynamic(function(prop) {
        if ( ! prop ) return;
        let propConfig = props.reduce((c, v) => {
          let name = foam.String.toSlotName(v.name);
          c[name] = prop[name]
          return c;
        }, {})
        this.tag(prop.__, { 
          config: propConfig, 
          viewArgs: { data$: self.value$ } 
        })
      }))
    },

    function toString() {
      return this.value.toString();
    },

    function valueOf() {
      return this.value.valueOf();
    }
  ],
  listeners: [
    {
      name: 'onPropTypeChange',
      on: ['this.propertyChange.propType'],
      code: function() {
        if ( ! this.propType ) return this.clearProperty('prop');
        if ( foam.lang.Property.isSubClass(this.propType) ) {
          this.prop = this.propType.create({ ...this.prop, label$: this.label$, onKey: true, name: ('Input' + foam.next$UID()) });
        } else {
          throw new Error('Invalid propType: ' + this.propType);
        }
      }
    }
  ]
});
