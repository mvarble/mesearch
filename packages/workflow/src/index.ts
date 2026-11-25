// The types a project's `workflow.config.ts` imports, and the engine's model, for tooling that
// reads entries.
export type {
    Area,
    CheckContext,
    KindConfig,
    StageConfig,
    WorkflowConfig,
} from './engine/config.ts';
export { CONFIG_FILE } from './engine/config.ts';
export { run, type Result, type RunOptions } from './engine/cli.ts';
