/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.core.console',
  name: 'FileUpload',
  extends: 'foam.u2.Controller',

  requires: [
    'foam.dao.MDAO',
    'foam.core.console.ColumnParser',
    'foam.core.console.Mapping',
    'foam.core.console.UploadService',
    'foam.core.boot.CSpec',
    'foam.core.fs.fileDropZone.FileDropZone',
    'foam.core.fs.File',
    'foam.u2.ActionView'
  ],

  imports: [ 'cSpecDAO' ],

  mixins: [ 'foam.mlang.Expressions' ],

  css: `
    ^ {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }
    ^ .step {
      margin-bottom: 24px;
      padding: 16px;
      border: 1px solid #ddd;
      border-radius: 8px;
      background-color: #fafafa;
    }
    ^ .step.active {
      border-color: #007bff;
      background-color: #f0f8ff;
    }
    ^ .step.completed {
      border-color: #28a745;
      background-color: #f0fff0;
    }
    ^ .step h3 {
      margin: 0 0 12px 0;
      color: #333;
    }
    ^ .file-upload-area {
      border: 2px dashed #ccc;
      border-radius: 8px;
      padding: 40px;
      text-align: center;
      background-color: #f9f9f9;
      cursor: pointer;
      transition: all 0.3s ease;
    }
    ^ .file-upload-area:hover {
      border-color: #007bff;
      background-color: #f0f8ff;
    }
    ^ .file-upload-area.dragover {
      border-color: #007bff;
      background-color: #e3f2fd;
    }
    ^ .dao-suggestions {
      margin-top: 16px;
    }
    ^ .dao-option {
      padding: 8px 12px;
      margin: 4px 0;
      border: 1px solid #ddd;
      border-radius: 4px;
      cursor: pointer;
      background-color: white;
    }
    ^ .dao-option:hover {
      background-color: #f0f8ff;
      border-color: #007bff;
    }
    ^ .dao-option.selected {
      background-color: #007bff;
      color: white;
      border-color: #007bff;
    }
    ^ .mappings-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
    }
    ^ .mappings-table th,
    ^ .mappings-table td {
      padding: 8px 12px;
      border: 1px solid #ddd;
      text-align: left;
    }
    ^ .mappings-table th {
      background-color: #f8f9fa;
      font-weight: bold;
    }
    ^ .progress-section {
      margin-top: 16px;
    }
    ^ .foam-u2-ProgressView {
      margin: 8px 0;
    }
    ^ .action-buttons {
      margin-top: 16px;
      display: flex;
      gap: 12px;
    }
    ^ .action-buttons button {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }
    ^ .btn-primary {
      background-color: #007bff;
      color: white;
    }
    ^ .btn-secondary {
      background-color: #6c757d;
      color: white;
    }
    ^ .btn-success {
      background-color: #28a745;
      color: white;
    }
  `,

  properties: [
    {
      class: 'FObjectArray',
      of: 'foam.lang.FObject',
      name: 'uploadedFiles',
      factory: function() { return []; },
      postSet: function(_, n) {
        // Force action state update when files change
        if (this.ANALYZE_STRUCTURE) {
          this.ANALYZE_STRUCTURE.isEnabled = function() {
            return (n && n.length > 0) || (this.input && this.input.trim() !== '');
          };
        }
        // Disable manual input if files are uploaded
        if (n && n.length > 0) {
          this.input = '';
        }
        // Force property change notification
        this.propertyChange.pub('uploadedFiles', this.slot('uploadedFiles'));
      }
    },
    {
      class: 'String',
      name: 'input',
      label: 'File Content (Manual Input)',
      view: { 
        class: 'foam.u2.tag.TextArea', 
        rows: 8, 
        cols: 100,
        placeholder: 'Or paste file content here manually if not using file upload...'
      },
      postSet: function(_, n) {
        // Disable file upload if manual input is used
        if (n && n.trim() !== '') {
          this.uploadedFiles = [];
        }
        // Update analyze button state
        if (this.ANALYZE_STRUCTURE) {
          this.ANALYZE_STRUCTURE.isEnabled = function() {
            return (this.uploadedFiles && this.uploadedFiles.length > 0) || (n && n.trim() !== '');
          };
        }
        // Force property change notification
        this.propertyChange.pub('input', this.slot('input'));
      }
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
      }
    },
    {
      class: 'String',
      name: 'tagName',
      value: '',
      visibility: function(format) { return format === 'XML' ?
        foam.u2.DisplayMode.RW :
        foam.u2.DisplayMode.HIDDEN ;
      }
    },
    {
      class: 'String',
      name: 'selectedDAO',
      label: 'Target DAO',
      view: { 
        class: 'foam.core.console.DAOSelectionView',
        mode: foam.u2.DisplayMode.RW
      }
    },
    {
      name: 'dao',
      hidden: true,
      expression: function(selectedDAO) {
        if ( ! selectedDAO ) return null;
        var daoName = selectedDAO.includes('(') ? selectedDAO.split(' (')[0] : selectedDAO;
        return this.__context__[daoName];
      }
    },
    {
      name: 'detectedHeaders',
      hidden: true,
      factory: function() { return []; }
    },
    {
      name: 'suggestedDAOs',
      hidden: true,
      factory: function() { return []; }
    },
    {
      class: 'FObjectArray',
      of: 'foam.core.console.Mapping',
      name: 'mappings',
      hidden: true,
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
      view: { class: 'foam.u2.ProgressView' },
      visibility: 'RO'
    },
    {
      class: 'String',
      name: 'progressStatus',
      value: '',
      hidden: true
    },
    {
      class: 'Boolean',
      name: 'filesVerified',
      value: false,
      hidden: true
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
      name: 'uploadService',
      transient: true,
      hidden: true,
      factory: function() {
        return this.UploadService.create();
      }
    },
    {
      class: 'foam.dao.DAOProperty',
      name: 'previewData',
      factory: function() {
        return this.MDAO.create({of: this.dao ? this.dao.of : foam.lang.FObject});
      },
      hidden: true
    }
  ],

  actions: [
    {
      name: 'analyzeStructure',
      label: 'Analyze Structure',
      isEnabled: function(uploadedFiles, input) {
        var hasFiles = uploadedFiles && uploadedFiles.length > 0;
        var hasInput = input && input.trim() !== '';
        return hasFiles || hasInput;
      },
      code: function() { 
        this.analyzeContent(); 
      }
    },
    {
      name: 'uploadAll',
      label: 'Upload All Files',
      isEnabled: function() { 
        return this.selectedDAO && this.mappings && this.mappings.length > 0 && 
               ((this.uploadedFiles && this.uploadedFiles.length > 0) || (this.input && this.input.trim() !== '')); 
      },
      code: function() { 
        this.processAllUploads(true); 
      }
    },
    {
      name: 'previewAll',
      label: 'Preview All Files',
      isEnabled: function() { 
        return this.selectedDAO && this.mappings && this.mappings.length > 0 && 
               ((this.uploadedFiles && this.uploadedFiles.length > 0) || (this.input && this.input.trim() !== '')); 
      },
      code: function() { 
        this.processAllUploads(false); 
      }
    },
    {
      name: 'reset',
      label: 'Reset All',
      code: function() {
        this.uploadedFiles = [];
        this.input = '';
        this.selectedDAO = '';
        this.detectedHeaders = [];
        this.suggestedDAOs = [];
        this.mappings = [];
        this.output = '';
        this.progress = 0;
        this.progressStatus = '';
        this.filesVerified = false;
        this.dao = null;
      }
    }
  ],

  methods: [
    function render() {
      this.SUPER();
      
      this.addClass().
      
      // File Upload Section
      start('div').addClass('step').
        start('h3').add('Step 1: Upload Files or Add Content').end().
        start('div').style({marginBottom: '20px'}).
          start('h4').add('Multiple File Upload').end().
          start('p').style({color: '#666', fontSize: '14px'}).
            add('Upload multiple files with the same structure (same headers/fields). All files will be processed together.').
          end().
          start('div').style({marginBottom: '16px'}).
            start('div').addClass('file-upload-area').
              add(this.FileDropZone.create({
                files$: this.uploadedFiles$,
                isMultipleFiles: true,
                supportedFormats: {
                  'text/csv': 'CSV',
                  'application/json': 'JSON',
                  'text/xml': 'XML',
                  'text/plain': 'TXT'
                },
                showHelp: true,
                title: 'Drag and drop files here or click to browse',
                onFilesChanged: function(files) {
                  this.uploadedFiles = Array.from(files);
                  this.filesVerified = false;
                  this.output = `Files uploaded: ${files.length}`;
                }.bind(this)
              })).
            end().
            start('div').style({marginTop: '12px'}).
              show(this.uploadedFiles$.map(files => files && files.length > 0)).
              start('strong').add(this.uploadedFiles$.map(files => `Files uploaded: ${files ? files.length : 0}`)).end().
              show(this.filesVerified$.map(verified => verified)).
              start('span').style({marginLeft: '12px', color: '#28a745'}).
                add('✅ Structure verified').
              end().
              show(this.filesVerified$.map(verified => !verified)).
              start('span').style({marginLeft: '12px', color: '#ffc107'}).
                add('⚠️ Structure verification needed').
              end().
            end().
          end().
        
        // Manual input section
        start('div').style({marginTop: '20px'}).
          show(this.uploadedFiles$.map(files => !files || files.length === 0)).
          start('h4').add('Or Manual Content Input').end().
          start('p').style({color: '#666', fontSize: '14px'}).
            add('Paste your file content directly if not using file upload.').
          end().
          start('div').style({marginTop: '16px'}).
            start('label').add('Format: ').end().
            add(this.FORMAT).
            show(this.format$.map(f => f === 'CSV')).
            start('label').style({marginLeft: '16px'}).add('Delimiter: ').end().
            add(this.DELIMITER).
          end().
          start('div').style({marginTop: '16px'}).
            add(this.INPUT).
          end().
        end().
      end().
      
      // Structure Analysis
      start('div').addClass('step').
        start('h3').add('Step 2: Analyze Structure & Select DAO').end().
        start('div').style({marginBottom: '16px'}).
          start(this.ANALYZE_STRUCTURE).end().
        end().
        start('div').style({marginTop: '16px'}).
          add(this.SELECTED_DAO).
        end().
        start('div').style({marginTop: '16px'}).
          show(this.selectedDAO$.map(dao => !! dao)).
          start('p').style({color: '#28a745'}).
            add('Selected DAO: ').add(this.selectedDAO$).
          end().
        end().
      end().
      
      // Mapping Review
      start('div').addClass('step').
        start('h3').add('Step 3: Review Field Mappings').end().
        start('div').
          show(this.mappings$.map(mappings => mappings.length > 0)).
          start('table').addClass('mappings-table').
            start('thead').
              start('tr').
                start('th').add('File Field').end().
                start('th').add('Maps To').end().
                start('th').add('Type').end().
                start('th').add('Status').end().
              end().
            end().
            start('tbody').
              forEach(this.mappings$, function(mapping) {
                this.start('tr').
                  start('td').add(mapping.id).end().
                  start('td').add(mapping.handler$.map(h => h.name || '--')).end().
                  start('td').add(mapping.handler$.map(h => h.cls_ ? h.cls_.name : '--')).end().
                  start('td').
                    style({color: mapping.handler$.map(h => h === this.Mapping.UNKNOWN ? 'red' : 'green')}).
                    add(mapping.handler$.map(h => h === this.Mapping.UNKNOWN ? '⚠️ No match' : '✅ Mapped')).
                  end().
                end();
              }).
            end().
          end().
        end().
        start('div').
          show(this.mappings$.map(mappings => mappings.length === 0)).
          start('p').add('No mappings generated yet. Please analyze the structure first.').end().
        end().
      end().
      
      // Upload All
      start('div').addClass('step').
        start('h3').add('Step 4: Upload All Data').end().
        start('div').
          show(this.uploadedFiles$.map(files => files && files.length > 0)).
          start('p').style({fontWeight: 'bold', color: '#007bff'}).
            add(this.uploadedFiles$.map(files => `Ready to process ${files ? files.length : 0} file(s)`)).
          end().
        end().
        start('div').
          show(this.input$.map(input => input && input.trim() !== '')).
          start('p').style({fontWeight: 'bold', color: '#007bff'}).
            add('Ready to process manual input content').
          end().
        end().
        start('div').addClass('action-buttons').
          add(this.PREVIEW_ALL).
          add(this.UPLOAD_ALL).
          add(this.RESET).
        end().
        start('div').addClass('progress-section').
          show(this.progressStatus$.map(status => !! status)).
          start('div').style({marginBottom: '8px', fontWeight: 'bold'}).
            add(this.progressStatus$).
          end().
          add(this.PROGRESS).
        end().
        start('div').style({marginTop: '16px'}).
          show(this.output$.map(output => !! output)).
          add(this.OUTPUT).
        end().
      end();
    },

    function detectFormat(content) {
      content = content.trim();
      if ( content.startsWith('<?xml') ) {
        return 'XML';
      } else if ( content.startsWith('{') || content.startsWith('[') ) {
        return 'JSON';
      } else {
        return 'CSV';
      }
    },

    function verifyFileStructure() {
      if ( ! this.uploadedFiles || this.uploadedFiles.length === 0 ) {
        return { verified: false, message: 'No files to verify.' };
      }

      if ( this.uploadedFiles.length === 1 ) {
        this.filesVerified = true;
        return { verified: true, message: 'Single file - no verification needed.' };
      }
      
      // Get headers from first file
      var firstFile = this.uploadedFiles[0];
      var firstHeaders = this.extractHeaders(firstFile);
      
      if ( ! firstHeaders || firstHeaders.length === 0 ) {
        return { verified: false, message: 'Could not extract headers from first file.' };
      }

      // Verify all files have the same headers
      var allMatch = true;
      var mismatchDetails = [];
      
      for ( var i = 1; i < this.uploadedFiles.length; i++ ) {
        var file = this.uploadedFiles[i];
        var headers = this.extractHeaders(file);
        
        if ( ! headers || headers.length !== firstHeaders.length ) {
          allMatch = false;
          mismatchDetails.push(`${file.name}: Different number of fields (${headers ? headers.length : 0} vs ${firstHeaders.length})`);
          continue;
        }
        
        for ( var j = 0; j < headers.length; j++ ) {
          if ( headers[j].trim().toLowerCase() !== firstHeaders[j].trim().toLowerCase() ) {
            allMatch = false;
            mismatchDetails.push(`${file.name}: Field mismatch at position ${j+1} ("${headers[j]}" vs "${firstHeaders[j]}")`);
            break;
          }
        }
      }

      if ( allMatch ) {
        this.filesVerified = true;
        this.detectedHeaders = firstHeaders;
        return { 
          verified: true, 
          message: `✅ Structure verified! All ${this.uploadedFiles.length} files have matching headers:\n${firstHeaders.join(', ')}` 
        };
      } else {
        this.filesVerified = false;
        return { 
          verified: false, 
          message: `❌ Structure mismatch detected:\n${mismatchDetails.join('\n')}\n\nPlease ensure all files have the same headers in the same order.` 
        };
      }
    },

    function extractHeaders(file) {
      try {
        var content = file.content.trim();
        
        if ( file.format === 'CSV' ) {
          var lines = content.split('\n');
          if ( lines.length > 0 ) {
            return lines[0].split(this.delimiter).map(h => h.trim());
          }
        } else if ( file.format === 'JSON' ) {
          var jsonData = JSON.parse(content);
          if ( Array.isArray(jsonData) && jsonData.length > 0 ) {
            return Object.keys(jsonData[0]);
          } else if ( typeof jsonData === 'object' ) {
            return Object.keys(jsonData);
          }
        } else if ( file.format === 'XML' ) {
          return ['xml_content']; // Placeholder for XML
        }
      } catch (e) {
        return null;
      }
      return null;
    },

    async function analyzeContent() {
      var headers = [];
      
      // Clear previous output
      this.output = '';
      
      // Use uploaded files if available
      if ( this.uploadedFiles && this.uploadedFiles.length > 0 ) {
        // Automatically verify file structure first
        var verification = this.verifyFileStructure();
        this.output = verification.message;
        
        if ( ! verification.verified ) {
          return; // Stop analysis if files don't match
        }
        
        // Get content from first file
        var firstFile = this.uploadedFiles[0];
        var content = firstFile.content;
        this.format = firstFile.format;
        
        // Extract headers based on format
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
            this.output = 'Error parsing JSON content: ' + e.message;
            return;
          }
        } else if ( this.format === 'XML' ) {
          headers = ['xml_content']; // Placeholder for XML
        }
      } 
      // Otherwise use manual input
      else if ( this.input && this.input.trim() !== '' ) {
        var content = this.input.trim();
        
        // Auto-detect format if AUTO
        if ( this.format === 'AUTO' ) {
          this.format = this.detectFormat(content);
        }
        
        // Extract headers based on format
        try {
          if ( this.format === 'CSV' ) {
            var lines = content.split('\n');
            if ( lines.length > 0 ) {
              headers = lines[0].split(this.delimiter).map(h => h.trim());
            }
          } else if ( this.format === 'JSON' ) {
            var jsonData = JSON.parse(content);
            if ( Array.isArray(jsonData) && jsonData.length > 0 ) {
              headers = Object.keys(jsonData[0]);
            } else if ( typeof jsonData === 'object' ) {
              headers = Object.keys(jsonData);
            }
          } else if ( this.format === 'XML' ) {
            headers = ['xml_content']; // Placeholder
          }
        } catch (e) {
          this.output = 'Error parsing content: ' + e.message;
          return;
        }
      } else {
        this.output = 'Please upload files or add manual content first.';
        return;
      }

      if ( headers.length === 0 ) {
        this.output = 'No fields detected.';
        return;
      }

      this.output += '\n\nAnalyzing structure...';
      this.detectedHeaders = headers;
      
      // Find matching DAOs
      await this.findMatchingDAOs(headers);
      
      var source = this.uploadedFiles.length > 0 ? `${this.uploadedFiles.length} file(s)` : 'manual input';
      this.output += `\n\nAnalysis complete for ${source}! Found ${headers.length} fields. Please select a target DAO.`;
    },

    async function findMatchingDAOs(headers) {
      this.suggestedDAOs = [];
      
      try {
        // Get all CSpecs that have a DAO
        var cSpecs = await this.cSpecDAO.select();
        
        var matchingDAOs = [];
        
        for ( var cSpec of cSpecs.array ) {
          var daoName = cSpec.name;
          var dao = this.__context__[daoName];
          
          if ( ! dao || ! dao.of ) {
            continue;
          }
          
          var modelClass = dao.of;
          var properties = modelClass.getAxiomsByClass(foam.lang.Property);
          var score = this.calculateMatchScore(headers, properties);
          
          if ( score > 0 ) {
            matchingDAOs.push({
              name: daoName,
              score: score,
              modelName: modelClass.id,
              totalFields: headers.length
            });
          }
        }
        
        // Sort by score (highest first)
        matchingDAOs.sort((a, b) => b.score - a.score);
        
        // Create display names with match quality
        this.suggestedDAOs = matchingDAOs.slice(0, 5).map(dao => {
          var matchPercent = Math.round((dao.score / dao.totalFields) * 100);
          var status = matchPercent >= 80 ? 'Excellent Match' : 
                      matchPercent >= 60 ? 'Good Match' : 
                      matchPercent >= 40 ? 'Partial Match' : 'Poor Match';
          return {
            name: dao.name,
            displayName: `${dao.name} (${status} - ${dao.score}/${dao.totalFields} fields)`,
            score: dao.score
          };
        });
        
        this.output += `\nFound ${this.suggestedDAOs.length} matching DAOs`;
        this.output += `\n${this.suggestedDAOs.map(dao => dao.displayName).join('\n')}`;
        
      } catch (e) {
        this.output = 'Error finding matching DAOs: ' + e.message;
        console.error('Error in findMatchingDAOs:', e);
      }
    },

    function calculateMatchScore(headers, properties) {
      var score = 0;
      
      for ( var header of headers ) {
        var normalizedHeader = header.toLowerCase().trim();
        var found = false;
        
        for ( var prop of properties ) {
          if ( prop.name.toLowerCase() === normalizedHeader ) {
            score++;
            found = true;
            break;
          }
          
          if ( prop.shortName && prop.shortName.toLowerCase() === normalizedHeader ) {
            score++;
            found = true;
            break;
          }
          
          var constantized = foam.String.constantize(prop.name).toLowerCase().replaceAll('_', ' ');
          if ( constantized === normalizedHeader ) {
            score++;
            found = true;
            break;
          }
        }
        
        if ( ! found ) {
          console.log(`No match found for header: ${normalizedHeader}`);
        }
      }
      
      return score;
    },

    function onDAOSelected() {
      if ( this.selectedDAO && this.detectedHeaders.length > 0 ) {
        // Extract DAO name if it's in the format "daoName (status - score)"
        var daoName = this.selectedDAO.includes('(') ? this.selectedDAO.split(' (')[0] : this.selectedDAO;
        
        // Check if the DAO exists
        if ( this.__context__[daoName] ) {
          this.dao = this.__context__[daoName];
          this.generateMappings(this.detectedHeaders);
          this.output = `DAO selected: ${daoName}. Field mappings generated.`;
          
          // Enable the preview and upload buttons by setting mappings
          if ( this.mappings && this.mappings.length > 0 ) {
            this.PREVIEW_ALL.isEnabled = true;
            this.UPLOAD_ALL.isEnabled = true;
          }
        } else {
          this.output = `DAO "${daoName}" not found. Please check the name and try again.`;
          this.dao = null;
          this.mappings = [];
          this.PREVIEW_ALL.isEnabled = false;
          this.UPLOAD_ALL.isEnabled = false;
        }
      }
    },

    function generateMappings(headers) {
      if ( ! this.dao || ! this.columnParser ) {
        return;
      }
      
      var mappings = [];
      
      headers.forEach(header => {
        var headerStr = typeof header === 'string' ? header : 
                       (header && header.toString ? header.toString() : String(header));
        
        var prop = this.columnParser.parseString(headerStr);
        
        var mapping = this.Mapping.create({
          id: headerStr,
          handler: prop || this.Mapping.UNKNOWN,
          of: this.of
        }, this.__subContext__);
        
        mappings.push(mapping);
      });
      
      this.mappings = mappings;
    },

    async function processAllUploads(real) {
      if ( ! this.dao ) {
        this.output = 'Please select a target DAO first.';
        return;
      }

      if ( ! this.mappings || this.mappings.length === 0 ) {
        this.output = 'Please complete the field mapping first.';
        return;
      }

      var self = this;
      var totalFiles = this.uploadedFiles.length > 0 ? this.uploadedFiles.length : 1; // 1 for manual input
      var processedFiles = 0;
      var totalRecords = 0;
      
      this.progressStatus = real ? 'Starting upload...' : 'Starting preview...';
      this.output = '';
      this.progress = 0;

      // Clear preview data if in preview mode
      if ( ! real ) {
        await this.previewData.removeAll();
      }

      var startTime = Date.now();

      try {
        // Process uploaded files
        if ( this.uploadedFiles.length > 0 ) {
          for ( var i = 0; i < this.uploadedFiles.length; i++ ) {
            var file = this.uploadedFiles[i];
            self.progressStatus = real ? 
              `Uploading file ${i+1}/${totalFiles}: ${file.name}` :
              `Previewing file ${i+1}/${totalFiles}: ${file.name}`;
            
            await this.uploadService.processUpload({
              input: file.content,
              format: file.format,
              dao: real ? this.dao : this.previewData,
              mappings: this.mappings,
              delimiter: this.delimiter,
              tagName: this.tagName,
              real: real,
              onProgress: function(current, total, percentage) {
                var fileProgress = ((processedFiles * 100) + percentage) / totalFiles;
                self.progress = Math.round(fileProgress);
              },
              onError: function(error) {
                self.output += `\nFile ${file.name} - Error: ${error}`;
              },
              onComplete: function(recordCount) {
                totalRecords += recordCount;
                processedFiles++;
              }
            });
          }
        } 
        // Process manual input
        else if ( this.input && this.input.trim() !== '' ) {
          self.progressStatus = real ? 'Uploading manual input...' : 'Previewing manual input...';
          
          await this.uploadService.processUpload({
            input: this.input,
            format: this.format,
            dao: real ? this.dao : this.previewData,
            mappings: this.mappings,
            delimiter: this.delimiter,
            tagName: this.tagName,
            real: real,
            onProgress: function(current, total, percentage) {
              self.progress = percentage;
            },
            onError: function(error) {
              self.output += `\nManual input - Error: ${error}`;
            },
            onComplete: function(recordCount) {
              totalRecords += recordCount;
              processedFiles++;
            }
          });
        }

        var endTime = Date.now();
        var duration = ((endTime - startTime) / 1000).toFixed(2);
        var action = real ? 'uploaded' : 'previewed';
        var source = this.uploadedFiles.length > 0 ? `${this.uploadedFiles.length} file(s)` : 'manual input';
        
        self.progressStatus = '';
        self.output = `✅ Successfully ${action} ${totalRecords} records from ${source} in ${duration} seconds!`;
        self.progress = 100;
        
      } catch (e) {
        self.progressStatus = '';
        this.output += `\n<span style="color:red">Processing failed: ${e.message}</span>`;
      }
    }
  ]
});

