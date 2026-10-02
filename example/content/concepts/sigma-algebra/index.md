---
title: σ-algebras
created: 2026-08-04
depends_on: [sets]
---

A $\sigma$-algebra on a set $\Omega$ is a collection $\calF$ of subsets of $\Omega$ that contains $\Omega$ itself and is closed under complements and countable unions. Its members are the sets one is allowed to measure, and the closure properties guarantee that measuring them never leads outside the collection.

# Definition

A collection $\calF \subseteq 2^\Omega$ is a $\sigma$-algebra when

$$
	\begin{aligned}
		&\Omega \in \calF, \\
		&A \in \calF \implies A^c \in \calF, \\
		&A_1, A_2, \ldots \in \calF \implies \textstyle\bigcup_n A_n \in \calF.
	\end{aligned}
$$

By De Morgan's laws it is then closed under countable intersections as well; see [sets and their operations](../sets/).

# Why not every subset

On a finite set the power set $2^\Omega$ is a perfectly good $\sigma$-algebra. On the real line it is too large: no notion of length that is translation invariant and countably additive can be defined on every subset. Restricting to the Borel sets, the smallest $\sigma$-algebra containing the open intervals, avoids the contradiction while keeping every set one would reasonably write down.
