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
        console.log('selectedDAO postSet called:', oldValue, '->', newValue);
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
      class: 'FObjectArray',
      of: 'String',
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
        console.log('Upload button check - selectedDAO:', selectedDAO, 'mappings:', mappings, 'mappings.length:', mappings ? mappings.length : 'undefined');
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

      // Store headers for later use
      this.currentHeaders = headers;
      
      // Find matching DAOs
      await this.findMatchingDAOs(headers);
    },

    function onDAOSelected() {
      console.log('onDAOSelected called, selectedDAO:', this.selectedDAO, 'currentHeaders:', this.currentHeaders);
      
      if ( this.selectedDAO && this.currentHeaders.length > 0 ) {
        // Extract DAO name if it's in the format "daoName (status - score)"
        var daoName = this.selectedDAO.includes('(') ? this.selectedDAO.split(' (')[0] : this.selectedDAO;
        
        console.log('Extracted DAO name:', daoName);
        
        // Check if the DAO exists
        if ( this.__context__[daoName] ) {
          console.log('DAO found, generating mappings...');
          this.generateMappings(this.currentHeaders);
          this.output = `DAO selected: ${daoName}. Mappings generated. Count: ${this.mappings.length}`;
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
      console.log('generateMappings called with headers:', headers);
      console.log('this.dao:', this.dao);
      console.log('this.columnParser:', this.columnParser);
      console.log('this.of:', this.of);
      
      if ( ! this.dao || ! this.columnParser ) {
        console.log('Missing dao or columnParser, returning early');
        return;
      }
      
      var mappings = [];
      
      headers.forEach(header => {
        var prop = this.columnParser.parseString(header);
        console.log('Header:', header, 'Mapped to prop:', prop);
        mappings.push(this.Mapping.create({
          id: header,
          handler: prop || this.Mapping.UNKNOWN,
          of: this.of
        }));
        
        if ( ! prop ) {
          this.output += `\nWarning: No property found for header "${header}"`;
        }
      });
      
      console.log('Generated mappings:', mappings);
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
      var lines = this.input.trim().split('\n');
      if ( lines.length < 2 ) {
        this.output = 'CSV file must have at least a header and one data row.';
        return;
      }
      
      var totalRows = lines.length - 1;
      
      for ( var i = 1; i < lines.length; i++ ) {
        var row = lines[i].trim();
        if ( ! row ) continue;
        
        var obj = this.of.create();
        var values = row.split(this.delimiter);
        
        for ( var j = 0; j < values.length && j < this.mappings.length; j++ ) {
          this.mappings[j].process(obj, values[j].trim());
        }
        
        await this.dao.put(obj);
        this.progress = Math.floor((i / totalRows) * 100);
      }
      
      this.output = 'Upload completed successfully!';
      this.progress = 100;
    },

    async function processJSON() {
      try {
        var jsonData = JSON.parse(this.input);
        var dataArray = Array.isArray(jsonData) ? jsonData : [jsonData];
        
        for ( var i = 0; i < dataArray.length; i++ ) {
          var item = dataArray[i];
          var obj = this.of.create();
          
          for ( var mapping of this.mappings ) {
            if ( item.hasOwnProperty(mapping.id) ) {
              mapping.process(obj, item[mapping.id]);
            }
          }
          
          await this.dao.put(obj);
          this.progress = Math.floor(((i + 1) / dataArray.length) * 100);
        }
        
        this.output = 'Upload completed successfully!';
        this.progress = 100;
      } catch (e) {
        this.output = 'Error processing JSON: ' + e.message;
      }
    }
  ]
}); 