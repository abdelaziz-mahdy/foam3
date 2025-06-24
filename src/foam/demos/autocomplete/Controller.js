
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
    'foam.parse.QueryParser',
    'foam.demos.autocomplete.AutoCompleter',
    'foam.u2.TextField'
  ],

  css: `
    ^ {
      position: relative;
    }
    ^suggestions {
      box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.06), 0px 4px 6px rgba(0, 0, 0, 0.1);
      background-color: white;
      border: 1px solid #ccc;
      border-radius: 4px;
      display: flex;
      flex-direction: column;
      height: auto;
      margin-top: 2px;
      overflow: auto;
      padding: 12px;
      gap: 8px;
      position: absolute;
      width: 100%;
      z-index: 100;
    }
    ^row {
      color: black;
      cursor: pointer;
      padding: 8px;
      border-radius: 4px;
    }
    ^row:hover {
      background-color: #f0f0f0;
    }
  `,

  properties: [
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
      class: 'String',
      name: 'placeholder'
    },
    {
      class: 'Boolean',
      name: 'inputFocused'
    },
    {
      class: 'Int',
      name: 'suggestionsLimit',
      value: 10
    },
    {
      name: 'suggestions',
      expression: function(data) {
        var query = data || '';
        
        this.autoCompleter.reset();
        
        this.parser.parseString(query + ' ', undefined, this.autoCompleter.apply);
        
        // Follow EXACT original implementation logic from addToE method
        function containsIC(str, sub) {
          return str.toLowerCase().indexOf(sub.toLowerCase()) != -1;
        }
        
        var suggestions = this.autoCompleter.suggestions;
        var keys = Object.keys(suggestions);
        var error = query.substring(this.autoCompleter.maxPos);
        
        // EXACT logic from original addToE method lines 86-110
        var ss = keys.sort().filter(k => k.toLowerCase().startsWith(error.toLowerCase()));
        if (!ss.length) ss = keys.sort().filter(k => containsIC(k, error));
        
        if (ss.length == 0) {
          var prevKeys = Object.keys(this.autoCompleter.previousSuggestions);
          ss = prevKeys.sort().filter(k => query.toLowerCase().endsWith(k.toLowerCase()));
          if (ss.length == 1) {
            this.data = query.substring(0, query.length - ss[0].length) + ss[0];
            return [];
          }
        }
        
        if (!ss.length) {
          return [];
        }
        
        if (ss.length == 1 && this.autoCompleter.maxPos + ss[0].length == query.length) {
          this.data = query.substring(0, this.autoCompleter.maxPos) + ss[0];
          return [];
        }
        
        return ss.slice(0, this.suggestionsLimit);
      }
    }
  ],

  methods: [
    function render() {
      var self = this;
      this.SUPER();

      // AutoCompleter query is now bound during creation via factory

      this
        .addClass()
        .start(this.TextField, {
          data$: this.data$,
          onKey: true,
          placeholder$: this.placeholder$,
          autocomplete: false
        })
          .on('focus', function() {
            self.inputFocused = true;
          })
          .on('blur', function() {
            // Delay blur to allow click events on suggestions
            setTimeout(function() {
              self.inputFocused = false;
            }, 200);
          })
        .end()
        .add(this.slot(this.populate));
    },

    function populate(suggestions, data, inputFocused) {
      var self = this;
      if (!data || !inputFocused) return this.E();
      
      return this.E().addClass(this.myClass('suggestions'))
        .start().add('Suggestions').end()
        .forEach(suggestions, function(suggestion) {
          this
            .start('div')
              .addClass(self.myClass('row'))
              .add(suggestion)
              .on('mousedown', function(e) {
                self.selectSuggestion(suggestion);
                e.preventDefault();
              })
            .end();
        });
    },

    function selectSuggestion(suggestion) {
      // Follow original logic exactly: line 107
      this.data = this.data.substring(0, this.autoCompleter.maxPos) + suggestion;
    }
  ],

  listeners: [
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
      onKey: true,
      view: {
        class: 'foam.demos.autocomplete.AutoSuggestTextField',
        placeholder: 'Type a user query (e.g., email:, firstName:, lastName:)...'
      }
    },
  ],

  methods: [
    function render() {
      this.
        add('AutoComplete Demo Comparison').
        br().br().
        
        add('1. Custom AutoSuggestTextField (with Query Parser):').
        br().
        add(this.SEARCH_QUERY.__).
        br().
        add('Query: ').add(this.searchQuery$).
        br().br().
        
        add('2. Original Implementation:').
        br().
        add(this.QUERY.__).
        call(function() { this.autoCompleter.addToE(this); }).
        br().
        add('Result: ').add(this.RESULT.__);
    }
  ]

});
