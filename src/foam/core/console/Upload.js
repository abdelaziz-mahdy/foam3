/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

// Could use foam.lib.csv.DynamicHeaderCSVParser if need to support inner-objects

foam.CLASS({
  package: 'foam.core.console',
  name: 'DAOHolder',

  properties: [
    { name: 'preview', hidden: true }
  ]
});



foam.CLASS({
  package: 'foam.core.console',
  name: 'UploadMapping',

  constants: {
    UNKNOWN: { name: '--', set: function() {}, cls_: { name: '--' } }
  },

  properties: [
    {
      class: 'String',
      name: 'id'
    },
    {
      name: 'handler',
      view: function(_, X) {
        return { class: 'foam.core.console.PropertyChoiceView', optionalChoice: [ this.UNKNOWN, '--' ], of: X.data.of };
      }
    },
    {
      name: 'of',
      hidden: true
    }
  ]
});


foam.CLASS({
  package: 'foam.core.console',
  name: 'UploadMappingsView',
  extends: 'foam.u2.Controller',

  properties: [ 'data' ],

  css: `
    ^ .foam-u2-tag-Select { height: 20px; }
    ^ td { padding: 2px 10px; }
  `,

  methods: [
    function render() {
      this.SUPER();

      this.addClass().
      start('table').start('tr').
        start('td').style({fontWeight: 'bold'}).add('Column').end().
        start('td').style({fontWeight: 'bold'}).add('Handler').end().
        start('td').style({fontWeight: 'bold'}).add('Type').end().
        start('td').style({fontWeight: 'bold'}).add('Required').end().
      end().
      add(function(data) {
        this.forEach(data, function(d) {
          this.
            startContext({data: d}).
            start('tr').
              start('td').add(d.id).end().
              start('td').add(d.HANDLER).end().
              start('td').add(d.handler$.map(h => h.cls_.name)).end().
              start('td').add(d.handler$.map(h => h.required)).end();
        });
      });
    }
  ]
});


