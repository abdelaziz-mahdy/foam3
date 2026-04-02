/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

// Entry point for FOAM LSP server.
// Usage: node foam3/tools/lsp-start.js [pom-path]

var path_ = require('path');
var pmake = require('./pmake');
var buildlib = require('./buildlib');

var pomPath = process.argv[2] || path_.join(process.cwd(), 'pom');

pmake.bind(buildlib, '-makers=LSP -pom=' + pomPath)();
