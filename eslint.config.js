import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'dist-demo/**',
      'node_modules/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  {
    files: ['src/**/*.tsx'],
    rules: {
      'no-restricted-globals': ['error', 'fetch', 'localStorage', 'sessionStorage'],
      'no-restricted-imports': ['error', { patterns: ['**/infrastructure/**'] }],
    },
  },
  { files: ['src/main.tsx'], rules: { 'no-restricted-imports': 'off' } },
);
