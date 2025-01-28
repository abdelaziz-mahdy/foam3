/**
 * @license
 * Copyright 2016 Google Inc. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.dao',
  name: 'AnonymousSink',
  implements: [ 'foam.dao.Sink' ],

  documentation: `
    A Sink which takes a JS map/object which might only contain some of the Sink methods.
    Can be used to implement only part of the Sink interface.
    Predates AbstractSink and is similar to AnonymousSink.
  `,

  axioms: [
    {
      class: 'foam.box.Remote',
      clientClass: 'foam.dao.ClientSink'
    }
  ],

  properties: [ 'sink' ],

  methods: [
    function put(obj, sub) { this.sink?.put?.(obj, sub); },
    function remove(obj, sub) { this.sink.remove?.(obj, sub); },
    function eof() { this.sink?.eof?.(); },
    function reset(sub) { this.sink?.reset?.(sub); },
    function toE() { return ''; }
  ]
});
