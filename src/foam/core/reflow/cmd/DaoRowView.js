/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */


foam.CLASS({
    package: 'foam.core.reflow.cmd',
    name: 'DAORowView',
    extends: 'foam.u2.View',
  
    requires: [
      'foam.u2.tag.Button',
    ],
    css: `
      ^name-btn {
        color: $black!important;
      }
    `,
  
    properties: [
      'shortName',
      'description',
      'ofId',
      'uploadAvailable'
    ],
  
    methods: [
      function render() {
        this.start('tr').
          start('td').attr('align', 'left').
            start(this.Button, { buttonStyle: 'SECONDARY', themeIcon: 'plus', size: 'SMALL' }).add('add').on('click', this.addFn).end().
          end().
          start('td').attr('align', 'left').
            show(this.uploadAvailable).
            start(this.Button, { buttonStyle: 'SECONDARY', themeIcon: 'upload', size: 'SMALL' }).add('upload').on('click', this.uplFn).end().
          end().
          start('th').attr('align', 'left').
            start(this.Button, { buttonStyle: 'LINK', size: 'SMALL'}).addClass(this.myClass('name-btn')).add(this.shortName).on('click', this.daoFn).end().
          end().
          start('td').attr('align', 'left').
            start(this.Button).add(this.ofId).on('click', this.desFn).end().
          end().
          start('td').attr('align', 'left').
            style({
              textWrapMode: 'nowrap',
              overflow: 'hidden',
              paddingRight: '8px',
            }).add(this.description).
          end().
        end();
      },
    ],
    
    listeners: [
      {
        name: 'addFn',
        code: function() {
          this.data.eval_('add ' + this.shortName);
        }
      },
      {
        name: 'uplFn',
        code: function() {
          this.data.eval_('upload ' + this.shortName);
        }
      },
      {
        name: 'daoFn',
        code: function() {
          this.data.eval_('dao ' + this.shortName);
        }
      },
      {
        name: 'desFn',
        code: function() {
          this.data.eval_('describe(' + this.ofId + ')');
        }
      }
    ]
  
});