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
            }
          },
          serverInfo: { name: 'foam-lsp', version: '0.1.0' }
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

      default:
        if ( id !== undefined ) {
          respondError(id, -32601, 'Method not found: ' + method);
        }
    }
  }

  console.error('FOAM LSP server started. ' + index.getAllClassIds().length + ' classes indexed.');
}

module.exports = { start: start };
