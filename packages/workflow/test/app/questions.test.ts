import { describe, expect, it } from 'vitest';

import { questionsIn } from '../../app/lib/questions';

describe('questionsIn', () => {
    it('finds each question, titled or not, and links the heading above it', () => {
        const source = [
            '## The epoch of header.stamp',
            '',
            '> [!TODO] Which epoch?',
            '> UNIX or GPS?',
            '',
            "### What's $x$ here",
            '',
            '> [!TODO]',
            '> An untitled one.',
        ].join('\n');
        expect(questionsIn(source, '/doc')).toEqual([
            { title: 'Which epoch?', href: '/doc#the-epoch-of-header-stamp' },
            { title: 'An untitled one.', href: '/doc#what-s-x-here' },
        ]);
    });

    it('links the document itself when no heading comes first', () => {
        expect(questionsIn('> [!TODO] Why?\n', '/doc')).toEqual([{ title: 'Why?', href: '/doc' }]);
    });

    it('ignores other callouts and a mention in prose', () => {
        expect(questionsIn('> [!NOTE] Hi\n\nA `[!TODO]` in prose.\n', '/doc')).toEqual([]);
    });
});
