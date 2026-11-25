import type { GraphTuning } from '@mvarble/mesearch-ui';

// How the document map is laid out: stronger repulsion and longer links than mesearch's defaults,
// so that labels as long as skoro's keep their distance. The build lays the map out with it, and
// the component re-runs the same simulation with it when a node is dragged.
export const MAP_TUNING: GraphTuning = { charge: -5000, linkDistance: 200, gravity: 0.008 };
