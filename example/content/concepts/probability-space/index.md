---
title: Probability spaces
created: 2026-08-10
depends_on: [measure]
---

A probability space is a triple $(\Omega, \calF, \PP)$: a set of outcomes $\Omega$, a [σ-algebra](../sigma-algebra/) $\calF$ of events, and a [measure](../measure/) $\PP$ with $\PP(\Omega) = 1$. The number $\PP(A)$ is the probability of the event $A$.

# The axioms

Everything about probability follows from the measure axioms with total mass one. The probability of the complement is $\PP(A^c) = 1 - \PP(A)$, and for any two events

$$
	\PP(A \cup B) = \PP(A) + \PP(B) - \PP(A \cap B).
$$

# Example

A fair die is $\Omega = \{1, \ldots, 6\}$ with every subset an event and $\PP(A) = |A| / 6$. The event of an even roll has probability $\PP(\{2, 4, 6\}) = 1/2$.
