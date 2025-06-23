
foam.CLASS({
  package: 'foam.demos.autocomplete',
  name: 'SearchField',
  extends: 'foam.u2.TextField',

  mixins: [
    'foam.u2.TextInputCSS'
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
    }
  ],

  methods: [
    function render() {
      this.SUPER();
      this.addClass('foam-u2-SearchField', 'foam-u2-SearchField-icon');
      this.setAttribute('autocomplete', this.autocomplete);
      this.setAttribute('aria-label', this.ariaLabel);
      if ( this.name ) this.setAttribute('name', this.name);
      return this;
    }
  ]
});

foam.CLASS({
  package: 'foam.demos.autocomplete',
  name: 'AutoCompleteSearchField',
  extends: 'foam.demos.autocomplete.SearchField',

  documentation: 'A reusable search field with autocomplete functionality for table views',

  requires: [
    'foam.parse.QueryParser',
    'foam.demos.autocomplete.AutoCompleter'
  ],

  properties: [
    {
      class: 'Class',
      name: 'of',
      documentation: 'The model class to provide autocomplete for'
    },
    {
      name: 'autoCompleter',
      factory: function() { 
        return this.AutoCompleter.create({query$: this.data$}); 
      }
    },
    {
      name: 'parser',
      expression: function(of) {
        return of ? this.QueryParser.create({of: of}) : null;
      }
    }
  ],

  methods: [
    function render() {
      this.SUPER();
      if ( this.autoCompleter && this.parser ) {
        this.autoCompleter.addToE(this);
      }
      return this;
    }
  ]
});

foam.CLASS({
  package: 'foam.demos.autocomplete',
  name: 'AutoCompleter',

  properties: [
    {
      class: 'String',
      name: 'query'
    },
    {
      class: 'Int',
      name: 'maxPos'
    },
    {
      name: 'previousSuggestions',
      factory: function() { return {}; }
    },
    {
      name: 'suggestions',
      factory: function() { return {}; }
    },
    {
      name: 'apply',
      factory: function() {
        var auto = this;

        function maybeAdd(p, ss) {
          try {
            if ( p.suggest ) {
              var s = p.suggest();
              if ( s ) {
                var label = s.text;
                if ( ! ss[label] ) {
                  ss[label] = s;
                }
              }
            }
          } catch(x) {}
        }

        return function(p, obj) {
          if ( p == foam.parse.EOF.create() ) return;
          if ( this.pos > auto.query.length ) return;

          if ( this.pos > auto.maxPos ) {
            auto.previousSuggestions = auto.suggestions;
            auto.suggestions = {};
            auto.maxPos = this.pos;
          }

          if ( this.pos == auto.maxPos ) {
            maybeAdd(p, auto.suggestions);
          } else if ( this.pos == auto.maxPos-1 ) {
            maybeAdd(p, auto.previousSuggestions);
          }

          return p.parse(this, obj);
        }
      }
    }
  ],

  methods: [
    function reset() {
      this.maxPos              = 0;
      this.previousSuggestions = {};
      this.suggestions         = {};
    },
    function suggestForInput(str) {
      var error = str.substring(this.maxPos);
      return Object.keys(this.suggestions).filter(k => k.startsWith(error)).join(' | ');
    },
    function toString() {
      return Object.keys(this.suggestions).join(' | ');
    },
    function addToE(e) {
      function containsIC(str, sub) {
        return str.toLowerCase().indexOf(sub.toLowerCase()) != -1;
      }
      var self = this;
      e.add(this.dynamic(function(query) {
        var suggestions = self.suggestions;
        var keys        = Object.keys(suggestions);
        var error       = query.substring(self.maxPos);
        var ss          = keys.sort().filter(k => k.toLowerCase().startsWith(error.toLowerCase()));
                        if ( ! ss.length )        ss          = keys.sort().filter(k => containsIC(k, error));
        if ( ss.length == 0 && self.previousSuggestions ) {
          console.log('previous: ', self.previousSuggestions);
          keys = Object.keys(self.previousSuggestions);
          ss   = keys.sort().filter(k => query.toLowerCase().endsWith(k.toLowerCase()));
          console.log('filtered: ', ss);
          if ( ss.length == 1 ) {
            self.query = query.substring(0, query.length-ss[0].length) + ss[0];
            return;
          }
        }
        if ( ! ss.length ) return;
        if ( ss.length == 1 && self.maxPos + ss[0].length == query.length ) {
          self.query = self.query.substring(0, self.maxPos) + ss[0];
          return;
        }
        this.start().style({width: '400px', maxHeight: '500px', border: '1px solid gray', overflowY: 'auto'}).forEach(ss, function(s) {
          this.start('div').
            style({margin: '6px'}).
            add(s).
            on('click', function() { self.query = self.query.substring(0, self.maxPos) + s; }).
          end();
        });
      }));
    }
  ]
});


