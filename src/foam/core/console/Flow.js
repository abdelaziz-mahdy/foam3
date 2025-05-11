/**
 * @license
 * Copyright 2016 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.core.console',
  name: 'Flow',

  implements: [
    'foam.core.auth.CreatedAware',
    'foam.core.auth.CreatedByAware',
    'foam.core.auth.LastModifiedAware',
    'foam.core.auth.LastModifiedByAware'
  ],

  imports: [ 'flowDAO' ],

  ids: [ 'name' ],

  axioms: [
    {
      class: 'foam.comics.v2.CannedQuery',
      label: 'Public',
      predicateFactory: function(e, cls) { return e.EQ(cls.IS_PUBLIC, true); }
    },
    {
      class: 'foam.comics.v2.CannedQuery',
      label: 'Private',
      predicateFactory: function(e, cls) { return e.EQ(cls.IS_PUBLIC, false); }
    }
  ],

  tableColumns: [ 'name', 'description', 'status', 'isPublic', 'readOnly' ],

  properties: [
    {
      class: 'String',
      name: 'name'
    },
    {
      class: 'String',
      name: 'description',
      width: 80
    },
    {
      class: 'String',
      name: 'status',
      width: 20
    },
    {
      class: 'String',
      name: 'source',
      width: 30
    },
    {
      class: 'String',
      name: 'notes',
      width: 80,
      view: { class: 'foam.u2.tag.TextArea', rows: 12, cols: 78 }
    },
    {
      class: 'Boolean',
      name: 'isPublic',
      value: true
    },
    {
      class: 'Boolean',
      name: 'readOnly'
    },
    {
      name: 'lastModifiedByAgent',
      hidden: true
    },
    {
      name: 'createdByAgent',
      hidden: true
    },
    {
//      class: 'FObjectArray',
//      of: 'com.google.flow.Property',
      name: 'memento',
      hidden: true,
      transient: true,
      postSet: function(o, n) {
        if ( this.feedback_ ) return;
        this.feedback_ = true;
        console.log('*********** FLOW memento change: ', n);
        try {
          // TODO: should still not output empty reactions_: or children:
          var json = foam.json.Outputter.create({
            pretty: true,
            strict: true,
            formatDatesAsNumbers: false,
            outputDefaultValues: false,
            useShortNames: false,
            propertyPredicate: function(o, p) { return ! p.externalTransient && ! p.networkTransient; }
          });
//          this.mementoStr = foam.json.Short.stringify(n);
          this.mementoStr = json.stringify(n);
        } finally {
          this.feedback_ = false;
        }
      }
    },
    {
      class: 'String',
      name: 'mementoStr',
      label: 'Source',
      postSet: function(o, n) {
        if ( this.feedback_ ) return;
        this.feedback_ = true;
        try {
          console.log('*********** FLOW mementoStr change:', n);
          var memento = this.memento = foam.json.parseString(n, this.__context__);
          console.log('mementos:', memento.length);

        } finally {
          this.feedback_ = false;
        }
      },
      view: { class: 'foam.u2.tag.TextArea', rows: 20, cols: 78 }
    }
  ],

  actions: [
    {
      name: 'save',
      code: function() {
        this.flowDAO.put(this);
      }
    }
  ]
});
