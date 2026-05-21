import js from '@eslint/js';
import checkFile from 'eslint-plugin-check-file';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const baseRules = {
    'no-empty': 'off',
    'no-var': 'error',
    'prefer-const': ['error', { destructuring: 'all' }],
    'no-else-return': ['error', { allowElseIf: false }],
    eqeqeq: ['error', 'always'],
    curly: ['warn', 'all'],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/unbound-method': 'off',
    '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: false }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-inferrable-types': 'off',
    '@typescript-eslint/ban-ts-comment': ['warn', { 'ts-expect-error': false }],
    'no-trailing-spaces': 'error',
    'object-shorthand': ['error', 'always'],
    'no-multi-spaces': 'error',
    'spaced-comment': ['warn', 'always', { markers: ['/'] }],
};

// Enforces the project's identifier conventions:
//   types/interfaces -> PascalCase   (UserProfileDto)
//   classes          -> PascalCase   (UserProfileService)
//   functions        -> camelCase
//   constants        -> UPPER_CASE   (MAX_RETRIES)
//   variables        -> camelCase    (userProfile)
// Object/type properties are left free so DB documents can use any field style.
const namingConvention = {
    '@typescript-eslint/naming-convention': [
        'error',
        { selector: 'typeLike', format: ['PascalCase'] },
        { selector: 'function', format: ['camelCase'] },
        { selector: 'parameter', format: ['camelCase'], leadingUnderscore: 'allow' },
        {
            selector: 'variable',
            format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
            leadingUnderscore: 'allow',
        },
        {
            selector: ['objectLiteralProperty', 'typeProperty', 'classProperty'],
            format: null,
        },
    ],
};

// kebab-case for every file and folder under src/ and examples/.
const fileNaming = {
    'check-file/filename-naming-convention': [
        'error',
        { '**/*.ts': 'KEBAB_CASE' },
        { ignoreMiddleExtensions: true },
    ],
    'check-file/folder-naming-convention': ['error', { '**/': 'KEBAB_CASE' }],
};

const languageOptions = {
    parser: tseslint.parser,
    parserOptions: {
        project: ['./tsconfig.json'],
        ecmaVersion: 'latest',
        sourceType: 'module',
    },
    globals: { ...globals.node },
};

// Heavy type-checked rules only on the shipped source.
const typedRecommended = [js.configs.recommended, ...tseslint.configs.recommendedTypeChecked].map(
    (config) => ({
        ...config,
        files: ['src/**/*.ts'],
        languageOptions: { ...config.languageOptions, ...languageOptions },
    }),
);

export default [
    ...typedRecommended,
    // Conventions everywhere: source, examples and tests.
    {
        files: ['src/**/*.ts', 'examples/**/*.ts', 'tests/**/*.ts'],
        plugins: { '@typescript-eslint': tseslint.plugin },
        languageOptions,
        rules: { ...baseRules, ...namingConvention },
    },
    // File/folder naming only where it makes sense (not the dotted *.test.ts names).
    {
        files: ['src/**/*.ts', 'examples/**/*.ts'],
        plugins: { 'check-file': checkFile },
        languageOptions,
        rules: fileNaming,
    },
    // Migration files keep their NNN_name.ts convention; the `_migrations` folder keeps
    // its leading underscore (it sorts to the top), so naming checks are off here.
    {
        files: ['src/_migrations/*.ts', 'examples/mongo-migrations/*.ts'],
        rules: {
            'check-file/filename-naming-convention': 'off',
            'check-file/folder-naming-convention': 'off',
        },
    },
    // node:test `test()` returns a promise the runner consumes — not a floating promise.
    {
        files: ['tests/**/*.ts'],
        rules: { '@typescript-eslint/no-floating-promises': 'off' },
    },
];
