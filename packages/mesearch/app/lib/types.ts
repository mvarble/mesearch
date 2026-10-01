import type { IndexEntry as UiIndexEntry } from '@mvarble/mesearch-ui';

export type {
    DocumentRef,
    GraphLink,
    GraphNode,
    SearchEntry,
    TocEntry,
    TrackItem,
} from '@mvarble/mesearch-ui';

// An index entry, with what the home page needs besides.
export interface IndexEntry extends UiIndexEntry {
    sequences: string[];
    descriptionFilename?: string;
}
