import eslint from '@eslint/js';
import pluginVue from 'eslint-plugin-vue';
import tseslint from 'typescript-eslint';
import vueParser from 'vue-eslint-parser';

export default tseslint.config(
  { ignores: ['.nuxt/**', '.output/**', 'dist/**', 'dist-electron/**', 'node_modules/**', 'app/common/**', 'data/**', 'assets/**'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/essential'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: { parser: tseslint.parser, extraFileExtensions: ['.vue'], sourceType: 'module' }
    },
    rules: { 'no-undef': 'off', 'vue/multi-word-component-names': 'off' }
  },
  { rules: { '@typescript-eslint/no-explicit-any': 'off' } }
);
