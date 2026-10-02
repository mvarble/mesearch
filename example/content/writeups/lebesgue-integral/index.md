---
title: The Lebesgue integral
created: 2026-08-17
updated: 2026-09-15
depends_on: [measure]
---

The Riemann integral slices the domain; the Lebesgue integral slices the range. Asking "for how large a set does $f$ exceed $t$?" needs only a [measure](../../concepts/measure/), so the same construction integrates over intervals, over finite sets, and over probability spaces alike.

# Simple functions

A simple function takes finitely many values, $s = \sum_{k=1}^n a_k \indicator_{A_k}$ with measurable $A_k$. Its integral is the only sensible one,

$$
	\int s \, {\rm d}\mu = \sum_{k=1}^n a_k \, \mu(A_k). @tag(simple)
$$

# Non-negative functions

For measurable $f \ge 0$ the integral is the supremum of [(1)](eq:simple) over simple functions beneath $f$:

$$
	\int f \, {\rm d}\mu = \sup \Big\{ \int s \, {\rm d}\mu : 0 \le s \le f,\ s \text{ simple} \Big\}. @tag(sup)
$$

## Monotone convergence

If $0 \le f_n \uparrow f$ then $\int f_n \, {\rm d}\mu \uparrow \int f \, {\rm d}\mu$. This follows from continuity of the measure along increasing sets, and it is the workhorse behind almost every limit theorem, including the [law of large numbers](../law-of-large-numbers/).

# Signed functions

A general $f$ splits as $f = f^+ - f^-$ into its positive and negative parts, and $\int f = \int f^+ - \int f^-$ whenever at least one side is finite.
