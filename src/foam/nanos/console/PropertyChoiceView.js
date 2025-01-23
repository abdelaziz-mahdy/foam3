/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.nanos.console',
  name: 'PropertyChoiceView',
  extends: 'foam.u2.view.ChoiceView',

  properties: [
    'of',
    {
      class: 'Boolean',
      name: 'allowEmptyChoice'
    },
    {
      name: 'choices',
      factory: function(of) {
        var choices = [ ];
        if ( this.allowEmptyChoice ) choices.push('--');
        this.of.getAxiomsByClass(foam.core.Property).forEach(p => {
          if ( p.hidden ) return;
          choices.push(p.name);
          choices.push('-' + p.name);
        });
        return choices;
      }
    }
  ]
});
