/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.parse.lsp',
  name: 'FoamClassGrammar',
  extends: 'foam.parse.Grammar',

  documentation: 'Grammar that parses foam.CLASS/ENUM/INTERFACE definitions with dynamic suggestions.',

  requires: [
    'foam.parse.lsp.FoamIndex'
  ],

  properties: [
    {
      class: 'FObjectProperty',
      of: 'foam.parse.lsp.FoamIndex',
      name: 'index',
      factory: function() { return this.FoamIndex.create(); }
    },
    {
      name: 'classRefParser_',
      documentation: 'Cached alt() parser of all class ID suggestions.'
    },
    {
      name: 'propTypeParser_',
      documentation: 'Cached alt() parser of all property type suggestions.'
    },
    {
      name: 'symbols',
      factory: function() {
        var self = this;
        this.buildDynamicParsers_();
        var P = foam.parse.Parsers.create();
        var grammar = this.buildGrammar_(P);
        return foam.parse.Grammar.SYMBOLS.adapt.call(this, null, grammar);
      }
    }
  ],

  methods: [
    function buildDynamicParsers_() {
      var self = this;
      var P = foam.parse.Parsers.create();

      // Property types — all subclasses of foam.lang.Property
      var propTypes = this.index.getPropertyTypes();
      var propTypeParsers = propTypes.map(function(t) {
        return P.sug(P.literalIC(t.name), foam.parse.Suggestion.create({
          text: t.name,
          category: 'property',
          hint: t.doc || t.id
        }));
      });
      this.propTypeParser_ = propTypeParsers.length > 0 ?
        P.alt.apply(P, propTypeParsers) : P.literalIC('String');

      // Class references — all known class IDs
      var ids = this.index.getAllClassIds();
      var classRefParsers = ids.map(function(id) {
        var cls = self.index.getClass(id);
        var doc = cls && cls.model_ ? ( cls.model_.documentation || '' ) : '';
        return P.sug(P.literal(id), foam.parse.Suggestion.create({
          text: id,
          category: 'class',
          hint: doc.substring(0, 80)
        }));
      });
      this.classRefParser_ = classRefParsers.length > 0 ?
        P.alt.apply(P, classRefParsers) : P.literal('foam.lang.FObject');
    },

    function buildGrammar_(P) {
      var self = this;

      var ws = P.repeat0(P.alt(P.literal(' '), P.literal('\t'), P.literal('\n'), P.literal('\r')));

      var sqString = P.seq1(1, P.literal("'"), P.str(P.repeat(P.alt(P.literal("\\'"), P.notChars("'")), null, 0)), P.literal("'"));
      var dqString = P.seq1(1, P.literal('"'), P.str(P.repeat(P.alt(P.literal('\\"'), P.notChars('"')), null, 0)), P.literal('"'));
      var stringLiteral = P.alt(sqString, dqString);

      var digit = P.range('0', '9');
      var number = P.str(P.repeat(digit, null, 1));
      var booleanLiteral = P.alt(P.literal('true'), P.literal('false'));

      function key(name) {
        return P.sug(P.literal(name), foam.parse.Suggestion.create({ text: name + ': ', category: 'key' }));
      }

      var comma = P.seq0(ws, P.literal(','), ws);

      var anyValue = P.alt(
        stringLiteral,
        number,
        booleanLiteral,
        P.sym('array'),
        P.sym('object'),
        P.sym('functionBody')
      );

      // Match foam.CLASS/ENUM/INTERFACE — used by until() to find the start
      var foamCall = P.alt(P.literal('foam.CLASS'), P.literal('foam.ENUM'), P.literal('foam.INTERFACE'), P.literal('foam.RELATIONSHIP'));

      return {
        // Skip everything before foam.CLASS/ENUM/INTERFACE, then parse the class body
        // until() CONSUMES the match, so we use seq with the call keyword + rest
        START: P.seq(P.str(P.until(foamCall)), ws, P.literal('('), ws, P.sym('classBody'), ws, P.optional(P.literal(')'))),

        foamClass:     P.seq(ws, P.literal('foam.CLASS'), ws, P.literal('('), ws, P.sym('classBody'), ws, P.optional(P.literal(')')), ws),
        foamEnum:      P.seq(ws, P.literal('foam.ENUM'), ws, P.literal('('), ws, P.sym('classBody'), ws, P.optional(P.literal(')')), ws),
        foamInterface: P.seq(ws, P.literal('foam.INTERFACE'), ws, P.literal('('), ws, P.sym('classBody'), ws, P.optional(P.literal(')')), ws),

        classBody: P.seq(P.literal('{'), ws, P.optional(P.sym('classEntries')), ws, P.optional(P.literal('}'))),

        classEntries: P.repeat(P.sym('classEntry'), P.seq0(ws, P.literal(','), ws)),

        classEntry: P.alt(
          P.sym('packageEntry'),
          P.sym('nameEntry'),
          P.sym('extendsEntry'),
          P.sym('implementsEntry'),
          P.sym('requiresEntry'),
          P.sym('propertiesEntry'),
          P.sym('methodsEntry'),
          P.sym('actionsEntry'),
          P.sym('importsEntry'),
          P.sym('exportsEntry'),
          P.sym('documentationEntry'),
          P.sym('abstractEntry'),
          P.sym('flagsEntry'),
          P.sym('topLevelKey'),
          P.sym('genericEntry')
        ),

        packageEntry: P.seq(key('package'), ws, P.literal(':'), ws, stringLiteral),
        nameEntry: P.seq(key('name'), ws, P.literal(':'), ws, stringLiteral),
        extendsEntry: P.seq(key('extends'), ws, P.literal(':'), ws, P.literal("'"), P.sym('classRef'), P.optional(P.literal("'"))),

        implementsEntry: P.seq(key('implements'), ws, P.literal(':'), ws, P.literal('['), ws,
          P.optional(P.repeat(P.seq(ws, P.literal("'"), P.sym('classRef'), P.optional(P.literal("'")), ws), comma)),
          ws, P.optional(P.literal(']'))),

        requiresEntry: P.seq(key('requires'), ws, P.literal(':'), ws, P.literal('['), ws,
          P.optional(P.repeat(P.seq(ws, P.literal("'"), P.sym('classRef'), P.optional(P.literal("'")), ws), comma)),
          ws, P.optional(P.literal(']'))),

        propertiesEntry: P.seq(key('properties'), ws, P.literal(':'), ws, P.literal('['), ws,
          P.optional(P.repeat(P.sym('propertyDef'), comma)),
          ws, P.optional(P.literal(']'))),

        methodsEntry: P.seq(key('methods'), ws, P.literal(':'), ws, P.literal('['), ws,
          P.optional(P.repeat(P.sym('methodDef'), comma)),
          ws, P.optional(P.literal(']'))),

        actionsEntry:       P.seq(key('actions'), ws, P.literal(':'), ws, P.sym('array')),
        importsEntry:       P.seq(key('imports'), ws, P.literal(':'), ws, P.sym('array')),
        exportsEntry:       P.seq(key('exports'), ws, P.literal(':'), ws, P.sym('array')),
        documentationEntry: P.seq(key('documentation'), ws, P.literal(':'), ws, stringLiteral),
        abstractEntry:      P.seq(key('abstract'), ws, P.literal(':'), ws, booleanLiteral),
        flagsEntry:         P.seq(key('flags'), ws, P.literal(':'), ws, P.sym('array')),

        topLevelKey: P.alt(
          key('package'), key('name'), key('extends'), key('requires'),
          key('imports'), key('exports'), key('properties'), key('methods'),
          key('actions'), key('documentation'), key('abstract'),
          key('implements'), key('javaImports'), key('axioms'),
          key('css'), key('messages'), key('topics'), key('listeners'),
          key('constants'), key('sections')
        ),

        classRef: P.alt(
          self.classRefParser_,
          P.str(P.repeat(P.alt(P.range('a', 'z'), P.range('A', 'Z'), P.range('0', '9'), P.chars('._')), null, 1))
        ),

        propertyDef: P.alt(
          stringLiteral,
          P.sym('propertyObject')
        ),

        propertyObject: P.seq(P.literal('{'), ws, P.optional(P.sym('propEntries')), ws, P.optional(P.literal('}'))),

        propEntries: P.repeat(P.sym('propEntry'), comma),

        propEntry: P.alt(
          P.seq(P.sug(P.literal('class'), foam.parse.Suggestion.create({ text: 'class', category: 'key' })), ws, P.literal(':'), ws, P.literal("'"), P.sym('propType'), P.optional(P.literal("'"))),
          P.seq(P.sug(P.literal('name'), foam.parse.Suggestion.create({ text: 'name', category: 'key' })), ws, P.literal(':'), ws, stringLiteral),
          P.seq(P.sug(P.literal('of'), foam.parse.Suggestion.create({ text: 'of', category: 'key' })), ws, P.literal(':'), ws, P.literal("'"), P.sym('classRef'), P.optional(P.literal("'"))),
          P.seq(P.sug(P.literal('value'), foam.parse.Suggestion.create({ text: 'value', category: 'key' })), ws, P.literal(':'), ws, anyValue),
          P.seq(P.sug(P.literal('documentation'), foam.parse.Suggestion.create({ text: 'documentation', category: 'key' })), ws, P.literal(':'), ws, stringLiteral),
          P.seq(P.sug(P.literal('hidden'), foam.parse.Suggestion.create({ text: 'hidden', category: 'key' })), ws, P.literal(':'), ws, booleanLiteral),
          P.seq(P.sug(P.literal('transient'), foam.parse.Suggestion.create({ text: 'transient', category: 'key' })), ws, P.literal(':'), ws, booleanLiteral),
          P.sym('genericEntry')
        ),

        propType: P.alt(
          self.propTypeParser_,
          P.str(P.repeat(P.alt(P.range('a', 'z'), P.range('A', 'Z'), P.range('0', '9'), P.chars('._')), null, 1))
        ),

        methodDef: P.alt(
          P.sym('functionBody'),
          P.sym('object')
        ),

        genericEntry: P.seq(
          P.str(P.repeat(P.alt(P.range('a', 'z'), P.range('A', 'Z'), P.range('0', '9'), P.chars('_')), null, 1)),
          ws, P.literal(':'), ws, anyValue
        ),

        array: P.seq(P.literal('['), ws, P.optional(P.repeat(P.seq(ws, anyValue, ws), comma)), ws, P.optional(P.literal(']'))),

        object: P.seq(P.literal('{'), ws, P.optional(P.repeat(P.seq(ws, P.sym('genericEntry'), ws), comma)), ws, P.optional(P.literal('}'))),

        functionBody: P.seq(
          P.optional(P.literal('async')), ws,
          P.literal('function'), ws,
          P.optional(P.str(P.repeat(P.alt(P.range('a', 'z'), P.range('A', 'Z'), P.range('0', '9'), P.chars('_')), null, 1))),
          ws, P.sym('balancedParens'), ws, P.sym('balancedBraces')
        ),

        balancedParens: P.seq(P.literal('('), P.str(P.repeat(P.alt(
          P.sym('balancedParens'),
          stringLiteral,
          P.notChars('()')
        ), null, 0)), P.literal(')')),

        balancedBraces: P.seq(P.literal('{'), P.str(P.repeat(P.alt(
          P.sym('balancedBraces'),
          stringLiteral,
          P.notChars('{}')
        ), null, 0)), P.literal('}'))
      };
    }
  ]
});
