/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
    package: 'foam.core.fs',
    name: 'FSFileContentDAO',
    extends: 'foam.dao.ProxyDAO',
    flags: ['java'],
  
    javaImports: [
      'foam.core.logger.Loggers',
      'foam.dao.DAO',
      'java.io.File',
      'java.io.IOException',
      'java.nio.file.Files',
      'java.nio.file.Path',
      'java.nio.file.Paths'
    ],
  
    methods: [
      {
        name: 'find_',
        javaCode: `
          var ret = getDelegate().find(id);
          if ( ret != null ) return ret;

          FSFile file = (FSFile) ((DAO) x.get("FSFileDAO")).find((String) id);
          if ( file.getIsDirectory() ) {
            Loggers.logger(x, this).error("Error getting content: ", (String) file.getFullPath(), "file is a directory");
            return null;
          }


          FSFileContent fsContent = new FSFileContent.Builder(x).setFileName((String) id).build();
          Path path = Paths.get(file.getFullPath());

          try {
            String content = Files.readString(path);
            fsContent.setContent(content);
          } catch (IOException e) {
            Loggers.logger(x, this).error("Failed reading file: ", (String) file.getFullPath(), e);
            fsContent.setContent("Error: could not read file");
          }
          fsContent = (FSFileContent) getDelegate().put_(x, fsContent);

          return fsContent;
        `
      },
      {
        name: 'select_',
        javaCode: `
          throw new UnsupportedOperationException();
        `
      },
      {
        name: 'put_',
        javaCode: `
          throw new UnsupportedOperationException();
        `
      },
      {
        name: 'remove_',
        javaCode: `
          throw new UnsupportedOperationException();
        `
      },
      {
        name: 'removeAll_',
        javaCode: `
          throw new UnsupportedOperationException();
        `
      },
      {
        name: 'cmd_',
        javaCode: `
          throw new UnsupportedOperationException();
        `
      }
    ]
  });