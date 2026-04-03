# FOAM LSP — Language Server Protocol for FOAM3

A runtime-aware Language Server for FOAM3 that provides autocomplete, hover, go-to-definition, diagnostics, workspace analysis, and Java code validation for `foam.CLASS`, `foam.ENUM`, and `foam.INTERFACE` definitions.

## Quick Start

```bash
# Run from your FOAM project root (e.g., ptv3/):
node foam3/tools/lsp-start.js

# Run tests:
cd <your-project> && node foam3/tools/tests/testFoamLSPGrammar.js

# VS Code debug mode:
cd foam3/vscode-foam && npm install && npx tsc -p ./
# Open foam3/vscode-foam/ in VS Code, press F5
```

## Architecture

```
VS Code Extension (TypeScript)              FOAM LSP Server (Node.js)
vscode-foam/                                 tools/lsp/

  extension.ts ──stdio──►  server.js (JSON-RPC main loop)
  FoamTreeProvider.ts                │
  FoamAnalysisRunner.ts              ├── FoamIndex.js (class registry queries)
                                     ├── FoamClassGrammar.js (FOAM grammar parser)
                                     ├── CursorAnalyzer.js (shared text utilities)
                                     └── handlers/
                                         ├── CompletionHandler.js
                                         ├── HoverHandler.js
                                         ├── DefinitionHandler.js
                                         ├── DiagnosticsHandler.js
                                         ├── MemberCompletionHandler.js
                                         ├── SymbolHandler.js
                                         ├── JavaBlockValidator.js
                                         └── WorkspaceAnalyzer.js
```

### Boot Sequence

1. `lsp-start.js` redirects console.log to stderr, sets buildlib globals
2. `pmake` loads FOAM runtime via `foam_node.js`, walks all POMs, loads all models
3. `LSPMaker.js` runs after POM traversal — builds file index, starts server
4. `server.js` creates FoamIndex, grammar, handlers — listens on stdio for JSON-RPC

### Key Components

#### FoamIndex (`tools/lsp/FoamIndex.js`)
The query layer over the FOAM runtime. All handlers go through FoamIndex, never touch `foam.*` directly.

- **Class discovery**: `getAllClassIds()` uses `foam.__context__.__cache__` (includes bootstrap classes)
- **File index**: `buildFileIndex()` walks ALL POMs recursively (including test/swift/node projects), stores `{ path, flags }` per class
- **Properties**: `getProperties()`, `getOwnProperties()`, `getInheritedProperties()`, `getAllPropertiesForFile()` (includes implements interfaces)
- **Java mappings**: `getJavaImportMappings()`, `getPropertyJavaType()`
- **Documentation**: `getClassDoc()`, `getPropertyDoc()`

#### FoamClassGrammar (`tools/lsp/FoamClassGrammar.js`)
FOAM grammar that parses entire `.js` files using a skip-and-match pattern:

```
START = repeat(alt(foamCall, ignoredContent))
foamCall = foam.CLASS/ENUM/INTERFACE + classBody
ignoredContent = anyChar()  // skip one character, try again
```

Dynamic suggestions built from FOAM registry:
- Property types: all subclasses of `foam.lang.Property` → `sug()` entries
- Class names: all known class IDs → `sug()` entries

#### CursorAnalyzer (`tools/lsp/CursorAnalyzer.js`)
Shared text/position utilities used by all handlers. Eliminates duplication.

12 methods: `offsetToPosition`, `positionToOffset`, `getDottedWordAtPosition`, `getSegmentAtPosition`, `resolveClassId`, `parseRequires`, `parseImports`, `resolveShortName`, `findCreateContext`, `findMatchingEnd`, `forEachFoamClass`, `getMethodSignature`

## Features

### Completion
| Context | What it suggests |
|---|---|
| `class: '▊'` | Property types (76 types from registry) |
| `extends: '▊'` | All class IDs (4000+) |
| `extends: 'foam.▊'` | Filtered class IDs |
| `of: '▊'` | Class IDs |
| `requires: ['▊']` | Class IDs |
| `javaImports: ['▊']` | Java package names |
| `this.▊` | Properties + methods + requires + imports |
| `this.X.create({▊})` | Target class properties |
| Top-level key position | package, name, extends, properties, etc. |
| Property key position | class, name, of, value, factory, etc. |

### Hover
- **Class names**: own vs inherited properties, documentation, methods
- **Short names from requires**: resolves to full class
- **`create` keyword**: shows target class properties
- **Method names**: signature with parameters
- **Properties inside `.create({})`**: type from target class
- **Property types**: type info and documentation

### Go-to-Definition
- Classes in `extends:`, `requires:`, `of:` → navigates to source file
- Property types → navigates to type definition
- 4310 files indexed from POM tree

