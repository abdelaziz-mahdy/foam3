/**
 * @license
 * Copyright 2016 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

foam.CLASS({
  package: 'foam.u2.tag',
  name: 'Image',
  extends: 'foam.u2.View',

  requires: [
    'foam.net.HTTPRequest',
    'foam.u2.HTMLView'
  ],

  css: `
    ^ .foam-u2-HTMLView {
      padding: 0;
    }
  `,

  constants: {
    CACHE: {}
  },

  properties: [
    {
      class: 'GlyphProperty',
      name: 'glyph'
    },
    {
      name: 'displayWidth',
      attribute: true
    },
    {
      name: 'displayHeight',
      attribute: true
    },
    ['alpha', 1.0],
    {
      class: 'String',
      name: 'role'
    },
    {
      class: 'Boolean',
      name: 'embedSVG'
    }
  ],

  methods: [
    function requestWithCache(data) {
      if ( ! this.CACHE[data] ) {
        this.CACHE[data] = new Promise(resolve => {
          this.HTTPRequest.create({method: 'GET', path: data, cache: true}).send().then(resp => {
            resp.resp.text().then(t => resolve(t));
          } );
        });
      }

      return this.CACHE[data];
    },

    function render() {
      var self = this;
      this
        .addClass(this.myClass())
        .add(this.dynamic(function(data, glyph, displayWidth, displayHeight, alpha) {
          if ( glyph ) {
            var indicator = glyph.clone(self).expandSVG();
            this.start(self.HTMLView, { data: indicator })
              .attrs({ role: self.role })
            .end();
            return;
          }

          if ( self.embedSVG && data?.endsWith('svg') ) {
            self.requestWithCache(data).then(data => {
              if ( ! self.U3 && self.state == self.OUTPUT ) return;

              this.start(self.HTMLView, { data: data })
                .attrs({ role: self.role })
              .end();
            });

            return;
          }

          if ( ! data ) return null;

          this.start('img')
            .attrs({ src: data, role: self.role })
            .style({
              height:  displayHeight,
              width:   displayWidth,
              opacity: alpha
            })
          .end();
        }));
    }
  ]
});


foam.SCRIPT({
  package: 'foam.u2.tag',
  name: 'ImageScript',
  requires: [
    'foam.u2.tag.Image',
    'foam.u2.U2ContextScript'
  ],
  flags: ['web'],
  code: function() {
    foam.__context__.registerElement(foam.u2.tag.Image);
  }
});
