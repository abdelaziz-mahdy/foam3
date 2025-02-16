/**
 * @license
 * Copyright 2024 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

// Bugs:
//  - Command.execute_ Action doesn't work in TableView because it has the wrong Context

foam.CLASS({
  package: 'foam.core.console',
  name: 'Flowable',

  properties: [
    'flowParent',
    {
      class: 'String',
      name: 'flowName'
    },
    {
      class: 'List',
      name: 'flowChildren'
    }
  ],

  methods: [
    function addFlowChild(f) {
      this.flowChildren = this.flowChildren.concat([f]);
      this.addFlowChild_ && this.addFlowChild_(f);
    },
    function removeFlowChild(f) {
      this.flowChildren = this.flowChildren.filter(c => c != f);
      this.removeFlowChild_ && this.removeFlowChild_(f);
    }
  ]
});


foam.CLASS({
  package: 'foam.core.console',
  name: 'FlowableTree',
  extends: 'foam.u2.View',

  css: `
    ^ {
      width: 100%;
    }
    ^ table {
      width: 100%;
    }
    ^ tabel tr {
      padding: 4px;
    }
    ^ table td:nth-of-type(2) {
      width: 40px;
      text-align: right;
    }
    ^selected {
      outline: 2px solid #ccc;
    }
  `,

  properties: [
    'selected'
  ],

  methods: [
    function render() {
      this.
        addClass().
        start('table').
        attr('cellpadding', '4').
        call(this.branch, [this, this.data, 0]);
    },

    function branch(self, data, depth) {
      this.add(data.dynamic(function (flowName) {
        this.start('tr').
          enableClass(self.myClass('selected'), self.selected$.map(s => s === data)).
          on('click', () => self.selected = data).
          start('td').
            style({'paddingLeft': (4 + depth * 12) + 'px'}).
            add(flowName).
          end().
          start('td').
            callIf(data.flowParent, function() {
              this.start().on('click', () => data.flowParent.removeFlowChild(data)).add('X');
            }).
          end();
      }));
      this.add(data.dynamic(function (flowChildren) {
        this.forEach(flowChildren, d => {
          this.call(self.branch, [self, d, depth+1]);
        });
      }));
    }
  ]
});


// Would 'Block' be a better name?
foam.CLASS({
  package: 'foam.core.console',
  name: 'Block',
  extends: 'foam.u2.Controller',

  mixins: [ 'foam.core.console.Flowable' ],

  exports: [
    'log',
    'out'
  ],

  css: `
    ^ {
      padding: 4px;
    }
    ^output {
    }
    ^:hover {
      border: 1px solid red;
    }
    ^prompt {
      font-weight: bold;
      padding-top: 5px;
      padding-right: 4px;
    }
    ^ span .property-cmd { width: inherit; }
    ^ .foam-u2-ActionView-del { border: none; }
  `,

  properties: [
    {
      class: 'String',
      name: 'cmd'
    },
    'out'
  ],

  methods: [
    function render() {
      this.
        addClass().
        start('span').
          style({display: 'flex', width: '100%'}).
          start().addClass(this.myClass('prompt')).add('> ').end().
          add(this.CMD, this.DEL).
        end().
        start('div', {}, this.out$).
          addClass(this.myClass('output')).
        end();
    },

    function log(...args) {
      if ( args.length == 0 ) return;
      this.out.tag('br');
      this.out.add(args.join(' '));
    }
  ],

  actions: [
    {
      name: 'del',
      label: 'X',
      code: function() {
        this.flowParent && this.flowParent.removeFlowChild(this);
      }
    }
  ]
});


foam.CLASS({
  package: 'foam.core.console',
  name: 'Layout',
  extends: 'foam.u2.Element',

  css: `
    ^ {
      display: flex;
      height: 100%;
    }
    ^l {
      box-shadow: 3px 3px 6px 0 gray;
      width: 400px;
      padding: 4px;
    }
    ^m {
    }
    ^r {
      box-shadow: 3px 3px 6px 0 gray;
      width: 50%;
    }
  `,

  properties: [
    'left',
    'middle',
    'right'
  ],

  methods: [
    function render() {
      this.
        addClass().
        start('div', {}, this.left$  ).addClass(this.myClass('l')).end().
        start('div', {}, this.middle$).addClass(this.myClass('m')).end().
        start('div', {}, this.right$ ).addClass(this.myClass('r')).end();
    }
  ]
});


foam.CLASS({
  package: 'foam.core.console',
  name: 'Console',
  extends: 'foam.u2.Controller',

  mixins: [ 'foam.core.console.Flowable' ],

  requires: [
    'foam.core.console.Layout',
    'foam.core.console.Link',
    'foam.core.console.FlowableTree',
    'foam.core.console.Block',
    'foam.dao.ArrayDAO',
    'foam.flow.Document'
  ],

  imports: [ 'commandDAO', 'scope?', 'window', 'setTimeout' ],

  exports: [ 'out', 'log', 'eval_', 'scrollToBottom', 'outputLink', 'history_' ],

  css: `
    ^ {
      display: flex;
      flex-direction: column;
      box-shadow: 3px 3px 6px 0 gray;
      width: 100%;
      height: 100%;
      margin-bottom: 4px;
      padding: 0 8px;
    }
    ^input-field {
      margin-block-end: 0;
      display: inline-flex;
      width: 100%;
      align-items: center;
      position: sticky;
      bottom: 0;
    }
    ^input-field, ^input-field ^input {
      background: $grey50;
    }
    ^output {
      font-family: monospace;
      text-align: left;
      align-content: flex-end;
      flex: 1;
      overflow: auto;
    }
    ^ .property-input {
      border: none !important;
    }
    ^ .foam-u2-view-ValueView {
      min-width: 220px;
    }
  `,

  properties: [
    {
      class: 'String',
      name: 'input',
      view: {
        class: 'foam.u2.TextField', // Avoids ModeAltView focus() issue
        autocomplete: 'off',
        onKey: true
      },
    },
    'input_', // Element pointer
    {
      name: 'out'
    },
    {
      class: 'Boolean',
      name: 'showPrompts',
      value: true
    },
    {
      class: 'StringArray',
      name: 'history_',
      factory: function() {
        try {
          return JSON.parse(this.window.localStorage[this.historyKey()]);
        } catch (x) {
        }
        return [];
      }
    },
    {
      class: 'Int',
      name: 'historyLength',
      value: 50
    },
    {
      class: 'Int',
      name: 'historyPosition',
      value: 0
    },
    {
      name: 'localScope',
      factory: function() {
        return {
          this:   this,
          output: this.out
        };
      }
    }
  ],

  methods: [
    function historyKey() {
      return this.cls_.id + '_HISTORY';
    },

    async function render() {
      this.SUPER();

      var cmds = await this.commandDAO.select();
      cmds.array.forEach(c => {
        this.localScope[c.id] = c.execute.bind(c.clone(this));
      });

      this.flowName = 'Unnamed';

      var layout = this.start(this.Layout);

      layout.left.tag(this.FlowableTree, {data: this});
      layout.middle.call(this.renderSelf, [this]);
    },

    function renderSelf(self) {
      this.
        addClass(self.myClass()).
        start('div', null, self.out$)
        .addClass(self.myClass('output')).end().
        start('span').
          addClass(self.myClass('input-field')).
          start('b').style({ display: 'flex', 'white-space': 'pre'}).
            start(self.Link).add('help').on('click',    () => self.eval_('help'),    this).end().add(', ').
            start(self.Link).add('history').on('click', () => self.eval_('history'), this).end().add(' >').
          end().
          start(self.INPUT, null, self.input_$).
          addClass(self.myClass('input')).
          end().
          tag(self.ON_INPUT).
        end();

        // These observers might cause scroll issues later when queries in the console can be edited
        // In that case there should be an explicit flag to only do the scroll when the query is submitted
      // from the main console input
      /*
        const resizeObserver = new ResizeObserver(this.scrollToBottom.bind(this));
        var observer = new MutationObserver(function(mutations) {
          for (const record of mutations) {
            for (const addedNode of record.addedNodes) {
              if ( addedNode.nodeType === Node.ELEMENT_NODE )
                resizeObserver.observe(addedNode);
            }
            for (const removedNode of record.removedNodes) {
              if ( removedNode.nodeType === Node.ELEMENT_NODE )
                resizeObserver.unobserve(removedNode);
            }
            if (record.target.childNodes.length === 0) {
              resizeObserver.disconnect();
              observer.disconnect();
            }
          }
        });
        var config = { attributes: true, childList: true, characterData: true };

        observer.observe(this.out.element_, config);
        this.onDetach(() => observer.disconnect());
        this.setTimeout(this.focusInput.bind(this), 500)
        */
    },

    function log(...args) {
      if ( args.length == 0 ) return;
      this.out.tag('br');
      this.out.add(args.join(' '));
    },

    function scrollToBottom() {
      if ( this.U3 ) {
        this.out.element_.scrollTop = this.out.element_.scrollHeight;
      }
    },

    function addHistory(cmd) {
      if ( cmd.startsWith('history') || cmd.startsWith('help') ) return;
      // avoid adjacent duplicates
      if ( cmd == this.history_[this.history_.length-1] ) return;
      this.history_.push(cmd);
      while ( this.history_.length > this.historyLength ) this.history_.shift();
      this.window.localStorage[this.historyKey()] = foam.json.stringify(this.history_);
    },

    // TODO: Just make be a View class
    function outputLink(text, action, self) {
      self = self || this.out;
      self.start('a').style({
        color: '-webkit-link',
        cursor: 'pointer',
        'text-decoration': 'underline'
      }).on('click', action).add(text).end();
      return this;
    },

    // TODO: better to add newlines after

    async function eval_(cmd) {
      var self = this;
      cmd = cmd.trim();
      this.clearProperty('historyPosition');
      if ( ! cmd ) return;
      this.addHistory(cmd);

//      this.out.tag('br').start().show(self.showPrompts$).start('b').add('> ').end().add(cmd);
      var block = this.Block.create({flowName: 'prompt1', cmd: cmd, flowParent: this});
      this.addFlowChild(block);

      with ( this.scope || {} ) { with ( this.localScope ) { with ( { log: block.log.bind(block), out: block.out } ) {
        let scope = { ...(this.scope || {} ), ...this.localScope };
        var r, arg
        try {
          r = eval(cmd);
        } catch (x) {
          var i = cmd.indexOf(' ');
          if ( i != -1 ) {
            arg = cmd.substring(i+1);
            cmd = cmd.substring(0,i);
            r = scope[cmd];
          } else {
            r = scope[cmd];
          }
        }
        if ( typeof r === 'function' ) {
          r = arg ? r(arg) : r();
        }
        if ( r instanceof Promise ) {
          r = await r;
        }
      }}}

      this.log(r);
      this.input_.focus();
    },

    function addFlowChild_(c) {
      this.out.add(c);
    },

    function removeFlowChild_(c) {
      c.remove();
    }
  ],

  actions: [
    {
      name: 'helpKey',
      code: function() { this.help(); },
      keyboardShortcuts: [ 'f1' ]
    },
    {
      name: 'focusInput',
      code: function() { this.input_.focus(); },
      keyboardShortcuts: [ 'ctrl-`' ]
    },
    {
      name: 'togglePrompts',
      code: function() { this.showPrompts = ! this.showPrompts; },
      keyboardShortcuts: [ 'escape' ]
    },
    {
      name: 'stepUpHistory',
      code: function() {
        this.historyPosition = foam.Number.clamp(0, this.historyPosition+1, this.history_.length);
        this.input = this.history_[this.history_.length - this.historyPosition] ?? '';
      },
      keyboardShortcuts: [ 'arrowup' ]
    },
    {
      name: 'stepDownHistory',
      code: function() {
        this.historyPosition--;
        this.input = this.history_[this.history_.length - this.historyPosition] ?? '';
      },
      keyboardShortcuts: [ 'arrowdown' ]
    },
    {
      name: 'onInput',
      label: '',
      themeIcon: 'next',
      size: 'SMALL',
      buttonStyle: 'TEXT',
      code: function() {
        var input = this.input;
        this.input = '';
        this.eval_(input);
      },
      keyboardShortcuts: [ 'enter' ]
    },
    {
      name: 'clear',
      code: function() {
        this.localScope.clear();
        this.focusInput();
      },
      keyboardShortcuts: [ 'meta-k', 'ctrl-k' ]
    }
  ],

  listeners: [
    {
      name: 'onClick',
      // TODO: introduce a merge delay so that cut&paste still works
      // but a better solution might be to wait for a keypress then set the focus
      // and copy the key
      isMerged: true,
      mergeDelay: 600,
      code: function() { this.input_.focus(); }
    }
  ]
});

/* TODO:
   modes: Doc, Prompt/Console, Calc
   Input
*/