foam.CLASS({
  package: 'foam.demos.autocomplete',
  name: 'Controller',
  extends: 'foam.u2.Controller',

  requires: [ 
    'foam.parse.QueryParser', 
    'foam.demos.autocomplete.AutoCompleter',
    'foam.demos.autocomplete.SearchField',
    'foam.dao.EasyDAO'
  ],

  css: `
    ^ {
      padding: 20px;
      font-family: Arial, sans-serif;
    }
    ^ .dao-selector {
      margin-bottom: 20px;
    }
    ^ .search-container {
      margin-bottom: 20px;
    }
    ^ .results-container {
      margin-top: 20px;
      padding: 10px;
      background: #f5f5f5;
      border-radius: 4px;
    }
    ^ .suggestions-container {
      margin-top: 10px;
    }
    ^ label {
      display: inline-block;
      width: 120px;
      font-weight: bold;
      margin-right: 10px;
    }
  `,

  properties: [
    {
      class: 'String',
      name: 'selectedDAOType',
      value: 'foam.core.auth.User',
      view: {
        class: 'foam.u2.view.ChoiceView',
        choices: [
          [ 'foam.core.auth.User', 'User (foam.core.auth.User)' ],
          [ 'foam.demos.sevenguis.Person', 'Person (foam.demos.sevenguis.Person)' ],
          [ 'foam.demos.heroes.Hero', 'Hero (foam.demos.heroes.Hero)' ],
          [ 'foam.demos.olympics.Medal', 'Medal (foam.demos.olympics.Medal)' ]
        ]
      }
    },
    {
      name: 'sampleDAO',
      expression: function(selectedDAOType) {
        var daoClass = selectedDAOType;
        var modelClass = this.__context__.lookup(daoClass);
        
        var dao = this.EasyDAO.create({
          of: modelClass,
          daoType: 'MDAO'
        });

        if ( daoClass === 'foam.demos.sevenguis.Person' ) {
          dao.put(modelClass.create({name: 'John', surname: 'Doe'}));
          dao.put(modelClass.create({name: 'Jane', surname: 'Smith'}));
          dao.put(modelClass.create({name: 'Bob', surname: 'Johnson'}));
          dao.put(modelClass.create({name: 'Alice', surname: 'Brown'}));
        } else if ( daoClass === 'foam.demos.heroes.Hero' ) {
          dao.put(modelClass.create({name: 'Superman'}));
          dao.put(modelClass.create({name: 'Batman'}));
          dao.put(modelClass.create({name: 'Wonder Woman'}));
          dao.put(modelClass.create({name: 'Spider-Man'}));
        } else if ( daoClass === 'foam.demos.olympics.Medal' ) {
          dao.put(modelClass.create({color: 'Gold', sport: 'Swimming', country: 'USA'}));
          dao.put(modelClass.create({color: 'Silver', sport: 'Running', country: 'Kenya'}));
          dao.put(modelClass.create({color: 'Bronze', sport: 'Cycling', country: 'France'}));
        }
        
        return dao;
      }
    },
    {
      name: 'autoCompleter',
      factory: function() { return this.AutoCompleter.create({query$: this.query$}); }
    },
    {
      class: 'String',
      name: 'query',
      onKey: true,
      view: {
        class: 'foam.demos.autocomplete.SearchField',
        placeholder: 'Type to search...'
      }
    },
    {
      name: 'parser',
      expression: function(selectedDAOType) {
        var daoClass = selectedDAOType;
        var modelClass = this.__context__.lookup(daoClass);
        return this.QueryParser.create({of: modelClass});
      }
    },
    {
      name: 'predicate',
      expression: function(query, parser) {
        if ( ! query ) return null;
        console.log(`****** parsing: "${query}" for ${this.selectedDAOType.label}`);
        this.autoCompleter.reset();
        var ps = parser.parseString(query + ' ', undefined, this.autoCompleter.apply);
        console.log('autocomplete: ', this.autoCompleter.toString());
        return ps || null;
      }
    },
    {
      class: 'String',
      name: 'result',
      expression: function(predicate) {
        return predicate ? predicate.toString() : '';
      }
    },
    {
      class: 'String',
      name: 'suggestion',
      expression: function(query) {
        return this.autoCompleter.suggestForInput(query || '');
      }
    }
  ],

  methods: [
    function render() {
      this.addClass(this.myClass()).
        start('div').addClass('dao-selector').
          start('label').add('Select DAO Type:').end().
          add(this.SELECTED_D_A_O_TYPE).
        end().
        start('div').addClass('search-container').
          start('label').add('Search Query:').end().
          add(this.QUERY).
        end().
        start('div').addClass('suggestions-container').
        end().
        start('div').addClass('results-container').
          start('div').
            start('strong').add('Query Result: ').end().
            add(this.RESULT).
          end().
          start('div').
            start('strong').add('Suggestions: ').end().
            add(this.SUGGESTION).
          end().
        end();
      
      this.autoCompleter.addToE(this);
    }
  ]

});
