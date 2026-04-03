/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import * as vscode from 'vscode';

export interface AnalysisResults {
  filesScanned: number;
  filesWithIssues: number;
  warnings: number;
  errors: number;
  infos: number;
  patterns: Array<{ pattern: string; count: number; severity: number }>;
  fileResults?: Record<string, Array<{
    range: { start: { line: number; character: number }; end: { line: number; character: number } };
    severity: number;
    message: string;
  }>>;
}

enum TreeItemType {
  Section,
  Action,
  Stat,
  FileEntry,
  DiagnosticEntry,
  PatternEntry,
  InfoEntry
}

class FoamTreeItem extends vscode.TreeItem {
  type: TreeItemType;
  children: FoamTreeItem[];
  uri?: string;
  line?: number;

  constructor(
    label: string,
    type: TreeItemType,
    collapsible: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None
  ) {
    super(label, collapsible);
    this.type = type;
    this.children = [];
  }
}

export class FoamTreeProvider implements vscode.TreeDataProvider<FoamTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<FoamTreeItem | undefined | null>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private results: AnalysisResults | null = null;
  private running = false;
  private lastRunTime: string | null = null;
  private serverInfo: { classes: number; files: number; types: number } | null = null;
  private activeFlags: Record<string, boolean> = {
    js: true, java: true, web: true, debug: true,
    test: false, node: false, swift: false
  };

  getTreeItem(element: FoamTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: FoamTreeItem): FoamTreeItem[] {
    if ( !element ) return this.getRootItems();
    return element.children;
  }

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  setRunning(running: boolean): void {
    this.running = running;
    this.refresh();
  }

  setResults(results: AnalysisResults): void {
    this.results = results;
    this.lastRunTime = new Date().toLocaleTimeString();
    this.running = false;
    this.refresh();
  }

  setServerInfo(info: { classes: number; files: number; types: number }): void {
    this.serverInfo = info;
    this.refresh();
  }

  private getRootItems(): FoamTreeItem[] {
    var items: FoamTreeItem[] = [];

    // Analysis section
    var analysis = new FoamTreeItem(
      'Analysis',
      TreeItemType.Section,
      vscode.TreeItemCollapsibleState.Expanded
    );
    analysis.iconPath = new vscode.ThemeIcon('graph');
    analysis.children = this.getAnalysisChildren();
    items.push(analysis);

    // Files with issues
    if ( this.results && this.results.filesWithIssues > 0 ) {
      var files = new FoamTreeItem(
        'Files with Issues (' + this.results.filesWithIssues + ')',
        TreeItemType.Section,
        vscode.TreeItemCollapsibleState.Collapsed
      );
      files.iconPath = new vscode.ThemeIcon('folder');
      files.children = this.getFileChildren();
      items.push(files);
    }

    // False positive patterns
    if ( this.results && this.results.patterns.length > 0 ) {
      var patterns = new FoamTreeItem(
        'Patterns (' + this.results.patterns.length + ')',
        TreeItemType.Section,
        vscode.TreeItemCollapsibleState.Collapsed
      );
      patterns.iconPath = new vscode.ThemeIcon('search');
      patterns.children = this.getPatternChildren();
      items.push(patterns);
    }

    // Active flags
    var flags = new FoamTreeItem(
      'Active Flags',
      TreeItemType.Section,
      vscode.TreeItemCollapsibleState.Collapsed
    );
    flags.iconPath = new vscode.ThemeIcon('settings-gear');
    flags.children = this.getFlagsChildren();
    items.push(flags);

    // Server info
    if ( this.serverInfo ) {
      var info = new FoamTreeItem(
        'Server Info',
        TreeItemType.Section,
        vscode.TreeItemCollapsibleState.Collapsed
      );
      info.iconPath = new vscode.ThemeIcon('gear');
      info.children = this.getServerInfoChildren();
      items.push(info);
    }

    return items;
  }

  private getAnalysisChildren(): FoamTreeItem[] {
    var children: FoamTreeItem[] = [];

    if ( this.running ) {
      var item = new FoamTreeItem('$(loading~spin) Running...', TreeItemType.Stat);
      children.push(item);
      return children;
    }

    // Run button
    var run = new FoamTreeItem('Run Workspace Analysis', TreeItemType.Action);
    run.iconPath = new vscode.ThemeIcon('play');
    run.command = { command: 'foam.analyzeWorkspace', title: 'Run Analysis' };
    children.push(run);

    if ( this.lastRunTime ) {
      children.push(new FoamTreeItem('Last run: ' + this.lastRunTime, TreeItemType.Stat));
    }

    if ( this.results ) {
      children.push(new FoamTreeItem('Files: ' + this.results.filesScanned + ' scanned', TreeItemType.Stat));

      var warn = new FoamTreeItem('Warnings: ' + this.results.warnings, TreeItemType.Stat);
      warn.iconPath = new vscode.ThemeIcon('warning', new vscode.ThemeColor('list.warningForeground'));
      children.push(warn);

      var info = new FoamTreeItem('Info: ' + this.results.infos, TreeItemType.Stat);
      info.iconPath = new vscode.ThemeIcon('info');
      children.push(info);

      var err = new FoamTreeItem('Errors: ' + this.results.errors, TreeItemType.Stat);
      err.iconPath = new vscode.ThemeIcon('error', new vscode.ThemeColor('list.errorForeground'));
      children.push(err);
    }

    return children;
  }

  private getFileChildren(): FoamTreeItem[] {
    if ( !this.results || !this.results.fileResults ) return [];
    var children: FoamTreeItem[] = [];
    var fileResults = this.results.fileResults;

    // Sort by diagnostic count descending
    var uris = Object.keys(fileResults).sort(function(a, b) {
      return fileResults[b].length - fileResults[a].length;
    });

    for ( var i = 0 ; i < Math.min(uris.length, 50) ; i++ ) {
      var uri = uris[i];
      var diags = fileResults[uri];
      var fileName = uri.split('/').pop() || uri;

      var file = new FoamTreeItem(
        fileName + ' (' + diags.length + ')',
        TreeItemType.FileEntry,
        vscode.TreeItemCollapsibleState.Collapsed
      );
      file.iconPath = new vscode.ThemeIcon('file');
      file.uri = uri;
      file.children = [];

      for ( var d = 0 ; d < Math.min(diags.length, 20) ; d++ ) {
        var diag = diags[d];
        var icon = diag.severity === 1 ? 'error' : diag.severity === 2 ? 'warning' : 'info';
        var entry = new FoamTreeItem(diag.message, TreeItemType.DiagnosticEntry);
        entry.iconPath = new vscode.ThemeIcon(icon);
        entry.uri = uri;
        entry.line = diag.range.start.line;
        entry.command = {
          command: 'vscode.open',
          title: 'Open',
          arguments: [
            vscode.Uri.parse(uri),
            { selection: new vscode.Range(diag.range.start.line, diag.range.start.character, diag.range.start.line, diag.range.start.character) }
          ]
        };
        file.children.push(entry);
      }

      children.push(file);
    }

    return children;
  }

  private getPatternChildren(): FoamTreeItem[] {
    if ( !this.results ) return [];
    var children: FoamTreeItem[] = [];
    var patterns = this.results.patterns;

    for ( var i = 0 ; i < Math.min(patterns.length, 30) ; i++ ) {
      var p = patterns[i];
      var icon = p.severity === 1 ? 'error' : p.severity === 2 ? 'warning' : 'info';
      var item = new FoamTreeItem(p.pattern + ' (' + p.count + ')', TreeItemType.PatternEntry);
      item.iconPath = new vscode.ThemeIcon(icon);
      children.push(item);
    }

    return children;
  }

  setActiveFlags(flags: Record<string, boolean>): void {
    this.activeFlags = flags;
    this.refresh();
  }

  private getFlagsChildren(): FoamTreeItem[] {
    var children: FoamTreeItem[] = [];
    var flagNames = ['js', 'java', 'web', 'test', 'node', 'swift', 'debug'];
    for ( var i = 0 ; i < flagNames.length ; i++ ) {
      var name = flagNames[i];
      var active = this.activeFlags[name] !== false;
      var item = new FoamTreeItem(
        (active ? '$(check) ' : '$(circle-outline) ') + name + (active ? ' (active)' : ' (off)'),
        TreeItemType.InfoEntry
      );
      item.tooltip = 'Flag: ' + name + ' — ' + (active ? 'Classes with this flag are loaded and analyzed' : 'Classes with this flag are known but not loaded');
      children.push(item);
    }
    return children;
  }

  private getServerInfoChildren(): FoamTreeItem[] {
    if ( !this.serverInfo ) return [];
    return [
      new FoamTreeItem('Classes indexed: ' + this.serverInfo.classes, TreeItemType.InfoEntry),
      new FoamTreeItem('Files indexed: ' + this.serverInfo.files, TreeItemType.InfoEntry),
      new FoamTreeItem('Property types: ' + this.serverInfo.types, TreeItemType.InfoEntry)
    ];
  }
}
