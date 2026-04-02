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
    }
  ],

  methods: [
    function init() {
      this.SUPER();
      this.buildDynamicParsers_();
    },

    function buildDynamicParsers_() {
      /** Build class ref and property type parsers from FOAM registry. */
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
    }
  ],

  grammar: function(alt, anyChar, chars, eof, join, literal, literalIC, not, notChars,
                    optional, range, repeat, repeat0, seq, seq0, seq1, str, sug, sym, until) {

    var self = this;

    // Whitespace
    var ws = repeat0(alt(' ', '\t', '\n', '\r'));

    // String literal (single or double quoted)
    var sqString = seq1(1, "'", str(repeat(alt(literal("\\'"), notChars("'")), null, 0)), "'");
    var dqString = seq1(1, '"', str(repeat(alt(literal('\\"'), notChars('"')), null, 0)), '"');
    var stringLiteral = alt(sqString, dqString);

    // Number literal
    var digit = range('0', '9');
    var number = str(repeat(digit, null, 1));

    // Boolean literal
    var booleanLiteral = alt(literal('true'), literal('false'));

    // Top-level keys with suggestions
    function key(name) {
      return sug(literal(name), { text: name + ': ', category: 'key' });
    }

    // Comma separator with optional whitespace
    var comma = seq0(ws, ',', ws);

    // Any value (for keys we don't parse deeply)
    // Matches: strings, numbers, booleans, arrays [...], objects {...}, function(){...}
    var anyValue = alt(
      stringLiteral,
      number,
      booleanLiteral,
      sym('array'),
      sym('object'),
      sym('functionBody')
    );

    return {
      START: alt(sym('foamClass'), sym('foamEnum'), sym('foamInterface')),

      foamClass:     seq(ws, literal('foam.CLASS'), ws, '(', ws, sym('classBody'), ws, optional(')'), ws),
      foamEnum:      seq(ws, literal('foam.ENUM'), ws, '(', ws, sym('classBody'), ws, optional(')'), ws),
      foamInterface: seq(ws, literal('foam.INTERFACE'), ws, '(', ws, sym('classBody'), ws, optional(')'), ws),

      classBody: seq('{', ws, optional(sym('classEntries')), ws, optional('}')),

      classEntries: repeat(sym('classEntry'), seq0(ws, ',', ws)),

      classEntry: alt(
        sym('packageEntry'),
        sym('nameEntry'),
        sym('extendsEntry'),
        sym('implementsEntry'),
        sym('requiresEntry'),
        sym('propertiesEntry'),
        sym('methodsEntry'),
        sym('actionsEntry'),
        sym('importsEntry'),
        sym('exportsEntry'),
        sym('documentationEntry'),
        sym('abstractEntry'),
        sym('flagsEntry'),
        sym('topLevelKey'),  // catch-all for other keys
        sym('genericEntry')  // absolute catch-all
      ),

      // Specific entries with suggestions
      packageEntry: seq(key('package'), ws, ':', ws, stringLiteral),

      nameEntry: seq(key('name'), ws, ':', ws, stringLiteral),

      extendsEntry: seq(key('extends'), ws, ':', ws, "'", sym('classRef'), optional("'")),

      implementsEntry: seq(key('implements'), ws, ':', ws, '[', ws,
        optional(repeat(seq(ws, "'", sym('classRef'), optional("'"), ws), comma)),
        ws, optional(']')),

      requiresEntry: seq(key('requires'), ws, ':', ws, '[', ws,
        optional(repeat(seq(ws, "'", sym('classRef'), optional("'"), ws), comma)),
        ws, optional(']')),

      propertiesEntry: seq(key('properties'), ws, ':', ws, '[', ws,
        optional(repeat(sym('propertyDef'), comma)),
        ws, optional(']')),

      methodsEntry: seq(key('methods'), ws, ':', ws, '[', ws,
        optional(repeat(sym('methodDef'), comma)),
        ws, optional(']')),

      actionsEntry: seq(key('actions'), ws, ':', ws, sym('array')),

      importsEntry: seq(key('imports'), ws, ':', ws, sym('array')),

      exportsEntry: seq(key('exports'), ws, ':', ws, sym('array')),

      documentationEntry: seq(key('documentation'), ws, ':', ws, stringLiteral),

      abstractEntry: seq(key('abstract'), ws, ':', ws, booleanLiteral),

      flagsEntry: seq(key('flags'), ws, ':', ws, sym('array')),

      // Top-level key suggestions for known keys
      topLevelKey: alt(
        key('package'), key('name'), key('extends'), key('requires'),
        key('imports'), key('exports'), key('properties'), key('methods'),
        key('actions'), key('documentation'), key('abstract'),
        key('implements'), key('javaImports'), key('axioms'),
        key('css'), key('messages'), key('topics'), key('listeners'),
        key('constants'), key('sections')
      ),

      // Class reference — dynamic from FOAM registry
      classRef: sym('classRefDynamic'),
      classRefDynamic: alt(
        // Dynamic parser built from registry (set in init)
        function(ps, grammar) { return self.classRefParser_.parse(ps, grammar); },
        // Fallback: accept any dotted identifier
        str(repeat(alt(range('a', 'z'), range('A', 'Z'), range('0', '9'), chars('._')), null, 1))
      ),

      // Property definition
      propertyDef: alt(
        stringLiteral,  // shorthand: 'propertyName'
        sym('propertyObject')
      ),

      propertyObject: seq('{', ws, optional(sym('propEntries')), ws, optional('}')),

      propEntries: repeat(sym('propEntry'), comma),

      propEntry: alt(
        seq(sug(literal('class'), { text: 'class', category: 'key' }), ws, ':', ws, "'", sym('propType'), optional("'")),
        seq(sug(literal('name'), { text: 'name', category: 'key' }), ws, ':', ws, stringLiteral),
        seq(sug(literal('of'), { text: 'of', category: 'key' }), ws, ':', ws, "'", sym('classRef'), optional("'")),
        seq(sug(literal('view'), { text: 'view', category: 'key' }), ws, ':', ws, anyValue),
        seq(sug(literal('documentation'), { text: 'documentation', category: 'key' }), ws, ':', ws, stringLiteral),
        seq(sug(literal('value'), { text: 'value', category: 'key' }), ws, ':', ws, anyValue),
        seq(sug(literal('factory'), { text: 'factory', category: 'key' }), ws, ':', ws, sym('functionBody')),
        seq(sug(literal('expression'), { text: 'expression', category: 'key' }), ws, ':', ws, sym('functionBody')),
        seq(sug(literal('preSet'), { text: 'preSet', category: 'key' }), ws, ':', ws, sym('functionBody')),
        seq(sug(literal('postSet'), { text: 'postSet', category: 'key' }), ws, ':', ws, sym('functionBody')),
        seq(sug(literal('javaCode'), { text: 'javaCode', category: 'key' }), ws, ':', ws, stringLiteral),
        seq(sug(literal('javaPreSet'), { text: 'javaPreSet', category: 'key' }), ws, ':', ws, stringLiteral),
        seq(sug(literal('javaPostSet'), { text: 'javaPostSet', category: 'key' }), ws, ':', ws, stringLiteral),
        seq(sug(literal('javaFactory'), { text: 'javaFactory', category: 'key' }), ws, ':', ws, stringLiteral),
        seq(sug(literal('javaGetter'), { text: 'javaGetter', category: 'key' }), ws, ':', ws, stringLiteral),
        seq(sug(literal('visibility'), { text: 'visibility', category: 'key' }), ws, ':', ws, anyValue),
        seq(sug(literal('section'), { text: 'section', category: 'key' }), ws, ':', ws, stringLiteral),
        seq(sug(literal('hidden'), { text: 'hidden', category: 'key' }), ws, ':', ws, booleanLiteral),
        seq(sug(literal('transient'), { text: 'transient', category: 'key' }), ws, ':', ws, booleanLiteral),
        seq(sug(literal('aliases'), { text: 'aliases', category: 'key' }), ws, ':', ws, sym('array')),
        sym('genericEntry') // catch-all for unlisted property keys
      ),

      // Property type — dynamic from FOAM registry
      propType: alt(
        function(ps, grammar) { return self.propTypeParser_.parse(ps, grammar); },
        // Fallback: accept any identifier
        str(repeat(alt(range('a', 'z'), range('A', 'Z'), range('0', '9'), chars('._')), null, 1))
      ),

      // Method definition
      methodDef: alt(
        sym('functionBody'),  // function myMethod() { ... }
        sym('object')         // { name: 'x', code: function() { ... } }
      ),

      // Generic entry: identifier : value (catch-all)
      genericEntry: seq(
        str(repeat(alt(range('a', 'z'), range('A', 'Z'), range('0', '9'), chars('_')), null, 1)),
        ws, ':', ws, anyValue
      ),

      // Structural parsers
      array: seq('[', ws, optional(repeat(seq(ws, anyValue, ws), comma)), ws, optional(']')),

      object: seq('{', ws, optional(repeat(seq(ws, sym('genericEntry'), ws), comma)), ws, optional('}')),

      functionBody: seq(
        optional(literal('async')), ws,
        literal('function'), ws,
        optional(str(repeat(alt(range('a', 'z'), range('A', 'Z'), range('0', '9'), chars('_')), null, 1))),
        ws, sym('balancedParens'), ws, sym('balancedBraces')
      ),

      // Balanced delimiters (skip contents, just match pairs)
      balancedParens: seq('(', str(repeat(alt(
        sym('balancedParens'),
        stringLiteral,
        notChars('()')
      ), null, 0)), ')'),

      balancedBraces: seq('{', str(repeat(alt(
        sym('balancedBraces'),
        stringLiteral,
        notChars('{}')
      ), null, 0)), '}')
    };
  }
});
