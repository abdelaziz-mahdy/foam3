/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.core.fs',
  name: 'FSFile',

  properties: [
    {
      class: 'String',
      name: 'id',
      documentation: 'the name of the file or directory'
    },
    {
      class: 'Boolean',
      name: 'writable',
      value: false
    },
    {
      class: 'String',
      name: 'fullPath',
      documentation: 'absolute path'
    },
    {
      class: 'Reference',
      of: 'foam.core.fs.FSFileContent',
      name: 'content'
    },
    {
      class: 'Boolean',
      name: 'isDirectory'
    }
  ]
});
