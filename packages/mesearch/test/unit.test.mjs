// The CLI's pieces that need no build: config validation, `mesearch init`,
// the generated stylesheet, and the heading shift.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { validate } from '../src/config.ts';
import { initProject, outdatedSkills, tokensFile, userStylesheet } from '../src/init.ts';
import { rehypeDemoteHeadings } from '../src/headings.ts';

test('a config is filled in with defaults', () => {
    const config = validate({}, undefined, 'notes');
    assert.equal(config.title, 'notes');
    assert.equal(config.base, '');
    assert.equal(config.lang, 'en');
    assert.deepEqual(config.katexMacros, {});
    assert.equal(typeof config.graph.charge, 'number');
});

test('every problem with a config is reported at once', () => {
    assert.throws(
        () =>
            validate(
                { title: 3, base: 'notes/', katexMacros: { '\\x': 1 }, graph: { charge: 'lots' } },
                'mesearch.config.ts',
                'x',
            ),
        (error) =>
            ['`title`', '`base`', '`katexMacros`', '`graph.charge`'].every((field) =>
                error.message.includes(field),
            ),
    );
});

test("a base of '/' is the root", () => {
    assert.equal(validate({ base: '/' }, undefined, 'x').base, '');
    assert.equal(validate({ base: '/notes' }, undefined, 'x').base, '/notes');
});

