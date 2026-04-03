foam.POM({
  name: 'lsp',
  files: [
    { name: 'FileModelCache', flags: 'js' },
    { name: 'FoamIndex', flags: 'js' },
    { name: 'FoamClassGrammar', flags: 'js' },
    { name: 'CursorAnalyzer', flags: 'js' }
  ],
  projects: [
    { name: 'handlers/pom' },
    { name: 'test/pom', flags: 'test' }
  ]
});
