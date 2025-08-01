/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.dashboard.view',
  name: 'Metric',
  extends: 'foam.u2.Element',

  requires: [
    'foam.u2.util.NumberShortener'
  ],

  imports: [
    'data',
    'visualizationWidth',
    'visualizationHeight'
  ],

  css: `
    ^ {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 20px;
      background: $backgroundSecondary;
      border-radius: 8px;
    }

    ^icon {
      font-size: 24px;
      margin-bottom: 12px;
      color: $textBrand;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: $backgroundBrandTertiary;
    }

    ^title {
      font-size: 14px;
      font-weight: 500;
      color: $textTertiary;
      margin-bottom: 8px;
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    ^value {
      font-size: 32px;
      font-weight: 700;
      color: $textDefault;
      line-height: 1;
      text-align: center;
    }

    ^operation {
      font-size: 12px;
      color: $textSecondary;
      margin-top: 4px;
      text-transform: capitalize;
    }
  `,

  properties: [
    [ 'nodeName', 'div' ],
    {
      name: 'icon',
      factory: function() {
        return this.getOperationIcon(this.data?.operation);
      }
    }
  ],

  methods: [
    function start() {
      this.SUPER();
      
      this.
        style({
          width: this.visualizationWidth$.map(function(w) { return w + 'px'; }),
          height: this.visualizationHeight$.map(function(h) { return h + 'px'; })
        }).
        addClass('h100', this.myClass()).
        start('div').
          addClass(this.myClass('icon')).
          add(this.slot(function(data$operation) {
            return this.getOperationIcon(data$operation);
          })).
        end().
        start('div').
          addClass(this.myClass('title')).
          add(this.slot(function(data$label) {
            return data$label || this.data.sink.label || 'Metric';
          })).
        end().
        start('div').
          addClass(this.myClass('value')).
          add(this.slot(function(data$data) {
            return this.NumberShortener.shortenNumber(data$data?.value);
          })).
        end();

      return this;
    },

    function getOperationIcon(operation) {
      switch(operation) {
        case 'COUNT': return '📊';
        case 'SUM':   return '➕';
        case 'MIN':   return '⬇️';
        case 'MAX':   return '⬆️';
        case 'AVG':   return '📈';
        default:      return '📊';
      }
    },


  ]
});