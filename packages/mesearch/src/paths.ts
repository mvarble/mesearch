import path from 'node:path';
import { fileURLToPath } from 'node:url';

// `dist/paths.js` sits one directory below the package root.
export const packageDir = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..');

// The SvelteKit app every site is built with, shipped as source.
export const appDir = path.join(packageDir, 'app');

// What `mesearch init` writes into a project.
export const templatesDir = path.join(packageDir, 'templates');

// The agent skills `mesearch init` installs: one folder per skill, and the
// `authoring.md` every one of them is given a copy of.
export const skillsDir = path.join(packageDir, 'skills');

// Inside a project: where mesearch keeps its generated SvelteKit scaffolding,
// and where a build writes the site by default.
export const WORK_DIR = '.mesearch';
export const BUILD_DIR = 'build';
export const CONTENT_DIR = 'content';
export const CONFIG_FILES = ['mesearch.config.ts', 'mesearch.config.js', 'mesearch.config.mjs'];
export const USER_CSS = 'mesearch.css';
