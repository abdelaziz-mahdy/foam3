/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.u2',
  name: 'DAOChoicesListView',
  extends: 'foam.u2.view.RichChoiceView',

  requires: [
    'foam.u2.view.RichChoiceViewSection',
  ],

  imports: ['cSpecDAO'],
  
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

      // var tmpDAO = foam.dao.MDAO.create({of: foam.core.boot.CSpec});
      // tmpDAO.put(foam.core.boot.CSpec.create({
      //   id: 'temp1',
      //   name: 'temp1'
      // }))

      // var tmpSection = this.RichChoiceViewSection.create({
      //   heading: 'Flow DAOs',
      //   dao: tmpDAO
      // });
      var daoSection = this.RichChoiceViewSection.create({
        heading: 'DAOs',
        dao: this.cSpecDAO.where(
          this.AND(
            this.ENDS_WITH(foam.core.boot.CSpec.ID, 'DAO'),
            this.EQ(foam.core.boot.CSpec.SERVE, true)
          )
        )
      });
      this.sections = [daoSection];
      // this.sections = [tmpSection, daoSection];
    }
  ]
});