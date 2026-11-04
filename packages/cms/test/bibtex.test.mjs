// The BibTeX reader: what an entry's fields read as once the TeX is gone.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { detex } from '../src/core/bibtex.ts';

test('BibTeX text reads as a reader would see it', () => {
    assert.equal(detex('Zeitschrift f{\\"u}r'), 'Zeitschrift für');
    assert.equal(detex("Erd{\\H{o}}s and R{\\'e}nyi"), 'Erdős and Rényi');
    assert.equal(
        detex('The {B}rownian $\\mathbb{R}^{d}$ case'),
        'The Brownian $\\mathbb{R}^{d}$ case',
    );
    assert.equal(detex('Dvoretzky--Erd\\H os'), 'Dvoretzky–Erdős');
});
