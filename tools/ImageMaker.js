/**
 * @license
 * Copyright 2023 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

exports.description = 'Copies image/* files into /build/images';

exports.init = function() {
  X.imagedir = X.builddir + '/images';
  this.ensureDir(X.imagedir);
};


exports.visitDir = function(pom, f, fn) {
  if ( f.name === 'images' || ( f.name === 'favicon' && ! fn.includes('images') ) ) {
    this.log(`[Image Maker] Copying ${fn} to ${X.imagedir}`);
    this.copyDir(fn, X.imagedir);
  }
};
