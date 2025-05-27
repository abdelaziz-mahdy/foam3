foam.POM({
  name:'https',
  envs: {
    webPort: '8443'
  },
  copy: [
    { source: 'foamdev-ca.crt' },
    { source: 'foamdev.jks' },
    { source: 'foamdev.pkcs12' }
  ]
})
