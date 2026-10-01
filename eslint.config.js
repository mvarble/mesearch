import prettier from 'eslint-config-prettier';
import path from 'node:path';
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import ts from 'typescript-eslint';
import { defineConfig, includeIgnoreFile } from 'eslint/config';

const gitignorePath = path.resolve(import.meta.dirname, '.gitignore');

export default defineConfig(
    includeIgnoreFile(gitignorePath),
    js.configs.recommended,
    ts.configs.recommended,
    svelte.configs.recommended,
    prettier,
    svelte.configs.prettier,
    {
        languageOptions: {
            globals: { ...globals.browser, ...globals.node },
        },
        rules: {
            'no-undef': 'off',
        },
    },
    {
        files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
        languageOptions: {
            parserOptions: {
                extraFileExtensions: ['.svelte'],
                parser: ts.parser,
            },
        },
    },
    {
        // The app renders HTML it made itself at build time --- KaTeX for the
        // math in titles and summaries --- and builds every internal link
        // through `href()`, which applies the configured base path.
        files: ['packages/mesearch/app/**/*.svelte'],
        rules: {
            'svelte/no-at-html-tags': 'off',
            'svelte/no-navigation-without-resolve': 'off',
        },
    },
    {
        ignores: ['**/dist', '**/build', '**/.mesearch', '**/test/fixtures'],
    },
    {
        rules: {
            // Hanging commas everywhere, as in the blog: a list that grows by a
            // line then changes by a line.
            'comma-dangle': [2, 'always-multiline'],
        },
    },
);
