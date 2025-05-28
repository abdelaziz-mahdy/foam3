/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.core.console',
  name: 'UploadService',

  requires: [
    'foam.lib.csv.CSVParser',
    'foam.core.console.UploadAgent'
  ],

  imports: [ 'setTimeout' ],

  properties: [
    {
      class: 'Boolean',
      name: 'bulkUpload',
      value: true
    }
  ],

  methods: [
    /**
     * Process data with callbacks for progress tracking and error handling
     * @param {Object} config - Configuration object
     * @param {string} config.input - Input data string
     * @param {string} config.format - Data format (CSV, JSON, XML)
     * @param {Object} config.dao - Target DAO
     * @param {Array} config.mappings - Property mappings
     * @param {string} config.delimiter - CSV delimiter (optional)
     * @param {string} config.tagName - XML tag name (optional)
     * @param {boolean} config.real - Whether to actually upload or just preview
     * @param {Function} config.onProgress - Progress callback (current, total, percentage)
     * @param {Function} config.onError - Error callback (error message)
     * @param {Function} config.onComplete - Completion callback
     * @param {Function} config.onRowProcessed - Row processed callback (object, rowIndex)
     */
    async function processUpload(config) {
      var self = this;
      var {
        input, format, dao, mappings, delimiter = ',', tagName, real = true,
        onProgress, onError, onComplete, onRowProcessed
      } = config;

      if ( ! input || ! dao || ! mappings ) {
        if ( onError ) onError('Missing required parameters: input, dao, or mappings');
        return;
      }

      var latch = foam.lang.Latch.create();
      var i = 1;
      var agent;
      var rows = 0;

      // Create sink with progress tracking
      var sink = this.bulkUpload ? {
        put: async function(obj) {
          if ( onProgress ) onProgress(i, rows, rows ? Math.floor(100 * i / rows) : 0);

          if ( obj.errors_ && onError ) {
            onError(obj.errors_);
          }

          if ( onRowProcessed ) onRowProcessed(obj, i);

          if ( ! real ) {
            // Preview mode - put object into DAO for preview
            if ( foam.lang.Long.isInstance(obj.ID) ) obj.id = i;
            await dao.put(obj);
          } else {
            // Real upload mode - use bulk upload with UploadAgent
            if ( ! agent ) agent = self.UploadAgent.create();
            agent.data.push(obj);
            if ( i && i % 1000 === 0 ) {
              var oldAgent = agent;
              agent = undefined;
              if ( i && i % 10000 === 0 ) {
                await dao.cmd(oldAgent);
              } else {
                dao.cmd(oldAgent);
              }
              // Wait 0ms so that the GUI can update
              await new Promise(r => self.setTimeout(r, 0));
            }
          }
          i++;
        },
        eof: async function() {
          if ( agent ) await dao.cmd(agent);
          if ( onProgress ) onProgress(rows, rows, 100);
          if ( onComplete ) onComplete(i - 1);
          latch.resolve('eof');
        }
      } : {
        put: async function(obj) {
          if ( onProgress ) onProgress(i, rows, rows ? Math.floor(100 * i / rows) : 0);
          if ( onRowProcessed ) onRowProcessed(obj, i);
          await dao.put(obj);
          i++;
        },
        eof: function() {
          if ( onProgress ) onProgress(rows, rows, 100);
          if ( onComplete ) onComplete(i - 1);
          latch.resolve('eof');
        }
      };

      try {
        input = input.trim();

        if ( format === 'CSV' ) {
          rows = await this.processCSV(input, mappings, delimiter, sink);
        } else if ( format === 'JSON' ) {
          rows = await this.processJSON(input, mappings, sink);
        } else if ( format === 'XML' ) {
          rows = await this.processXML(input, mappings, tagName, sink, dao.of);
        } else {
          if ( onError ) onError('Unsupported format: ' + format);
          return;
        }
      } catch (e) {
        if ( onError ) onError('Processing error: ' + e.message);
        return;
      }

      return latch;
    },

    async function processCSV(input, mappings, delimiter, sink) {
      var lines = input.split('\n');
      if ( ! lines || lines.length < 2 ) {
        throw new Error('CSV must have at least a header and one data row');
      }

      var rows = lines.length - 1;
      var parser = this.CSVParser.create({});

      for ( var i = 1; i < lines.length; i++ ) {
        var row = lines[i];
        if ( ! row.trim() ) continue;
        
        var obj = mappings[0].of.create();
        var csv = parser.parseString(row, delimiter);
        
        for ( var j = 0; j < csv.length && j < mappings.length; j++ ) {
          mappings[j].process(obj, csv[j].value);
        }
        
        await sink.put(obj);
      }

      sink.eof();
      return rows;
    },

    async function processJSON(input, mappings, sink) {
      var jsonData = JSON.parse(input);
      var dataArray = Array.isArray(jsonData) ? jsonData : [jsonData];
      var rows = dataArray.length;

      for ( var i = 0; i < dataArray.length; i++ ) {
        var item = dataArray[i];
        var obj = mappings[0].of.create();
        
        for ( var mapping of mappings ) {
          if ( item.hasOwnProperty(mapping.id) ) {
            mapping.process(obj, item[mapping.id]);
          }
        }
        
        await sink.put(obj);
      }

      sink.eof();
      return rows;
    },

    async function processXML(input, mappings, tagName, sink, modelClass) {
      var parser = new DOMParser();
      var doc = parser.parseFromString(input, 'text/xml');
      var root = doc.firstChild;
      var children = root.children;
      var rows = 0;

      // Count matched rows
      for ( var i = 0; i < children.length; i++ ) {
        var node = children[i];
        if ( tagName && node.tagName !== tagName ) continue;
        rows++;
      }

      // Process matched rows
      for ( var i = 0; i < children.length; i++ ) {
        var node = children[i];
        if ( tagName && node.tagName !== tagName ) continue;
        
        var obj = this.objectifyXML(node, mappings, modelClass);
        await sink.put(obj);
      }

      sink.eof();
      return rows;
    },

    function objectifyXML(doc, mappings, modelClass) {
      var obj = modelClass.create();
      var children = doc.children;
      var mappingMap = {};
      
      // Create mapping lookup
      mappings.forEach(m => mappingMap[m.id] = m);

      for ( var i = 0; i < children.length; i++ ) {
        var node = children[i];
        var attrs = node.getAttributeNames();

        if ( node.firstChild ) {
          var value = node.firstChild.nodeValue;
          var mapping = mappingMap[node.tagName];
          if ( mapping ) mapping.process(obj, value);
        }
        
        for ( var j = 0; j < attrs.length; j++ ) {
          var attrName = attrs[j];
          var value = node.getAttribute(attrName);
          var key = node.tagName + '.' + attrName;
          var mapping = mappingMap[key];
          if ( mapping ) mapping.process(obj, value);
        }
      }

      return obj;
    }
  ]
}); 