### Diagnostics
- Unknown class in `extends:` / `requires:` (checks runtime + file index)
- Unknown property type (both short and full names)
- Wrong Java imports (`foam.nanos.*` → suggests correct package)
- Invalid getter/setter in `javaCode` (bare calls on `this`)
- Flag-aware: test/swift/node classes known but not flagged

### Signature Help
- Shows parameter names inside method parentheses
- Triggered by `(` and `,`

### Workspace Analyzer
- On-demand full codebase scan
- Auto-runs on startup
- Respects active flags (test/swift/node files filtered)
- Pattern grouping for false positive identification
- Results in VS Code Problems panel + sidebar

### Additional LSP Features
- **Workspace Symbols** (`Cmd+T`): search all FOAM classes by name
- **Folding Ranges**: fold properties/methods/requires/etc. blocks
- **Code Actions**: "Did you mean X?" for unknown classes, fix wrong imports
- **TextMate Grammar**: Java syntax highlighting in `javaCode` blocks
- **Document Symbols**: outline of properties/methods/actions

## VS Code Extension

### Sidebar Panel
- **Analysis**: run button, stats, auto-analyze on startup
- **Files with Issues**: expandable tree with clickable diagnostics
- **Patterns**: grouped diagnostic patterns with counts
- **Active Flags**: js, java, web, test, node, swift — clickable toggles
- **Server Info**: indexed classes, files, property types

### Installation

```bash
cd foam3/vscode-foam
npm install
npx tsc -p ./

# Debug mode: press F5 in VS Code
# Or package: npx @vscode/vsce package --allow-missing-repository
# Then: code --install-extension foam-lsp-*.vsix
```

## Testing

### Quick Test (seconds, no build)
```bash
cd <your-project> && node foam3/tools/tests/testFoamLSPGrammar.js
```

69 tests covering:
- FoamIndex queries (class discovery, property types, file index)
- Grammar parsing (5 real FOAM files)
- Completion (property types, class names, partial values, this., .create({}))
- Hover (class, property type, short names, create, methods)
- Diagnostics (valid/invalid classes, property types, constants)
- Definition (real file path resolution)
- CursorAnalyzer (position math, class resolution, requires parsing)
- WorkspaceAnalyzer (single file, pattern grouping)
- Folding ranges, code actions, workspace symbols
- Flag-aware file index (test classes not flagged as unknown)

### FOAM Test Framework
```bash
./build.sh -W9090 -Jlsp --flags:test client-tests:FoamIndexTest,FoamClassGrammarTest,HandlersTest,JavaBlockValidatorTest,LSPIntegrationTest
```

## File Structure

```
foam3/tools/
├── LSPMaker.js                    # Build Maker — hooks into pmake
├── lsp-start.js                   # Entry point for LSP server
├── lsp/
│   ├── pom.js
│   ├── FoamIndex.js               # Class registry queries (318 lines)
│   ├── FoamClassGrammar.js        # FOAM grammar parser (316 lines)
│   ├── CursorAnalyzer.js          # Shared text utilities
│   ├── server.js                  # JSON-RPC main loop (500+ lines)
│   ├── handlers/
│   │   ├── pom.js
│   │   ├── CompletionHandler.js   # textDocument/completion
│   │   ├── HoverHandler.js        # textDocument/hover
│   │   ├── DefinitionHandler.js   # textDocument/definition
│   │   ├── DiagnosticsHandler.js  # textDocument/publishDiagnostics
│   │   ├── MemberCompletionHandler.js  # this. and .create({}) completion
│   │   ├── SymbolHandler.js       # textDocument/documentSymbol
│   │   ├── JavaBlockValidator.js  # javaCode validation
│   │   └── WorkspaceAnalyzer.js   # foam/analyzeWorkspace
│   └── test/
│       ├── pom.js
│       ├── tests.jrl
│       ├── FoamIndexTest.js
│       ├── FoamClassGrammarTest.js
│       ├── HandlersTest.js
│       ├── JavaBlockValidatorTest.js
│       └── LSPIntegrationTest.js
├── tests/
│   └── testFoamLSPGrammar.js      # Quick standalone test (69 tests)
└── vscode-foam/
    ├── package.json
    ├── tsconfig.json
    ├── .gitignore
    ├── .vscode/launch.json
    ├── resources/foam-icon.svg
    ├── syntaxes/foam-js.tmLanguage.json
    └── src/
        ├── extension.ts
        ├── FoamTreeProvider.ts
        └── FoamAnalysisRunner.ts
```

## Known Limitations

1. **Java-only properties**: Properties added by Java code generation (not in JS model) can't be validated
2. **Multi-refines files**: Files with multiple `refines:` blocks — each block handled separately
3. **Flag toggle**: Changing flags shows a message but requires LSP restart to take effect
4. **Refinement properties**: Some properties added by refinements after class boot may not be visible
5. **Boot time**: ~10-15s to load all FOAM models on startup
