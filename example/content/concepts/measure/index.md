---
title: Measures
created: 2026-08-07
updated: 2026-09-12
depends_on: [sigma-algebra]
katex_macros:
    '\meas': '\mu'
---

<script>
	import Statement from '@mvarble/mesearch/Statement.svelte';
	import Proof from '@mvarble/mesearch/Proof.svelte';
	import * as continuity from './statements/continuity.md';
</script>

A measure assigns a size to each set in a [σ-algebra](../sigma-algebra/), in a way that adds up correctly over disjoint pieces. Length, area, volume, counting and probability are all measures.

# Definition

A measure on $(\Omega, \calF)$ is a function $\meas : \calF \to [0, \infty]$ with $\meas(\emptyset) = 0$ that is _countably additive_: for disjoint $A_1, A_2, \ldots \in \calF$,

$$
	\meas\Big(\bigcup_n A_n\Big) = \sum_n \meas(A_n). @tag(additivity)
$$

# Examples

The counting measure gives a finite set its number of elements. Lebesgue measure gives an interval $[a, b]$ its length $b - a$, and by [additivity](eq:additivity) any countable disjoint union of intervals the sum of their lengths. A [probability space](../probability-space/) is a measure of total mass one.

# Consequences

Additivity alone forces monotonicity, $A \subseteq B \implies \meas(A) \le \meas(B)$, and it forces continuity along increasing sequences [Theorem 1.8](cite:folland1999).

<Statement {...continuity} />

<Proof>

Write $\bigcup_n A_n$ as the disjoint union of $B_1 = A_1$ and $B_k = A_k \setminus A_{k-1}$. By [additivity](eq:additivity), $\meas(\bigcup_n A_n) = \sum_k \meas(B_k)$, whose partial sums are $\meas(A_n)$.

</Proof>

[%full](statement:continuity) is what lets integrals be defined by approximation, as in [the Lebesgue integral](../../writeups/lebesgue-integral/). The axioms in this form go back to [](cite:kolmogorov1933).
