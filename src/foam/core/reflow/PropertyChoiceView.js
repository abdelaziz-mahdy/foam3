/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.core.reflow',
  name: 'PropertyRefinement',
  refines: 'Property',

  properties: [
    {
      class: 'Boolean',
      name: 'showInPropertyChoice',
      factory: function() { return ! this.hidden && ! this.networkTransient; }
    }
  ]
});


foam.CLASS({
  package: 'foam.core.reflow',
  name: 'PropertyCitationView',
  extends: 'foam.u2.CitationView',
  methods: [
    function render() {   // to be used later for complex views
      this.add(this.data.name/*, this.data.label*/);
    }
  ]
});


foam.CLASS({
  package: 'foam.core.reflow',
  name: 'PropertyChoiceView_',
  extends: 'foam.u2.view.RichChoiceView',

  properties: [
    {
      name: 'forCls',
      postSet: function(_, value) {
        this.rebuildSections();
      }
    },
    'predicate',
    {
      name: 'search',
      value: true
    },
    {
      name: 'idProperty',
      value: 'name'
    },
    {
      name: 'choosePlaceholder',
      value: 'Choose Property'
    },
    {
      name: 'rowView',
      factory: function() {
        return { class: 'foam.core.reflow.PropertyCitationView' };
      }
    },
    {
      name: 'sections',
      factory: function() {
        if ( ! this.forCls ) return [
          {
            heading: 'Properties',
            dao: foam.dao.ArrayDAO.create({ of: foam.lang.Property, array: [] })
          }
        ];
        let arr = this.forCls.getAxiomsByClass(foam.lang.Property)
          .filter(p => p.showInPropertyChoice)
          .filter(p => ! this.predicate || this.predicate(p));

        return [
          {
            heading: 'Properties',
            dao: foam.dao.ArrayDAO.create({ of: foam.lang.Property, array: arr })
          }
        ];
      }
    }
  ],

  methods: [
    function rebuildSections() {
      this.clearProperty('sections');
    }
  ]
});


foam.CLASS({
  package: 'foam.core.reflow',
  name: 'PropertyChoiceView',
  extends: 'foam.u2.View',

  requires: [ 'foam.core.reflow.PropertyChoiceView_' ],

  properties: [
    'forCls',
    'propName'
  ],

  methods: [
    function render() {
      this.SUPER();

      var self = this;

      this.data$.relateTo(
        this.propName$,
        function propToName(p) { return p ? p.name : ''; },
        function nameToProp(n) { return n ? self.of.getAxiomByName(n) : ''; }
      );

      this.start(this.PropertyChoiceView_, {forCls: this.forCls, data$: this.propName$});
    }
  ]

});
