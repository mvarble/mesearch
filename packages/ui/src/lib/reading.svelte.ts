// How far through the current document the reader is, from 0 to 1, or null
// on a page that is not a document. The document page sets it; the rail shows
// it.
export const reading = $state<{ progress: number | null }>({ progress: null });
