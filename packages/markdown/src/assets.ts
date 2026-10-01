import type { Plugin } from 'unified';
import type { Root, Element } from 'hast';

// Vite rewrites relative URLs in `.html` entries, and Svelte resolves them in
// `import` statements --- but nothing rewrites `src="./picture.png"` written in
// a Svelte template, which is exactly what `![](./picture.png)` compiles to.
// Such a document builds cleanly and then ships a broken image.
//
// So the rehype pass below turns the attribute into `src={__md_asset_0}` and
// records the URL; the preprocessor that runs after mdsvex hoists a matching
// `import __md_asset_0 from './picture.png'` into the document's script.
// From there it is an ordinary Vite import: hashed, emitted, and correct in
// both the dev server and the build.

// Attributes that name a file, by tag. `<a href>` is deliberately absent: a
// link to a neighbouring document is a link, not an asset to inline.
const ASSET_ATTRIBUTES: Record<string, string[]> = {
    img: ['src'],
    source: ['src'],
    video: ['src', 'poster'],
    audio: ['src'],
    track: ['src'],
    embed: ['src'],
    iframe: ['src'],
    object: ['data'],
    link: ['href'],
};

// URLs written relative to the document. Everything else --- absolute paths,
// external URLs, fragments, data URIs --- is left exactly as the author wrote it.
const isRelative = (url: string) => url.startsWith('./') || url.startsWith('../');

// Keyed by absolute filename, because the rehype tree and the Svelte source it
// becomes are handled by two different plugins with no channel between them.
//
// A build compiles the document twice --- once for the client, once for SSR ---
// and both passes write here. That is safe only because the two passes are
// sequential and see the same tree; running them concurrently would let one
// pass's markup be hoisted against the other's URLs.
const collected = new Map<string, string[]>();

export const rehypeAssets: Plugin<[], Root> = () => {
    return (tree, vfile) => {
        // mdsvex puts the document's absolute path on the vfile as `filename`,
        // which is not one of vfile's own fields.
        const filename = (vfile as { filename?: string }).filename;
        if (!filename) throw new Error('the document vfile has no filename.');

        const urls: string[] = [];
        const stack: Array<Root | Element> = [tree];
        while (stack.length > 0) {
            const node = stack.pop()!;
            if (node.type == 'element') {
                const properties = node.properties ?? {};
                for (const attribute of ASSET_ATTRIBUTES[node.tagName] ?? []) {
                    const value = properties[attribute];
                    if (typeof value != 'string' || !isRelative(value)) continue;
                    properties[attribute] = `{__md_asset_${urls.length}}`;
                    urls.push(value);
                }
            }
            for (const child of node.children) {
                if (child.type == 'element') stack.push(child);
            }
        }
        collected.set(filename, urls);
    };
};

// A document may already declare an instance `<script>`; a second one is a
// compile error, so the imports go inside the existing block when there is one.
//
// Only the prologue is searched. mdsvex emits the module block it makes from the
// frontmatter, then the document's own script, then the markup --- so a `<script`
// that appears after any real content is something the author wrote *in* the
// document, and injecting imports into it would corrupt the page.
const SCRIPT_OPEN = /^<script\b([^>]*)>/;

function instanceScriptEnd(content: string): number | null {
    let at = 0;
    while (at < content.length) {
        const rest = content.slice(at);
        const leading = rest.length - rest.trimStart().length;
        at += leading;

        const open = SCRIPT_OPEN.exec(content.slice(at));
        if (!open) return null;

        const attributes = open[1] ?? '';
        const openEnd = at + open[0].length;
        const close = content.indexOf('</script>', openEnd);
        if (close < 0) return null;

        // The block mdsvex generates for the frontmatter is not the document's.
        if (!/\b(?:context|module)\b/.test(attributes)) return openEnd;
        at = close + '</script>'.length;
    }
    return null;
}

export const hoistAssetImports = {
    name: 'markdown-assets',
    markup({ content, filename }: { content: string; filename?: string }) {
        const urls = filename ? collected.get(filename) : undefined;
        if (!urls?.length) return;

        const imports = urls
            .map((url, i) => `import __md_asset_${i} from ${JSON.stringify(url)};`)
            .join('\n');

        const at = instanceScriptEnd(content);
        if (at == null) return { code: `<script>\n${imports}\n</script>\n${content}` };
        return { code: `${content.slice(0, at)}\n${imports}${content.slice(at)}` };
    },
};
