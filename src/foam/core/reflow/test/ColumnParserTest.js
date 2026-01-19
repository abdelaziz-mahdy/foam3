/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.core.reflow.test',
  name: 'ColumnParserTest',
  extends: 'foam.core.test.JSTest',

  requires: [
    'foam.core.reflow.ColumnParser'
  ],

  methods: [
    async function runTest(x) {
      // Create a test model with various property names, shortNames, and aliases
      foam.CLASS({
        package: 'foam.core.reflow.test',
        name: 'TestModel',
        properties: [
          { name: 'id' },
          { name: 'firstName', shortName: 'fn' },
          { name: 'lastName', aliases: ['surname', 'familyName'] },
          { name: 'elementAttribute' },
          { name: 'parentChildValue' },
          { name: 'level1Level2Level3Value' },
          { name: 'aBc' },
          { name: 'emailAddress', shortName: 'email', aliases: ['mail', 'e_mail'] },
          { name: 'PTest' },
          { name: 'camelCaseTest' }
        ]
      });

      var parser = this.ColumnParser.create({
        of: foam.core.reflow.test.TestModel
      });

      // Test exact match
      x.test(
        parser.parseString('firstName')?.name === 'firstName',
        'Exact match: firstName'
      );

      // Test case insensitive match
      x.test(
        parser.parseString('FIRSTNAME')?.name === 'firstName',
        'Case insensitive: FIRSTNAME -> firstName'
      );

      x.test(
        parser.parseString('FirstName')?.name === 'firstName',
        'Case insensitive: FirstName -> firstName'
      );

      // Test underscore format - single level
      x.test(
        parser.parseString('Element_attribute')?.name === 'elementAttribute',
        'Underscore single: Element_attribute -> elementAttribute'
      );

      x.test(
        parser.parseString('element_Attribute')?.name === 'elementAttribute',
        'Underscore single (mixed case): element_Attribute -> elementAttribute'
      );

      // Test underscore format - two levels
      x.test(
        parser.parseString('Parent_Child_value')?.name === 'parentChildValue',
        'Underscore two levels: Parent_Child_value -> parentChildValue'
      );

      x.test(
        parser.parseString('parent_child_value')?.name === 'parentChildValue',
        'Underscore two levels (lowercase): parent_child_value -> parentChildValue'
      );

      // Test underscore format - three levels
      x.test(
        parser.parseString('Level1_Level2_Level3_value')?.name === 'level1Level2Level3Value',
        'Underscore three levels: Level1_Level2_Level3_value -> level1Level2Level3Value'
      );

      // Test CONSTANT_CASE
      x.test(
        parser.parseString('FIRST_NAME')?.name === 'firstName',
        'CONSTANT_CASE: FIRST_NAME -> firstName'
      );

      x.test(
        parser.parseString('PARENT_CHILD_VALUE')?.name === 'parentChildValue',
        'CONSTANT_CASE: PARENT_CHILD_VALUE -> parentChildValue'
      );

      // Test short format
      x.test(
        parser.parseString('A_B_c')?.name === 'aBc',
        'Short format: A_B_c -> aBc'
      );

      // Test column list
      var list = parser.parseString('firstName, lastName, Element_attribute', 'columnList');
      x.test(
        list?.length === 3,
        'Column list parses multiple columns: got ' + (list?.length || 0) + ' columns'
      );
      x.test(
        list?.[0]?.name === 'firstName',
        'Column list first item: firstName'
      );
      x.test(
        list?.[1]?.name === 'lastName',
        'Column list second item: lastName'
      );
      x.test(
        list?.[2]?.name === 'elementAttribute',
        'Column list third item (underscore): elementAttribute'
      );

      // Test normalization method directly
      x.test(
        parser.normalizeToPropertyName('Element_attribute') === 'elementAttribute',
        'normalizeToPropertyName: Element_attribute -> elementAttribute'
      );
      x.test(
        parser.normalizeToPropertyName('A_B_C') === 'aBC',
        'normalizeToPropertyName: A_B_C -> aBC'
      );
      x.test(
        parser.normalizeToPropertyName('SimpleValue') === 'simpleValue',
        'normalizeToPropertyName (no underscore): SimpleValue -> simpleValue'
      );

      // Test that non-matching returns undefined
      x.test(
        parser.parseString('nonExistentProperty') === undefined,
        'Non-matching property returns undefined'
      );

      // Test shortName
      x.test(
        parser.parseString('fn')?.name === 'firstName',
        'ShortName exact: fn -> firstName'
      );
      x.test(
        parser.parseString('FN')?.name === 'firstName',
        'ShortName case insensitive: FN -> firstName'
      );
      x.test(
        parser.parseString('email')?.name === 'emailAddress',
        'ShortName exact: email -> emailAddress'
      );

      // Test aliases
      x.test(
        parser.parseString('surname')?.name === 'lastName',
        'Alias exact: surname -> lastName'
      );
      x.test(
        parser.parseString('SURNAME')?.name === 'lastName',
        'Alias case insensitive: SURNAME -> lastName'
      );
      x.test(
        parser.parseString('familyName')?.name === 'lastName',
        'Alias exact: familyName -> lastName'
      );
      x.test(
        parser.parseString('mail')?.name === 'emailAddress',
        'Alias exact: mail -> emailAddress'
      );

      // Test underscore normalization with aliases
      x.test(
        parser.parseString('e_mail')?.name === 'emailAddress',
        'Alias with underscore: e_mail -> emailAddress'
      );
      x.test(
        parser.parseString('E_MAIL')?.name === 'emailAddress',
        'Alias with underscore (uppercase): E_MAIL -> emailAddress'
      );
      x.test(
        parser.parseString('family_Name')?.name === 'lastName',
        'Alias underscore normalized: family_Name -> lastName (via familyName)'
      );

      // Test case sensitivity edge cases (property PTest)
      x.test(
        parser.parseString('PTest')?.name === 'PTest',
        'Exact match: PTest -> PTest'
      );
      x.test(
        parser.parseString('pTest')?.name === 'PTest',
        'Case insensitive: pTest -> PTest'
      );
      x.test(
        parser.parseString('ptest')?.name === 'PTest',
        'Case insensitive lowercase: ptest -> PTest'
      );
      x.test(
        parser.parseString('PTEST')?.name === 'PTest',
        'Case insensitive uppercase: PTEST -> PTest'
      );

      // Test case sensitivity with camelCase property
      x.test(
        parser.parseString('camelCaseTest')?.name === 'camelCaseTest',
        'Exact match: camelCaseTest'
      );
      x.test(
        parser.parseString('CamelCaseTest')?.name === 'camelCaseTest',
        'Case insensitive: CamelCaseTest -> camelCaseTest'
      );
      x.test(
        parser.parseString('CAMELCASETEST')?.name === 'camelCaseTest',
        'Case insensitive uppercase: CAMELCASETEST -> camelCaseTest'
      );
    }
  ]
});
