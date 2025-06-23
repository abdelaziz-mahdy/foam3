/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.u2',
  name: 'AutoCompleteSearchField',
  extends: 'foam.u2.TextField',

  documentation: 'A search field with autocomplete functionality that can work with any DAO model',

  mixins: [
    'foam.u2.TextInputCSS'
  ],

  requires: [
    'foam.parse.QueryParser',
    'foam.u2.QueryAutoCompleter'
  ],

  properties: [
    {
      name: 'type',
      value: 'search'
    },
    {
      name: 'placeholder',
      value: 'Search...'
    },
    {
      name: 'ariaLabel',
      value: 'Search'
    },
    {
      name: 'autocomplete',
      value: 'on'
    },
    {
      name: 'name',
      value: 'filterSearch'
    },
    {
      name: 'of',
      documentation: 'The model class to provide autocomplete for',
      preSet : function(_, of) {
        this.parser= undefined;
        console.log('of', of);
        if ( ! of ) return null;
        if ( typeof of === 'string' ) {
          // Assume it's a class name and resolve it.
          return foam.lookup(of);
        }
        this.parser = this.QueryParser.create({of: of});
        return of;
      }
    },
    {
      name: 'autoCompleter',
      factory: function() { 
        return this.QueryAutoCompleter.create({query$: this.data$}); 
      }
    },
    {
      name: 'parser',
      expression: function(of) {
        return of ? this.QueryParser.create({of: of}) : null;
      }
    },
    {
      name: 'predicate',
      expression: function(data, parser) {
        if ( ! data || ! parser ) return null;
        this.autoCompleter.reset();
        try {
          return parser.parseString(data + ' ', undefined, this.autoCompleter.apply);
        } catch(e) {
          return null;
        }
      }
    }
  ],

  methods: [
    function render() {
      this.SUPER();
      this.addClass('foam-u2-SearchField', 'foam-u2-SearchField-icon');
      this.setAttribute('autocomplete', this.autocomplete);
      this.setAttribute('aria-label', this.ariaLabel);
      if ( this.name ) this.setAttribute('name', this.name);
      
      this.autoCompleter.addToE(this);
      return this;
    }
  ]
});