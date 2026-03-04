/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.parse.test',
  name: 'SimpleQueryParserJavaTest',
  extends: 'foam.core.test.Test',

  javaImports: [
    'foam.parse.SimpleQueryParser',
    'foam.mlang.predicate.Predicate',
    'foam.core.auth.User',
    'java.util.Calendar',
    'java.util.Date',
    'java.util.TimeZone'
  ],

  documentation: 'Comprehensive Java tests for SimpleQueryParser mirroring the JS test suite',

  methods: [
    {
      name: 'runTest',
      javaCode: `
        testStringProperties();
        testStringArrayProperties();
        testNumberProperties();
        testNumberCombinedProperties();
        testBooleanProperties();
        testEnumProperties();
        testDateProperties();
        testParenthesesAndLogical();
        testEdgeCases();
      `
    },
    {
      name: 'buildPredicate',
      type: 'String',
      args: [ { name: 'query', type: 'String' } ],
      javaCode: `
        SimpleQueryParser parser = new SimpleQueryParser(User.getOwnClassInfo());
        Predicate pred = parser.parseString(query);
        if ( pred == null ) return null;
        return pred.toString().trim();
      `
    },
    {
      name: 'assertQuery',
      args: [
        { name: 'query',    type: 'String' },
        { name: 'expected', type: 'String' },
        { name: 'message',  type: 'String' }
      ],
      javaCode: `
        String result = buildPredicate(query);
        if ( result == null ) {
          test(false, message + " — got null");
          return;
        }
        test(
          result.toLowerCase().equals(expected.toLowerCase()),
          message + " — expected: " + expected + ", got: " + result
        );
      `
    },
    {
      name: 'assertQueryContains',
      args: [
        { name: 'query',    type: 'String' },
        { name: 'fragment', type: 'String' },
        { name: 'message',  type: 'String' }
      ],
      javaCode: `
        String result = buildPredicate(query);
        if ( result == null ) {
          test(false, message + " — got null");
          return;
        }
        test(
          result.toLowerCase().contains(fragment.toLowerCase()),
          message + " — expected to contain: " + fragment + ", got: " + result
        );
      `
    },
    {
      name: 'assertQueryNull',
      args: [
        { name: 'query',   type: 'String' },
        { name: 'message', type: 'String' }
      ],
      javaCode: `
        String result = buildPredicate(query);
        test(result == null, message + " — expected null, got: " + result);
      `
    },

    // ───────── String property tests ─────────
    {
      name: 'testStringProperties',
      javaCode: `
        assertQuery(
          "firstName = SomeName",
          "EQ(foam.core.auth.User.firstName, \\"SomeName\\")",
          "String Test1: Equal"
        );
        assertQuery(
          "firstName!=SomeName",
          "NEQ(foam.core.auth.User.firstName, \\"SomeName\\")",
          "String Test2: Not equal"
        );
        assertQuery(
          "firstName CONTAINS SomeName",
          "CONTAINS_IC(foam.core.auth.User.firstName, \\"SomeName\\")",
          "String Test3: CONTAINS"
        );
        assertQuery(
          "firstName:SomeName",
          "CONTAINS_IC(foam.core.auth.User.firstName, \\"SomeName\\")",
          "String Test4: Colon operator"
        );
        assertQuery(
          "firstName~SomeName",
          "CONTAINS_IC(foam.core.auth.User.firstName, \\"SomeName\\")",
          "String Test5: Tilde operator"
        );
        assertQuery(
          "firstName IN (SomeName,AnotherName)",
          "IN(foam.core.auth.User.firstName, [\\"SomeName\\", \\"AnotherName\\"])",
          "String Test6: IN"
        );
        assertQuery(
          "firstName NOT IN (SomeName,AnotherName)",
          "NOT(IN(foam.core.auth.User.firstName, [\\"SomeName\\", \\"AnotherName\\"]))",
          "String Test7: NOT IN"
        );
        assertQuery(
          "firstName IS EMPTY",
          "NOT(HAS(foam.core.auth.User.firstName))",
          "String Test8: IS EMPTY"
        );
        assertQuery(
          "firstName IS NOT EMPTY",
          "HAS(foam.core.auth.User.firstName)",
          "String Test9: IS NOT EMPTY"
        );
      `
    },

    // ───────── StringArray property tests ─────────
    {
      name: 'testStringArrayProperties',
      javaCode: `
        assertQuery(
          "disabledTopics IN (tag1,tag2,tag3)",
          "IN(foam.core.auth.User.disabledTopics, [\\"tag1\\", \\"tag2\\", \\"tag3\\"])",
          "StringArray Test1: IN list"
        );
        assertQuery(
          "disabledTopics NOT IN (tag1,tag2,tag3)",
          "NOT(IN(foam.core.auth.User.disabledTopics, [\\"tag1\\", \\"tag2\\", \\"tag3\\"]))",
          "StringArray Test2: NOT IN list"
        );
        assertQuery(
          "disabledTopics = tag1",
          "IN(foam.core.auth.User.disabledTopics, \\"tag1\\")",
          "StringArray Test3: Equals maps to IN"
        );
        assertQuery(
          "disabledTopics HAS tag1",
          "IN(foam.core.auth.User.disabledTopics, \\"tag1\\")",
          "StringArray Test4: HAS maps to IN"
        );
        assertQuery(
          "disabledTopics != tag1",
          "NOT(IN(foam.core.auth.User.disabledTopics, \\"tag1\\"))",
          "StringArray Test5: Not equals maps to NOT IN"
        );
      `
    },

    // ───────── Number property tests ─────────
    {
      name: 'testNumberProperties',
      javaCode: `
        assertQuery(
          "id = 6",
          "EQ(foam.core.auth.User.id, 6)",
          "Number Test1: Equal"
        );
        assertQuery(
          "id!=6",
          "NEQ(foam.core.auth.User.id, 6)",
          "Number Test2: Not equal"
        );
        assertQuery(
          "id>6",
          "GT(foam.core.auth.User.id, 6)",
          "Number Test3: Greater than"
        );
        assertQuery(
          "id>=6",
          "GTE(foam.core.auth.User.id, 6)",
          "Number Test4: Greater than or equal"
        );
        assertQuery(
          "id<6",
          "LT(foam.core.auth.User.id, 6)",
          "Number Test5: Less than"
        );
        assertQuery(
          "id<=6",
          "LTE(foam.core.auth.User.id, 6)",
          "Number Test6: Less than or equal"
        );
        assertQuery(
          "id IN (6,7,8)",
          "IN(foam.core.auth.User.id, [6, 7, 8])",
          "Number Test7: IN list"
        );
        assertQuery(
          "id NOT IN (6,7,8)",
          "NOT(IN(foam.core.auth.User.id, [6, 7, 8]))",
          "Number Test8: NOT IN list"
        );
      `
    },

    // ───────── Number combined property tests ─────────
    {
      name: 'testNumberCombinedProperties',
      javaCode: `
        assertQuery(
          "id>9 AND id<16",
          "AND(GT(foam.core.auth.User.id, 9),LT(foam.core.auth.User.id, 16))",
          "Number Combined Test1: Greater than AND less than"
        );
        assertQuery(
          "id=18 OR id<9",
          "OR(EQ(foam.core.auth.User.id, 18),LT(foam.core.auth.User.id, 9))",
          "Number Combined Test2: Equal OR less than"
        );
      `
    },

    // ───────── Boolean property tests ─────────
    {
      name: 'testBooleanProperties',
      javaCode: `
        assertQuery(
          "loginEnabled IS TRUE",
          "EQ(foam.core.auth.User.loginEnabled, true)",
          "Boolean Test1: IS TRUE"
        );
        assertQuery(
          "loginEnabled IS FALSE",
          "EQ(foam.core.auth.User.loginEnabled, false)",
          "Boolean Test2: IS FALSE"
        );
      `
    },

    // ───────── Enum property tests ─────────
    {
      name: 'testEnumProperties',
      javaCode: `
        assertQuery(
          "lifecycleState= ACTIVE",
          "EQ(foam.core.auth.User.lifecycleState, ACTIVE)",
          "Enum Test1: Equal"
        );
        assertQuery(
          "lifecycleState!=ACTIVE",
          "NEQ(foam.core.auth.User.lifecycleState, ACTIVE)",
          "Enum Test2: Not equal"
        );
        assertQuery(
          "lifecycleState IN (ACTIVE,REJECTED)",
          "IN(foam.core.auth.User.lifecycleState, [ACTIVE, REJECTED])",
          "Enum Test3: IN list"
        );
        assertQuery(
          "lifecycleState NOT IN ( ACTIVE, REJECTED )",
          "NOT(IN(foam.core.auth.User.lifecycleState, [ACTIVE, REJECTED]))",
          "Enum Test4: NOT IN list"
        );
      `
    },

    // ───────── Date property tests ─────────
    {
      name: 'testDateProperties',
      javaCode: `
        // Date equality produces a range predicate (AND of GTE start, LT end)
        String result1 = buildPredicate("created=2025-01-01");
        test(result1 != null, "Date Test1: Date equality parses");
        test(
          result1.toLowerCase().contains("gte(foam.core.auth.user.created,") &&
          result1.toLowerCase().contains("lt(foam.core.auth.user.created,"),
          "Date Test1: Date equality produces range (GTE + LT) — got: " + result1
        );

        String result2 = buildPredicate("created = 2025-05-31");
        test(result2 != null, "Date Test2: Date equality with spaces parses");
        test(
          result2.toLowerCase().contains("gte(foam.core.auth.user.created,") &&
          result2.toLowerCase().contains("lt(foam.core.auth.user.created,"),
          "Date Test2: Date equality with spaces produces range — got: " + result2
        );

        // Relative date comparisons
        String result3 = buildPredicate("birthday > TODAY-7");
        test(result3 != null, "Date Test3: Relative date > TODAY-7 parses");
        test(
          result3.toLowerCase().contains("gt(foam.core.auth.user.birthday,"),
          "Date Test3: Relative date produces GT — got: " + result3
        );

        String result4 = buildPredicate("birthday <= TODAY+30");
        test(result4 != null, "Date Test4: Relative date <= TODAY+30 parses");
        test(
          result4.toLowerCase().contains("lte(foam.core.auth.user.birthday,"),
          "Date Test4: Relative date produces LTE — got: " + result4
        );

        // Date IN RANGE
        String result5 = buildPredicate("birthday IN RANGE (2025-03-31, 2025-04-30)");
        test(result5 != null, "Date Test5: Date IN RANGE parses");
        test(
          result5.toLowerCase().contains("gte(foam.core.auth.user.birthday,") &&
          result5.toLowerCase().contains("lt(foam.core.auth.user.birthday,"),
          "Date Test5: Date IN RANGE produces GTE+LT — got: " + result5
        );

        // Date NOT IN RANGE
        String result6 = buildPredicate("birthday NOT IN RANGE (2025-03-31, 2025-04-30)");
        test(result6 != null, "Date Test6: Date NOT IN RANGE parses");
        test(
          result6.toLowerCase().contains("gte(foam.core.auth.user.birthday,") &&
          result6.toLowerCase().contains("lt(foam.core.auth.user.birthday,"),
          "Date Test6: Date NOT IN RANGE produces OR(GTE,LT) — got: " + result6
        );

        // Date IS EMPTY / IS NOT EMPTY
        assertQuery(
          "lastLogin IS EMPTY",
          "NOT(HAS(foam.core.auth.User.lastLogin))",
          "Date Test7: IS EMPTY"
        );
        assertQuery(
          "lastLogin IS NOT EMPTY",
          "HAS(foam.core.auth.User.lastLogin)",
          "Date Test8: IS NOT EMPTY"
        );

        // Combined date queries
        String result7 = buildPredicate("birthday IN RANGE (2025-03-31, 2025-04-30) AND lastLogin IS EMPTY");
        test(result7 != null, "Date Test9: Date AND query parses");
        test(
          result7.toLowerCase().contains("gte(foam.core.auth.user.birthday,") &&
          result7.toLowerCase().contains("not(has(foam.core.auth.user.lastlogin))"),
          "Date Test9: Date AND combines range + IS EMPTY — got: " + result7
        );

        String result8 = buildPredicate("birthday NOT IN RANGE (2025-03-31, 2025-04-30) OR lastLogin IS NOT EMPTY");
        test(result8 != null, "Date Test10: Date OR query parses");
        test(
          result8.toLowerCase().contains("has(foam.core.auth.user.lastlogin)"),
          "Date Test10: Date OR includes HAS — got: " + result8
        );
      `
    },

    // ───────── Parentheses and logical tests ─────────
    {
      name: 'testParenthesesAndLogical',
      javaCode: `
        assertQuery(
          "( id = 6 )",
          "EQ(foam.core.auth.User.id, 6)",
          "Parentheses Test1: Simple parentheses"
        );

        assertQuery(
          "(id>9 AND id<17)",
          "AND(GT(foam.core.auth.User.id, 9),LT(foam.core.auth.User.id, 17))",
          "Parentheses Test2: AND in parentheses"
        );

        assertQuery(
          "(id=18 OR id<10)",
          "OR(EQ(foam.core.auth.User.id, 18),LT(foam.core.auth.User.id, 10))",
          "Parentheses Test3: OR in parentheses"
        );

        assertQuery(
          "NOT id=17 AND loginEnabled IS TRUE",
          "AND(NEQ(foam.core.auth.User.id, 17),EQ(foam.core.auth.User.loginEnabled, true))",
          "Parentheses Test4: NOT with AND"
        );
      `
    },

    // ───────── Edge case tests ─────────
    {
      name: 'testEdgeCases',
      javaCode: `
        SimpleQueryParser parser = new SimpleQueryParser(User.getOwnClassInfo());

        // null input
        Predicate nullResult = parser.parseString(null);
        test(nullResult == null, "Edge Test1: null input returns null");

        // empty string
        Predicate emptyResult = parser.parseString("");
        test(emptyResult == null, "Edge Test2: empty string returns null");

        // whitespace only
        Predicate wsResult = parser.parseString("   ");
        test(wsResult == null, "Edge Test3: whitespace-only returns null");
      `
    }
  ]
});
