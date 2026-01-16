/**
 * @license
 * Copyright 2021 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.core.ndiff',
  name: 'NDiff',
  documentation: `Tracks changes to cSpecs. Used for debugging`,
  requires: [
    'foam.u2.dialog.Popup',
    'foam.core.ndiff.NDiffId'
  ],

  css: `
    .ndiff-compare-modal .foam-u2-dialog-StyledModal-wrapper {
      width: min(95vw, 1200px);
    }
  `,
  tableColumns: [
    'cSpecName',
    'objectId',
    'deletedAtRuntime',
    'apply',
    'compare'
  ],
  ids: ['cSpecName', 'objectId'],
  properties: [
    {
      name: 'cSpecName',
      label: 'CSpec',
      class: 'String',
    },
    {
      name: 'objectId',
      class: 'String',
    },
    {
      name: 'deletedAtRuntime',
      class: 'Boolean',
      tableWidth: 25,
      documentation: `
        Set to true if a repo entry was deleted at runtime.
      `
    },
    {
      name: 'initialFObject',
      class: 'FObjectProperty',
      visibility: 'HIDDEN',
      documentation: `
        The object as it was loaded from the repo journals (".0 file")
        `,
    },
    {
      name: 'runtimeFObject',
      class: 'FObjectProperty',
      visibility: 'HIDDEN',
      documentation: `
        The current runtime state of the object (fetched on-the-fly during select)
      `,
      storageTransient: true
    },
    {
      name: 'applyOriginal',
      label: 'Should Apply Original',
      class: 'Boolean',
      visibility: 'HIDDEN',
      documentation: `
        Client-side will set this true when they want to store
        the initialFObject to its respective DAO.
        The flag will then automatically be set to false.
        `,
      storageTransient: true
    }
  ],

  actions: [
    {
      name: 'apply',
      label: 'Apply Original',
      tableWidth: 25,
      confirmationRequired: function() {
        return true;
      },
      code: async function(X) {
        var self = this;

        // Fetch full NDiff to get complete initialFObject (projection may have filtered fields)
        var fullNdiff = await X.ndiffDAO.find(foam.core.ndiff.NDiffId.create({
          cSpecName: self.cSpecName,
          objectId: self.objectId
        }));

        if ( ! fullNdiff || ! fullNdiff.initialFObject ) {
          console.warn('NDiff.apply: Could not fetch full NDiff or initialFObject');
          return;
        }

        fullNdiff.applyOriginal = true;
        await X.ndiffDAO.put(fullNdiff);
      }
    },
    {
      name: 'compare',
      label: 'Compare Changes',
      tableWidth: 25,
      code: async function(X) {
        var self = this;

        // Fetch full NDiff to get complete initialFObject (projection may have filtered fields)
        var fullNdiff = await X.ndiffDAO.find(foam.core.ndiff.NDiffId.create({
          cSpecName: self.cSpecName,
          objectId: self.objectId
        }));

        if ( ! fullNdiff || ! fullNdiff.initialFObject ) {
          console.warn('NDiff.compare: Could not fetch full NDiff or initialFObject');
          return;
        }

        var initialFObject = fullNdiff.initialFObject;

        // Fetch runtime object from the target DAO
        var targetDAO = X[self.cSpecName];
        var runtimeFObject = null;

        if ( targetDAO ) {
          var id = initialFObject.id;
          runtimeFObject = await targetDAO.find(id);
        }

        // Create comparison modal - ComparisonView handles all the diff logic and UI
        X.ctrl.add(
          foam.u2.dialog.StyledModal.create({
            title: 'Comparison: ' + self.objectId,
            maxWidth: 'min(95vw, 1200px)'
          }, self)
            .addClass('ndiff-compare-modal')
            .tag({
              class: 'foam.u2.view.ComparisonView',
              left: initialFObject,
              right: runtimeFObject
            })
        );
      }
    }
  ]
});
