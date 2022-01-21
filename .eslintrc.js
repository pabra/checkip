module.exports = {
  parser: '@typescript-eslint/parser', // Specifies the ESLint parser
  plugins: ['@typescript-eslint', 'jest', 'prettier', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:node/recommended',
    'plugin:node/recommended-module',
    'plugin:jest/recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended', // Uses the recommended rules from the @typescript-eslint/eslint-plugin
    'plugin:import/typescript',
    'prettier', // Uses eslint-config-prettier to disable ESLint rules from @typescript-eslint/eslint-plugin that would conflict with prettier
  ],
  env: {
    'jest/globals': true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: 2020, // Allows for the parsing of modern ECMAScript features
    sourceType: 'module', // Allows for the use of imports
  },
  rules: {
    // Place to specify ESLint rules. Can be used to overwrite rules specified from the extended configs
    // e.g. "@typescript-eslint/explicit-function-return-type": "off",
    '@typescript-eslint/no-explicit-any': 0,
    'no-duplicate-imports': 'off',

    // ts
    '@typescript-eslint/explicit-module-boundary-types': 2,
    '@typescript-eslint/no-non-null-asserted-optional-chain': 2,
    '@typescript-eslint/no-unused-vars': [2],
    '@typescript-eslint/no-duplicate-imports': ['error'],
    '@typescript-eslint/no-shadow': 2,

    // js
    'no-shadow': 0,
    'import/no-unused-modules': [2, { unusedExports: true }],
    eqeqeq: 2,
    'node/no-missing-import': [
      2,
      {
        tryExtensions: ['.ts', '.js', '.json', '.node'],
      },
    ],
  },
  reportUnusedDisableDirectives: true,
};
