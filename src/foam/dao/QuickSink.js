/**
 * @license
 * Copyright 2016 Google Inc. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.dao',
  name: 'QuickSink',
  extends: 'foam.dao.AbstractSink',

  documentation: `
    A Sink which has each of the Sink methods configured as a Property.
    Can be used to implement only part of the Sink interface.
    Predates AbstractSink and AnonymousSink and could be removed.
  `,

  axioms: [
    {
      class: 'foam.box.Remote',
      clientClass: 'foam.dao.ClientSink'
    }
  ],

  properties: [
    {
      class: 'Function',
      name: 'putFn'
    },
    {
      class: 'Function',
      name: 'removeFn'
    },
    {
      class: 'Function',
      name: 'eofFn'
    },
    {
      class: 'Function',
      name: 'resetFn'
    }
  ],

  methods: [
    function put()    { this.putFn?.apply(this, arguments); },
    function remove() { this.removeFn?.apply(this, arguments); },
    function eof()    { this.eofFn?.apply(this, arguments); },
    function reset()  { this.resetFn?.apply(this, arguments); }
  ]
});
