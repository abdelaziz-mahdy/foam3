foam.POM({
  name: "mongodb",

  projects: [
    { name: '../../src/foam/dao/mongodb/pom' }
  ],

  javaDependencies: [
    'org.mongodb:mongodb-driver-sync:5.3.1'
  ]
})
