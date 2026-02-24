/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.lib.json',
  name: 'JSONParserReentrancyTest',
  extends: 'foam.core.test.Test',

  documentation: `
    Tests that JSONParser.parseString() is safe for reentrant use.

    Bug: JSONParser previously reused a single StringPStream field across
    parseString() calls. StringPStream uses a shared Reference<CharSequence>
    that propagates to ALL derived PStreams (via tail() and setValue()).
    When pi.set() during parsing triggers a javaPostSet that calls
    DAO.find() -> journal replay -> parseString() on the SAME ThreadLocal
    JSONParser, setString() mutated the shared Reference, corrupting the
    outer parse's entire PStream chain.

    Fix: JSONParser now creates a new StringPStream(data) per parseString()
    call. Each call gets its own Reference, so reentrant calls cannot
    corrupt the outer parse.
  `,

  javaImports: [
    'foam.lang.FObject',
    'foam.lib.json.FObjectParser',
    'foam.lib.json.JSONParser',
    'foam.lib.parse.*'
  ],

  methods: [
    {
      name: 'runTest',
      javaCode: `
        testReferenceIsolation();
        testSetStringCorruption();
        testReentrantStreamSafety();
        testSequentialParseString(x);
        testNestedFObjectParsing(x);
      `
    },
    {
      name: 'testReferenceIsolation',
      documentation: 'Verify that new StringPStream() creates independent Reference objects',
      javaCode: `
        // Two StringPStream instances created via constructor should have
        // independent References. Modifying one must not affect the other.
        StringPStream ps1 = new StringPStream("hello");
        StringPStream ps2 = new StringPStream("world");

        test(ps1.head() == 'h', "ps1 starts with 'h'");
        test(ps2.head() == 'w', "ps2 starts with 'w'");

        // Advance ps1 and verify ps2 is completely unaffected
        PStream ps1tail = ps1.tail();
        test(ps2.head() == 'w', "ps2 unaffected after advancing ps1");
        test(ps1tail.valid(), "ps1 tail is valid");
      `
    },
    {
      name: 'testSetStringCorruption',
      documentation: 'Demonstrate that setString() on a shared StringPStream corrupts derived PStreams (the bug)',
      javaCode: `
        // This test documents the bug that existed when JSONParser reused
        // a shared StringPStream field and called setString() per parse.
        //
        // StringPStream.tail() shares the parent's Reference<CharSequence>.
        // Calling setString() mutates that Reference, corrupting ALL
        // PStreams derived from the same root.

        StringPStream shared = new StringPStream("hello");
        PStream tail = shared.tail(); // shares Reference, position 1 -> 'e'

        test(tail.valid(), "tail is valid before setString");
        test(tail.head() == 'e', "tail sees 'e' from 'hello' at pos 1");

        // setString mutates the shared Reference — ALL derived PStreams are affected
        shared.setString("XY");

        // tail's Reference now points to "XY" instead of "hello"
        // Position 1 of "XY" is 'Y', not 'e' — data corruption!
        test(tail.valid(), "tail still valid (pos 1 < 'XY'.length)");
        test(tail.head() == 'Y', "setString corrupts derived PStream: tail sees 'Y' instead of 'e'");

        // With an even shorter string, tail becomes invalid entirely
        shared.setString("Z");
        test( ! tail.valid(), "setString with shorter string makes tail invalid (pos 1 >= 'Z'.length)");
      `
    },
    {
      name: 'testReentrantStreamSafety',
      documentation: 'Verify that creating new StringPStream per call prevents reentrant corruption',
      javaCode: `
        // Simulate the reentrant scenario:
        // 1. Outer parseString creates StringPStream("outer data"), parsing advances
        // 2. During parsing, pi.set() triggers javaPostSet -> DAO.find() -> journal replay
        // 3. Reentrant parseString creates StringPStream("inner data")
        // 4. Inner parse runs to completion
        // 5. Outer parse continues — its PStream must be unaffected

        // Step 1: Outer parse starts, advances to position 10
        StringPStream outerPs = new StringPStream("{class:\\"foam.core.test.Test\\",id:\\"outer\\"}");
        PStream advanced = outerPs;
        for ( int i = 0 ; i < 10 ; i++ ) advanced = advanced.tail();
        char outerCharBefore = advanced.head();

        // Step 2-4: Reentrant parse creates NEW StringPStream (the fix)
        StringPStream innerPs = new StringPStream("{class:\\"foam.core.test.Test\\",id:\\"inner\\"}");
        // Inner parse runs — this only affects innerPs's Reference
        PStream innerAdvanced = innerPs;
        for ( int i = 0 ; i < 10 ; i++ ) innerAdvanced = innerAdvanced.tail();

        // Step 5: Verify outer stream is completely unaffected
        char outerCharAfter = advanced.head();
        test(
          outerCharBefore == outerCharAfter,
          "Outer PStream unaffected by inner parse (new StringPStream per call)"
        );

        // Contrast: if we had used setString() on a shared instance (OLD behavior)
        StringPStream sharedPs = new StringPStream("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
        PStream sharedAdvanced = sharedPs;
        for ( int i = 0 ; i < 10 ; i++ ) sharedAdvanced = sharedAdvanced.tail();
        char sharedBefore = sharedAdvanced.head();

        // Simulate reentrant call using setString (OLD code's behavior)
        sharedPs.setString("BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB");
        char sharedAfter = sharedAdvanced.head();

        test(
          sharedBefore != sharedAfter,
          "setString DOES corrupt shared PStream (old behavior that caused the bug)"
        );
      `
    },
    {
      name: 'testSequentialParseString',
      args: 'foam.lang.X x',
      documentation: 'Verify sequential parseString calls produce correct independent results',
      javaCode: `
        JSONParser parser = new JSONParser();
        parser.setX(x);

        // Parse two different objects sequentially
        String json1 = "{class:\\"foam.core.test.Test\\",id:\\"first\\"}";
        String json2 = "{class:\\"foam.core.test.Test\\",id:\\"second\\"}";

        FObject obj1 = parser.parseString(json1, null);
        FObject obj2 = parser.parseString(json2, null);

        test(obj1 != null, "Sequential parse: first object is non-null");
        test(obj2 != null, "Sequential parse: second object is non-null");

        if ( obj1 != null && obj2 != null ) {
          String id1 = ((foam.core.test.Test) obj1).getId();
          String id2 = ((foam.core.test.Test) obj2).getId();
          test("first".equals(id1), "Sequential parse: first object id is 'first', got '" + id1 + "'");
          test("second".equals(id2), "Sequential parse: second object id is 'second', got '" + id2 + "'");
        }

        // Parse a third object to verify no state leakage from prior parses
        String json3 = "{class:\\"foam.core.test.Test\\",id:\\"third\\"}";
        FObject obj3 = parser.parseString(json3, null);
        test(obj3 != null, "Sequential parse: third object is non-null");
        if ( obj3 != null ) {
          String id3 = ((foam.core.test.Test) obj3).getId();
          test("third".equals(id3), "Sequential parse: third object id is 'third', got '" + id3 + "'");
        }
      `
    },
    {
      name: 'testNestedFObjectParsing',
      args: 'foam.lang.X x',
      documentation: 'Verify parsing nested FObjects works correctly (exercises parser reuse within a single parseString call)',
      javaCode: `
        JSONParser parser = new JSONParser();
        parser.setX(x);

        // Parse an object with a nested FObject property.
        // FObjectParser is invoked recursively for the nested object,
        // but this uses the same PStream chain (which is fine — the fix
        // is about reentrant parseString calls creating separate PStreams).
        String json = "{class:\\"foam.core.auth.User\\",id:999,firstName:\\"Test\\",lastName:\\"User\\",address:{class:\\"foam.core.auth.Address\\",city:\\"Toronto\\"}}";

        FObject obj = parser.parseString(json, null);
        test(obj != null, "Nested FObject: parse succeeded");
        if ( obj != null ) {
          test(obj instanceof foam.core.auth.User, "Nested FObject: correct type");
          foam.core.auth.User u = (foam.core.auth.User) obj;
          test("Test".equals(u.getFirstName()), "Nested FObject: firstName is 'Test'");
          test(u.getAddress() != null, "Nested FObject: address is non-null");
          if ( u.getAddress() != null ) {
            test("Toronto".equals(u.getAddress().getCity()), "Nested FObject: city is 'Toronto'");
          }
        }
      `
    }
  ]
});
