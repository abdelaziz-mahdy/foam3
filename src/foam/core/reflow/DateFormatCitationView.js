
foam.CLASS({
  package: 'foam.core.reflow',
  name: 'DateFormatCitationView',
  extends: 'foam.u2.CitationView',

  documentation: 'Shows date format label with supported formats below it (dropdown state)',

  css: `
    ^ {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    ^label {
      font-weight: 500;
      color: $textDefault;
      font-size: 14px;
    }

    ^documentation {
      font-size: 12px;
      color: $textSecondary;
      line-height: 1.4;
    }
  `,

  methods: [
    function render() {
      if ( ! this.data ) return this;

      return this
        .addClass(this.myClass())
        .start('div')
          .addClass(this.myClass('label'))
          .add(this.data.label)
        .end()
        .start('div')
          .addClass(this.myClass('documentation'))
          .add(this.data.documentation)
        .end();
    }
  ]
});

foam.CLASS({
  package: 'foam.core.reflow',
  name: 'DateFormatSelectionView',
  extends: 'foam.u2.CitationView',

  documentation: 'Shows only the label when selected (collapsed state)',

  css: `
    ^ {
      padding: 8px 12px;
      color: $textDefault;
      font-size: 14px;
    }
  `,

  methods: [
    function render() {
      if ( ! this.data ) return this;

      return this
        .addClass(this.myClass())
        .add(this.data.label);
    }
  ]
});