foam.CLASS({
  package: 'foam.core.console',
  name: 'DAOSelectionView',
  extends: 'foam.u2.View',

  properties: [
    {
      name: 'data',
      attribute: true
    },
    {
      name: 'mode',
      value: foam.u2.DisplayMode.RW
    }
  ],

  methods: [
    function render() {
      var self = this;
      this
        .start('div').style({display: 'flex', flexDirection: 'column', gap: '8px'}).
          // Manual input
          start('div').
            start('label').add('Enter DAO name: ').end().
            start('input').
              attrs({
                type: 'text',
                placeholder: 'e.g., userDAO, customerDAO...',
                value: this.data$
              }).
              on('input', (e) => {
                this.data = e.target.value;
                if ( this.data && this.data.onDAOSelected ) {
                  this.data.onDAOSelected();
                }
              }).
            end().
          end().
          
          // Suggested DAOs
          show(this.data$.map(dao => dao && dao.suggestedDAOs && dao.suggestedDAOs.length > 0)).
          start('div').
            start('h4').add('Suggested DAOs:').end().
            start('div').addClass('dao-suggestions').
              forEach(this.data$.map(dao => dao.suggestedDAOs), function(dao) {
                this.start('div').addClass('dao-option').
                  enableClass('selected', self.data$.map(selected => selected === dao.displayName)).
                  on('click', () => {
                    self.data = dao.displayName;
                    if ( self.data && self.data.onDAOSelected ) {
                      self.data.onDAOSelected();
                    }
                  }).
                  add(dao.displayName).
                end();
              }).
            end().
          end().
        end();
    }
  ]
}); 