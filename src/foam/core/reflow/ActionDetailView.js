/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.core.reflow',
  name: 'ActionDetailView',
  extends: 'foam.core.reflow.ReactiveSectionedDetailView',

  documentation: 'Custom detail view for foam.lang.Action with limited property editing for better UX',

  properties: [
    {
      name: 'propertyWhitelist',
      factory: function() {
        return [
          'label',
          'code',
          'buttonStyle', 
          'size',
          'icon',
          'themeIcon',
          'isEnabled',
          'isAvailable'
        ];
      }
    },
    {
      name: 'useSections',
      factory: function() {
        return ['general'];
      }
    }
  ]
});