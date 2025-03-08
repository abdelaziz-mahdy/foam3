foam.POM({
  name: "mongodb-test",

  projects: [
    { name: '../../pom' },
    { name: '../mongodb/pom' },
    { name: '../../src/foam/dao/mongodb/test/pom' }
  ]
})
