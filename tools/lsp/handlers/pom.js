foam.POM({
  name: 'lsp-handlers',
  files: [
    { name: 'CompletionHandler', flags: 'js' },
    { name: 'HoverHandler', flags: 'js' },
    { name: 'DefinitionHandler', flags: 'js' },
    { name: 'DiagnosticsHandler', flags: 'js' },
    { name: 'JavaBlockValidator', flags: 'js' },
    { name: 'SymbolHandler', flags: 'js' },
    { name: 'MemberCompletionHandler', flags: 'js' }
  ]
});
