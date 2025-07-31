/**
 * @license
 * Copyright 2019 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.dashboard.view',
  name: 'Metric',
  extends: 'foam.u2.Element',

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
      background: $backgroundDefault;
      border-radius: 8px;
    }

    ^icon {
      font-size: 24px;
      margin-bottom: 12px;
      color: $primary400;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: $primary50;
    }

    ^title {
      font-size: 14px;
      font-weight: 500;
      color: $grey600;
      margin-bottom: 8px;
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    ^value {
      font-size: 32px;
      font-weight: 700;
      color: $grey900;
      line-height: 1;
      text-align: center;
    }

    ^operation {
      font-size: 12px;
      color: $grey500;
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
          add(this.slot(function(data$label, data$operation) {
            return data$label || this.getOperationLabel(data$operation);
          })).
        end().
        start('div').
          addClass(this.myClass('value')).
          add(this.slot(function(data$data) {
            return this.formatValue(data$data?.value);
          })).
        end().
        start('div').
          addClass(this.myClass('operation')).
          add(this.slot(function(data$operation) {
            return this.getOperationLabel(data$operation);
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

    function getOperationLabel(operation) {
      switch(operation) {
        case 'COUNT': return 'Count';
        case 'SUM':   return 'Sum';
        case 'MIN':   return 'Minimum';
        case 'MAX':   return 'Maximum';
        case 'AVG':   return 'Average';
        default:      return 'Metric';
      }
    },

    function formatValue(value) {
      if ( value === null || value === undefined ) return '—';
      
      if ( typeof value === 'number' ) {
        // Format large numbers with appropriate suffixes
        if ( value >= 1000000 ) {
          return (value / 1000000).toFixed(1) + 'M';
        } else if ( value >= 1000 ) {
          return (value / 1000).toFixed(1) + 'K';
        } else if ( value % 1 !== 0 ) {
          return value.toFixed(2);
        }
      }
      
      return value.toString();
    }
  ]
});