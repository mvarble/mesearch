---
title: The law of large numbers
created: 2026-09-10
updated: 2026-09-25
depends_on: [expectation]
---

Averages of independent repetitions settle down to the [expectation](../../concepts/expectation/). The coin's proportion of heads approaches one half; a die's running average approaches $3.5$.

# Statement

Let $X_1, X_2, \ldots$ be [independent](../independence/) random variables with a common distribution and $\EE|X_1| < \infty$. Then the averages converge,

$$
	\frac{X_1 + \cdots + X_n}{n} \longrightarrow \EE[X_1] \quad \text{with probability one.} @tag(slln)
$$

# A weaker version, quickly

If the $X_k$ also have finite variance $\sigma^2$, Chebyshev's inequality gives the weak law in one line: the average has variance $\sigma^2 / n$, so

$$
	\PP\Big( \Big|\tfrac{1}{n}\textstyle\sum_{k \le n} X_k - \EE[X_1]\Big| > \varepsilon \Big) \le \frac{\sigma^2}{n \varepsilon^2} \to 0.
$$

The strong form [(1)](eq:slln) needs more care and the [Lebesgue integral](../lebesgue-integral/)'s convergence theorems.
