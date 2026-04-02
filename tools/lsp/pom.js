foam.POM({
  name: 'lsp',
  files: [
    { name: 'FoamIndex', flags: 'js' }
  ],
  projects: [
    { name: 'handlers/pom' },
    { name: 'test/pom', flags: 'test' }
  ]
});
