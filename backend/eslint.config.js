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
      // ignoreRestSiblings: `const { a, ...resto } = x` se usa para quitar campos de un objeto
      'no-unused-vars': ['warn', { ignoreRestSiblings: true }],
      eqeqeq: 'warn',
      curly: ['warn', 'multi-line']
    }
  },
  {
    // Plantilla de db-migrate: las migraciones aplicadas no se editan
    files: ['migrations/**/*.js'],
    rules: { 'no-unused-vars': ['warn', { varsIgnorePattern: '^(dbm|type|seed)$' }] }
  }
])
