/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.nanos.pii',
  name: 'PIIReportRequestView',
  extends: 'foam.u2.View',

  documentation: 'End user view to request pii report',

  imports: [
    'subject',
    'ticketDAO'
  ],

  requires: [
    'foam.nanos.pii.PIIReportTicket'
  ],

  css: `
    ^ {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: start;
      gap: 1rem;
      padding: 2.4rem 3.2rem;
      width: clamp(400px, 100%, 700px);
      max-width: 90vw;
      text-align: center;
      margin: auto;
    }
  `,

  messages: [
    { name: 'TITLE', message: 'PII Report Request' },
    { name: 'MSG', message: 'A PII Report has been emailed to ${email}.', template: true }
  ],

  methods: [
    function render() {
      this.SUPER();

      let user = this.subject.user;
      this
        .addClass()
        .start().addClass('h400').add(this.TITLE).end()
        .start().addClass('p').add(this.MSG({ email: user.email })).end();

      this.createAndSend();
    },
    {
      name: 'createAndSend',
      code: function() {
        var self = this;
        let user = this.subject.user;
        var ticket = this.PIIReportTicket.create({
          createdFor: user.id,
          spid: user.spid
        });
        this.ticketDAO.put(ticket).then(function(t) {
          t.status = 'CLOSED';
          self.ticketDAO.put(t);
        });
      }
    }
  ]
});
