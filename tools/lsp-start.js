/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

// Entry point for FOAM LSP server.
// Usage: node foam3/tools/lsp-start.js [pom-path]
//
// Uses pmake (same as build.sh) to correctly load all FOAM models,
// then starts the LSP JSON-RPC server on stdio.
//
// stdout = JSON-RPC channel, ALL logging goes to stderr.

// Redirect console.log to stderr BEFORE anything loads
console.log = function() { console.error.apply(console, arguments); };
console.warn = function() { console.error.apply(console, arguments); };

// Prevent unhandled rejections from crashing the process.
// Web-only code like JsLib.installLib() may reference 'document' which
// doesn't exist in Node.js — these are non-fatal for the LSP.
process.on('unhandledRejection', function(e) {
  console.error('[LSP] Ignoring unhandled rejection:', e.message || e);
});
process.on('uncaughtException', function(e) {
  // Only ignore 'document is not defined' errors from web-only code
  if ( e.message && e.message.includes('document') ) {
    console.error('[LSP] Ignoring web-only error:', e.message);
    return;
  }
  console.error('[LSP] Fatal error:', e);
  process.exit(1);
});

// Set globals that buildlib expects (normally set by build.js)
globalThis.SILENT  = false;
globalThis.VERBOSE = false;
globalThis.DRY_RUN = false;
globalThis.HELP    = false;
globalThis.NOP     = '';

var path_ = require('path');
var pmake = require('./pmake');
var buildlib = require('./buildlib');

var pomPath = process.argv[2] || path_.join(process.cwd(), 'pom');

pmake.bind(buildlib, '-makers=LSP -pom=' + pomPath)();
