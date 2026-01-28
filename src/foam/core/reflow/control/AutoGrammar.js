/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.core.reflow.control',
  name: 'AutoGrammar',
  extends: 'foam.parse.Grammar',

  requires: [
    'foam.core.boot.CSpec',
    'foam.parse.Alternate',
    'foam.parse.Parsers',
    'foam.parse.SimpleQueryParser'
  ],

  imports: [
    'agentDAO',
    'commandDAO',
    'flowDAO',
    'AuthenticatedCSpecDAO as cSpecDAO'
  ],

  properties: [
    {
      name: 'cmdsParser',
      factory: function() {
        return this.Alternate.create();
      }
    },
    {
      name: 'daosParser',
      factory: function() {
        return this.Alternate.create();
      }
    },
    {
      name: 'flowsParser',
      factory: function() {
        return this.Alternate.create();
      }
    },
    {
      name: 'agentsParser',
      factory: function() {
        return this.Alternate.create();
      }
    }
  ],

  methods: [
    async function aInit() {
      let p = this.Parsers.create();

      var dao = this.cSpecDAO.where(this.CSpec.SERVED_DAOS);

      this.daosParser.args = (await dao.select()).array.map(c => {
        //        console.log('***', c.id, c);
        let parser = p.sug(p.literalIC(c.id), {
          text:     c.id,
          label:    c.id,
          prependSpaceOnSelect: false,
          category: c.keywords.indexOf('custom') == -1 ? 'standard' : 'custom'});

        parser = this.ParserWithAction.create({
          p: parser,
          action: v => {
            console.log('***** daoName ', v, this.__context__[v]);
            let key = 'query__' + v;
            if ( ! this.symbolMap_[key] ) {
              console.log('************* adding', key, this.$UID, this.cls_.id);
              let dao = this.__context__[v];
              this.addSymbol(key, this.SimpleQueryParser.create({of: dao.of}));
              // TODO: this shouldn't be needed, just setting this.symbolMap_ = undefined
              // should work but it doesn't.
              this.symbolMap_ = this.SYMBOL_MAP_.expression(this.symbols);
            }
            return v;
          }
        });

        parser = p.seq(
          parser,
          p.optional(p.seq(' ', p.sym('where'), ' ', p.sym('query__' + c.id))),
          p.optional(p.seq(' ', p.sym('to'),    ' ', p.sym('agentName')))
        );

        return parser;
      });

      this.cmdsParser.args = (await this.commandDAO.select()).array.map(c => {
        let parser = p.sug(p.literalIC(c.id), {
          text:  c.id,
          label: c.description,
          hint:  c.description,
          prependSpaceOnSelect: false,
          category: 'command'});

        // TODO: take custom parser from Command object itself
        if ( c.id === 'dao' || c.id === 'add' || c.id == 'from' ) {
          parser = p.seq(parser, p.optional(p.seq(' ', p.sym('dao'))));
        } else if ( c.id === 'load' ) {
          parser = p.seq(parser, p.optional(p.seq(' ', p.sym('flowName'))));
        }

        return parser;
      });

      this.flowsParser.args = (await this.flowDAO.select()).array.map(f => {
        return p.sug(p.literalIC(f.name), {
          text:  f.label,
          label: f.description,
          hint:  f.description,
          prependSpaceOnSelect: false,
          category: 'flow'});
      });

      this.agentsParser.args = (await this.agentDAO.select()).array.map(a => {
        return p.sug(p.literalIC(a.label), {
          text:  a.label,
//          label: f.description,
 //         hint:  f.description,
          prependSpaceOnSelect: false,
          category: 'target'});
      });
    },

    function grammar(alt, eof, seq0, seq, seq1, str, sug, sym, repeat, repeat0, anyChar, optional, notChars, literal, range, not, until0, literalIC) {
      return {
        START: alt(sym('autoCmd'), sym('jsCmd')),

        autoCmd: seq('/', sym('cmd')),
//         autoCmd: seq('/', sym('cmd'), optional(seq(' ', sym('dao')))),

        jsCmd: str(seq(not('/'), str(repeat(not(eof()), anyChar())))),

        cmd: this.cmdsParser,

//        dao: seq(sym('daoName') , optional(seq(sym('where'), sym('query')))),
        dao: sym('daoName'),

        where: sug(literalIC(' where'), {text: ' WHERE'}),

        to: sug(literalIC(' to'), {text: ' TO'}),

        daoName: this.daosParser,

        flowName: this.flowsParser,

        agentName: this.agentsParser
      };
    },

    function xxxdaoNameAction(v) {
      console.log('***** daoName ', v, this.__context__[v]);
      let key = 'query:' + v;
      if ( ! this.symbolMap_[key] )
        this.symbolMap_[key] = this.SimpleQueryParser.create({of: dao.of});
      return v;
    }
  ]
});
