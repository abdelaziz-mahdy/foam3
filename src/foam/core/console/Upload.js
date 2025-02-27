/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

// Could use foam.lib.csv.DynamicHeaderCSVParser if need to support inner-objects

foam.CLASS({
  package: 'foam.core.console',
  name: 'Upload',
//  extends: 'foam.u2.Controller',

  requires: [
    'foam.lib.csv.CSVParser',
    'foam.parse.QueryParser'
  ],

  properties: [
    {
      class: 'String',
      name: 'daoKey',
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
      width: 1
    },
    {
      class: 'Int',
      name: 'limit',
      value: 0,
      placeholder: '',
      size: 5
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
      class: 'String',
      name: 'output',
      view: {
        class: 'foam.u2.HTMLView',
        nodeName: 'pre'
      },
      visibility: 'RO'
    }
  ],

  methods: [
    function parseColumns(s) {
      var parser = this.QueryParser.create({of: this.dao.of});
      var props  = [];

      s.trim().split(',').forEach(c => {
        var prop = parser.parseString(c, 'fieldname');
        if ( prop ) {
          this.output += `<span style="color:green">Mapping</span> <b>${c}</b> to <b>${prop.name}</b>\n`;
          props.push(prop);
        } else {
          throw `Unknown property <b>'${c}'</b>`;
        }
      });

      return props;
    },

    async function process(real) {
      this.clear();
      var a = this.input.trim().split('\n');
      if ( ! a ) { this.rows = 0; return; }
      this.rows = a.length-1;

      try {
        var props = this.parseColumns(a[0]);

        this.rows = a.length-1;

        var parser = this.CSVParser.create({});

        for ( var i = 1 ; i < a.length-1 && ( this.limit == 0 || i <= this.limit ) ; i++ ) {
          var row = a[i];
          var obj = this.dao.of.create();
          this.processing = i;
          this.progress   = Math.floor(100 * i / a.length);
          var csv = parser.parseString(row, this.delimiter);
          for ( var j = 0 ; j < csv.length && j < props.length ; j++ ) {
            var value = csv[j];
            if ( value !== '' ) {
              obj[props[j].name] = value.value
            }
          }
          if ( real ) {
            try {
              await this.dao.put(obj);
            } catch (x) {
              debugger;
              throw `Unable to put row ${row} with response "${x}"`
            }
          } else if ( this.limit < 100 ) {
            this.output += 'created ' + obj + '\n';
            console.log(obj);
          }
        }
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
