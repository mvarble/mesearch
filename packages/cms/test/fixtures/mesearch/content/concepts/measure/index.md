---
title: Measure
created: 2026-01-02
updated: 2026-03-01
depends_on: [sets]
katex_macros:
    '\mu': '\mathrm{m}'
---

<script>
	import Statement from '@mvarble/mesearch/Statement.svelte';
	import * as extension from './statements/extension.md';
</script>

A measure assigns sizes to [sets](../sets/).

$$
	\mu(A) = 1 @tag(unit)
$$

See [the unit](eq:unit) and [Lebesgue](../../writeups/lebesgue/index.md#start).

<Statement {...extension} />

By [%full](statement:extension), with [](eq:outer) and [](cite:folland1999).
