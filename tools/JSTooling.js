/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.POM({
  name: 'js',

  envs: {
    FOAM_REVISION:     ['FOAM Revision ?'],
    FOAM_BIN_VERSION:  ['foam-bin version string, with our without timestamp']
  },

  options: {
    noTimestampFoamBin: [ 'g', 'no-timestamp-foam-bin', 'TIMESTAMP_FOAM_BIN', 'Set to false to not timestamp foam-bin javascript file to retain breakpoints during development cycle.', true, () => TIMESTAMP_FOAM_BIN = false ],
    withoutStages: [ 'w', 'without-stages', 'STAGE_JS', 'Without stages. Only generate a single foam-bin file.', true, () => STAGE_JS = false ]
  },

  tasks: {
    cleanFOAM: ['Remove foam-bin files.', [], function cleanFOAM() {
      this.execSync(`rm -f ${BUILD_DIR}/js/foam-bin-* >/dev/null 2>&1`);
    }],

    genFoamBinVersion: ['Generate version string for the foam-bin, with our without a timestamp', [], function genFoamBinVersion() {
      FOAM_BIN_VERSION = TIMESTAMP_FOAM_BIN ? `${VERSION}-${TIMESTAMP}` : `${VERSION}`;
    }],

    genJS: ["Build 'foam-bin.js'.", ['cleanFOAM', 'genFoamBinVersion'], function genJS() {
      let version = FOAM_BIN_VERSION;
      let flags = this.flag();
      let outdir = BUILD_DIR+'/js';
      if ( STAGE_JS ) {
        this.pmake.bind(this, `-flags=${flags} -makers=JS -version=${version} -pom=${POMS} -builddir=${BUILD_DIR} -outdir=${outdir} -stage=0`)();
        this.pmake.bind(this, `-flags=${flags} -makers=JS -version=${version} -pom=${POMS} -builddir=${BUILD_DIR} -outdir=${outdir} -stage=1`)();
        this.pmake.bind(this, `-flags=${flags} -makers=JS -version=${version} -pom=${POMS} -builddir=${BUILD_DIR} -outdir=${outdir} -stage=2`)();
      } else {
        this.pmake.bind(this, `-flags=${flags} -makers=JS -version=${version} -pom=${POMS} -builddir=${BUILD_DIR} -outdir=${outdir}`)();
      }
    }]
  }
});
