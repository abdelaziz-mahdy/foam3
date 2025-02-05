/**
 * @license
 * Copyright 2024 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.nanos.console',
  name: 'AxiomInfo',

  ids: [ 'name' ],

  properties: [
    {
      class: 'String',
      name: 'type',
      label: 'Axiom Type'
    },
    {
      class: 'String',
      name: 'source',
      label: 'Source Class'
    },
    {
      class: 'String',
      name: 'name'
    },
    {
      class: 'String',
      name: 'path',
      label: 'Source Path'
    }
  ]
});


foam.CLASS({
  package: 'foam.nanos.console',
  name: 'Console',
  extends: 'foam.u2.Controller',

  requires: [
    'foam.nanos.console.Link',
    'foam.nanos.console.DAOCreate',
    'foam.nanos.console.DAOPrompt',
    'foam.nanos.console.DocumentReadWriteView',
    'foam.dao.ArrayDAO',
    'foam.demos.sevenguis.Cells',
    'foam.flow.Document',
    'foam.nanos.boot.NSpec'
  ],

  imports: [ 'flowDAO', 'nSpecDAO', 'scope?', 'window', 'setTimeout' ],

  exports: [ 'eval_', 'scrollToBottom' ],

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
    'input_',
    {
      name: 'outputDiv'
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
        // TODO: include DAOs in scope
        // TODO: include MLang's from foam.mlang.Expressions in scope
        return {
          '#':      this.h1.bind(this),
          '##':     this.h2.bind(this),
          '###':    this.h3.bind(this),
          '**':     this.bold.bind(this),
          '*':      this.italic.bind(this),
          '>':      this.blockquote.bind(this),
          models:   this.models.bind(this),
          cells:    this.cells.bind(this),
          describe: this.describeClass.bind(this),
          doc:      this.doc.bind(this),
          history:  this.history.bind(this),
          log:      this.log.bind(this),
          flows:    this.listFlows.bind(this),
          mqlhelp:  this.mqlHelp.bind(this),
          help:     this.help.bind(this),
          dao:      this.dao.bind(this),
          daoCreate:this.daoCreate.bind(this),
          this:     this,
          cls:      this.cls.bind(this),
          daos:     this.services.bind(this, this.NSpec.SERVED_DAOS),
          services: this.services.bind(this, this.NSpec.SERVED_SERVICES),
          output:   this.outputDiv
        };
      }
    }
  ],

  methods: [
    function historyKey() {
      return this.cls_.id + '_HISTORY';
    },

    function render() {
      this.SUPER();

      var self = this;

      this.
        addClass(this.myClass()).
        start('div', null, this.outputDiv$)
        .addClass(this.myClass('output')).end().
        start('span').
          addClass(this.myClass('input-field')).
          start('b').style({ display: 'flex', 'white-space': 'pre'}).
            start(this.Link).add('help').on('click',    () => self.eval_('help'),    this).end().add(', ').
            start(this.Link).add('history').on('click', () => self.eval_('history'), this).end().add(' >').
          end().
          start(this.INPUT, null, this.input_$).
          addClass(this.myClass('input')).
          end().
          tag(this.ON_INPUT).
        end();

        // These observers might cause scroll issues later when queries in the console can be edited
        // In that case there should be an explicit flag to only do the scroll when the query is submitted
        // from the main console input
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

        observer.observe(this.outputDiv.element_, config);
        this.onDetach(() => observer.disconnect());
        this.setTimeout(this.focusInput.bind(this), 500)
    },

    function log(...args) {
      if ( args.length == 0 ) return;
      this.outputDiv.tag('br');
      this.outputDiv.add(args.join(' '));
    },

    function scrollToBottom() {
      if ( this.U3 ) {
        this.outputDiv.element_.scrollTop = this.outputDiv.element_.scrollHeight;
      }
    },

    function h1(h) { this.outputDiv.start('h1').add(h).end(); },
    function h2(h) { this.outputDiv.start('h2').add(h).end(); },
    function h3(h) { this.outputDiv.start('h3').add(h).end(); },
    function bold(h) { this.outputDiv.start('b').add(h).end(); },
    function italic(h) { this.outputDiv.start('i').add(h).end(); },
    function blockquote(h) { this.outputDiv.start('blockquote').add(h).end(); },

    function models() {
      this.outputDiv.tag(foam.doc.DocBrowser);
    },

    function cells(rows, cols) {
      this.outputDiv.tag(this.Cells, rows && cols && { rows: rows, columns: cols});
    },

    function doc() {
      this.outputDiv.tag(this.DocumentReadWriteView.create({data: '<i>insert text here</i>'}));
    },

    function dao(daoKey) {
      this.outputDiv.tag(this.DAOPrompt.create({daoKey: daoKey}));
    },

    function daoCreate(daoKey) {
      this.outputDiv.tag(this.DAOCreate.create({daoKey: daoKey}));
    },

    function describeClass(cls) {
      if ( foam.String.isInstance(cls) ) {
        cls = foam.lookup(cls);
        if ( cls == null ) {
          log('Unknown class');
          return;
        }
      }
      // TODO: add ability to specify how SimpleClassView writes links so it can hyperlink back to this command
      this.outputDiv.startContext({conventionalUML: true}).tag(foam.doc.SimpleClassView, {data: cls, showUML: true});
      return;
      /*
      this.outputDiv.br().add('CLASS:  ', cls.name, ' extends: ');
      this.outputLink(cls.__proto__.id, () => this.eval_('describe(' + cls.__proto__.id + ')'), this.outputDiv);
      var dao = foam.dao.ArrayDAO.create({of: foam.nanos.console.AxiomInfo});

      for ( var key in cls.axiomMap_ ) {
        var a = cls.axiomMap_[key];
        dao.put(foam.nanos.console.AxiomInfo.create({
          type: a.cls_ ? a.cls_.name : 'anonymous',
          source: (a.sourceCls_ && a.sourceCls_.name) || 'unknown',
          name: a.name,
          path: a.source || ''
        }));
      }
      dao.select(console);

      this.outputDiv.tag({class: 'foam.u2.table.TableView', data: dao});
      */
    },

    function cls() {
      // TODO: add optional parameter to control number of commands to clear?
      this.outputDiv.removeAllChildren();
    },

    function history(q) {
      if ( q ) q = q.toLowerCase();
      this.history_.forEach(h => {
        if ( q != undefined && h.toLowerCase().indexOf(q) == -1 ) return;
        this.outputDiv.tag('br');
        this.outputLink(h, () => this.eval_(h));
      });
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
      self = self || this.outputDiv;
      self.start('a').style({
        color: '-webkit-link',
        cursor: 'pointer',
        'text-decoration': 'underline'
      }).on('click', action).add(text).end();
      return this;
    },

    function listFlows() {
      return this.flowDAO.select({
        put: o => {
          this.outputDiv.tag('br');
          // TODO: fix since load() isn't in scope anymore
          this.outputLink(o.name, () => this.scope.load(o.name));
        }
      }).then(function() { return undefined; });
    },

    function mqlHelp() {
      this.outputDiv.start('pre').style({'font-family': 'monospace'}).add(`
key:value                  key contains "value"
key=value                  key exactly matches "value"
key:value1,value2          key contains "value1" OR "value2"
key:(value1|value2)        "
key1:value key2:value      key1 contains value AND key2 contains "value"
key1:value AND key2:value  "
key1:value and key2:value  "
key1:value OR key2:value   key1 contains value OR key2 contains "value"
key1:value or key2:value   "
key:(-value)               key does not contain "value"
(expr)                     groups expression
-expr                      not expression, ie. -pri:1
NOT expr                   not expression, ie. NOT pri:1
has:key                    key has a value
is:key                     key is a boolean TRUE value
key>value                  key is greater than value
key-after:value            "
key<value                  key is less than value
key-before:value           "
date:YY/MM/DD              date specified
date:today                 date of today
date-after:today-7         date newer than 7 days ago
date:d1..d2                date within range d1 to d2, inclusive
key:me                     key is the current user

Date formats:
YYYY-MM
YYYY-MM-DD
YYYY-MM-DDTHH
YYYY-MM-DDTHH:MM
`);
    },

    function help() {
      var self = this;
      this.outputDiv.tag('br');
      // TODO: store commands in a DAO
      var cmds = [
        [ 'help',     'Display help' ],
        [ 'mqlhelp',  'Display MQL help', true ],
        [ '#',        'Heading 1' ],
        [ '##',       'Heading 2' ],
        [ '##',       'Heading 3' ],
        [ '**',       'Bold' ],
        [ '*',        'Italic' ],
        [ '>',        'Blockquote' ],
        [ 'models',   'Browse Models', true ],
        [ 'cells',    'Embed spreadsheet', true ],
        [ 'describe', 'Describe a Class' ],
        [ 'doc',      'Embed document', true ],
        [ 'flows',    'Display saved flows', true ],
        [ 'cls',      'Clear console output', true ],
        [ 'dao',      'Perform DAO operation' ], // ???: Combine with daos with args?
        [ 'daoCreate','Add a new object to a DAO' ], // ???: Combine with daos with args?
        [ 'daos',     'Display availabe DAO services', true ],
        [ 'history',  'Display past executed commands', true ],
        [ 'load',     'Load a specified flow' ],
        [ 'services', 'Display available services', true ],
        [ 'save',     'Save the current flow to a specified name' ]
      ];
      var shortcuts = [
        [ 'F1',      'Help' ],
        [ 'ESC',     'Toggle prompt display' ],
        [ 'Up',      'Previous from history' ],
        [ 'Down',    'Next from history' ],
        [ 'CMD + k / CTRL + k',  'Clear console' ],
        [ 'CTRL + `', 'Focus input' ]
      ];
      this.outputDiv.start('h3').add('Commands').end().
      start('table').style({width: 'max-content'}).
        forEach(cmds, function(c) {
          this.start('tr').
            start('th').attr('width', '250').attr('align', 'left').call(function() {
              if ( c[2] ) {
                self.outputLink(c[0], () => self.eval_(c[0]), this);
              } else {
                this.add(c[0]);
              }
            }).end().
            start('td').attr('align', 'left').add(c[1]);
        }).
        end().
        br().
        start('h3').add('Keyboard Shortcuts').end().
        start('table').style({width: 'max-content'}).
          forEach(shortcuts, function(c) {
            this.start('tr').start('th').attr('width', '250').attr('align', 'left').add(c[0]).end().start('td').add(c[1]);
          }).
        end();
    },

    // TODO: break into two different function
    async function services(opt_query, opt_nameQuery) {
      var dao = this.nSpecDAO.where(this.EQ(this.NSpec.SERVE, this.True));
      if ( opt_query ) dao = dao.where(opt_query);
      if ( opt_nameQuery ) dao = dao.where(this.CONTAINS_IC(this.NSpec.NAME, opt_nameQuery));
      var self = this;
      var sdao;
      this.outputDiv.tag('br');
      this.outputDiv.start('table').attr('width', '100%').
        select(dao, function(n) {
          this.start('tr').
            start('th').attr('align', 'left').call(function() {
              if ( n.name.endsWith('DAO') ) {
                self.outputLink(n.name, () => self.eval_('dao("' + n.name + '")'), this);
                sdao = self.__context__[n.name];
              } else {
                this.add(n.name);
                sdao = undefined;
              }
            }).end().
            start('td').attr('align', 'left').call(function() {
              if ( ! sdao ) return;
              var of = sdao.of;
              self.outputLink('create', () => self.eval_('daoCreate("' + n.name + '")'), this);
            }).end().
            start('td').attr('align', 'left').call(function() {
              if ( ! sdao || ! sdao.of ) return;
              var of = sdao.of;
              self.outputLink(of.id, () => self.eval_('describe(' + of.id + ')'), this);
            }).end().
            start('td').attr('align', 'left').add(n.description);
        });
    },

    // TODO: better to add newlines after

    async function eval_(cmd) {
      var self = this;
      cmd = cmd.trim();
      this.clearProperty('historyPosition');
      if ( ! cmd ) return;
      this.addHistory(cmd);
      this.outputDiv.tag('br').start().show(self.showPrompts$).start('b').add('> ').end().add(cmd);

      with ( this.scope || {} ) {
        with ( this.localScope ) {
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
        }
      }

      this.log(r);
      this.input_.focus();

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
        this.cls();
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
