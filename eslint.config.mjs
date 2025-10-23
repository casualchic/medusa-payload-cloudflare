import tsParser from '@typescript-eslint/parser'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import reactPlugin from 'eslint-plugin-react'
import reactHooksPlugin from 'eslint-plugin-react-hooks'
import nextPlugin from '@next/eslint-plugin-next'

// ESLint flat config for Next.js 16
const eslintConfig = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      '.conductor/**',
      'dist/**',
      'build/**',
      '.open-next/**',
      'cloudflare-env.d.ts',
    ],
  },
  {
    files: ['**/*.{js,jsx,ts,tsx,mjs}'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'react': reactPlugin,
      'react-hooks': reactHooksPlugin,
      '@next/next': nextPlugin,
    },
    rules: {
      // Next.js core rules (accessibility & performance)
      '@next/next/no-img-element': 'warn',
      '@next/next/no-html-link-for-pages': 'error',
      '@next/next/no-sync-scripts': 'error',
      '@next/next/no-document-import-in-page': 'error',
      '@next/next/no-head-import-in-document': 'error',
      '@next/next/google-font-display': 'warn',
      '@next/next/google-font-preconnect': 'warn',
      '@next/next/next-script-for-ga': 'warn',
      '@next/next/no-before-interactive-script-outside-document': 'warn',
      '@next/next/no-css-tags': 'warn',
      '@next/next/no-head-element': 'warn',
      '@next/next/no-styled-jsx-in-document': 'warn',
      '@next/next/no-title-in-document-head': 'warn',
      '@next/next/no-unwanted-polyfillio': 'warn',
      '@next/next/inline-script-id': 'error',
      '@next/next/no-assign-module-variable': 'error',
      '@next/next/no-duplicate-head': 'error',
      '@next/next/no-page-custom-font': 'warn',
      '@next/next/no-typos': 'warn',

      // TypeScript rules
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/ban-ts-comment': 'warn',

      // React rules
      'react/react-in-jsx-scope': 'off', // Not needed in Next.js
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // General rules
      'no-unused-vars': 'off', // Use TypeScript version
      'no-console': 'off',
      'prefer-const': 'warn',
    },
  },
]

export default eslintConfig
