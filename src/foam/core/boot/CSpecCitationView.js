/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
    package: 'foam.core.boot',
    name: 'CSpecCitationView',
    extends: 'foam.u2.CitationView',
  
    imports: [ 'outputLink', 'eval_' ],
  
    css: `
      ^ {
        height: fit-content;
        background-color: white;
        border-radius: 8px;
        box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.1);
        border: 1px solid #ebebeb;
        display: flex;
        flex-direction: column;
        padding: 1rem;
        margin: 1rem;
      }
      ^card {
        display: flex;
        flex-direction: row;
        width: 100%;
        justify-content: space-between;
      }
      ^left {
        width: 20%;
      }
      ^right {
        width: 80%;
        overflow-x: scroll;
      }
    `,
  
    properties: [
      {
        class: 'FObjectProperty',
        of: 'foam.core.boot.CSpec',
        name: 'data',
        documentation: ''
      }
    ],
  
    methods: [
      function render() {
        var cspec = this.__context__[this.data.name];
        if ( ! cspec || ! cspec.of ) {
          // non-dao services and server side daos
          this.addClass(this.myClass())
            .start().addClass(this.myClass('card'))
              .start('b').addClass(this.myClass('left')).add('cSpec not available: ').end()
              .start().addClass(this.myClass('right')).add(this.data.name).end()
            .end();
          return;
        }
  
        var of = cspec.of;
        var self = this;
  
        this
          .start()
          .addClass(this.myClass())
            .start().addClass(this.myClass('card'))
              .start('b').addClass(this.myClass('left')).add('cSpec').end()
              .start().addClass(this.myClass('right'))
                .call(function() { self.outputLink(self.data.name, () => self.eval_('dao("' + self.data.name + '")'), this); })
              .end()
            .end()
            .start().addClass(this.myClass('card'))
              .start('b').addClass(this.myClass('left')).add('add').end()
              .start().addClass(this.myClass('right'))
                .call(function() { self.outputLink('add', () => self.eval_('add("' + self.data.name + '")'), this); })
              .end()
            .end()
            .start().addClass(this.myClass('card'))
              .start('b').addClass(this.myClass('left')).add('of').end()
              .start().addClass(this.myClass('right'))
                .call(function() { self.outputLink(of.id, () => self.eval_('describe(' + of.id + ')'), this); })
              .end()
            .end()
            .start().addClass(this.myClass('card'))
              .start('b').addClass(this.myClass('left')).add('description').end()
              .start().addClass(this.myClass('right'))
                .add(this.data.description || this.data.name)
              .end()
            .end()
          .end();
      }
    ]
  });
  