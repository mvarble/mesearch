---
title: Measures
created: 2026-08-07
updated: 2026-09-12
depends_on: [sigma-algebra]
katex_macros:
    '\meas': '\mu'
---

A measure assigns a size to each set in a [σ-algebra](../sigma-algebra/), in a way that adds up correctly over disjoint pieces. Length, area, volume, counting and probability are all measures.

# Definition

A measure on $(\Omega, \calF)$ is a function $\meas : \calF \to [0, \infty]$ with $\meas(\emptyset) = 0$ that is _countably additive_: for disjoint $A_1, A_2, \ldots \in \calF$,

$$
	\meas\Big(\bigcup_n A_n\Big) = \sum_n \meas(A_n). @tag(additivity)
$$

# Examples

The counting measure gives a finite set its number of elements. Lebesgue measure gives an interval $[a, b]$ its length $b - a$, and by [additivity](eq:additivity) any countable disjoint union of intervals the sum of their lengths. A [probability space](../probability-space/) is a measure of total mass one.

# Consequences

Additivity alone forces monotonicity, $A \subseteq B \implies \meas(A) \le \meas(B)$, and continuity along increasing sequences, $\meas(A_n) \uparrow \meas(\bigcup_n A_n)$. The second is what lets integrals be defined by approximation, as in [the Lebesgue integral](../../writeups/lebesgue-integral/).