foam.CLASS({
  package: 'foam.core.console',
  name: 'Upload',

  requires: [
    'foam.dao.MDAO',
    'foam.lib.csv.CSVParser',
    'foam.parse.QueryParser',
    'foam.core.console.DAOHolder',
    'foam.core.console.UploadMapping',
    'foam.core.console.UploadAgent'
  ],

  imports: [ 'currentBlock', 'eval_' ],

  properties: [
    {
      class: 'String',
      name: 'daoKey',
      label: 'DAO',
      adapt: function(o, n) {
        if ( this.__context__[n] ) return n;
        if ( this.__context__[n + 'DAO'] ) return n + 'DAO';
        if ( n.endsWith('s') ) return n.substring(0, n.length-1) + 'DAO';
        return n;
      }
    },
    {
      name: 'dao',
      hidden: true,
      factory: function() {
        return this.__context__[this.daoKey];
      }
    },
    {
      class: 'String',
      name: 'format',
      value: 'CSV',
      view: { class: 'foam.u2.view.ChoiceView', choices: [ 'CSV', 'JSON', 'XML' ] }
    },
    {
      class: 'String',
      name: 'delimiter',
      value: ',',
      visibility: function(format) { return format === 'CSV' ?
        foam.u2.DisplayMode.RW :
        foam.u2.DisplayMode.HIDDEN ;
      },
      width: 1
    },
    {
      class: 'Int',
      name: 'processing',
      visibility: 'RO'
    },
    {
      class: 'Int',
      name: 'progress',
      view: { class: 'foam.u2.ProgressView' }
    },
    {
      class: 'Int',
      name: 'rows',
      visibility: 'RO'
    },
    {
      class: 'String',
      name: 'input',
      view: { class: 'foam.u2.tag.TextArea', rows: 20, cols: 90 }
    },
    {
      class: 'FObjectArray',
      of: 'foam.core.console.UploadMapping',
      name: 'mappings',
      view: 'foam.core.console.UploadMappingsView',
      factory: function() { return []; }
    },
    {
      class: 'String',
      name: 'output',
      label: 'Errors',
      view: {
        class: 'foam.u2.HTMLView',
        nodeName: 'pre'
      },
      visibility: 'RO'
    },
    {
      class: 'foam.dao.DAOProperty',
      name: 'data',
      factory: function() {
        return this.MDAO.create({of: this.dao.of});
      },
      hidden: true
    },
    { name: 'block', hidden: true, postSet: function(o, n) { if ( ! n ) debugger; } }
  ],

  methods: [
    function init() {
      this.SUPER();

      this.block = this.currentBlock;
      this.block.value = this.DAOHolder.create({preview: this.data});
    },

    function parseColumns(s) {
      if ( s === this.lastColumns ) return this.mappings;
      var parser   = this.QueryParser.create({of: this.dao.of});
      var mappings = [];

      s.trim().split(',').forEach(c => {
        var prop = parser.parseString(c, 'fieldname');

        if ( ! prop ) {
          c = c.split(' ').map((n, i) => { n = n.toLowerCase(); if ( i ) n = foam.String.capitalize(n); return n; }).join('');
          prop = parser.parseString(c, 'fieldname');
        }

        mappings.push(this.UploadMapping.create({id: c, handler: prop || foam.core.console.UploadMapping.UNKNOWN, of: this.dao.of}));
        if ( ! prop ) {
          this.output += '<span style="color:red">Unknown property: ' + c + '</span>';
        }
      });

      this.mappings = mappings;
      this.lastColumns = s;

      return this.mappings;
    },

    async function process(real) {
      await this.data.removeAll();
      this.clear();
      console.time('upload');

      if ( this.format === 'CSV' ) {
        this.processCSV(real);
      } else if ( this.format === 'XML' ) {
        this.processXML(real);
      }

      console.timeEnd('upload');

      if ( ! real ) {
        var block = this.block;
        this.eval_(`dao(${block.flowName}.preview, '${block.flowName}.preview')`);
        var block2 = this.currentBlock;
        block2.flowName = block.flowName + 'data';
        block2.obj.limit = 10;
        setTimeout(() => {
          // Needed because it is the SinkView which creates the 'select' object
          block2.obj.run();
        }, 100);
      }
    },

    async function processXML(real) {

    },

    async function processCSV(real) {
      var ids = {};
      var a = this.input.trim().split('\n');
      if ( ! a ) { this.rows = 0; return; }
      this.rows = a.length-1;

      try {
        var props  = this.parseColumns(a[0]);
        var parser = this.CSVParser.create({});
        var agent;

        this.rows = a.length-1;

        for ( var i = 1 ; i < a.length ; i++ ) {
          if ( ! agent ) agent = this.UploadAgent.create();
          var row = a[i];
          var obj = this.dao.of.create();
          this.processing = Math.max(this.processing, i);
          this.progress   = Math.max(this.progress, Math.floor(100 * i / a.length));
          var csv = parser.parseString(row, this.delimiter);
          for ( var j = 0 ; j < csv.length && j < props.length ; j++ ) {
            var prop  = props[j].handler;
            var value = csv[j];
            if ( value !== '' ) { // TODO: this line is probably wrong
              prop.set(obj, value.value);
            }
          }
          /*
          if ( ids[obj.id] ) {
            this.output += '<span style="color:red">Duplicate Records for id "' + obj.id + '":<br>' + ids[obj.id] + '<br>' + row + '</span>';
          }
          ids[obj.id] = row;
          */
          if ( obj.errors_ ) {
            this.output += '<span style="color:red">' + obj.errors_ + ', row: ' + i + '<br>' + row + '</span>';
          }
          if ( real ) {
            agent.data.push(obj);
            if ( i && i % 1000 === 0 ) {
              var oldAgent = agent;
              agent = undefined;
              if ( i && i % 10000 === 0 ) {
                await this.dao.cmd(oldAgent);
              } else {
                this.dao.cmd(oldAgent);
              }
            }
            /*
            try {
              if ( i % 250 == 1 ) {
                await this.dao.put(obj);
              } else {
                this.dao.put(obj);
              }
            } catch (x) {
              throw `Unable to put row ${row} with response "${x}"`
              }
              */
          } else {
            this.data.put(obj);
          }
        }
        if ( agent ) this.dao.cmd(agent);

        this.progress = 100;
      } catch (x) {
        this.output += '<span style="color:red">ERROR: ' + x + '</span>';
      }
    }
  ],

  actions: [
    {
      name: 'preview',
      code: function() { this.process(false); }
    },
    {
      name: 'upload',
      code: function() { this.process(true); }
    },
    {
      name: 'clear',
      code: function() {
        this.output   = '';
        this.progress = 0;
      }
    }
  ]
});
