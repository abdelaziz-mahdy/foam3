/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */


foam.CLASS({
  package: 'foam.core.reflow',
  name: 'DynamicReflowData',
  extends: 'foam.u2.View',

  requires: [
    'foam.u2.Tabs',
    'foam.u2.Tab',
    'foam.core.boot.CSpec'
  ],

  imports: [
    'cSpecDAO',
    'flowDAO'
  ],

  css: `
    ^container {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    ^ .foam-u2-Tabs-tabRow {
      padding: 0px;
    }
    ^ .foam-u2-Tabs-tab {
      color: $black;
      border-radius: 0;
      padding: 15px;
      margin-left: 10px;
    }
    ^ .foam-u2-Tabs-tab:hover {
      color: $primary500;
      background-color: $white;
    }
    ^ .foam-u2-Tabs-tab.selected {
      background-color: $white;
      color: $primary500;
      border-bottom: 2px solid $primary700;
    }
    ^collection-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-height: 200px;
      overflow-y: auto;
      padding-top: 10px;
    }
    ^collection-item {
      padding: 5px;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    ^collection-item:hover {
      background-color: $grey50;
    }
    ^collection-item-button {
      border-color: $grey300!important;
      color: $black!important;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      display: none !important;
    }
    ^collection-item:hover ^collection-item-button {
      display: inline-flex !important;
    }
  `,

  properties: [
    {
      class: 'String',
      name: 'filterSearch',
      placeholder: 'Search...'
    },
    {
      name: 'selectedTab',
      value: 'collections'
    },
    {
      name: 'tabs',
      value: [
        { name: 'collections', label: 'Collections' },
        { name : 'flows', label: 'Flows' },
        { name: 'url', label: 'URL'}
      ]
    },
    {
      name: 'collections',
      value: []
    },
    {
      name: 'flows',
      value: []
    }
  ],

  methods: [
    async function render() {
      var self = this;
      const collectionsSink = await this.cSpecDAO.where(this.CSpec.DAOS).select();

      const flowsSink = await this.flowDAO.select();
      this.collections = collectionsSink.array;
      this.flows = flowsSink.array;



      this.addClass()
        .start().addClass(this.myClass('container'))
          .tag(this.FILTER_SEARCH, { data$: this.filterSearch$ })
          .add(this.dynamic(function(selectedTab, filterSearch, collections, flows) {
            this.start(self.Tabs).addClass(self.myClass('tabs'))
              .forEach(self.tabs, function(tab) {
                this.start(self.Tab, {
                  label: tab.label,
                  selected: tab.name === selectedTab
                })
                  .start()
                    .callIf(tab.name === 'collections', function() {
                      var search = (filterSearch || '').toLowerCase();
                      var filtered = collections.filter(c =>
                      !search || (c.name && c.name.toLowerCase().includes(search))
                      );
                    console.log('filtered', filtered);
                      this.start().addClass(self.myClass('collection-list'))
                        .forEach(filtered, function(collection) {
                          this.start().addClass(self.myClass('collection-item'))
                            .add(collection.name)
                            .start(foam.u2.tag.Button, {
                              name: 'add',
                              label: 'Add',
                              buttonStyle: foam.u2.ButtonStyle.SECONDARY,
                              size: 'SMALL',
                              themeIcon: 'plus'
                            })
                              .addClass(self.myClass('collection-item-button'))
                              .on('click', function() {
                                self.addCollection(collection);
                              })
                          .end();
                        })
                      .end();
                    })
                    .callIf(tab.name === 'flows', function() {
                      var search = (filterSearch || '').toLowerCase();
                      var filtered = flows.filter(f =>
                        !search || (f.name && f.name.toLowerCase().includes(search))
                      );
                      this.start().addClass(self.myClass('collection-list'))
                        .forEach(filtered, function(flow) {
                          this.start().addClass(self.myClass('collection-item'))
                            .add(flow.name)
                            .start(foam.u2.tag.Button, {
                              name: 'add',
                              label: 'Add',
                              buttonStyle: foam.u2.ButtonStyle.SECONDARY,
                              size: 'SMALL',
                              themeIcon: 'plus'
                            })
                              .addClass(self.myClass('collection-item-button'))
                              .on('click', function() {
                                self.addFlow(flow);
                              })
                          .end();
                        })
                      .end();
                    })
                  .end()
              })
              .end()

              
          }))
        .end();
    }
  ],

  listeners: [
    {
      name: 'addCollection',
      code: function(collection) {
        this.data.eval_('dao '+collection.name);
      }
    },
    {
      name: 'addFlow',
      code: function(flow) {
        this.data.eval_('load '+flow.name);
      }
    }
  ],
});