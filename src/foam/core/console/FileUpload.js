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
    'foam.core.console.MappingsView',
    'foam.core.console.PropertyChoiceView',
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
          this.filesVerified = false;
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
      view: function(_, X) {
        return {
          class: 'foam.core.console.DAOSelectionView',
          mode: foam.u2.DisplayMode.RW,
          fileUpload: X.data
        };
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
      isEnabled: function(selectedDAO, mappings, uploadedFiles, input, filesVerified) { 
        return filesVerified && selectedDAO && mappings && mappings.length > 0 && 
               ((uploadedFiles && uploadedFiles.length > 0) || (input && input.trim() !== '')); 
      },
      code: function() { 
        this.processAllUploads(true); 
      }
    },
    {
      name: 'previewAll',
      label: 'Preview All Files',
      isEnabled: function(selectedDAO, mappings, uploadedFiles, input, filesVerified) { 
        return filesVerified && selectedDAO && mappings && mappings.length > 0 && 
               ((uploadedFiles && uploadedFiles.length > 0) || (input && input.trim() !== '')); 
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
      
      var self = this;
      
      this.addClass();
      
      // File Upload Section
      this.start('div').addClass('step').
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
                  // Convert FileList or array to FObject array with proper metadata
                  var foamFiles = [];
                  for (var i = 0; i < files.length; i++) {
                    var file = files[i];
                    if (file.cls_ && file.cls_.id === 'foam.core.fs.File') {
                      // Already a FOAM File object
                      foamFiles.push(file);
                    } else {
                      // Create a FOAM File object from native File
                      var foamFile = self.File.create({
                        filename: file.name || `File ${i+1}`,
                        filesize: file.size || 0,
                        mimeType: file.type || 'text/plain',
                        data: { blob: file }
                      });
                      foamFiles.push(foamFile);
                    }
                  }
                  self.uploadedFiles = foamFiles;
                  self.filesVerified = false;
                  self.output = `Files uploaded: ${foamFiles.length}`;
                }
              })).
            end().
            start('div').style({marginTop: '12px'}).
              show(this.uploadedFiles$.map(files => files && files.length > 0)).
              start('strong').add(this.uploadedFiles$.map(files => `Files uploaded: ${files ? files.length : 0}`)).end().
              show(this.filesVerified$).
              start('span').style({marginLeft: '12px', color: '#28a745'}).
                add(' ✅ Structure verified').
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
      
      // Structure Analysis & DAO Selection
      start('div').addClass('step').
        start('h3').add('Step 2: Analyze Structure & Select DAO').end().
        start('div').style({marginBottom: '16px'}).
          // Structure Analysis button
          start('div').style({marginTop: '16px'}).
            start(this.ANALYZE_STRUCTURE).end().
          end().
          
          // Structure Status and Results
          start('div').style({marginTop: '16px'}).
            // Structure Analysis Results
            show(this.filesVerified$).
            start('div').style({padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '4px', marginBottom: '16px'}).
              start('h4').style({marginBottom: '8px'}).add('Structure Analysis Results').end().
              start('div').style({marginBottom: '8px', color: '#28a745'}).
                add(this.uploadedFiles$.map(files => 
                  `✅ Structure verified! All ${files ? files.length : 0} files have matching headers:`
                )).
              end().
              start('div').style({fontFamily: 'monospace', whiteSpace: 'pre-wrap', backgroundColor: '#fff', padding: '8px', borderRadius: '4px'}).
                add(this.detectedHeaders$.map(headers => headers.join(', '))).
              end().
            end().

            // Target DAO Selection (only show after analysis)
            show(this.filesVerified$).
            start('div').style({marginTop: '16px'}).
              start('h4').add('Target DAO').end().
              start('p').style({color: '#666', fontSize: '14px'}).
                add('Select the target DAO where the data will be uploaded.').
              end().
              start('div').style({marginTop: '8px'}).
                add(this.SELECTED_DAO).
              end().
            end().
          end().
        end().
      end().
      
      // Mapping Review
      start('div').addClass('step').
        start('h3').add('Step 3: Review Field Mappings').end().
        start('div').
          show(this.mappings$.map(mappings => mappings.length > 0)).
          add(this.MAPPINGS).
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

    async function verifyFileStructure() {
      if (!this.uploadedFiles || this.uploadedFiles.length === 0) {
        return { verified: false, message: 'No files to verify.' };
      }

      if (this.uploadedFiles.length === 1) {
        this.filesVerified = true;
        return { verified: true, message: 'Single file - no verification needed.' };
      }
      
      try {
        // Get headers from first file
        var firstFile = this.uploadedFiles[0];
        var firstFileName = firstFile.filename || (firstFile.data && firstFile.data.blob && firstFile.data.blob.name) || 'First file';
        var firstHeaders = await this.extractHeaders(firstFile);
        
        if (!firstHeaders || firstHeaders.length === 0) {
          return { verified: false, message: 'Could not extract headers from first file.' };
        }

        // Verify all files have the same headers
        var allMatch = true;
        var mismatchDetails = [];
        var fileStats = new Map(); // Track stats for each file
        
        // Add first file stats
        fileStats.set(firstFileName, {
          fieldCount: firstHeaders.length,
          headers: firstHeaders
        });
        
        for (var i = 1; i < this.uploadedFiles.length; i++) {
          var file = this.uploadedFiles[i];
          var fileName = file.filename || (file.data && file.data.blob && file.data.blob.name) || `File ${i + 1}`;
          
          try {
            var headers = await this.extractHeaders(file);
            
            // Track stats for this file
            fileStats.set(fileName, {
              fieldCount: headers ? headers.length : 0,
              headers: headers || []
            });
            
            if (!headers || headers.length !== firstHeaders.length) {
              allMatch = false;
              mismatchDetails.push(`${fileName}: Different number of fields (${headers ? headers.length : 0} vs ${firstHeaders.length} from ${firstFileName})`);
              continue;
            }
            
            for (var j = 0; j < headers.length; j++) {
              if (headers[j].trim().toLowerCase() !== firstHeaders[j].trim().toLowerCase()) {
                allMatch = false;
                mismatchDetails.push(`${fileName}: Field mismatch at position ${j+1} ("${headers[j]}" vs "${firstHeaders[j]}" from ${firstFileName})`);
                break;
              }
            }
          } catch (e) {
            allMatch = false;
            mismatchDetails.push(`${fileName}: Error reading file - ${e.message}`);
          }
        }

        if (allMatch) {
          this.filesVerified = true;
          this.detectedHeaders = firstHeaders;
          return { 
            verified: true, 
            message: `✅ Structure verified! All ${this.uploadedFiles.length} files have matching headers:\n${firstHeaders.join(', ')}` 
          };
        } else {
          this.filesVerified = false;
          
          // Create a summary of all files
          var summary = ['File Structure Summary:'];
          fileStats.forEach((stats, fileName) => {
            summary.push(`${fileName}: ${stats.fieldCount} fields`);
          });
          
          return { 
            verified: false, 
            message: `❌ Structure mismatch detected:\n\n${summary.join('\n')}\n\nDetailed Issues:\n${mismatchDetails.join('\n')}\n\nPlease ensure all files have the same headers in the same order as ${firstFileName}.` 
          };
        }
      } catch (e) {
        return { verified: false, message: 'Error verifying file structure: ' + e.message };
      }
    },

    function extractHeaders(file) {
      return new Promise((resolve, reject) => {
        try {
          // Get the actual File object from the data property
          var actualFile = file.data ? file.data.blob : file;
          
          if (!actualFile) {
            reject('No file data available');
            return;
          }

          var reader = new FileReader();
          
          reader.onload = function(e) {
            try {
              var content = e.target.result;
              
              if (file.mimeType === 'text/csv' || file.type === 'text/csv') {
                var lines = content.split('\n');
                if (lines.length > 0) {
                  // Remove BOM if present
                  var firstLine = lines[0].replace(/^\uFEFF/, '');
                  // Split by delimiter and clean up
                  var headers = firstLine.split(this.delimiter || ',').map(h => h.trim());
                  // Filter out empty headers
                  headers = headers.filter(h => h.length > 0);
                  
                  if (headers.length === 0) {
                    reject('No valid headers found in CSV file');
                    return;
                  }
                  
                  resolve(headers);
                } else {
                  reject('Empty CSV file');
                }
              } else if (file.mimeType === 'application/json' || file.type === 'application/json') {
                var jsonData = JSON.parse(content);
                if (Array.isArray(jsonData) && jsonData.length > 0) {
                  resolve(Object.keys(jsonData[0]));
                } else if (typeof jsonData === 'object') {
                  resolve(Object.keys(jsonData));
                } else {
                  reject('Invalid JSON structure');
                }
              } else if (file.mimeType === 'text/xml' || file.type === 'text/xml') {
                resolve(['xml_content']); // Placeholder for XML
              } else {
                reject('Unsupported file type: ' + (file.mimeType || file.type));
              }
            } catch (e) {
              reject('Error processing file content: ' + e.message);
            }
          }.bind(this);
          
          reader.onerror = function() {
            reject('Error reading file');
          };
          
          reader.readAsText(actualFile);
        } catch (e) {
          reject('Error accessing file: ' + e.message);
        }
      });
    },

    async function analyzeContent() {
      var headers = [];
      
      // Clear previous output
      this.output = '';
      
      // Use uploaded files if available
      if (this.uploadedFiles && this.uploadedFiles.length > 0) {
        // Automatically verify file structure first
        var verification = await this.verifyFileStructure();
        // this.output = verification.message;
        
        if (!verification.verified) {
          return; // Stop analysis if files don't match
        }
        
        // Get content from first file
        var firstFile = this.uploadedFiles[0];
        try {
          var actualFile = firstFile.data ? firstFile.data.blob : firstFile;
          var content = await new Promise((resolve, reject) => {
            var reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = e => reject(e);
            reader.readAsText(actualFile);
          });
          
          this.format = firstFile.mimeType === 'text/csv' ? 'CSV' :
                       firstFile.mimeType === 'application/json' ? 'JSON' :
                       firstFile.mimeType === 'text/xml' ? 'XML' : 'CSV';
          
          // Extract headers based on format
          if (this.format === 'CSV') {
            var lines = content.split('\n');
            if (lines.length > 0) {
              headers = lines[0].split(this.delimiter).map(h => h.trim());
            }
          } else if (this.format === 'JSON') {
            try {
              var jsonData = JSON.parse(content);
              if (Array.isArray(jsonData) && jsonData.length > 0) {
                headers = Object.keys(jsonData[0]);
              } else if (typeof jsonData === 'object') {
                headers = Object.keys(jsonData);
              }
            } catch (e) {
              this.output = 'Error parsing JSON content: ' + e.message;
              return;
            }
          } else if (this.format === 'XML') {
            headers = ['xml_content']; // Placeholder for XML
          }
        } catch (e) {
          this.output = 'Error reading file: ' + e.message;
          return;
        }
      } 
      // Otherwise use manual input
      else if (this.input && this.input.trim() !== '') {
        var content = this.input.trim();
        
        // Auto-detect format if AUTO
        if (this.format === 'AUTO') {
          this.format = this.detectFormat(content);
        }
        
        // Extract headers based on format
        try {
          if (this.format === 'CSV') {
            var lines = content.split('\n');
            if (lines.length > 0) {
              headers = lines[0].split(this.delimiter).map(h => h.trim());
            }
          } else if (this.format === 'JSON') {
            var jsonData = JSON.parse(content);
            if (Array.isArray(jsonData) && jsonData.length > 0) {
              headers = Object.keys(jsonData[0]);
            } else if (typeof jsonData === 'object') {
              headers = Object.keys(jsonData);
            }
          } else if (this.format === 'XML') {
            headers = ['xml_content']; // Placeholder
          }
        } catch (e) {
          this.output = 'Error parsing content: ' + e.message;
          return;
        }
        
        // Mark as verified for manual input
        this.filesVerified = true;
      } else {
        this.output = 'Please upload files or add manual content first.';
        return;
      }

      if (headers.length === 0) {
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
        
        // this.output += `\nFound ${this.suggestedDAOs.length} matching DAOs`;
        // this.output += `\n${this.suggestedDAOs.map(dao => dao.displayName).join('\n')}`;
        
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
        } else {
          this.output = `DAO "${daoName}" not found. Please check the name and try again.`;
          this.dao = null;
          this.mappings = [];
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
            var fileName = file.filename || (file.data && file.data.blob && file.data.blob.name) || `File ${i+1}`;
            
            self.progressStatus = real ? 
              `Uploading file ${i+1}/${totalFiles}: ${fileName}` :
              `Previewing file ${i+1}/${totalFiles}: ${fileName}`;
            
            // Read file content
            var content = await this.readFileContent(file);
            var fileFormat = file.mimeType === 'text/csv' ? 'CSV' :
                           file.mimeType === 'application/json' ? 'JSON' :
                           file.mimeType === 'text/xml' ? 'XML' : this.format;
            
            await this.uploadService.processUpload({
              input: content,
              format: fileFormat,
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
                self.output += `\nFile ${fileName} - Error: ${error}`;
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
          reject('Error accessing file: ' + e.message);
        }
      });
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
    },
    {
      name: 'fileUpload',
      documentation: 'Reference to the parent FileUpload instance'
    }
  ],

  methods: [
    function render() {
      var self = this;
      var fileUpload = this.fileUpload;
      
      if (!fileUpload) {
        console.error('DAOSelectionView: No FileUpload instance provided');
        return;
      }
      
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
              enableClass('disabled', fileUpload.filesVerified$.map(verified => !verified)).
              attrs({disabled: fileUpload.filesVerified$.map(verified => !verified)}).
              on('input', (e) => {
                this.data = e.target.value;
                fileUpload.selectedDAO = e.target.value;
                fileUpload.onDAOSelected();
              }).
            end().
          end().
          
          // Suggested DAOs
          show(fileUpload.suggestedDAOs$.map(daos => daos && daos.length > 0)).
          start('div').
            start('h4').add('Suggested DAOs:').end().
            start('div').addClass('dao-suggestions').
              forEach(fileUpload.suggestedDAOs$, function(dao) {
                this.start('div').addClass('dao-option').
                  enableClass('selected', self.data$.map(selected => 
                    selected && dao && selected === dao.displayName
                  )).
                  on('click', () => {
                    if (fileUpload.filesVerified) {
                      self.data = dao.displayName;
                      fileUpload.selectedDAO = dao.displayName;
                      fileUpload.onDAOSelected();
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