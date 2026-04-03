"use strict";
/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const vscode_1 = require("vscode");
const node_1 = require("vscode-languageclient/node");
let client;
function activate(context) {
    const outputChannel = vscode_1.window.createOutputChannel('FOAM Language Server');
    context.subscriptions.push(outputChannel);
    outputChannel.appendLine('FOAM LSP extension activated');
    const workspaceRoot = vscode_1.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot)
        return;
    // Fast path checks
    const candidates = [
        path.join(workspaceRoot, 'foam3/tools/lsp-start.js'),
        path.join(workspaceRoot, 'tools/lsp-start.js'),
    ];
    let lspScript = '';
    for (const c of candidates) {
        if (fs.existsSync(c)) {
            lspScript = c;
            break;
        }
    }
    if (!lspScript) {
        outputChannel.appendLine('Not a FOAM project (lsp-start.js not found)');
        return;
    }
    let pomPath = path.join(workspaceRoot, 'pom');
    if (!fs.existsSync(pomPath + '.js')) {
        pomPath = path.join(path.dirname(path.dirname(lspScript)), 'pom');
    }
    outputChannel.appendLine('LSP: ' + lspScript);
    outputChannel.appendLine('POM: ' + pomPath);
    // Defer server start to not block activation
    setTimeout(() => {
        startServer(context, outputChannel, lspScript, pomPath, workspaceRoot);
    }, 100);
}
function startServer(context, outputChannel, lspScript, pomPath, cwd) {
    const serverOptions = {
        command: 'node',
        args: [lspScript, pomPath],
        options: { cwd }
    };
    const clientOptions = {
        documentSelector: [{ scheme: 'file', language: 'javascript' }],
        synchronize: {
            fileEvents: [
                vscode_1.workspace.createFileSystemWatcher('**/*.js'),
                vscode_1.workspace.createFileSystemWatcher('**/pom.js')
            ]
        },
        outputChannel: outputChannel
    };
    client = new node_1.LanguageClient('foam-lsp', 'FOAM Language Server', serverOptions, clientOptions);
    const status = vscode_1.window.createStatusBarItem();
    status.text = '$(loading~spin) FOAM: Indexing...';
    status.show();
    outputChannel.appendLine('Starting FOAM LSP server...');
    client.start().then(() => {
        outputChannel.appendLine('FOAM LSP server ready');
        status.text = '$(check) FOAM: Ready';
        setTimeout(() => status.hide(), 5000);
    }).catch((err) => {
        outputChannel.appendLine('FOAM LSP failed: ' + err.message);
        status.text = '$(error) FOAM: Error';
    });
    context.subscriptions.push(client);
}
function deactivate() {
    if (!client)
        return undefined;
    return client.stop();
}
//# sourceMappingURL=extension.js.map