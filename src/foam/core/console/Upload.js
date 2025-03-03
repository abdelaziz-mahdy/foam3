/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

// Could use foam.lib.csv.DynamicHeaderCSVParser if need to support inner-objects

foam.CLASS({
  package: 'foam.core.console',
  name: 'UploadMapping',

  properties: [
    {
      class: 'String',
      name: 'id'
    },
    {
      name: 'handler',
      view: function(_, X) {
       return { class: 'foam.core.console.PropertyChoiceView', of: X.data.of };
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
              start('td').add(d.handler.cls_.name).end().
              start('td').add(d.handler.required).end();
        });
      });
    }
  ]
});


foam.CLASS({
  package: 'foam.core.console',
  name: 'Upload',

  requires: [
    'foam.lib.csv.CSVParser',
    'foam.parse.QueryParser',
    'foam.core.console.UploadMapping',
    'foam.core.console.UploadAgent'
  ],

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
    }
  ],

  methods: [
    function parseColumns(s) {
      var parser   = this.QueryParser.create({of: this.dao.of});
      var props    = [];
      var mappings = [];

      s.trim().split(',').forEach(c => {
        var prop = parser.parseString(c, 'fieldname');
        if ( prop ) {
          mappings.push(this.UploadMapping.create({id: c, handler: prop, of: this.dao.of}));
//          this.output += `<span style="color:green">Mapping</span> <b>${c}</b> to <b>${prop.name}</b>\n`;
          props.push(prop);
        } else {
          throw `Unknown property <b>'${c}'</b>`;
        }
      });

      this.mappings = mappings;

      return props;
    },

    async function process(real) {
      var ids = {};
      this.clear();
      var a = this.input.trim().split('\n');
      if ( ! a ) { this.rows = 0; return; }
      this.rows = a.length-1;

      console.time('upload');
      try {
        var props = this.parseColumns(a[0]);

        this.rows = a.length-1;

        var parser = this.CSVParser.create({});
        var agent;
        for ( var i = 1 ; i < a.length ; i++ ) {
          if ( ! agent ) agent = this.UploadAgent.create();
          var row = a[i];
          var obj = this.dao.of.create();
          this.processing = Math.max(this.processing, i);
          this.progress   = Math.max(this.progress, Math.floor(100 * i / a.length));
          var csv = parser.parseString(row, this.delimiter);
          for ( var j = 0 ; j < csv.length && j < props.length ; j++ ) {
            var value = csv[j];
            if ( value !== '' ) {
              obj[props[j].name] = value.value
            }
          }
          if ( ids[obj.id] ) {
            this.output += '<span style="color:red">Duplicate Records for id "' + obj.id + '":<br>' + ids[obj.id] + '<br>' + row + '</span>';
          }
          ids[obj.id] = row;
          if ( obj.errors_ ) {
            this.output += '<span style="color:red">' + obj.errors_ + ', row: ' + i + '<br>' + row + '</span>';
          }
          if ( real ) {
            agent.data.push(obj);
            if ( i && i % 1000 === 0 ) {
              var oldAgent = agent;
              agent = undefined;
              if ( i && i % 100000 === 0 ) {
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
          }
        }
        if ( agent ) this.dao.cmd(agent);

        this.progress = 100;
      } catch (x) {
        this.output += '<span style="color:red">ERROR: ' + x + '</span>';
      }
      console.timeEnd('upload');
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
