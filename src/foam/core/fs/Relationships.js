// dir - file/sub-dir
foam.RELATIONSHIP({
  cardinality: '1:*',
  sourceModel: 'foam.core.fs.FSFile',
  forwardName: 'files',
  targetModel: 'foam.core.fs.FSFile',
  inverseName: 'dir',
  sourceProperty: {
    hidden: true
  },
  targetProperty: {
    class: 'String',
    visibility: 'RO',
    view: {
      class: 'foam.u2.view.ReferenceView',
      placeholder: '--'
    }
  }
});