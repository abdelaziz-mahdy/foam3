
foam.CLASS({
  package: 'foam.demos.autocomplete',
  name: 'Controller',
  extends: 'foam.u2.Controller',

  requires: [ 
    'foam.u2.AutoCompleteSearchField'
  ],

  css: `
    ^ {
      padding: 20px;
      font-family: Arial, sans-serif;
    }
    ^ .demo-section {
      margin-bottom: 30px;
      padding: 20px;
      border: 1px solid #ddd;
      border-radius: 8px;
    }
    ^ .demo-title {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 10px;
      color: #333;
    }
    ^ .demo-description {
      margin-bottom: 15px;
      color: #666;
    }
  `,

  properties: [
    {
      class: 'String',
      name: 'userQuery',
      view: {
        class: 'foam.u2.AutoCompleteSearchField',
        of: foam.core.auth.User,
        placeholder: 'Search users (e.g., "email:" for properties)...'
      }
    },
    {
      class: 'String',
      name: 'timerQuery',
      view: {
        class: 'foam.u2.AutoCompleteSearchField',
        of: foam.util.Timer,
        placeholder: 'Search timers (e.g., "name:" for properties)...'
      }
    }
  ],

  methods: [
    function render() {
      this.addClass(this.myClass()).
        start('h2').add('AutoComplete Search Field Demo').end().
        start('p').add('This demo shows the foam.u2.AutoCompleteSearchField component working with different model types. Type in the search fields below and see autocomplete suggestions based on the model properties.').end().
        
        start('div').addClass('demo-section').
          start('div').addClass('demo-title').add('User Search').end().
          start('div').addClass('demo-description').add('Search with foam.core.auth.User model properties').end().
          add(this.USER_QUERY).
        end().
        
        start('div').addClass('demo-section').
          start('div').addClass('demo-title').add('Timer Search').end().
          start('div').addClass('demo-description').add('Search with foam.util.Timer model properties').end().
          add(this.TIMER_QUERY).
        end();
    }
  ]

});
