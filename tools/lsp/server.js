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

  var index   = foam.parse.lsp.FoamIndex.create();
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
            documentSymbolProvider: true
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
          if ( /this\.\s*$/.test(prefix) ) {
            result = memberHandler.handle(doc.text, params.position);
          } else {
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
        respond(id, hoverHandler.handle(doc.text, params.position));
        break;

      case 'textDocument/definition':
        var doc = documents[params.textDocument.uri];
        if ( ! doc || ! isFoamFile(doc.text) ) { respond(id, null); break; }
        respond(id, definitionHandler.handle(doc.text, params.position));
        break;

      case 'textDocument/documentSymbol':
        var doc = documents[params.textDocument.uri];
        if ( ! doc || ! isFoamFile(doc.text) ) { respond(id, []); break; }
        respond(id, symbolHandler.handle(doc.text));
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
