foam.CLASS({
  package: 'foam.u2.filter.properties',
  name: 'StringArrayFilterView',
  extends: 'foam.u2.Controller',

  documentation: 'Filter view for String[] properties. Builds OR(IN("x", prop), IN("y", prop), ...).',

  implements: [ 'foam.mlang.Expressions' ],

  requires: [
    'foam.u2.CheckBox',
    'foam.u2.TextField'
  ],

  css: `
    ^ { position: relative; }

    ^container-search {
      padding: 16px;
      border-bottom: solid 1px #cbcfd4;
    }

    ^ .foam-u2-TextField {
      width: 100%;
      height: 36px;
      border-radius: 3px;
      border: solid 1px #cbcfd4;
      background-color: $backgroundDefault;
      background-image: url(images/ic-search.svg);
      background-repeat: no-repeat;
      background-position: 8px;
      padding: 0 21px 0 38px;
    }

    ^label-limit { margin-top: 4px; }

    ^container-filter {
      max-height: 320px;
      overflow: auto;
      padding-bottom: 24px;
    }

    ^label-section {
      padding: 0 16px;
      color: #1e1f21;
    }

    ^label-loading {
      padding: 0 16px;
      color: #1e1f21;
      text-align: center;
    }

    ^container-option {
      display: flex;
      align-items: center;
      padding: 4px 16px;
    }

    ^container-option:hover {
      cursor: pointer;
      background-color: #f5f7fa;
    }

    /* Style both base and MD checkbox variants */
    ^container-option .foam-u2-CheckBox-label,
    ^container-option .foam-u2-md-CheckBox-label {
      position: relative;
      margin-top: 0;
    }
    ^container-option .foam-u2-CheckBox,
    ^container-option .foam-u2-md-CheckBox {
      border-color: #9ba1a6;
    }
    ^container-option .foam-u2-CheckBox:checked,
    ^container-option .foam-u2-md-CheckBox:checked {
      background-color: #406dea;
      border-color: #406dea;
    }
  `,

  messages: [
    { name: 'LABEL_PLACEHOLDER',    message: 'Search' },
    { name: 'LABEL_LIMIT_REACHED',  message: 'Please refine your search to view more options' },
    { name: 'LABEL_LOADING',        message: '- LOADING OPTIONS -' },
    { name: 'LABEL_NO_OPTIONS',     message: '- NO OPTIONS AVAILABLE -' },
    { name: 'LABEL_SELECTED',       message: 'SELECTED OPTIONS' },
    { name: 'LABEL_FILTERED',       message: 'OPTIONS' },
    { name: 'LABEL_EMPTY',          message: '- Not Defined -' }
  ],

  properties: [
    { name: 'property', required: true }, // PropertyInfo for String[]
    { class: 'foam.dao.DAOProperty', name: 'dao', required: true },
    {
      class: 'String',
      name: 'search',
      documentation: 'Client-side starts-with filter for option names.',
      postSet: function() { this.daoUpdate(); }
    },
    { class: 'Int',     name: 'maxOptionCount', value: 20 },
    { class: 'Boolean', name: 'isOverLimit' },
    { class: 'Boolean', name: 'isLoading', value: true },

    // Map<string, number> of option -> count
    { name: 'countByContents', factory: function() { return {}; } },

    // User selections (strings)
    { name: 'selectedOptions', factory: function() { return []; } },

    // Available options = keys in countByContents minus already selected
    {
      name: 'availableOptions',
      expression: function(countByContents, selectedOptions) {
        var all = Object.keys(countByContents || {});
        if ( ! all.length ) return [];
        var set = new Set(selectedOptions || []);
        return all.filter(o => ! set.has(o)).sort();
      }
    },

    // Predicate from selections: OR(IN('a', prop), IN('b', prop), ...)
    {
      name: 'predicate',
      expression: function(selectedOptions, property) {
        if ( ! selectedOptions || selectedOptions.length === 0 ) return this.TRUE;
        if ( selectedOptions.length === 1 ) return this.IN(selectedOptions[0], property);
        var self = this;
        return selectedOptions.reduce(function(acc, v) {
          var term = self.IN(v, property);
          return acc ? self.OR(acc, term) : term;
        }, null);
      }
    },

    // Header label
    { name: 'name', expression: function(property) { return property && property.name; } }
  ],

  methods: [
    function render() {
      var self = this;

      // Refresh list when DAO or selections change
      this.onDetach(this.dao$.sub(this.daoUpdate));
      this.onDetach(this.selectedOptions$.sub(this.daoUpdate));

      // Initial load
      this.daoUpdate();

      this
        .addClass(this.myClass())

        // Search Bar
        .start().addClass(this.myClass('container-search'))
          .start(this.TextField, {
            data$: this.search$,
            placeholder: this.LABEL_PLACEHOLDER,
            onKey: true
          }).end()
          .start()
            .addClass('p-semibold', this.myClass('label-limit'))
            .show(this.isOverLimit$)
            .add(this.LABEL_LIMIT_REACHED)
          .end()
        .end()

        // Filter body
        .start().addClass(this.myClass('container-filter'))

          // Selected options
          .add(this.slot(function(selectedOptions) {
            var e = this.E();
            if ( ! selectedOptions || ! selectedOptions.length ) return e;
            e.start('p').addClass('p-label', self.myClass('label-section'))
              .add(self.LABEL_SELECTED)
            .end();

            selectedOptions.forEach(function(option, index) {
              e.start().addClass(self.myClass('container-option'))
                .on('click', () => self.deselectOption(index))
                .start(self.CheckBox, {
                  data: true,
                  showLabel: true,
                  label: self.getLabelWithCount(option)
                }).end()
              .end();
            });
            return e;
          }))

          // Available options
          .add(this.slot(function(availableOptions, isLoading) {
            var e = this.E();
            if ( isLoading ) {
              return e.start('p').addClass('p-label', self.myClass('label-loading'))
                .add(self.LABEL_LOADING).end();
            }
            if ( ! availableOptions || ! availableOptions.length ) {
              return e.start('p').addClass('p-label', self.myClass('label-loading'))
                .add(self.LABEL_NO_OPTIONS).end();
            }

            e.start('p').addClass(self.myClass('label-section'))
              .add(self.LABEL_FILTERED)
            .end();

            availableOptions.forEach(function(option, index) {
              e.start().addClass(self.myClass('container-option'))
                .on('click', () => self.selectOption(index))
                .start(self.CheckBox, {
                  data: false,
                  showLabel: true,
                  label: self.getLabelWithCount(option)
                }).end()
              .end();
            });
            return e;
          }))
        .end();
    },

    function getLabelWithCount(option) {
      var c = (this.countByContents && this.countByContents[option]) || 0;
      return c > 1 ? '[' + c + '] ' + (option || this.LABEL_EMPTY) : (option || this.LABEL_EMPTY);
    },

    function clear() { this.selectedOptions = []; }
  ],

  listeners: [
    {
      name: 'daoUpdate',
      isMerged: true,
      delay: 200,
      code: function() {
        var self = this;
        this.isLoading = true;
        this.isOverLimit = false;

        var q = (this.search || '').trim().toLowerCase();

        // Count from dao.where(this.predicate)
        this.dao.where(this.predicate).select().then(function(sink) {
          var arr = sink && (sink.array || sink.a || sink) || [];
          var map = Object.create(null);

          for ( var i = 0; i < arr.length; i++ ) {
            var vals = self.property.f(arr[i]) || [];
            if ( ! Array.isArray(vals) ) continue;

            for ( var j = 0; j < vals.length; j++ ) {
              var raw = vals[j];
              if ( raw == null ) continue;

              var key = ('' + raw).trim();
              if ( q && key.toLowerCase().indexOf(q) !== 0 ) continue; // starts-with

              map[key] = (map[key] || 0) + 1;
            }
          }

          self.countByContents = map;
          self.isOverLimit = Object.keys(map).length > self.maxOptionCount;
        }).finally(() => { self.isLoading = false; });
      }
    },
    {
      name: 'selectOption',
      code: function(index) {
        var opt = this.availableOptions[index];
        if ( ! opt ) return;
        this.selectedOptions = this.selectedOptions.concat([ opt ]);
      }
    },
    {
      name: 'deselectOption',
      code: function(index) {
        this.selectedOptions = this.selectedOptions.filter((_, i) => i !== index);
      }
    }
  ]
});