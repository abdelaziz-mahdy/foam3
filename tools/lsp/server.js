/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

// FOAM LSP Server — JSON-RPC over stdio.
// Started by LSPMaker.end() after all FOAM models are loaded.

function start() {
  // Redirect console.log to stderr — stdout is JSON-RPC channel
  var origLog = console.log;
  console.log = function() { console.error.apply(console, arguments); };

  var index = globalThis.__foamLSPIndex__ || foam.parse.lsp.FoamIndex.create();
  if ( ! globalThis.__foamLSPIndex__ ) index.buildFileIndex();
  var grammar = foam.parse.lsp.FoamClassGrammar.create({ index: index });

  var completionHandler  = foam.parse.lsp.handlers.CompletionHandler.create({ index: index, grammar: grammar });
  var hoverHandler       = foam.parse.lsp.handlers.HoverHandler.create({ index: index });
  var definitionHandler  = foam.parse.lsp.handlers.DefinitionHandler.create({ index: index });
  var diagnosticsHandler = foam.parse.lsp.handlers.DiagnosticsHandler.create({ index: index });
  var symbolHandler      = foam.parse.lsp.handlers.SymbolHandler.create();
  var memberHandler      = foam.parse.lsp.handlers.MemberCompletionHandler.create({ index: index });

  var workspaceAnalyzer = foam.parse.lsp.handlers.WorkspaceAnalyzer.create({ index: index });

  var documents = {};
  var buffer = '';

  // === JSON-RPC over stdio ===

  process.stdin.setEncoding('utf8');
  process.stdin.on('data', function(chunk) {
    buffer += chunk;
    processBuffer();
  });

  function processBuffer() {
    while ( true ) {
      var headerEnd = buffer.indexOf('\r\n\r\n');
      if ( headerEnd === -1 ) return;

      var header = buffer.substring(0, headerEnd);
      var match = header.match(/Content-Length:\s*(\d+)/i);
      if ( ! match ) { buffer = buffer.substring(headerEnd + 4); continue; }

      var contentLength = parseInt(match[1]);
      var bodyStart = headerEnd + 4;

      if ( buffer.length < bodyStart + contentLength ) return;

      var body = buffer.substring(bodyStart, bodyStart + contentLength);
      buffer = buffer.substring(bodyStart + contentLength);

      try {
        handleMessage(JSON.parse(body));
      } catch (e) {
        console.error('FOAM LSP parse error:', e);
      }
    }
  }

  function send(msg) {
    var json = JSON.stringify(msg);
    var out = 'Content-Length: ' + Buffer.byteLength(json) + '\r\n\r\n' + json;
    process.stdout.write(out);
  }

  function respond(id, result) {
    send({ jsonrpc: '2.0', id: id, result: result });
  }

  function respondError(id, code, message) {
    send({ jsonrpc: '2.0', id: id, error: { code: code, message: message } });
  }

  function notify(method, params) {
    send({ jsonrpc: '2.0', method: method, params: params });
  }

  function isFoamFile(text) {
    return /foam\.(CLASS|ENUM|INTERFACE|RELATIONSHIP)\s*\(/.test(text);
  }

  function getSignatureHelp(text, position, index) {
    /**
     * Provides parameter hints when cursor is inside parentheses of a method call.
     * E.g., this.myClass(|) → shows parameters for myClass
     * Also handles this.X.create({ → shows class properties
     */
    var lines = text.split('\n');
    var line = lines[position.line] || '';
    var prefix = line.substring(0, position.character);

    // Find the method name by scanning back from cursor to find '('
    // Then find the word before '('
    var callMatch = prefix.match(/(?:this\.)?(\w+)\s*\(\s*[^)]*$/);
    if ( ! callMatch ) return null;

    var methodName = callMatch[1];

    // Resolve the current class
    var pkgMatch = text.match(/package\s*:\s*['"]([^'"]+)['"]/);
    var nameMatch = text.match(/name\s*:\s*['"]([^'"]+)['"]/);
    if ( ! nameMatch ) return null;
    var classId = pkgMatch ? pkgMatch[1] + '.' + nameMatch[1] : nameMatch[1];

    // Find the method in the class
    var methods = index.getMethods(classId);
    var method = null;
    for ( var i = 0 ; i < methods.length ; i++ ) {
      if ( methods[i].name === methodName ) { method = methods[i]; break; }
    }

    if ( ! method ) return null;

    // Build parameter list
    var params = [];
    if ( method.args && method.args.length > 0 ) {
      for ( var i = 0 ; i < method.args.length ; i++ ) {
        var a = method.args[i];
        params.push({
          label: a.name,
          documentation: a.type ? 'Type: ' + a.type : ''
        });
      }
    } else if ( method.code ) {
      var match = method.code.toString().match(/function\s*\w*\s*\(([^)]*)\)/);
      if ( match && match[1].trim() ) {
        var paramNames = match[1].split(',').map(function(p) { return p.trim(); });
        for ( var i = 0 ; i < paramNames.length ; i++ ) {
          params.push({ label: paramNames[i] });
        }
      }
    }

    if ( params.length === 0 ) return null;

    // Build signature label
    var sig = methodName + '(' + params.map(function(p) { return p.label; }).join(', ') + ')';

    // Determine active parameter by counting commas before cursor
    var afterParen = prefix.substring(prefix.lastIndexOf('(') + 1);
    var activeParam = (afterParen.match(/,/g) || []).length;

    return {
      signatures: [{
        label: sig,
        documentation: method.documentation || '',
        parameters: params
      }],
      activeSignature: 0,
      activeParameter: Math.min(activeParam, params.length - 1)
    };
  }

  function getFoldingRanges(text) {
    /**
     * Finds foldable sections: properties, methods, requires, imports,
     * exports, javaImports, actions, listeners arrays.
     */
    var ranges = [];
    var keywords = ['properties', 'methods', 'requires', 'imports', 'exports', 'javaImports', 'actions', 'listeners'];
    var lines = text.split('\n');

    for ( var k = 0 ; k < keywords.length ; k++ ) {
      var kw = keywords[k];
      var pattern = new RegExp(kw + '\\s*:\\s*\\[');

      for ( var i = 0 ; i < lines.length ; i++ ) {
        if ( ! pattern.test(lines[i]) ) continue;

        // Find the matching ] using balanced bracket tracking
        var depth = 0;
        var foundOpen = false;
        var endLine = -1;
        for ( var j = i ; j < lines.length ; j++ ) {
          var line = lines[j];
          for ( var c = 0 ; c < line.length ; c++ ) {
            if ( line[c] === '[' ) { depth++; foundOpen = true; }
            else if ( line[c] === ']' ) {
              depth--;
              if ( foundOpen && depth === 0 ) {
                endLine = j;
                break;
              }
            }
          }
          if ( endLine !== -1 ) break;
        }

        if ( endLine > i ) {
          ranges.push({
            startLine: i,
            endLine: endLine,
            kind: 'region'
          });
        }
      }
    }

    return ranges;
  }

  function getCodeActions(text, range, context, index) {
    /**
     * Provides code actions for diagnostics:
     * - "Did you mean X?" for unknown class references
     * - "Replace with correct import" for wrong Java packages
     */
    var actions = [];
    if ( ! context || ! context.diagnostics ) return actions;

    for ( var i = 0 ; i < context.diagnostics.length ; i++ ) {
      var diag = context.diagnostics[i];

      // For "Unknown class" diagnostics, suggest similar names
      var unknownMatch = diag.message.match(/Unknown class[^']*'([^']+)'/);
      if ( unknownMatch ) {
        var unknownId = unknownMatch[1];
        var suggestions = findSimilarClasses(unknownId, index, 3);
        for ( var s = 0 ; s < suggestions.length ; s++ ) {
          actions.push({
            title: "Did you mean '" + suggestions[s] + "'?",
            kind: 'quickfix',
            diagnostics: [diag],
            edit: {
              changes: {
                [context.textDocument ? context.textDocument.uri : '']: [{
                  range: diag.range,
                  newText: suggestions[s]
                }]
              }
            }
          });
        }
      }

      // For wrong Java import packages, suggest correct ones
      var javaImportMappings = index.getJavaImportMappings();
      var wrongPkgMatch = diag.message.match(/Wrong Java package[^']*'([^']+)'/);
      if ( wrongPkgMatch ) {
        var wrongPkg = wrongPkgMatch[1];
        if ( javaImportMappings[wrongPkg] ) {
          actions.push({
            title: "Replace with '" + javaImportMappings[wrongPkg] + "'",
            kind: 'quickfix',
            isPreferred: true,
            diagnostics: [diag],
            edit: {
              changes: {
                [context.textDocument ? context.textDocument.uri : '']: [{
                  range: diag.range,
                  newText: javaImportMappings[wrongPkg]
                }]
              }
            }
          });
        }
      }
    }

    return actions;
  }

  function findSimilarClasses(target, index, maxResults) {
    /** Simple fuzzy match: find classes whose short name is close to target's short name. */
    var targetShort = target.split('.').pop().toLowerCase();
    var ids = index.getAllClassIds();
    var scored = [];

    for ( var i = 0 ; i < ids.length ; i++ ) {
      var shortName = ids[i].split('.').pop().toLowerCase();
      if ( shortName === targetShort ) {
        // Exact short name match but different package — high score
        scored.push({ id: ids[i], score: 100 });
      } else if ( shortName.indexOf(targetShort) !== -1 || targetShort.indexOf(shortName) !== -1 ) {
        scored.push({ id: ids[i], score: 50 });
      } else {
        // Levenshtein-like: count common chars
        var common = 0;
        for ( var c = 0 ; c < targetShort.length ; c++ ) {
          if ( shortName.indexOf(targetShort[c]) !== -1 ) common++;
        }
        var similarity = common / Math.max(targetShort.length, shortName.length);
        if ( similarity > 0.6 ) {
          scored.push({ id: ids[i], score: Math.round(similarity * 40) });
        }
      }
    }

    scored.sort(function(a, b) { return b.score - a.score; });
    var results = [];
    for ( var i = 0 ; i < Math.min(scored.length, maxResults) ; i++ ) {
      results.push(scored[i].id);
    }
    return results;
  }

  function pushDiagnostics(uri, text) {
    notify('textDocument/publishDiagnostics', {
      uri: uri,
      diagnostics: diagnosticsHandler.handle(text)
    });
  }

  function reindexFile(uri) {
    var doc = documents[uri];
    if ( ! doc ) return;

    var match = doc.text.match(/package\s*:\s*['"]([^'"]+)['"]/);
    var pkg = match ? match[1] : '';
    match = doc.text.match(/name\s*:\s*['"]([^'"]+)['"]/);
    var name = match ? match[1] : '';

    if ( name ) {
      var classId = pkg ? pkg + '.' + name : name;
      try {
        var filePath = uri.replace('file://', '');
        foam.require(filePath.replace(/\.js$/, ''), false, false);
        index.invalidate(classId);
      } catch (e) {
        console.error('FOAM LSP reindex failed for', classId, e);
      }
      pushDiagnostics(uri, doc.text);
    }
  }

  // === Message Dispatch ===

  function handleMessage(msg) {
    var method = msg.method;
    var params = msg.params;
    var id     = msg.id;

    switch ( method ) {
      case 'initialize':
        respond(id, {
          capabilities: {
            textDocumentSync: {
              openClose: true,
              change: 1,
              save: { includeText: false }
            },
            completionProvider: {
              triggerCharacters: ["'", '"', '.', ':'],
              resolveProvider: false
            },
            hoverProvider: true,
            definitionProvider: true,
            documentSymbolProvider: true,
            signatureHelpProvider: {
              triggerCharacters: ['(', ',']
            },
            workspaceSymbolProvider: true,
            foldingRangeProvider: true,
            codeActionProvider: true
          },
          experimental: {
            workspaceAnalyzer: true
          },
          serverInfo: { name: 'foam-lsp', version: '0.2.0' }
        });
        break;

      case 'initialized':
        break;

      case 'shutdown':
        respond(id, null);
        break;

      case 'exit':
        process.exit(0);
        break;

      case 'textDocument/didOpen':
        var tdoc = params.textDocument;
        documents[tdoc.uri] = { text: tdoc.text, version: tdoc.version || 0 };
        if ( isFoamFile(tdoc.text) ) pushDiagnostics(tdoc.uri, tdoc.text);
        break;

      case 'textDocument/didChange':
        var uri = params.textDocument.uri;
        if ( params.contentChanges.length > 0 ) {
          documents[uri] = { text: params.contentChanges[0].text, version: params.textDocument.version || 0 };
          if ( isFoamFile(documents[uri].text) ) pushDiagnostics(uri, documents[uri].text);
        }
        break;

      case 'textDocument/didSave':
        reindexFile(params.textDocument.uri);
        break;

      case 'textDocument/didClose':
        delete documents[params.textDocument.uri];
        notify('textDocument/publishDiagnostics', { uri: params.textDocument.uri, diagnostics: [] });
        break;

      case 'textDocument/completion':
        var doc = documents[params.textDocument.uri];
        if ( ! doc || ! isFoamFile(doc.text) ) {
          respond(id, { isIncomplete: false, items: [] });
          break;
        }
        try {
          var lines = doc.text.split('\n');
          var line = lines[params.position.line] || '';
          var prefix = line.substring(0, params.position.character);
          var result;
          // Try member completion first (this., .create({), or inside create block)
          result = memberHandler.handle(doc.text, params.position);
          // Fall back to grammar-based completion
          if ( ! result || result.items.length === 0 ) {
            result = completionHandler.handle(doc.text, params.position);
          }
          console.error('[LSP] completion: ' + result.items.length + ' items at line ' + params.position.line + ':' + params.position.character);
          respond(id, result);
        } catch (e) {
          console.error('[LSP] completion error:', e.message, e.stack);
          respond(id, { isIncomplete: false, items: [] });
        }
        break;

      case 'textDocument/hover':
        var doc = documents[params.textDocument.uri];
        if ( ! doc || ! isFoamFile(doc.text) ) { respond(id, null); break; }
        try {
          var result = hoverHandler.handle(doc.text, params.position);
          console.error('[LSP] hover: success');
          respond(id, result);
        } catch (e) {
          console.error('[LSP] hover error:', e.message);
          respond(id, null);
        }
        break;

      case 'textDocument/definition':
        var doc = documents[params.textDocument.uri];
        if ( ! doc || ! isFoamFile(doc.text) ) { respond(id, null); break; }
        try {
          var result = definitionHandler.handle(doc.text, params.position);
          console.error('[LSP] definition: success');
          respond(id, result);
        } catch (e) {
          console.error('[LSP] definition error:', e.message);
          respond(id, null);
        }
        break;

      case 'textDocument/documentSymbol':
        var doc = documents[params.textDocument.uri];
        if ( ! doc || ! isFoamFile(doc.text) ) { respond(id, []); break; }
        try {
          var result = symbolHandler.handle(doc.text);
          console.error('[LSP] documentSymbol: success');
          respond(id, result);
        } catch (e) {
          console.error('[LSP] documentSymbol error:', e.message);
          respond(id, []);
        }
        break;

      case 'textDocument/signatureHelp':
        var doc = documents[params.textDocument.uri];
        if ( ! doc || ! isFoamFile(doc.text) ) { respond(id, null); break; }
        try {
          var result = getSignatureHelp(doc.text, params.position, index);
          respond(id, result);
        } catch (e) {
          console.error('[LSP] signatureHelp error:', e.message);
          respond(id, null);
        }
        break;

      case 'foam/analyzeWorkspace':
        try {
          var results = workspaceAnalyzer.analyze(function(progress) {
            notify('foam/analyzeProgress', progress);
          });
          // Push diagnostics for each file with issues
          for ( var uri in results.fileResults ) {
            notify('textDocument/publishDiagnostics', {
              uri: uri,
              diagnostics: results.fileResults[uri]
            });
          }
          respond(id, {
            filesScanned:   results.filesScanned,
            filesWithIssues: results.filesWithIssues,
            warnings:       results.warnings,
            errors:         results.errors,
            infos:          results.infos,
            patterns:       results.patterns
          });
        } catch (e) {
          console.error('[LSP] analyzeWorkspace error:', e.message);
          respondError(id, -32603, e.message);
        }
        break;

      case 'workspace/symbol':
        var query = (params.query || '').toLowerCase();
        var symbols = [];
        var ids = index.getAllClassIds();
        for ( var i = 0 ; i < ids.length && symbols.length < 100 ; i++ ) {
          if ( ids[i].toLowerCase().indexOf(query) !== -1 ) {
            var filePath = index.getFilePath(ids[i]);
            if ( filePath ) {
              symbols.push({
                name: ids[i].split('.').pop(),
                kind: 5,
                location: {
                  uri: 'file://' + filePath,
                  range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }
                },
                containerName: ids[i]
              });
            }
          }
        }
        respond(id, symbols);
        break;

      case 'textDocument/foldingRange':
        var doc = documents[params.textDocument.uri];
        if ( ! doc ) { respond(id, []); break; }
        respond(id, getFoldingRanges(doc.text));
        break;

      case 'textDocument/codeAction':
        var doc = documents[params.textDocument.uri];
        if ( ! doc ) { respond(id, []); break; }
        respond(id, getCodeActions(doc.text, params.range, params.context, index));
        break;

      default:
        if ( id !== undefined ) {
          respondError(id, -32601, 'Method not found: ' + method);
        }
    }
  }

  console.error('FOAM LSP server started. ' + index.getAllClassIds().length + ' classes indexed.');
}

module.exports = { start: start };
