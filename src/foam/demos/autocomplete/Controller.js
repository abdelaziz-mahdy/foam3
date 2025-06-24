
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
      name: 'previousSuggestions'
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
//        suggestions = {...suggestions, ...self.previousSuggestions};
        var ss          = keys.sort().filter(k => k.toLowerCase().startsWith(error.toLowerCase()));
                        if ( ! ss.length )        ss          = keys.sort().filter(k => containsIC(k, error));
        if ( ss.length == 0 ) {
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
  name: 'AutoSuggestTextField',
  extends: 'foam.u2.View',

  requires: [
    'foam.u2.TextField',
    'foam.parse.QueryParser',
    'foam.demos.autocomplete.AutoCompleter'
  ],

  properties: [
    {
      class: 'String',
      name: 'placeholder',
      value: 'Type to search...'
    },
    {
      name: 'autoCompleter',
      factory: function() { 
        return this.AutoCompleter.create({query$: this.data$}); 
      }
    },
    {
      name: 'parser',
      factory: function() {
        return this.QueryParser.create({of: foam.core.auth.User});
      }
    },
    {
      name: 'suggestions',
      expression: function(data) {
        if (!data) return [];
        
        console.log(`****** parsing: "${data}"`);
        this.autoCompleter.reset();
        var ps = this.parser.parseString(data + ' ', undefined, this.autoCompleter.apply);
        
        var suggestions = Object.keys(this.autoCompleter.suggestions);
        var error = data.substring(this.autoCompleter.maxPos);
        
        return suggestions.filter(function(s) {
          return s.toLowerCase().startsWith(error.toLowerCase());
        }).slice(0, 10);
      }
    },
    {
      name: 'textField',
      factory: function() {
        return this.TextField.create({
          placeholder$: this.placeholder$,
          data$: this.data$,
          onKey: true
        });
      }
    },
    {
      class: 'Boolean',
      name: 'showSuggestions',
      value: false
    }
  ],

  methods: [
    function render() {
      var self = this;
      
      this.addClass('auto-suggest-text-field').
        add(this.textField).
        add(this.dynamic(function(suggestions, showSuggestions) {
          if (!showSuggestions || !suggestions.length) return;
          
          this.start().forEach(suggestions, function(suggestion) {
            this.start().
              add(suggestion).
              on('click', function() { 
                self.selectSuggestion(suggestion); 
              }).
            end();
          }).end();
        }));

      this.textField.on('focus', function() {
        if (self.data) {
          self.showSuggestions = true;
        }
      });

      this.textField.on('blur', function() {
        setTimeout(function() {
          self.showSuggestions = false;
        }, 150);
      });

      this.textField.on('input', function() {
        self.showSuggestions = true;
      });
    },

    function selectSuggestion(suggestion) {
      var currentQuery = this.data || '';
      var newQuery = currentQuery.substring(0, this.autoCompleter.maxPos) + suggestion;
      this.data = newQuery;
      this.showSuggestions = false;
      this.textField.el().focus();
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
    'foam.demos.autocomplete.AutoSuggestTextField'
  ],

  properties: [
    {
      name: 'autoCompleter',
      factory: function() { return this.AutoCompleter.create({query$: this.query$}); }
    },
    {
      class: 'String',
      name: 'query',
      onKey: true
    },
    {
      name: 'parser',
      factory: function() {
        return this.QueryParser.create({of: foam.core.auth.User});
//        return this.QueryParser.create({of: foam.util.Timer});
      }
    },
    {
      name: 'predicate',
      expression: function(query) {
        console.log(`****** parsing: "${query}"`);
        this.autoCompleter.reset();
        var ps = this.parser.parseString(query + ' ', undefined, this.autoCompleter.apply);
        console.log('autocomplete: ', this.autoCompleter.toString());
//        this.suggestion = this.autoCompleter.suggestForInput(this.query);
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
      name: 'suggestion'
    },
    {
      class: 'String',
      name: 'searchQuery',
      onKey: true
    }
  ],

  methods: [
    function render() {
      this.
        add('User Query Parser Demo').
        br().
        add(this.AutoSuggestTextField.create({
          data$: this.searchQuery$,
          placeholder: 'Type a user query (e.g., email:, firstName:, lastName:)...'
        })).
        br().
        add('Current Query: ').add(this.searchQuery$).
        br().br().
        add('Original Implementation:').
        br().
        add(this.QUERY.__).
        call(function() { this.autoCompleter.addToE(this); }).
        br().
        add('Result: ').add(this.RESULT.__);
    }
  ]

});
