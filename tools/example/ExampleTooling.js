/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.POM({
  name: 'example',
  envs: {
    EXAMPLE_RELEASE_DEFAULT: ['Example version default','3']
  },

  options: {
    example: [ 'e', 'example', 'EXAMPLE', 'Enable example.', false, () => { EXAMPLE = true; } ],
    exampleRelease: [ '', 'example-release', 'EXAMPLE_RELEASE', 'Set example release', '', () => EXAMPLE_RELEASE = args ]
  },

  tasks: {
    example: ['Run example', [], function example() {
      console.log(`[Example] enabled ${EXAMPLE}, release ${EXAMPLE_RELEASE || EXAMPLE_RELEASE_DEFAULT}`); } ],
    examplePOMs: ['Show POM structure.', [], function examplePOMs() {
      this.pmake.bind(this, `-makers=Verbose -flags=${this.flag('web,java')} -pom=${POMS} -builddir=${BUILD_DIR}`)();
    }],
    clean: ['Clean', [], function clean() {
      console.log('[Example] clean');
    }],
    cleanAll: ['CleanAll', [], function cleanAll() {
      console.log('[Example] cleanAll');
    }]
  }
});
