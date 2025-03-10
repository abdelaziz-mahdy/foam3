foam.POM({
  name: "mongodb",

  files: [
    { name: "DDAORefines",
      flags: "java" },
    { name: "MongoDAO",
      flags: "java" },
    { name: "MongoDBService",
      flags: "js|java" },
    { name: "LoadingAgent",
      flags: "java" }
  ]
});
