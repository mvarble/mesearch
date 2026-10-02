---
title: Expectation
created: 2026-08-20
updated: 2026-09-20
depends_on: [random-variable, writeups/lebesgue-integral]
---

The expectation of a [random variable](../random-variable/) is its average value, weighted by probability. Formally it is the integral of $X$ against $\PP$,

$$
	\EE[X] = \int_\Omega X \, {\rm d}\PP,
$$

defined whenever $\EE|X| < \infty$, using the [Lebesgue integral](../../writeups/lebesgue-integral/).

# Linearity

Expectation is linear: $\EE[aX + bY] = a\EE[X] + b\EE[Y]$, whether or not $X$ and $Y$ are [independent](../../writeups/independence/). This is often the shortest route to an answer.

# Example

For the number rolled on a fair die, $\EE[X] = \tfrac16(1 + 2 + \cdots + 6) = 3.5$, a value the die never shows.
