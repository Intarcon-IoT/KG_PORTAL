import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'

export default defineConfig([
  globalIgnores(['dist/**', 'build/**']),
  {
    files: ['src/**/*.{js,vue}'],
    extends: [js.configs.recommended, pluginVue.configs['flat/essential']],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: globals.browser },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': 'warn',
      'vue/multi-word-component-names': 'off',
      // Slots de Vuetify con punto (#item.name en v-data-table)
      'vue/valid-v-slot': ['error', { allowModifiers: true }]
    }
  }
])
