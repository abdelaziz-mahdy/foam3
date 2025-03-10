/**
 * @license
 * Copyright 2020 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.u2.crunch.wizardflow',
  name: 'SkipGrantedAgent',
  documentation: `
    Allows filtering or skipping of granted capabilities. Also exports a wizard
    position in case wizardlets are to be skipped.
  `,
  imports: [ 
    'crunchService',
    'wizardlets'
  ],
  exports: [ 'initialPosition' ],
  requires: [
    'foam.core.crunch.CapabilityJunctionStatus',
    'foam.u2.crunch.wizardflow.SkipMode',
    'foam.core.crunch.ui.CapabilityWizardlet',
    'foam.core.crunch.ui.MinMaxCapabilityWizardlet',
    'foam.u2.wizard.WizardPosition',
    'foam.u2.wizard.wizardflow.AddFacadeWizardlet.FacadeWizardlet'
  ],

  properties: [
    {
      name: 'initialPosition',
      class: 'FObjectProperty',
      of: 'foam.u2.wizard.WizardPosition',
      factory: function() {
        return this.WizardPosition.create({
          wizardletIndex: 0,
          sectionIndex: 0,
        });
      },
    },
    {
      name: 'mode',
      class: 'Enum',
      of: 'foam.u2.crunch.wizardflow.SkipMode',
      factory: function () {
        return this.SkipMode.SKIP;
      }
    }
  ],

  methods: [
    async function execute() {
      if ( this.mode == this.SkipMode.SHOW ) return;

      let passedAtBeginning = -1;
      let foundFirstWizardlet = false;
      for ( let wizardlet of this.wizardlets ) {
        if ( ! foundFirstWizardlet ) passedAtBeginning++;
        if ( ! wizardlet.isAvailable ||
          (! this.CapabilityWizardlet.isInstance(wizardlet) && ! this.FacadeWizardlet.isInstance(wizardlet)) ) continue;
        let isGranted = ['GRANTED','PENDING'].some(status =>
          this.CapabilityJunctionStatus[status] == wizardlet.status);
        // if a MinMaxCapability is in PENDING we need to load it to find the real first wizardlet
        // This might be a limitation in the future as the user might have to click through an extra wizardlet
        // but in current scenarios where goNextOnValid is set to true for most MinMax wizardlets this doesnt present
        // a problem
        if ( wizardlet.status == 'PENDING' && this.MinMaxCapabilityWizardlet.isInstance(wizardlet) ) {
          foundFirstWizardlet = true;
          continue;
        }
        if ( ! isGranted ||  
          (wizardlet.capability && await this.crunchService.isRenewable(this.__subContext__, wizardlet.capability.id))
        ) {
          foundFirstWizardlet = true;
          continue;
        }
        if ( this.FacadeWizardlet.isInstance(wizardlet) ) wizardlet.handleSkipping();
        if ( this.mode == this.SkipMode.HIDE ) {
          wizardlet.isVisible = false;
        }
      }

      this.initialPosition.wizardletIndex = passedAtBeginning;
    }
  ],
});
