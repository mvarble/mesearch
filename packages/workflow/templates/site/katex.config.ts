// The site's KaTeX macros. Macros for one page go in its `katex_macros` frontmatter.
export default {
    macros: { '\\R': '\\mathbb{R}' } as Record<string, string>,
    throwOnError: false,
};
