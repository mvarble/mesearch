---
title: Independence
created: 2026-09-05
depends_on: [probability-space]
---

Two events are independent when knowing that one happened does not change the probability of the other. In the language of [probability spaces](../../concepts/probability-space/) that is a product rule,

$$
	\PP(A \cap B) = \PP(A)\,\PP(B). @tag(product)
$$

# Coins again

In [flipping coins](../coin-flips/), the events "the first flip is heads" and "the second flip is heads" each have probability $1/2$, and their intersection $\{HH\}$ has probability $1/4$. They satisfy [the product rule](eq:product) and are independent; that is what it means for the coin to have no memory.

# Random variables

Random variables $X$ and $Y$ are independent when every event about $X$ is independent of every event about $Y$. Then expectations multiply, $\EE[XY] = \EE[X]\EE[Y]$, which is the key to computing the variance of a sum.
