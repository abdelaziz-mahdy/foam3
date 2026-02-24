/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.lib.json.test',
  name: 'ReentrantParseTestModel',

  documentation: `
    Test model that triggers a reentrant JSONParser.parseString() call
    during its own JSON deserialization. Used by JSONParserReentrancyTest
    to verify that reentrant parsing does not corrupt the outer parse.

    When the 'trigger' property is set during parsing, its javaPostSet
    calls parseString() on the same JSONParser instance (stored in a
    static field by the test). This simulates what happens in production
    when a RELATIONSHIP javaPostSet calls DAO.find() which triggers
    journal replay on the same ThreadLocal JSONParser.
  `,

  properties: [
    {
      class: 'String',
      name: 'id'
    },
    {
      class: 'String',
      name: 'trigger',
      javaPostSet: `
        // Simulate reentrant parsing: when this property is set during
        // JSON deserialization, call parseString on the same parser.
        foam.lib.json.JSONParser p = foam.lib.json.JSONParserReentrancyTest.reentrantTestParser_;
        if ( p != null ) {
          foam.lib.json.JSONParserReentrancyTest.reentrantTestResult_ =
            p.parseString("{class:\\"foam.core.test.Test\\",id:\\"nested-reentrant\\"}", null);
        }
      `
    },
    {
      class: 'String',
      name: 'afterTrigger',
      documentation: 'Property parsed AFTER trigger — will fail to parse if the reentrant call corrupted the stream'
    }
  ]
});
