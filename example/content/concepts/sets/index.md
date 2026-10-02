---
title: Sets and their operations
created: 2026-08-02
---

A set is a collection of objects, its _elements_, considered as a single whole. Writing $x \in A$ says that $x$ is an element of $A$, and two sets are equal exactly when they have the same elements. Everything else in these notes is built from sets, so the handful of operations below recur constantly.

# Operations

Given sets $A$ and $B$ inside some larger set $\Omega$, the union $A \cup B$ collects the elements of either, the intersection $A \cap B$ those of both, and the complement $A^c$ everything in $\Omega$ that is not in $A$. De Morgan's laws relate the three:

$$
	(A \cup B)^c = A^c \cap B^c, \qquad (A \cap B)^c = A^c \cup B^c.
$$

## Countable unions

The operations extend to sequences. For sets $A_1, A_2, \ldots$ the union $\bigcup_{n} A_n$ contains every element lying in at least one $A_n$. Countable unions are what separate measure theory from plain counting: the length of an interval is the sum of the lengths of countably many pieces it is cut into.

# Example

Rolling a die gives the outcomes $\Omega = \{1, 2, 3, 4, 5, 6\}$. The event "even" is $E = \{2, 4, 6\}$, the event "at least four" is $F = \{4, 5, 6\}$, and $E \cap F = \{4, 6\}$ is the event that both happen.
