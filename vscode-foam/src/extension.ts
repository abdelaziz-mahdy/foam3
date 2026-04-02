/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import * as path from 'path';
import { ExtensionContext, workspace, window } from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions
} from 'vscode-languageclient/node';

let client: LanguageClient;

export function activate(context: ExtensionContext) {
  const workspaceRoot = workspace.workspaceFolders?.[0]?.uri.fsPath;

  if ( !workspaceRoot ) {
    return;
  }

  const serverOptions: ServerOptions = {
    command: 'node',
    args: [
      path.join(workspaceRoot, 'foam3/tools/lsp-start.js'),
      path.join(workspaceRoot, 'pom')
    ],
    options: { cwd: workspaceRoot }
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: 'file', language: 'javascript' }],
    synchronize: {
      fileEvents: [
        workspace.createFileSystemWatcher('**/*.js'),
        workspace.createFileSystemWatcher('**/pom.js')
      ]
    }
  };

  client = new LanguageClient(
    'foam-lsp',
    'FOAM Language Server',
    serverOptions,
    clientOptions
  );

  const status = window.createStatusBarItem();
  status.text = '$(loading~spin) FOAM: Indexing...';
  status.show();

  client.start().then(() => {
    status.text = '$(check) FOAM: Ready';
    setTimeout(() => status.hide(), 3000);
  });

  context.subscriptions.push(client);
}

export function deactivate(): Thenable<void> | undefined {
  if ( !client ) {
    return undefined;
  }
  return client.stop();
}
