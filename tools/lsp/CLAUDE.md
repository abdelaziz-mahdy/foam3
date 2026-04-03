# FOAM LSP — AI Agent Context

## What This Is
A runtime-aware Language Server Protocol implementation for the FOAM3 framework. It provides IDE features (autocomplete, hover, go-to-definition, diagnostics) for FOAM model files (`.js` files using `foam.CLASS`, `foam.ENUM`, `foam.INTERFACE`).

## How It Works
The LSP boots the FOAM runtime via `pmake` (same as `build.sh`), loading all model definitions into memory. It then serves IDE features over stdio JSON-RPC. The FOAM class registry (`foam.__context__.__cache__`) provides complete metadata about every class, property, method, and axiom.

## Key Files

### Core
| File | Purpose | Key Functions |
|---|---|---|
| `FoamIndex.js` | Query layer over FOAM registry | `getAllClassIds()`, `getProperties()`, `getFilePath()`, `buildFileIndex()`, `getAllPropertiesForFile()` |
| `FoamClassGrammar.js` | Grammar parser for foam.CLASS files | Skip-and-match pattern, dynamic `sug()` from registry |
| `CursorAnalyzer.js` | Shared text/position utilities | `offsetToPosition()`, `resolveClassId()`, `parseRequires()`, `findCreateContext()` |
| `server.js` | JSON-RPC main loop | Message dispatch, handler creation, helper functions |
| `lsp-start.js` | Entry point | Console redirect, buildlib globals, pmake invocation |
| `LSPMaker.js` | Build Maker for pmake | Sets flags, builds file index, starts server |

### Handlers
| Handler | LSP Method | What It Does |
|---|---|---|
| `CompletionHandler.js` | `textDocument/completion` | Grammar-based + context fallback for partial values |
| `MemberCompletionHandler.js` | (routed from completion) | `this.` members, `.create({})` properties, requires/imports |
| `HoverHandler.js` | `textDocument/hover` | Class docs, method signatures, property types, create info |
| `DefinitionHandler.js` | `textDocument/definition` | File index lookup for class → file path |
| `DiagnosticsHandler.js` | `textDocument/publishDiagnostics` | Class/type validation, delegates to JavaBlockValidator |
| `JavaBlockValidator.js` | (called by Diagnostics) | Java import validation, getter/setter validation |
| `SymbolHandler.js` | `textDocument/documentSymbol` | Document outline |
| `WorkspaceAnalyzer.js` | `foam/analyzeWorkspace` | Full codebase scan |

### VS Code Extension
| File | Purpose |
|---|---|
| `extension.ts` | Spawns LSP server, registers commands, auto-analyzes on startup |
| `FoamTreeProvider.ts` | Sidebar tree view (analysis, files, patterns, flags) |
| `FoamAnalysisRunner.ts` | Sends workspace analysis request, handles progress |

## FOAM Concepts for AI Agents

### Class Registry
- `foam.__context__.__cache__` — ALL registered classes (including lazy factories)
- `foam.USED` / `foam.UNUSED` — classes tracked after EndBoot.js (NOT bootstrap classes)
- `foam.maybeLookup(id)` — resolves a class, returns null if not found
- `foam.isRegistered(id)` — checks if class ID exists in cache
- `cls.getAxiomsByClass(foam.lang.Property)` — ALL properties including inherited
- `cls.getOwnAxiomsByClass(foam.lang.Property)` — only properties on this class

### Interfaces
- FOAM interfaces (`foam.INTERFACE`) define properties/methods
- Implementing classes get interface properties ONLY if explicitly declared in JS
- Some interface properties are Java-only (added by Java code generation)
- `getAllPropertiesForFile(classId, text)` checks implements interfaces from file text

### Refinements
- `refines: 'target.Class'` modifies an existing class, doesn't create a new one
- A file can have multiple `refines:` blocks (multiple classes refined)
- Refinements are in `foam.USED` with `m.refines` set

### Flags
- `foam.flags` controls which files are loaded: `{ js, java, web, test, node, swift, debug }`
- POM file entries have `flags: "js|java"` or `flags: "js&test|java&test"`
- Test/swift/node classes aren't loaded by default but ARE in the file index
- File index stores per-class flag metadata for filtering

### Property Types
- All subclasses of `foam.lang.Property` (76 types: String, Long, FObjectProperty, etc.)
- Discovered dynamically via `PropertyClass.isSubClass(cls)`
- Includes custom types from the project

## Testing
```bash
# Quick test (69 tests, ~30s):
cd <project> && node foam3/tools/tests/testFoamLSPGrammar.js

# FOAM framework tests:
./build.sh -W9090 -Jlsp --flags:test client-tests:FoamIndexTest
```

## Common Patterns for Modifications

### Adding a new LSP feature
1. Add handler method in appropriate handler file
2. Add capability in `server.js` initialize response
3. Add dispatch case in `server.js` handleMessage switch
4. Add test in `testFoamLSPGrammar.js`
5. If VS Code-specific, update `extension.ts` and `package.json`

### Adding a new diagnostic check
1. Add check in `DiagnosticsHandler.validateBlock()`
2. Use `this.classKnown_(id)` to check class existence (respects flags)
3. Use `this.addDiag()` to create the diagnostic
4. Add test case in tools test

### Adding to the grammar
1. Add rule in `FoamClassGrammar.buildGrammar_()`
2. Use `P.sug()` for completions, `P.sym()` for rule references
3. Dynamic parsers built from registry in `buildDynamicParsers_()`

## Metrics
- ~3000 lines of LSP code
- 69 automated tests
- 4310 classes indexed
- 76 property types
- Boot time: ~10-15s
