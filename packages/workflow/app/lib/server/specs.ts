import path from 'node:path';

import type { SiteDocument } from '../documents';

// The specs a document imports by name, `import { name } from './x.graph'`, from `modules`.
export function importedSpecs<T>(
    script: string,
    doc: SiteDocument,
    modules: Record<string, Record<string, T>>,
): Map<string, T> {
    const dir = path.posix.dirname(`/${doc.filename}`);
    const specs = new Map<string, T>();
    for (const [, names, from] of script.matchAll(
        /import\s*\{([^}]*)\}\s*from\s*['"](\.[^'"]+)['"]/g,
    )) {
        const module = modules[path.posix.join(dir, from!.replace(/(\.ts)?$/, '.ts'))];
        if (!module) continue;
        for (const name of names!
            .split(',')
            .map((n) => n.trim())
            .filter(Boolean)) {
            specs.set(name, module[name]!);
        }
    }
    return specs;
}
