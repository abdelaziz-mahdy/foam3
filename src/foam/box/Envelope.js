foam.CLASS({
  package: 'foam.box',
  name: 'Envelope',
  properties: [
    {
      name: 'replyBox',
      value: null
    },
    {
      class: 'Object',
      name: 'contents'
    },
    {
      class: 'Map',
      name: 'headers'
    }
  ],
  methods: [
    {
      name: 'toMessage',
      code: function() {
        var attributes = foam.Object.shallowClone(this.headers);
        attributes.replyBox = this.replyBox;
        
        return foam.box.Message.create({
          attributes,
          object: this.contents
        });
      }
    }
  ]
});
