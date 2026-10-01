---
title: The law of large numbers
created: 2026-09-10
updated: 2026-09-25
depends_on: [expectation]
---

<script>
	import Statement from '@mvarble/mesearch/Statement.svelte';
	import * as slln from './statements/slln.md';
</script>

Averages of independent repetitions settle down to the [expectation](../../concepts/expectation/). The coin's proportion of heads approaches one half; a die's running average approaches $3.5$.

# Statement

<Statement {...slln} />

Pairwise independence is in fact enough [](cite:etemadi1981); see [Section 2.4](cite:durrett2019) for the textbook treatment.

# A weaker version, quickly

If the $X_k$ also have finite variance $\sigma^2$, Chebyshev's inequality gives the weak law in one line: the average has variance $\sigma^2 / n$, so

$$
	\PP\Big( \Big|\tfrac{1}{n}\textstyle\sum_{k \le n} X_k - \EE[X_1]\Big| > \varepsilon \Big) \le \frac{\sigma^2}{n \varepsilon^2} \to 0.
$$

The strong form [](eq:slln) needs more care and the [Lebesgue integral](../lebesgue-integral/)'s convergence theorems.
