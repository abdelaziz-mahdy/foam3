/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.core.fs',
  name: 'FSFileDAO',
  extends: 'foam.dao.ProxyDAO',
  flags: ['java'],

  javaImports: [
    'foam.core.fs.AbstractStorage',
    'foam.dao.Sink',
    'foam.lang.X',
    'java.io.File'
  ],

  properties: [
    {
      class: 'String',
      name: 'root',
      value: "/Users/noodlemoodle/ptv3/src"
    },
    {
      class: 'Boolean',
      name: 'initialized',
    }
  ],

  methods: [
    {
      name: 'select_',
      javaCode: `
        if ( ! getInitialized() ) {
          File dir = new File(getRoot()); 
          listFiles(x, dir, sink);
          setInitialized(true);
          return sink;
        }
        return getDelegate().select_(x, sink, skip, limit, order, predicate);
      `
    },
    {
      name: 'listFiles',
      args: 'X x, File dir, Sink sink',
      javaCode: `
        File[] files = dir.listFiles();
        FSFile current;
        for (File file : files) {
          current = save(x, file, dir);
          sink.put(current, null);
          if (file.isDirectory()) {
            listFiles(x, file, sink);
          }
        }

      `
    },
    {
      name: 'save',
      args: 'X x, File file, File dir',
      javaType: 'FSFile',
      javaCode: `
        FSFile fsFile = new FSFile.Builder(x)
          .setId(file.getName())
          .setDir(dir.getName())
          .setFullPath(file.getAbsolutePath())
          .setIsDirectory(file.isDirectory())
          .build();
        return (FSFile) getDelegate().put_(x, fsFile);
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