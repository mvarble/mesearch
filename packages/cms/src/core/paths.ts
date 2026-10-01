import path from 'node:path';

// Every document is identified by its path relative to the project root,
// written with forward slashes whatever the platform. Absolute paths are what
// Vite and mdsvex hand around, so the two meet here.
export const toId = (root: string, absolute: string) =>
    path.relative(root, absolute).split(path.sep).join('/');

export const toAbsolute = (root: string, id: string) => path.resolve(root, ...id.split('/'));

// The document a relative import or link names, as an id.
export const resolveId = (from: string, relative: string) =>
    path.posix.normalize(path.posix.join(path.posix.dirname(from), relative));

export function slugFromFilename(filename: string): string {
    const basename = path.posix.basename(filename);
    const extname = path.posix.extname(basename);
    const name = extname ? basename.slice(0, -extname.length) : basename;
    if (name != 'index') return name;
    return path.posix.dirname(filename).split('/').at(-1)!;
}
