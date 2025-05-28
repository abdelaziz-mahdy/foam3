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
  name: 'Mapping',

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
  ],

  methods: [
    function process(obj, value) {
      if ( foam.String.isInstance(value) ) value = value.trim();
      if ( value !== '' ) {
        this.handler.set(obj, value);
      }
    }
  ]
});


foam.CLASS({
  package: 'foam.core.console',
  name: 'MappingsView',
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
        start('td').style({fontWeight: 'bold'}).add('Property').end().
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
    'foam.core.console.ColumnParser',
    'foam.core.console.DAOHolder',
    'foam.core.console.Mapping',
    'foam.core.console.UploadAgent',
    'foam.core.console.UploadService'
  ],

  imports: [ 'currentBlock?', 'eval_?', 'setTimeout' ],

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
      value: 'AUTO',
      view: { class: 'foam.u2.view.ChoiceView', choices: [ 'AUTO', 'DAO', 'CSV', 'JSON', 'XML' ] }
    },
    {
      class: 'String',
      name: 'sourceDAOKey',
      label: 'Source DAO',
      adapt: function(o, n) {
        if ( this.__context__[n] ) return n;
        if ( this.__context__[n + 'DAO'] ) return n + 'DAO';
        if ( n.endsWith('s') ) return n.substring(0, n.length-1) + 'DAO';
        return n;
      },
      visibility: function(format) { return format === 'DAO' ?
        foam.u2.DisplayMode.RW :
        foam.u2.DisplayMode.HIDDEN ;
      }
    },
    {
      name: 'sourceDAO',
      hidden: true,
      expression: function(sourceDAOKey) {
        return this.__context__[sourceDAOKey];
      }
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
      class: 'String',
      name: 'tagName',
      value: 'CardFinancial',
      visibility: function(format) { return format === 'XML' ?
        foam.u2.DisplayMode.RW :
        foam.u2.DisplayMode.HIDDEN ;
      }
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
      view: { class: 'foam.u2.tag.TextArea', rows: 10, cols: 100 }
    },
    {
      class: 'FObjectArray',
      of: 'foam.core.console.Mapping',
      name: 'mappings',
      view: 'foam.core.console.MappingsView',
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
    { name: 'block', hidden: true, postSet: function(o, n) { if ( ! n ) debugger; } },
    {
      name: 'of',
      transient: true,
      hidden: true,
      expression: function (dao) { return dao.of; }
    },
    {
      name: 'columnParser',
      transient: true,
      hidden: true,
      expression: function (of) {
        return this.ColumnParser.create({of: of});
      }
    },
    {
      class: 'Boolean',
      name: 'bulkUpload',
      value: true
    },
    {
      name: 'uploadService',
      transient: true,
      hidden: true,
      factory: function() {
        return this.UploadService.create();
      }
    }
  ],

  methods: [
    function init() {
      this.SUPER();

      if ( this.currentBlock ) {
        this.block        = this.currentBlock;
        this.block.upload = this;
        this.block.value  = this.DAOHolder.create({preview: this.data});
      }
    },

    function parseColumns(s) {
      if ( s === this.lastColumns ) return this.mappings;
      var mappings = [];

      s.trim().split(',').forEach(c => {
        if ( c.indexOf(' ') != -1 ) {
          c = c.split(' ').map((n, i) => { n = n.toLowerCase(); if ( i ) n = foam.String.capitalize(n); return n; }).join('');
        }

        var prop = this.columnParser.parseString(c);
        mappings.push(this.Mapping.create({id: c, handler: prop || this.Mapping.UNKNOWN, of: this.of}));
        if ( ! prop ) {
          this.output += '<span style="color:red">Unknown property: ' + c + '</span><br>';
        }
      });

      this.mappings = mappings;
      this.lastColumns = s;

      return this.mappings;
    },

    async function process(real) {
      var self = this;
      await this.data.removeAll();
      this.processing = 0;
      this.clear();
      console.time('upload');
      var i = 1;
      var agent;

      var sink = this.bulkUpload ? {
        put: async function(o) {
          self.processing = Math.max(self.processing, i);
          self.progress   = self.rows ? Math.max(self.progress, Math.floor(100 * i / self.rows)) : 0;

          if ( o.errors_ ) {
            //            self.output += '<span style="color:red">' + o.errors_ + ', row: ' + i + '<br>' + row + '</span>';
            self.output += '<span style="color:red">' + o.errors_.map(e => e[0].name + ' ' + e[1]).join(', ') + '</span><br>';
          }

          if ( ! real ) {
            if ( foam.lang.Long.isInstance(o.ID) && ! o.id ) o.id = i;
            self.data.put(o);
          } else {
            if ( ! agent ) agent = self.UploadAgent.create();
            agent.data.push(o);
            if ( i && i % 1000 === 0 ) {
              var oldAgent = agent;
              agent = undefined;
              if ( i && i % 10000 === 0 ) {
                await self.dao.cmd(oldAgent);
              } else {
                self.dao.cmd(oldAgent);
              }
              // Wait 0ms so that the GUI (including the upload progress) can update
              await new Promise(r => self.setTimeout(r, 0));
            }
          }
          i++;
        },
        eof: async function() {
          if ( agent ) await self.dao.cmd(agent);
          self.progress = 100;
          console.timeEnd('upload');
          latch.resolve('eof');

          if ( ! real ) {
            var block = self.block;
            self.eval_(`dao(${block.flowName}.preview, '${block.flowName}.preview')`);
            var block2 = self.currentBlock;
            block2.flowName = block.flowName + 'data';
            block2.obj.limit = 10;
            setTimeout(() => {
              // Needed because it is the SinkView which creates the 'select' object
              block2.obj.run();
            }, 100);
          }
        }
      } : {
        put: self.dao.put.bind(self.dao),
        eof: function() {
          console.timeEnd('upload');
          latch.resolve('eof');
        }
      };


      // Handle DAO format separately since it's specific to Upload class
      if ( this.format === 'DAO' ) {
        return this.processDAO(real);
      }

      // Auto-detect format
      this.input = this.input.trim();
      if ( this.format === 'AUTO' ) {
        if ( this.input.startsWith('<?xml') ) {
          this.format = 'XML';
        } else if ( this.input.startsWith('{') ) {
          this.format = 'JSON';
        } else {
          this.format = 'CSV';
        }
      }

      // For CSV, generate mappings if they don't exist
      if ( this.format === 'CSV' && this.mappings.length === 0 ) {
        var lines = this.input.split('\n');
        if ( lines.length > 0 ) {
          this.parseColumns(lines[0]);
        }
      }

      // For XML, generate mappings dynamically (Upload class behavior)
      if ( this.format === 'XML' ) {
        this.mappings_ = {};
        this.mappings.forEach(m => this.mappings_[m.id] = m);
      }

      try {
        var latch = await this.uploadService.processUpload({
          input: this.input,
          format: this.format,
          dao: real ? this.dao : this.data,
          mappings: this.mappings,
          delimiter: this.delimiter,
          tagName: this.tagName,
          real: real,
          onProgress: function(current, total, percentage) {
            self.processing = Math.max(self.processing, current);
            self.progress = percentage;
            self.rows = total;
          },
          onError: function(error) {
            self.output += '<span style="color:red">' + error + '</span>';
          },
          onComplete: function(recordCount) {
            self.progress = 100;
            console.timeEnd('upload');

            if ( ! real && self.currentBlock ) {
              var block = self.block;
              self.eval_(`dao(${block.flowName}.preview, '${block.flowName}.preview')`);
              var block2 = self.currentBlock;
              block2.flowName = block.flowName + 'data';
              block2.obj.limit = 10;
              setTimeout(() => {
                // Needed because it is the SinkView which creates the 'select' object
                block2.obj.run();
              }, 100);
            }
          },
          onRowProcessed: function(obj, rowIndex) {
            if ( ! real ) {
              if ( foam.lang.Long.isInstance(obj.ID) ) obj.id = rowIndex;
            }
          }
        });

        // For XML format, update mappings after processing (Upload class behavior)
        if ( this.format === 'XML' && this.mappings_ ) {
          this.mappings = Object.values(this.mappings_);
        }

        return latch;
      } catch (e) {
        this.output += '<span style="color:red">ERROR: ' + e + '</span>';
        console.timeEnd('upload');
      }
    },

    async function processDAO(real) {
      var self = this;
      var latch = foam.lang.Latch.create();
      
      try {
        var a = (await this.sourceDAO.select()).array;
        this.rows = a.length;
        
        for ( var i = 0; i < a.length; i++ ) {
          self.processing = Math.max(self.processing, i + 1);
          self.progress = Math.floor(((i + 1) / a.length) * 100);
          
          if ( real ) {
            await this.dao.put(a[i]);
          } else {
            await this.data.put(a[i]);
          }
        }
        
        self.progress = 100;
        console.timeEnd('upload');
        latch.resolve('eof');
      } catch (e) {
        this.output += '<span style="color:red">ERROR: ' + e + '</span>';
        latch.reject(e);
      }
      
      return latch;
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
    },
    {
      name: 'resetMappings',
      isAvailable: function(mappings) { return mappings.length; },
      code: function() {
        this.mappings = [];
      }
    }
  ]
});
