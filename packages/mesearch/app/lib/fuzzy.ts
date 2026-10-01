// A small fuzzy matcher for the index and the search palette: every character
// of the query must appear in order, and a match scores higher the more of it
// falls at the start of words and in runs.

export interface Match {
    score: number;
    // Indices into the text that matched, for highlighting.
    indices: number[];
}

const isBoundary = (text: string, i: number) => i == 0 || /[\s\-_/.(:,]/.test(text[i - 1]!);

export function fuzzy(query: string, text: string): Match | null {
    const q = query.trim().toLowerCase();
    if (!q) return { score: 0, indices: [] };
    const t = text.toLowerCase();

    // A plain substring is the strongest kind of match.
    const at = t.indexOf(q);
    if (at >= 0) {
        const indices = Array.from({ length: q.length }, (_, i) => at + i);
        return { score: 100 + q.length * 4 + (isBoundary(t, at) ? 30 : 0) - at * 0.1, indices };
    }

    const indices: number[] = [];
    let score = 0;
    let run = 0;
    let from = 0;
    for (const char of q) {
        if (char == ' ') continue;
        const i = t.indexOf(char, from);
        if (i < 0) return null;
        run = indices.length && i == indices.at(-1)! + 1 ? run + 1 : 0;
        score += 1 + run * 2 + (isBoundary(t, i) ? 4 : 0) - Math.min(i - from, 10) * 0.15;
        indices.push(i);
        from = i + 1;
    }
    return { score, indices };
}

// The best match over several fields, each weighted.
export function bestMatch(query: string, fields: Array<[text: string, weight: number]>) {
    let best: (Match & { field: number }) | null = null;
    fields.forEach(([text, weight], field) => {
        const match = fuzzy(query, text);
        if (match && (!best || match.score * weight > best.score)) {
            best = { score: match.score * weight, indices: match.indices, field };
        }
    });
    return best as (Match & { field: number }) | null;
}

// `text` cut into runs, marking those that matched.
export function highlight(text: string, indices: number[]): Array<{ text: string; hit: boolean }> {
    const hits = new Set(indices);
    const parts: Array<{ text: string; hit: boolean }> = [];
    for (let i = 0; i < text.length; i++) {
        const hit = hits.has(i);
        const last = parts.at(-1);
        if (last && last.hit == hit) last.text += text[i];
        else parts.push({ text: text[i]!, hit });
    }
    return parts;
}
