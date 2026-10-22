//  @ts-check
import { tanstackConfig } from '@tanstack/eslint-config'
import pluginRouter from '@tanstack/eslint-plugin-router'
import { configs } from 'eslint-plugin-react-hooks'
import stylistic from '@stylistic/eslint-plugin'
// waiting for eslint 10 support
// import reactPlugin from 'eslint-plugin-react'

export default [
  ...tanstackConfig.map(config => ({
    ...config,
    rules: {
      ...config.rules,
      ...(config.name === 'tanstack/javascript' && {
        'import/no-cycle': 'off',
        'import/order': ['error', { 'newlines-between': 'always', 'alphabetize': { order: 'asc' } }],
        '@typescript-eslint/array-type': 'off',
        '@typescript-eslint/require-await': 'off',
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        '@typescript-eslint/no-unnecessary-condition': 'error',
        '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
        'pnpm/json-enforce-catalog': 'off',
      }),
    }
  })),
  {
    files: ['**/*.{js,mjs,cjs,jsx,mjsx,ts,tsx,mtsx}'],
    // ...reactPlugin.configs.flat.recommended,
    // ...reactPlugin.configs.flat['jsx-runtime'],
    // rules: {
    //   'react/jsx-boolean-value': ['error'],
    // }
  },
  ...pluginRouter.configs['flat/recommended'],
  { ...configs.flat['recommended-latest'] },
  {
    ...stylistic.configs.recommended,
    rules: {
      "@stylistic/jsx-self-closing-comp": ["error"],
      "@stylistic/jsx-newline": ["error"],
      "@stylistic/jsx-max-props-per-line": ["error"],
      "@stylistic/array-bracket-spacing": ["error"],
      "@stylistic/newline-per-chained-call": ["error"],
      "@stylistic/no-confusing-arrow": ["error"],
      "@stylistic/object-property-newline": ["error", { "allowAllPropertiesOnSameLine": false }],
      "@stylistic/comma-dangle": ["error", 'always-multiline'],
      "@stylistic/indent": ["error", 2],
      "@stylistic/jsx-first-prop-new-line": ["error", "multiline"],
      "@stylistic/object-curly-newline": ["error", { "multiline": true }],
      "@stylistic/jsx-wrap-multilines": ["error", {
        return: "parens-new-line",
        // Opzionale: puoi applicarlo anche ad altre strutture multilinea
        // declaration: 'parens-new-line',
        // assignment: 'parens-new-line',
        // arrow: 'parens-new-line'
      }],
      "@stylistic/keyword-spacing": ["error", {
        before: true,
        after: true
      }],
      "@stylistic/no-multi-spaces": ["error"],
      "@stylistic/object-curly-spacing": ["error", "always"],
      "@stylistic/space-infix-ops": ["error", { int32Hint: false }],
      "@stylistic/arrow-spacing": ["error", { before: true, after: true }]
    }
  },
  {
    rules: {
      "sort-imports": 'off',
      "sort-keys": ["error"],

    },
  },
  {
    // Route options must follow @tanstack/router/create-route-property-order
    // (validateSearch → loaderDeps → beforeLoad → loader → head) for type
    // inference, which conflicts with alphabetical sort-keys. shadcn-generated
    // ui components keep upstream ordering so they can be re-pulled cleanly.
    files: ['src/routes/**/*.{ts,tsx}', 'src/components/ui/**/*.tsx'],
    rules: {
      "sort-keys": 'off',
    },
  },
  {
    ignores: ['.sandcastle/*.ts', 'eslint.config.js', 'prettier.config.js', 'src/paraglide/*', 'supabase-selfhosted', 'public', 'src/supabase/database.types.ts', '.output'],
  },
]
