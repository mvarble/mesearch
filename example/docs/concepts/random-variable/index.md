---
title: Random variables
created: 2026-08-14
depends_on: [probability-space]
---

A random variable is a measurable function $X : \Omega \to \bbR$ on a [probability space](../probability-space/). It turns outcomes into numbers, and measurability --- $\{X \le x\} \in \calF$ for every $x$ --- is exactly what makes $\PP(X \le x)$ meaningful.

# Distribution

The distribution of $X$ is the measure $A \mapsto \PP(X \in A)$ on the real line. Two random variables on different spaces can share a distribution, and most questions about a single random variable depend on nothing else.

# Example

On the die, $X(\omega) = \omega$ is the number rolled and $Y(\omega) = \indicator\{\omega \text{ even}\}$ indicates an even roll. Then $\PP(Y = 1) = 1/2$.
