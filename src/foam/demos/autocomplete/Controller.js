
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
      name: 'suggestions',
      factory: function() { return {}; }
    },
    {
      name: 'apply',
      factory: function() {
        var auto = this;

        return function(p, obj) {
          if ( this.pos >= auto.maxPos ) {
            if ( this.pos > auto.maxPos ) {
              auto.suggestions = {};
              auto.maxPos = this.pos;
            }

            try {
              if ( p.suggest ) {
                var s = p.suggest();
                if ( s ) {
                  var label = s.label;
                  console.log(this.pos, label);
                  if ( ! auto.suggestions[label] ) {
                    auto.suggestions[label] = s;
                  }
                }
              }
            } catch(x) {}
          }

          return p.parse(this, obj);
        }
      }
    }
  ],

  methods: [
    function reset() {
      this.maxPos      = 0;
      this.suggestions = {};
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
      e.add(this.dynamic(function(query, suggestions) {
        var error = query.substring(self.maxPos);
        var ss    = Object.keys(suggestions).sort().filter(k => containsIC(k, error));

        this.start().style({width: '400px', maxHeight: '400px', border: '1px solid gray', overflowY: 'auto'}).forEach(ss, function(s) {
          this.start('div').
            style({margin: '5px'}).
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

  requires: [ 'foam.parse.QueryParser', 'foam.demos.autocomplete.AutoCompleter' ],

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
        this.suggestion = this.autoCompleter.suggestForInput(this.query);
        return ps || null;
      }
    },
    {
      class: 'String',
      name: 'result',
      expression: function(predicate) {
        console.log('predicate:', predicate);
        return predicate ? predicate.toString() : '';
      }
    },
    {
      class: 'String',
      name: 'suggestion'
    }
  ],

  methods: [
    function render() {
      this.add(this.QUERY.__).br();
      this.add(this.RESULT.__).br();
//      this.add(this.SUGGESTION.__);

      this.autoCompleter.addToE(this);
    }
  ]

});
