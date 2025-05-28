module.exports = {
  env: {
    browser: true,
    node: true,
    es6: true
  },
  
  extends: [
    'eslint:recommended'
  ],
  
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'script'
  },
  
  globals: {
    foam: 'readonly',
    globalThis: 'writable'
  },
  
  rules: {
    // Disable indentation checking - codebase is too inconsistent
    'indent': 'off',
    
    // FOAM3 Style Guide: 80 character line length (warning only)
    'max-len': ['warn', {
      code: 100, // Be more lenient
      tabWidth: 2,
      ignoreUrls: true,
      ignoreStrings: true,
      ignoreTemplateLiterals: true,
      ignoreRegExpLiterals: true,
      ignoreComments: true,
      ignorePattern: '^\\s*//.*$'
    }],
    
    // Disable most style rules - focus on code quality
    'space-in-parens': 'off',
    'space-unary-ops': 'off',
    'space-infix-ops': 'off',
    'space-before-blocks': 'off',
    'keyword-spacing': 'off',
    'comma-dangle': 'off',
    'quote-props': 'off',
    
    // Disable variable checking rules
    'no-unused-vars': 'off',
    'no-undef': 'off',
    'no-redeclare': 'off',
    
    // Keep only critical code quality rules
    'no-console': 'off', // Allow console in FOAM3
    'no-debugger': 'error',
    'no-alert': 'error',
    
    // Semicolon rules - important for code correctness
    'semi': ['error', 'always'],
    'semi-spacing': 'off',
    
    // Quote rules - be permissive
    'quotes': 'off',
    
    // Brace style - be permissive
    'brace-style': 'off',
    
    // Object and array formatting - be permissive
    'object-curly-spacing': 'off',
    'array-bracket-spacing': 'off',
    
    // Function formatting - be permissive
    'space-before-function-paren': 'off',
    
    // Comma rules - be permissive
    'comma-spacing': 'off',
    'comma-style': 'off',
    
    // Variable declaration - be permissive
    'one-var': 'off',
    
    // Disable equality checking - FOAM3 uses == and != extensively
    'eqeqeq': 'off',
    
    // Best practices - focus on critical issues
    'curly': ['error', 'multi-line'], // Allow single-line if without braces
    'dot-notation': 'off',
    'no-eval': 'off', // Allow eval in FOAM3
    'no-implied-eval': 'off',
    'no-new-wrappers': 'error',
    'no-throw-literal': 'error',
    'no-with': 'error',
    'no-prototype-builtins': 'off',
    
    // ES6+ rules - be permissive
    'prefer-const': 'off',
    'no-var': 'off',
    
    // Disable style rules
    'no-multi-spaces': 'off',
    'key-spacing': 'off',
    'no-multiple-empty-lines': 'off'
  },
  
  overrides: [
    {
      // Very relaxed rules for test files
      files: ['**/*test*.js', '**/*spec*.js', '**/test/**/*.js'],
      rules: {
        'max-len': 'off',
        'no-console': 'off'
      }
    }
  ]
}; 