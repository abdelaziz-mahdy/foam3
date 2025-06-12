/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.u2',
  name: 'DAOChoicesListView',

  documentation: `A view that provides a searchable list of all served DAOs and flowChildren if any available. 
  For flowChildren, 
  - all flow-DAOs would be shown irrespective of whether that fow was declared before or after the current selected block,
  - current selected flowChild is not shown in list of dropdowns.`,

  extends: 'foam.u2.view.RichChoiceView',

  requires: [
    'foam.u2.view.RichChoiceViewSection',
  ],

  imports: [
    'cSpecDAO',
    'selected',
    'flowChildren'
  ],
  
  properties: [
    'of',
    {
      name: 'sections',
      value: []
    },
    {
      name: 'search',
      value: true
    },
    {
      name: 'choosePlaceholder',
      value: 'Choose DAO...'
    }
  ],

  methods: [
    function init() {
      this.SUPER();

      var flowChildrenDAOs = foam.dao.MDAO.create({of: foam.core.boot.CSpec});
      var flowSection = this.RichChoiceViewSection.create({
        heading: 'Flow DAOs',
        dao: flowChildrenDAOs
      });
      var daoSection = this.RichChoiceViewSection.create({
        heading: 'DAOs',
        dao: this.cSpecDAO.where(
          this.AND(
            this.ENDS_WITH(foam.core.boot.CSpec.ID, 'DAO'),
            this.EQ(foam.core.boot.CSpec.SERVE, true)
          )
        )
      });
      
      this.flowChildren.forEach(child =>{
        if (child.flowName !== this.selected.flowName) 
          child.value.cls_.getAxiomsByClass(foam.dao.DAOProperty).forEach(prop =>
            flowChildrenDAOs.put(foam.core.boot.CSpec.create({
              id: child.flowName + '.' + prop.name,
              name: child.flowName + '.' + prop.name
            }))
          )
      })
      
      // Using flowChildren.length because for some reason : \ the first render of match commands was glitchy, wouldn't render cSpec DAOs if flowChildren was empty(not counting itself)"
      if(this.flowChildren.length > 1) this.sections = [flowSection, daoSection];
      else this.sections = [daoSection];
    }
  ]
});