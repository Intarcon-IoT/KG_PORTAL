const js = require('@eslint/js')
const globals = require('globals')
const { defineConfig, globalIgnores } = require('eslint/config')

module.exports = defineConfig([
  globalIgnores(['node_modules/**', 'logs/**']),
  {
    files: ['src/**/*.js', 'migrations/**/*.js'],
    extends: [js.configs.recommended],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'commonjs', globals: globals.node },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': 'warn',
      eqeqeq: 'warn',
      curly: ['warn', 'multi-line']
    }
  }
])
