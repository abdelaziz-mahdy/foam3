foam.CLASS({
  package: 'foam.u2.view',
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
      background-color: $backgroundDefault;
      border: 1px solid $borderDefault;
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
      color: $textDefault;
      cursor: pointer;
      padding: 8px;
      border-radius: 4px;
    }
    ^row:hover {
      background-color: $backgroundHover;
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
        return this.QueryParser.create({of: this.model});
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
      class: 'Class',
      name: 'model',
      documentation: 'The model class to use for query parsing and suggestions'
    },
    {
      name: 'predicate',
      expression: function(data) {
        var query = data || '';
        
        this.autoCompleter.reset();
        
        var ps = this.parser.parseString(query + ' ', undefined, this.autoCompleter.apply);
        
        return ps || null;
      }
    },
    {
      name: 'suggestions',
      expression: function(data) {
        var query = data || '';
        
        this.autoCompleter.reset();
        
        this.parser.parseString(query + ' ', undefined, this.autoCompleter.apply);
        
        function containsIC(str, sub) {
          return str.toLowerCase().indexOf(sub.toLowerCase()) != -1;
        }
        
        var suggestions = this.autoCompleter.suggestions;
        var keys = Object.keys(suggestions);
        var error = query.substring(this.autoCompleter.maxPos);
        
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
      this.data = this.data.substring(0, this.autoCompleter.maxPos) + suggestion;
    }
  ]
});