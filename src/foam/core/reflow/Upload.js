/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

// Could use foam.lib.csv.DynamicHeaderCSVParser if need to support inner-objects

foam.CLASS({
  package: 'foam.core.reflow',
  name: 'DAOHolder',

  properties: [
    { name: 'preview', hidden: true }
  ]
});



foam.CLASS({
  package: 'foam.core.reflow',
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
        return { class: 'foam.core.reflow.PropertyChoiceView', of: X.data.of };
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
  package: 'foam.core.reflow',
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
  package: 'foam.core.reflow',
  name: 'Upload',
  extends: 'foam.u2.Controller',

  requires: [
    'foam.dao.MDAO',
    'foam.core.reflow.ColumnParser',
    'foam.core.reflow.DAOHolder',
    'foam.core.reflow.Mapping',
    'foam.core.reflow.UploadService',
    'foam.core.fs.fileDropZone.FileDropZone',
    'foam.core.fs.File'
  ],

  imports: [ 'currentBlock?', 'eval_?', 'setTimeout' ],

  css: `
    ^file-upload-section {
      margin-bottom: 16px;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    ^manual-input-section {
      margin-bottom: 16px;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    ^section-title {
      font-weight: bold;
      margin-bottom: 8px;
    }
    ^actions {
      margin-top: 20px;
      display: flex;
      gap: 8px;
    }
  `,

  properties: [
    {
      class: 'FObjectArray',
      of: 'foam.lang.FObject',
      name: 'uploadedFiles',
      factory: function() { return []; },
      postSet: function(_, n) {
        if (n && n.length > 0) {
          this.input = '';
          this.processUploadedFiles();
        }
      }
    },
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
      view: { class: 'foam.u2.tag.TextArea', rows: 10, cols: 100 },
      postSet: function(_, n) {
        if (n && n.trim() !== '') {
          this.uploadedFiles = [];
        }
      }
    },
    {
      class: 'FObjectArray',
      of: 'foam.core.reflow.Mapping',
      name: 'mappings',
      view: 'foam.core.reflow.MappingsView',
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
      name: 'uploadService',
      transient: true,
      hidden: true,
      factory: function() {
        return this.UploadService.create();
      }
    },
    {
      class: 'Boolean',
      name: 'bulkUpload',
      getter: function() {
        return this.uploadService.bulkUpload;
      },
      setter: function(value) {
        this.uploadService.bulkUpload = value;
      }
    }
  ],

  methods: [
    function render() {
      this.SUPER();
      
      this.addClass();
      
      // File upload section
      this.start('div').addClass(this.myClass('file-upload-section')).
        show(this.input$.map(input => !input || input.trim() === '')).
        start('div').addClass(this.myClass('section-title')).add('Upload File').end().
        add(this.FileDropZone.create({
          files$: this.uploadedFiles$,
          supportedFormats: {
            'text/csv': 'CSV',
            'application/json': 'JSON',
            'text/xml': 'XML',
            'text/plain': 'TXT'
          },
          title: 'Drag and drop a file here or click to browse',
          onFilesChanged: this.onFilesChanged.bind(this)
        })).
      end().
      
      // Manual input section
      start('div').addClass(this.myClass('manual-input-section')).
        show(this.uploadedFiles$.map(files => !files || files.length === 0)).
        start('div').addClass(this.myClass('section-title')).add('Or Enter Content Manually').end().
        add(this.INPUT).
      end().
      
      // Default property views for the rest
      tag(this.DAO_KEY.__).
      tag(this.FORMAT.__).
      tag(this.DELIMITER.__).
      tag(this.TAG_NAME.__).
      tag(this.MAPPINGS.__).
      tag(this.PROGRESS.__).
      tag(this.OUTPUT.__).

      // Actions at the end
      start('div').addClass(this.myClass('actions')).
        add(this.PREVIEW).
        add(this.UPLOAD).
        add(this.CLEAR).
        add(this.RESET_MAPPINGS).
      end();
    },

    function onFilesChanged(files) {
      var foamFiles = [];
      for (var i = 0; i < files.length; i++) {
        var file = files[i];
        if (file.cls_ && file.cls_.id === 'foam.core.fs.File') {
          foamFiles.push(file);
        } else {
          var foamFile = this.File.create({
            filename: file.name || `File ${i+1}`,
            filesize: file.size || 0,
            mimeType: file.type || 'text/plain',
            data: { blob: file }
          });
          foamFiles.push(foamFile);
        }
      }
      this.uploadedFiles = foamFiles;
    },

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

    function generateMappingsFromInput() {
      if ( ! this.input || ! this.dao ) return;

      try {
        var mappings = this.uploadService.generateMappingsFromInput(
          this.input, 
          this.format, 
          this.dao, 
          this.delimiter, 
          this.tagName
        );
        
        if ( mappings && mappings.length > 0 ) {
          this.mappings = mappings;
          this.output += '<span style="color:blue">Auto-generated mappings from input data</span><br>';
        }
      } catch (e) {
        console.error('Error generating mappings from input:', e);
        console.trace('Mapping generation error stack trace');
        this.output += '<span style="color:red">Error auto-generating mappings: ' + e.message + '</span><br>';
      }
    },

    async function process(real) {
      var self = this;
      await this.data.removeAll();
      this.processing = 0;
      this.clear();

      if ( this.format === 'AUTO' ) {
        this.input = this.input.trim();
        if ( this.input.startsWith('<?xml') ) {
          this.format = 'XML';
        } else if ( this.input.startsWith('{') || this.input.startsWith('[') ) {
          this.format = 'JSON';
        } else {
          this.format = 'CSV';
        }
      }

      if ( this.format === 'DAO' ) {
        return this.processDAO();
      }

      // Auto-generate mappings if they don't exist
      if ( ! this.mappings || this.mappings.length === 0 ) {
        this.generateMappingsFromInput();
      }

      // Use UploadService for all other formats
      return this.uploadService.processUpload({
        input: this.input,
        format: this.format,
        dao: real ? this.dao : this.data,
        mappings: this.mappings,
        delimiter: this.delimiter,
        tagName: this.tagName,
        real: real,
        onProgress: function(current, total, percentage) {
          self.processing = current;
          self.progress = percentage;
          self.rows = total;
        },
        onError: function(error) {
          console.error('Upload error:', error);
          console.trace('Upload error stack trace');
          if ( Array.isArray(error) ) {
            self.output += '<span style="color:red">' + error.map(e => e[0].name + ' ' + e[1]).join(', ') + '</span><br>';
          } else {
            self.output += '<span style="color:red">' + error + '</span><br>';
          }
        },
        onComplete: function(recordCount) {
          self.progress = 100;
          
          if ( ! real && self.block && self.eval_ ) {
            var block = self.block;
            self.eval_(`dao(${block.flowName}.preview, '${block.flowName}.preview')`);
            var block2 = self.currentBlock;
            block2.flowName = block.flowName + 'data';
            block2.obj.limit = 10;
            setTimeout(() => {
              block2.obj.run();
            }, 100);
          }
        }
      });
    },

    async function processDAO() {
      var latch = foam.lang.Latch.create();
      
      try {
        var a = (await this.sourceDAO.select()).array;
        this.rows = a.length;
        
        for ( var i = 0; i < a.length; i++ ) {
          await this.data.put(a[i]);
          this.processing = i + 1;
          this.progress = Math.floor(100 * (i + 1) / a.length);
        }
        
        this.progress = 100;
        latch.resolve('eof');
      } catch (e) {
        this.output += '<span style="color:red">DAO ERROR: ' + e + '</span>';
        latch.reject(e);
      }
      
      return latch;
    },

    async function processUploadedFiles() {
      if (!this.uploadedFiles || this.uploadedFiles.length === 0) {
        return;
      }

      try {
        var firstFile = this.uploadedFiles[0];
        var content = await this.readFileContent(firstFile);
        this.input = content;
        
        this.format = firstFile.mimeType === 'text/csv' ? 'CSV' :
                     firstFile.mimeType === 'application/json' ? 'JSON' :
                     firstFile.mimeType === 'text/xml' ? 'XML' : 'AUTO';
      } catch (e) {
        console.error('Error processing uploaded files:', e);
        console.trace('Upload file processing error stack trace');
        this.output += '<span style="color:red">Error reading uploaded file: ' + e.message + '</span><br>';
      }
    },

    function readFileContent(file) {
      return new Promise((resolve, reject) => {
        try {
          var actualFile = file.data ? file.data.blob : file;
          
          if (!actualFile) {
            reject('No file data available');
            return;
          }

          var reader = new FileReader();
          
          reader.onload = function(e) {
            resolve(e.target.result);
          };
          
          reader.onerror = function() {
            reject('Error reading file');
          };
          
          reader.readAsText(actualFile);
        } catch (e) {
          console.error('Error accessing file:', e);
          console.trace('File access error stack trace');
          reject('Error accessing file: ' + e.message);
        }
      });
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
