import { docsSite } from '@mvarble/mesearch-workflow/site';
import { defineConfig } from 'vite';

export default defineConfig({ plugins: await docsSite() });
