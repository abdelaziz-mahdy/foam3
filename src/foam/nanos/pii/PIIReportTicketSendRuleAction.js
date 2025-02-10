/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.nanos.pii',
  name: 'PIIReportTicketSendRuleAction',

  documentation: 'Generate email from report and send.',

  implements: [
    'foam.nanos.ruler.RuleAction'
  ],

  javaImports: [
    'foam.core.ContextAgent',
    'foam.core.FObject',
    'foam.core.X',
    'foam.dao.DAO',
    'foam.log.LogLevel',
    'static foam.mlang.MLang.*',
    'foam.nanos.auth.User',
    'foam.nanos.crunch.UserCapabilityJunction',
    'foam.nanos.er.EventRecord',
    'foam.nanos.fs.File',
    'foam.nanos.logger.Logger',
    'foam.nanos.logger.Loggers',
    'foam.nanos.logger.PrefixLogger',
    'foam.nanos.notification.email.EmailMessage',
    'foam.nanos.notification.email.EmailPropertyService',
    'foam.nanos.session.Session',
    'foam.nanos.ticket.Ticket',
    'foam.util.SafetyUtil',
    'java.util.Arrays',
    'java.util.HashMap',
    'java.util.List',
    'java.util.Map'
  ],

  properties: [
    {
      class: 'String',
      name: 'emailTemplate',
      value: 'foam-nanos-pii-report-EmailTemplate',
    }
  ],

  methods: [
    {
      name: 'applyAction',
      javaCode: `
        agency.submit(x, new ContextAgent() {
          @Override
          public void execute(X x) {
            try {
              PIIReportTicket ticket = (PIIReportTicket) obj;
              User user = (User) ticket.findCreatedFor(x);
              EmailMessage msg = new EmailMessage();
              msg.setUser(user.getId());
              msg.setTo(new String[] { user.getEmail() });
              Map<String, Object> args = new HashMap();
              args.put("template", getEmailTemplate());
              args.put("user", user);
              args.put("ticket", ticket);
              msg.setTemplateArguments(args);
              msg = (EmailMessage) ((EmailPropertyService) ruler.getX().get("emailPropertyService")).apply(x, user.getGroup(), msg, args);
              EmailMessage.TEMPLATE_ARGUMENTS.clear(msg);

              String[] attachments = (String[]) Arrays.stream(ticket.getDocuments()).map(obj -> obj instanceof File ? ((File)obj).getId() : (String)((Map)obj).get("id")).toArray(String[]::new);
              msg.setAttachments(attachments);
              ((DAO) ruler.getX().get("emailMessageDAO")).put(msg);
            } catch (Throwable t) {
              ((DAO) ruler.getX().get("eventRecordDAO")).put(new EventRecord(x, "PIIReportTicketSendRuleAction", null, t.getMessage(), LogLevel.ERROR, t));
            }
          }
        }, "PIIReportTicketSendRuleAction");
      `
    }
  ]
})
