/**
 * @license
 * Copyright 2016 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.core.reflow',
  name: 'Flow',

  implements: [
    'foam.core.auth.Authorizable',
    'foam.core.auth.CreatedAware',
    'foam.core.auth.CreatedByAware',
    'foam.core.auth.LastModifiedAware',
    'foam.core.auth.LastModifiedByAware',
    'foam.core.auth.ServiceProviderAware'
  ],

  javaImports: [
    'foam.core.auth.AuthorizationException',
    'foam.core.auth.Subject',
    'foam.core.auth.User',
    'java.util.Arrays'
  ],

  imports: [ 'flowDAO' ],

  ids: [ 'name' ],
/*
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
    */

  tableColumns: [ 'name', 'source', 'description', 'status', /* 'isPublic', 'readOnly', */ 'reflow' ],

  searchColumns: [ 'name', 'status', 'source' ],

  properties: [
    {
      class: 'String',
      name: 'name',
      onKey: true
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
      view: { class: 'foam.u2.tag.TextArea', rows: 4, cols: 78 }
    },
    {
      class: 'Enum',
      of: 'foam.core.reflow.FlowAccess',
      name: 'accessLevel',
      value: foam.core.reflow.FlowAccess.PUBLIC_RW
    },
    {
      class: 'FObjectArray',
      of: 'foam.core.reflow.UserFlowAccess',
      name: 'specifiedUserAccess',
      label: 'Specified Access',
      visibility: function(accessLevel) {
        return accessLevel != foam.core.reflow.FlowAccess.SHARED ? foam.u2.DisplayMode.HIDDEN : foam.u2.DisplayMode.RW;
      }
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
      label: 'Script',
      postSet: function(o, n) {
        if ( this.feedback_ ) return;
        this.feedback_ = true;
        try {
          // console.log('*********** FLOW mementoStr change:', n);
          n = n.trim();
          if ( n ) {
            var json = JSON.parse(n);
            this.memento = foam.json.parse(json, null, this.__context__);
          } else {
            this.memento = [];
          }
        } finally {
          this.feedback_ = false;
        }
      },
      view: { class: 'foam.u2.tag.TextArea', rows: 10, cols: 78 }
    },
    {
      class: 'FObjectProperty',
      name: 'mementoMgr',
      transient: true,
      hidden: true,
      factory: function() {
        return foam.memento.MementoMgr.create({memento$: this.mementoStr$, position$: this.revision$});
      }
    },
    {
      class: 'Int',
      name: 'version'
    },
    {
      class: 'Int',
      name: 'revision',
      transient: true,
      xxxview: {
        class: 'foam.u2.view.DualView',
        viewa: { class: 'foam.u2.IntView' },
        viewb: { class: 'foam.u2.RangeView', onKey: true }
      }
    },
    {
      class: 'Reference',
      of: 'foam.core.auth.ServiceProvider',
      name: 'spid',
      hidden: true
    }
  ],

  methods: [
    function init() {
      this.SUPER();
      this.mementoMgr;
    },
    {
      name: 'authorizeOnCreate',
      javaCode: `
        // noop
      `
    },
    {
      name: 'authorizeOnRead',
      javaCode: `
        User user = ((Subject) x.get("subject")).getUser();
        if ( getCreatedBy() == user.getId() ) return;

        if ( getAccessLevel() == FlowAccess.PRIVATE ) throw new AuthorizationException();

        if ( getAccessLevel() == FlowAccess.SHARED ) {
          var hasAccess = Arrays.stream(getSpecifiedUserAccess()).anyMatch(o ->
            ((UserFlowAccess) o).getUserId() == user.getId() &&
            (
              ((UserFlowAccess) o).getAccessLevel() == foam.core.reflow.FlowAccess.PUBLIC_RO ||
              ((UserFlowAccess) o).getAccessLevel() == foam.core.reflow.FlowAccess.PUBLIC_RW
            )
          );
          if ( ! hasAccess ) throw new AuthorizationException();
        }
      `
    },
    {
      name: 'authorizeOnUpdate',
      javaCode: `
        User user = ((Subject) x.get("subject")).getUser();
        if ( getCreatedBy() == user.getId() ) return;

        if ( getAccessLevel() == FlowAccess.PRIVATE || getAccessLevel() == FlowAccess.PUBLIC_RO ) throw new AuthorizationException();

        if ( getAccessLevel() == FlowAccess.SHARED ) {
          var hasAccess = Arrays.stream(getSpecifiedUserAccess()).anyMatch(o ->
            ((UserFlowAccess) o).getUserId() == user.getId() && ((UserFlowAccess) o).getAccessLevel() == foam.core.reflow.FlowAccess.PUBLIC_RW
          );
          if ( ! hasAccess ) throw new AuthorizationException();
        }
      `
    },
    {
      name: 'authorizeOnDelete',
      javaCode: `
        User user = ((Subject) x.get("subject")).getUser();
        if ( getCreatedBy() == user.getId() ) return;

        if ( getAccessLevel() == FlowAccess.PRIVATE || getAccessLevel() == FlowAccess.PUBLIC_RO ) throw new AuthorizationException();

        if ( getAccessLevel() == FlowAccess.SHARED ) {
          var hasAccess = Arrays.stream(getSpecifiedUserAccess()).anyMatch(o ->
            ((UserFlowAccess) o).getUserId() == user.getId() && ((UserFlowAccess) o).getAccessLevel() == foam.core.reflow.FlowAccess.PUBLIC_RW
          );
          if ( ! hasAccess ) throw new AuthorizationException();
        }
      `
    }
  ],

  actions: [
    {
      name: 'reflow',
      code: function(X) {
        X.routeTo('flow/' + this.name + '?flowMode=view');
      },
      isAvailable: function() {
        // Disable in Reflow, but enable in DAOController (because already in reflow)
        return ! this.__context__.flow;
      }
    }
  ]
});
