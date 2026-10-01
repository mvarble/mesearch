import { defineConfig } from '@mvarble/mesearch';

export default defineConfig({
    title: 'Probability, from the ground up',
    author: 'An example mesearch site',
    katexMacros: {
        '\\PP': '\\mathbb{P}',
        '\\EE': '\\mathbb{E}',
        '\\indicator': '\\mathbf{1}',
    },
});
