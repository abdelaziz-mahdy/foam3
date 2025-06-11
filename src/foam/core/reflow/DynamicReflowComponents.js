/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */


foam.CLASS({
  package: 'foam.core.reflow',
  name: 'DynamicReflowComponents',
  extends: 'foam.u2.View',

  imports: [
    'commandDAO'
  ],

  css: `
    ^container {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    ^command-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-height: 200px;
      overflow-y: auto;
      padding-top: 10px;
    }
    ^command-item {
      padding: 5px;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    ^command-item:hover {
      background-color: $grey50;
    }
    ^command-item-button {
      border-color: $grey300!important;
      color: $black!important;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      display: none !important;
    }
    ^command-item:hover ^command-item-button {
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
      name: 'commands',
      value: []
    }
  ],

  methods: [
    async function render() {
      var self = this;
      const commandsSink = await this.commandDAO.select();
      this.commands = commandsSink.array;

      console.log('commands', this.commands);


      this.addClass()
        .start().addClass(this.myClass('container'))
          .tag(this.FILTER_SEARCH, { data$: this.filterSearch$ })
          .add(this.dynamic(function(filterSearch, commands) {
            var search = (filterSearch || '').toLowerCase();
            var filtered = commands.filter(c =>
              !search || (c.description && c.description.toLowerCase().includes(search))
            );
            this.start().addClass(self.myClass('command-list'))
              .forEach(filtered, function(command) {
                this.start().addClass(self.myClass('command-item'))
                  .add(command.description)
                  .startContext({ data: self, command: command })
                    .tag(self.ADD_COMPONENT)
                  .endContext()
                .end();
              })
          }))
        .end();
    }
  ],
  actions: [
    {
      name: 'addComponent',
      label: 'Add',
      buttonStyle: foam.u2.ButtonStyle.SECONDARY,
      size: 'SMALL',
      themeIcon: 'plus',
      code: function() {
        console.log('this.data ===>', this.data)
        console.log('this.command ==>', this.command)
      }
    }
  ]
});