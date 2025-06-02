/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.core.console',
  name: 'VerticalSectionedView',
  extends: 'foam.u2.DetailView',

  requires: [
    'foam.layout.SectionAxiom',
    'foam.u2.PropertyBorder'
  ],

  css: `
    ^section-card {
      padding: 10px;
      border-top: 1px solid $grey400;
    }
    ^section-header > span {
      font-weight: bold;
      font-size: 1.1em;
    }
  `,

  methods: [
    function render() {
      if ( ! this.data || ! this.data.cls_ ) {
        this.add('No data selected.');
        return;
      }
      var self = this;
      var sections = this.data.cls_.getAxiomsByClass(this.SectionAxiom);
      var properties = this.data.cls_.getAxiomsByClass(foam.lang.Property);

      this.addClass();
      this.start()
        .forEach(sections, function(section) {
          var sectionProperties = properties.filter(p => p.section === section.name && p.visibility !== 'HIDDEN');
          this.start().addClass(self.myClass('section-card'))
            .start().addClass(self.myClass('section-header'))
              .start('span')
                .add(section.title)
              .end()
            .end()
            .start().addClass(self.myClass('section-content'))
              .forEach(sectionProperties, function(prop) {
                console.log('prop ==>', prop)
                this.startContext({data: self.data}).add(prop).endContext();
              })
              // .add(function(data) {
              //   console.log('data.cls_.getAxiomsByClass(foam.core.Property) ==>', data.cls_.getAxiomsByClass(foam.core.Property))
              // }, self.data$)
            .end()
          .end();
        })
      .end();
      // sections.forEach(function(section) {
      //   this.start().addClass(self.myClass('section-card'))
      //     .start().addClass(self.myClass('section-title')).add(section.title).end()
      //     .add(self.slot(function(data) {
      //       return self.E().forEach(data.cls_.getAxiomsByClass(foam.core.Property)
      //         .filter(p => p.section === section.name && p.visibility !== 'HIDDEN'), function(prop) {
      //           this.add(self.propView(prop));
      //         });
      //     }, self.data$))
      //   .end();
      // });
    }
  ]
});