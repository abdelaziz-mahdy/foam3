/**
 * @license
 * Copyright 2022 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.core.reflow',
  name: 'ReflowDashboardView',
  extends: 'foam.dashboard.view.Dashboard',
  // extends: 'foam.u2.View',
  mixins: ['foam.u2.layout.ContainerWidth'],

  imports: [
    'displayWidth?',
    'document'
  ],

  css: `
    ^ {
      height: 100%;
      width: 100%;
      display: flex;
      flex-direction: column;
    }
    ^main {
      height: fit-content;
      min-height: 600px;
      padding: 24px 32px;
      max-width: 160rem;
      margin: auto;
    }
    ^widget-container {
      width: 100%;
      display: grid;
      flex-grow: 1;
    }
  `,

  listeners: [
    {
      name: 'updateCols',
      on: 'data.propertyChange.widgets',
      isFramed: true,
      code: function() {
        let cw = this.containerWidth;
        let currentWidgetSet = 0;
        let widgetSetCount = 0;
        let cm = {};
        
        if ( this.data && this.data.widgets ) {
          this.data.widgets.forEach(widget => {
            let col = widget[`${cw}Column`] ?? widget['column'];
            if ( foam.String.isInstance(col) ) {
              let colSpan = col.indexOf('fr') != -1 ? col.split('fr')[0] : 1;
              if ( widgetSetCount == 0 )
                currentWidgetSet++;
              widgetSetCount += Number(colSpan);
              cm[widget.id] = `span calc(${colSpan}*var(--dashboard-max-col)/var(--split-row-${currentWidgetSet}))`;
            } else {
              if ( widgetSetCount > 0 )
                this.document.documentElement.style.setProperty(`--split-row-${currentWidgetSet}`, widgetSetCount); 
              widgetSetCount = 0;
              cm[widget.id] = 'span ' + col;
            }
          });
        }
        
        this.containerMap = cm;
      }
    }
  ],

  properties: [
    {name:'data'},
    {
      class: 'Map',
      name: 'containerMap'
    }
  ],

  methods: [
    function render() {
      this.SUPER();
      this.initContainer();
      var self = this;
      
      // Ensure data exists before accessing properties
      if ( ! this.data ) {
        console.warn('ReflowDashboardView: No data provided');
        return;
      }
      
      var widgetContainer = this.start()
        .addClass(this.myClass('widget-container'))
        .style({
          'grid-template-columns': this.data$.dot('width'),
          'grid-template-rows': this.data$.dot('height'), 
          'grid-gap': this.data$.dot('gap')
        });

      this
        .addClass(this.myClass())
        .enableClass(this.myClass('main'), this.data$.dot('main'))
        .start()
          .show(this.data$.dot('dashboardTitle').map(t => !!t))
          .enableClass('h500', this.data$.dot('dashboardTitle'))
          .style({ height: '2em' })
          .add(this.data$.dot('dashboardTitle'))
        .end()
        .tag(widgetContainer);

      // Process widgets using dynamic pattern - following original dashboard approach
      this.dynamic(function(containerMap,data$widgets) {
        var widgets = self.data.widgets;
        console.log('ReflowDashboardView: Rendering widgets dynamically', widgets);
        
        // Clear existing widgets
        widgetContainer.removeAllChildren();
        
        if ( ! widgets || widgets.length === 0 ) {
          console.warn('ReflowDashboardView: No widgets to render');
          return;
        }
        
        console.log('ReflowDashboardView: Rendering widgets number', widgets.length);
        widgets.forEach(function(widget) {
          if ( widget.view ) {
            console.log('ReflowDashboardView: Rendering widget', widget.id);
            
            // Get view spec like the menu system uses
            var viewSpec = widget.getViewSpec ? widget.getViewSpec() : {class: widget.view};
            var viewConfig = widget.getViewConfig();
            
            
            // Handle dashboard models differently
            if ( widget.view && widget.view.startsWith('foam.dashboard.model.') ) {
              // Use the existing dashboard context since we extend foam.dashboard.view.Dashboard
              var ctx = widgetContainer.__subContext__;
              
              // For dashboard models, render the visualization with card
              if ( viewConfig.visualization ) {
                var card = viewConfig.visualization.toE(null, ctx);
                
                // Create the view in the card's context, which provides the necessary imports
                var view = foam.u2.ViewSpec.createView(viewSpec, {
                  data: viewConfig.visualization
                }, card, card.__subContext__);
                
                card.add(view);
                
                widgetContainer.start('div').style({
                  'grid-column': self.containerMap$.map(v => {
                    return v[widget.id] || 'span 12';
                  })
                }).add(card).end();
              } else {
                // Non-visualization dashboard views
                widgetContainer.start('div').style({
                  'grid-column': self.containerMap$.map(v => {
                    return v[widget.id] || 'span 12';
                  })
                }).add(foam.u2.ViewSpec.createView(viewSpec, viewConfig, ctx, ctx)).end();
              }
            } else {
              // Base views (org.chartjs.*, foam.u2.*, etc)
              widgetContainer.tag({
                class: viewSpec.class,
                ...viewConfig
              }, {
                'grid-column': self.containerMap$.map(v => {
                  return v[widget.id] || 'span 12';
                })
              });
            }
          }
        });
      });

      this.updateCols();
      this.containerWidth$.sub(this.updateCols);
    }
  ]

});