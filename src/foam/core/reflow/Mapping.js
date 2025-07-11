/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.core.reflow',
  name: 'Mapping',

  properties: [
    {
      class: 'String',
      name: 'id'
    },
    {
      class: "foam.mlang.ExprProperty",
      name: 'handler',
      view: function(_, X) {
        // Try multiple ways to get the class reference
        var cls = X.data.of;
        
        // Workaround: When loading from DAO, 'of' is not serialized but handler maintains sourceCls_
        // This prevents the view from showing just the default placeholder
        if ( ! cls && X.data.handler && X.data.handler.sourceCls_ ) {
          cls = X.data.handler.sourceCls_;
        }
        
        return { class: 'foam.core.reflow.PropertyChoiceView', forCls: cls };
      }
    },
    {
      name: 'of',
      hidden: true
    }
  ],

  methods: [
    function process(obj, value) {
      if ( foam.String.isInstance(value) ) value = value.trim();
      if ( value !== '' && this.handler && this.handler.name ) {
        obj[this.handler.name] = value;
      } else {
        console.warn('Mapping.process: No handler defined for', this.id, 'with value', value);
      }
    }
  ]
});