test('init scaffolds a project and never overwrites its own files without --force', () => {
    const dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mesearch-init-')), 'my-notes');
    const log = console.log;
    console.log = () => {};
    try {
        initProject(dir);
        for (const file of [
            'AGENTS.md',
            'mesearch.config.ts',
            'mesearch.css',
            'tsconfig.json',
            'prettier.config.js',
            'eslint.config.js',
            'content/description.md',
            'content/concepts/example-concept/index.md',
            'content/concepts/example-concept/description.md',
            'content/writeups/example-writeup/index.md',
            'content/sequences/.gitkeep',
            '.github/workflows/build.yml',
            '.gitlab-ci.yml',
            '.agents/skills/explain/SKILL.md',
            '.agents/skills/explain/authoring.md',
            '.claude/skills/explain/SKILL.md',
            '.claude/skills/explain/authoring.md',
        ]) {
            assert.ok(fs.existsSync(path.join(dir, file)), `${file} is written`);
        }
        for (const file of ['.github/workflows/build.yml', '.gitlab-ci.yml']) {
            const ci = fs.readFileSync(path.join(dir, file), 'utf8');
            assert.match(ci, /npx --no -- mesearch build/, `${file} builds the site`);
            assert.match(ci, /pnpm install --frozen-lockfile/);
            assert.match(ci, /npm ci/);
        }
        const ignored = fs.readFileSync(path.join(dir, '.prettierignore'), 'utf8').split('\n');
        for (const entry of ['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', '.agents/']) {
            assert.ok(ignored.includes(entry), `${entry} is not formatted`);
        }
        // A skill is handed over as written: nothing in it is a template.
        const skill = fs.readFileSync(path.join(dir, '.agents/skills/explain/SKILL.md'), 'utf8');
        assert.match(skill, /^---\nname: explain\ndescription: .+\n---\n/);
        // The description is a plain YAML scalar, which ': ' or ' #' would break.
        const description = skill.match(/^description: (.+)$/m)[1];
        assert.doesNotMatch(description, /: | #/);
        assert.doesNotMatch(skill, /\{\{/);
        // AGENTS.md is the project's, and leaves the conventions to the file
        // it points at, which is mesearch's.
        const agents = fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8');
        assert.match(agents, /^# Writing for My notes\n/);
        assert.match(agents, /\.agents\/skills\/explain\/authoring\.md/);
        assert.match(agents, /## Site-specific opinions/);
        assert.doesNotMatch(agents, /depends_on/);
        const authoring = fs.readFileSync(
            path.join(dir, '.agents/skills/explain/authoring.md'),
            'utf8',
        );
        for (const section of ['Layout', 'Frontmatter', 'Links', 'Prose', 'Mathematics']) {
            assert.match(authoring, new RegExp(`^## ${section}$`, 'm'));
        }
        assert.match(
            fs.readFileSync(path.join(dir, 'mesearch.config.ts'), 'utf8'),
            /title: 'My notes'/,
        );
        const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
        assert.equal(manifest.scripts.dev, 'mesearch dev');
        assert.ok(manifest.dependencies['@mvarble/mesearch']);
        assert.match(fs.readFileSync(path.join(dir, '.gitignore'), 'utf8'), /\.mesearch\//);
        assert.match(
            fs.readFileSync(path.join(dir, 'prettier.config.js'), 'utf8'),
            /trailingComma: 'all'/,
        );

        fs.writeFileSync(path.join(dir, 'AGENTS.md'), 'mine');
        // As a project holding an earlier version's skill would have it.
        fs.writeFileSync(path.join(dir, '.agents/skills/explain/SKILL.md'), 'old');
        fs.writeFileSync(path.join(dir, '.agents/skills/explain/dropped.md'), 'old');
        fs.mkdirSync(path.join(dir, '.agents/skills/mine'));
        fs.writeFileSync(path.join(dir, '.agents/skills/mine/SKILL.md'), 'mine');
        // The examples are deleted once there is something real to read.
        fs.rmSync(path.join(dir, 'content/concepts/example-concept'), { recursive: true });
        fs.rmSync(path.join(dir, 'content/sequences/.gitkeep'));
        fs.rmSync(path.join(dir, '.gitlab-ci.yml'));
        // As a project made before the skills were would have it.
        fs.writeFileSync(path.join(dir, '.prettierignore'), 'build/\nmine/\n');
        manifest.scripts.dev = 'custom';
        fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(manifest));
        initProject(dir);
        assert.equal(fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8'), 'mine');
        // What is missing is written again, but never an example document.
        assert.ok(fs.existsSync(path.join(dir, '.gitlab-ci.yml')));
        assert.ok(!fs.existsSync(path.join(dir, 'content/concepts/example-concept')));
        assert.ok(!fs.existsSync(path.join(dir, 'content/sequences/.gitkeep')));
        // The skills are mesearch's: brought up to date, through the link too,
        // with nothing left over. A skill of the project's own is not touched.
        for (const skills of ['.agents/skills', '.claude/skills']) {
            assert.equal(
                fs.readFileSync(path.join(dir, skills, 'explain/SKILL.md'), 'utf8'),
                skill,
            );
            assert.ok(!fs.existsSync(path.join(dir, skills, 'explain/dropped.md')));
        }
        assert.ok(fs.lstatSync(path.join(dir, '.claude/skills/explain')).isSymbolicLink());
        assert.equal(
            fs.readFileSync(path.join(dir, '.agents/skills/mine/SKILL.md'), 'utf8'),
            'mine',
        );
        assert.equal(
            JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')).scripts.dev,
            'custom',
        );
        assert.deepEqual(
            fs.readFileSync(path.join(dir, '.prettierignore'), 'utf8').split('\n').slice(0, 5),
            ['build/', 'mine/', '.mesearch/', '.agents/', '.claude/'],
        );
        initProject(dir, { force: true });
        assert.notEqual(fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8'), 'mine');
    } finally {
        console.log = log;
    }
});

test('init refreshes a copied skill, and leaves alone a folder that is not its copy', () => {
    const dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mesearch-init-')), 'my-notes');
    const log = console.log;
    console.log = () => {};
    try {
        initProject(dir);
        const installed = path.join(dir, '.agents/skills/explain');
        const linked = path.join(dir, '.claude/skills/explain');
        const shipped = fs.readFileSync(path.join(installed, 'SKILL.md'), 'utf8');
        const stale = () => {
            fs.writeFileSync(path.join(installed, 'SKILL.md'), 'old');
            fs.rmSync(linked, { recursive: true });
            fs.cpSync(installed, linked, { recursive: true });
        };

        // Where links cannot be made, `.claude/skills/` holds a copy instead.
        stale();
        initProject(dir);
        assert.equal(fs.readFileSync(path.join(linked, 'SKILL.md'), 'utf8'), shipped);
        assert.ok(!fs.lstatSync(linked).isSymbolicLink());

        // A folder that differs from what was installed is somebody's own.
        stale();
        fs.writeFileSync(path.join(linked, 'SKILL.md'), 'mine');
        initProject(dir);
        assert.equal(fs.readFileSync(path.join(installed, 'SKILL.md'), 'utf8'), shipped);
        assert.equal(fs.readFileSync(path.join(linked, 'SKILL.md'), 'utf8'), 'mine');
    } finally {
        console.log = log;
    }
});

test("a skill that is not this version's is reported, and a missing one is not", () => {
    const dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mesearch-init-')), 'my-notes');
    const log = console.log;
    console.log = () => {};
    try {
        assert.deepEqual(outdatedSkills(dir), []);
        initProject(dir);
        assert.deepEqual(outdatedSkills(dir), []);

        const skill = path.join(dir, '.agents/skills/explain/SKILL.md');
        const shipped = fs.readFileSync(skill, 'utf8');
        // A checkout that converts line endings has changed nothing.
        fs.writeFileSync(skill, shipped.replaceAll('\n', '\r\n'));
        assert.deepEqual(outdatedSkills(dir), []);
        fs.writeFileSync(skill, shipped + 'An edit.\n');
        assert.deepEqual(outdatedSkills(dir), ['.agents/skills/explain']);
        fs.writeFileSync(skill, shipped);
        fs.writeFileSync(path.join(dir, '.agents/skills/explain/dropped.md'), 'old');
        assert.deepEqual(outdatedSkills(dir), ['.agents/skills/explain']);

        initProject(dir);
        assert.deepEqual(outdatedSkills(dir), []);
        // A project need not be written by agents at all.
        fs.rmSync(path.join(dir, '.agents'), { recursive: true });
        assert.deepEqual(outdatedSkills(dir), []);
    } finally {
        console.log = log;
    }
});

test('the stylesheet lists every variable, commented out', () => {
    const css = userStylesheet();
    const tokens = fs.readFileSync(tokensFile(), 'utf8');
    const names = [...tokens.matchAll(/^\s*(--[\w-]+)\s*:/gm)].map((match) => match[1]);
    assert.ok(names.length > 30);
    for (const name of new Set(names)) assert.ok(css.includes(`/* ${name}:`), `${name} is listed`);
    // Nothing is in effect until it is uncommented.
    const live = css.replace(/\/\*[\s\S]*?\*\//g, '');
    assert.doesNotMatch(live, /--[\w-]+\s*:/);
    assert.match(live, /:root\[data-theme='dark'\]/);
});

test('document headings move one level down', () => {
    const h = (tagName) => ({ type: 'element', tagName, properties: {}, children: [] });
    const tree = {
        type: 'root',
        children: [h('h1'), h('h3'), h('h6'), { ...h('blockquote'), children: [h('h2')] }],
    };
    rehypeDemoteHeadings()(tree);
    assert.deepEqual(
        [...tree.children.slice(0, 3).map((n) => n.tagName), tree.children[3].children[0].tagName],
        ['h2', 'h4', 'h6', 'h3'],
    );
});
