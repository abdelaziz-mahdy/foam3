/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.core.console',
  name: 'GenericUpload',

  requires: [
    'foam.dao.MDAO',
    'foam.lib.csv.CSVParser',
    'foam.core.console.ColumnParser',
    'foam.core.console.Mapping',
    'foam.core.boot.CSpec'
  ],

  imports: [ 'currentBlock?', 'eval_?', 'setTimeout', 'cSpecDAO' ],

  mixins: [ 'foam.mlang.Expressions' ],

  css: `
    ^ {
      padding: 16px;
      border: 1px solid #ddd;
      border-radius: 4px;
      margin: 8px 0;
    }
    ^ .button-row {
      margin-top: 16px;
      display: flex;
      gap: 8px;
    }
    ^ h3, ^ h4 {
      margin: 8px 0 4px 0;
    }
    ^ .foam-u2-ProgressView {
      margin: 8px 0;
    }
  `,

  properties: [
    {
      class: 'String',
      name: 'input',
      view: { class: 'foam.u2.tag.TextArea', rows: 10, cols: 100 },
      label: 'File Content'
    },
    {
      class: 'String',
      name: 'format',
      value: 'AUTO',
      view: { class: 'foam.u2.view.ChoiceView', choices: [ 'AUTO', 'CSV', 'JSON', 'XML' ] }
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
      name: 'selectedDAO',
      label: 'Target DAO',
      postSet: function(oldValue, newValue) {
        if ( newValue && this.currentHeaders && this.currentHeaders.length > 0 ) {
          this.onDAOSelected();
        }
      }
    },
    {
      name: 'dao',
      hidden: true,
      expression: function(selectedDAO) {
        if ( ! selectedDAO ) return null;
        // Extract DAO name from descriptive choice (e.g., "userDAO (Good Match - 3/5)" -> "userDAO")
        var daoName = selectedDAO.split(' (')[0];
        return this.__context__[daoName];
      }
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
      label: 'Status',
      view: {
        class: 'foam.u2.HTMLView',
        nodeName: 'pre'
      },
      visibility: 'RO'
    },
    {
      class: 'Int',
      name: 'progress',
      view: { class: 'foam.u2.ProgressView' }
    },
    {
      name: 'of',
      transient: true,
      hidden: true,
      expression: function (dao) { return dao ? dao.of : null; }
    },
    {
      name: 'columnParser',
      transient: true,
      hidden: true,
      expression: function (of) {
        return of ? this.ColumnParser.create({of: of}) : null;
      }
    },
    {
      name: 'currentHeaders',
      hidden: true,
      factory: function() { return []; }
    }
  ],

  actions: [
    {
      name: 'analyzeFile',
      label: 'Analyze File',
      isEnabled: function(input) { return !! input; },
      code: function() { this.analyze(); }
    },
    {
      name: 'generateMappings',
      label: 'Generate Mappings',
      isEnabled: function(selectedDAO, currentHeaders) { return !! selectedDAO && currentHeaders && currentHeaders.length > 0; },
      code: function() { this.onDAOSelected(); }
    },
    {
      name: 'upload',
      label: 'Upload',
      isEnabled: function(selectedDAO, mappings) { 
        return !! selectedDAO && mappings && mappings.length > 0; 
      },
      code: function() { this.process(); }
    }
  ],

  methods: [
    async function analyze() {
      if ( ! this.input ) {
        this.output = 'Please provide file content first.';
        return;
      }

      this.output = 'Analyzing file...';
      
      // Auto-detect format
      var content = this.input.trim();
      if ( this.format === 'AUTO' ) {
        if ( content.startsWith('<?xml') ) {
          this.format = 'XML';
        } else if ( content.startsWith('{') || content.startsWith('[') ) {
          this.format = 'JSON';
        } else {
          this.format = 'CSV';
        }
      }

      // Extract headers based on format
      var headers = [];
      if ( this.format === 'CSV' ) {
        var lines = content.split('\n');
        if ( lines.length > 0 ) {
          headers = lines[0].split(this.delimiter).map(h => h.trim());
        }
      } else if ( this.format === 'JSON' ) {
        try {
          var jsonData = JSON.parse(content);
          if ( Array.isArray(jsonData) && jsonData.length > 0 ) {
            headers = Object.keys(jsonData[0]);
          } else if ( typeof jsonData === 'object' ) {
            headers = Object.keys(jsonData);
          }
        } catch (e) {
          this.output = 'Error parsing JSON: ' + e.message;
          return;
        }
      }

      if ( headers.length === 0 ) {
        this.output = 'No headers detected in the file.';
        return;
      }

      // Store headers for later use - ensure they're strings
      var stringHeaders = headers.map(h => typeof h === 'string' ? h : String(h));
      this.currentHeaders = stringHeaders;
      
      // Find matching DAOs
      await this.findMatchingDAOs(headers);
    },

    function onDAOSelected() {
      if ( this.selectedDAO && this.currentHeaders.length > 0 ) {
        // Extract DAO name if it's in the format "daoName (status - score)"
        var daoName = this.selectedDAO.includes('(') ? this.selectedDAO.split(' (')[0] : this.selectedDAO;
        
        // Check if the DAO exists
        if ( this.__context__[daoName] ) {
          this.generateMappings(this.currentHeaders);
          this.output = `DAO selected: ${daoName}. Mappings generated.\n Count: ${this.mappings.length}`;
          if ( this.__context__[daoName].instance_.delegate.name ) {
            this.output += `\npackage: ${this.__context__[daoName].instance_.delegate.name}`;
          }
        } else {
          this.output = `DAO "${daoName}" not found. Please check the name and try again.`;
        }
      }
    },

    async function findMatchingDAOs(headers) {
      this.output = 'Finding matching DAOs...';
      var matchingDAOs = [];
      
      try {
        var cSpecs = await this.cSpecDAO.where(this.CSpec.SERVED_DAOS).select();
        
        for ( var cSpec of cSpecs.array ) {
          var daoName = cSpec.name;
          var dao = this.__context__[daoName];
          
          if ( ! dao || ! dao.of ) continue;
          
          var modelClass = dao.of;
          var properties = modelClass.getAxiomsByClass(foam.lang.Property);
          var score = this.calculateMatchScore(headers, properties);
          
          if ( score > 0 ) {
            matchingDAOs.push({
              name: daoName,
              score: score,
              modelName: modelClass.id
            });
          }
        }
        
        // Sort by score (highest first)
        matchingDAOs.sort((a, b) => b.score - a.score);
        
        // Create descriptive choices showing match quality
        var choices = matchingDAOs.map(dao => {
          var matchPercent = Math.round((dao.score / headers.length) * 100);
          var status = matchPercent >= 80 ? 'Excellent Match' : 
                      matchPercent >= 60 ? 'Good Match' : 
                      matchPercent >= 40 ? 'Partial Match' : 'Poor Match';
          return `${dao.name} (${status} - ${dao.score}/${headers.length})`;
        });
        
        if ( matchingDAOs.length > 0 ) {
          var choicesList = choices.join('\n');
          this.output = `Found ${matchingDAOs.length} matching DAO(s):\n\n${choicesList}\n\nPlease enter the DAO name in the "Target DAO" field above.`;
          // Don't auto-select or generate mappings - let user choose
        } else {
          this.output = 'No matching DAOs found for the detected headers.';
        }
      } catch (e) {
        this.output = 'Error finding matching DAOs: ' + e.message;
      }
    },

    function calculateMatchScore(headers, properties) {
      var score = 0;
      
      for ( var header of headers ) {
        var normalizedHeader = header.toLowerCase().trim();
        
        for ( var prop of properties ) {
          if ( prop.name.toLowerCase() === normalizedHeader ) {
            score++;
            break;
          }
          
          if ( prop.shortName && prop.shortName.toLowerCase() === normalizedHeader ) {
            score++;
            break;
          }
          
          var constantized = foam.String.constantize(prop.name).toLowerCase().replaceAll('_', ' ');
          if ( constantized === normalizedHeader ) {
            score++;
            break;
          }
        }
      }
      
      return score;
    },

    function generateMappings(headers) {
      if ( ! this.dao || ! this.columnParser ) {
        return;
      }
      
      var mappings = [];
      
      headers.forEach(header => {
        // Ensure header is a string - convert if it's a FOAM object
        var headerStr = typeof header === 'string' ? header : 
                       (header && header.toString ? header.toString() : String(header));
        
        var prop = this.columnParser.parseString(headerStr);
        
        var mapping = this.Mapping.create({
          id: headerStr,
          handler: prop || this.Mapping.UNKNOWN,
          of: this.of
        }, this.__subContext__);
        
        mappings.push(mapping);
        
        if ( ! prop ) {
          this.output += `\nWarning: No property found for header "${headerStr}"`;
        }
      });
      
      this.mappings = mappings;
    },

    async function process() {
      if ( ! this.dao ) {
        this.output = 'Please select a target DAO first.';
        return;
      }
      
      this.output = 'Uploading...';
      this.progress = 0;
      
      if ( this.format === 'CSV' ) {
        await this.processCSV();
      } else if ( this.format === 'JSON' ) {
        await this.processJSON();
      }
    },

    async function processCSV() {
      var startTime = Date.now();
      var lines = this.input.trim().split('\n');
      if ( lines.length < 2 ) {
        this.output = 'CSV file must have at least a header and one data row.';
        return;
      }
      
      var totalRows = lines.length - 1;
      var uploadedCount = 0;
      
      for ( var i = 1; i < lines.length; i++ ) {
        var row = lines[i].trim();
        if ( ! row ) continue;
        
        var obj = this.of.create();
        var values = row.split(this.delimiter);
        
        for ( var j = 0; j < values.length && j < this.mappings.length; j++ ) {
          this.mappings[j].process(obj, values[j].trim());
        }
        
        await this.dao.put(obj);
        uploadedCount++;
        this.progress = Math.floor((i / totalRows) * 100);
      }
      
      var endTime = Date.now();
      var duration = ((endTime - startTime) / 1000).toFixed(2);
      this.output = `Upload completed successfully! ${uploadedCount} items uploaded in ${duration} seconds.`;
      this.progress = 100;
    },

    async function processJSON() {
      var startTime = Date.now();
      try {
        var jsonData = JSON.parse(this.input);
        var dataArray = Array.isArray(jsonData) ? jsonData : [jsonData];
        var uploadedCount = 0;
        
        for ( var i = 0; i < dataArray.length; i++ ) {
          var item = dataArray[i];
          var obj = this.of.create();
          
          for ( var mapping of this.mappings ) {
            if ( item.hasOwnProperty(mapping.id) ) {
              mapping.process(obj, item[mapping.id]);
            }
          }
          
          await this.dao.put(obj);
          uploadedCount++;
          this.progress = Math.floor(((i + 1) / dataArray.length) * 100);
        }
        
        var endTime = Date.now();
        var duration = ((endTime - startTime) / 1000).toFixed(2);
        this.output = `Upload completed successfully! ${uploadedCount} items uploaded in ${duration} seconds.`;
        this.progress = 100;
      } catch (e) {
        this.output = 'Error processing JSON: ' + e.message;
      }
    }
  ]
}); 