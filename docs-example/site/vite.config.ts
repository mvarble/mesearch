import { docsSite } from '@mvarble/mesearch-workflow/site';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: await docsSite(),
    test: {
        // The app's own tests, which need `$site` as a site serves it.
        include: ['src/**/*.test.ts', '../../packages/workflow/test/app/**/*.test.ts'],
    },
});
