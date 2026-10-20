Every loss function you minimise is secretly a probability distribution. Mean squared error assumes Gaussian noise; cross-entropy assumes a categorical outcome. Knowing a handful of distributions — and *why* they appear — makes model design far less mysterious.

## Random variables in one paragraph

A random variable $X$ assigns a number to each outcome of an experiment. Discrete variables have a **probability mass function** $P(X = x)$; continuous ones have a **density** $p(x)$ with $P(a \le X \le b) = \int_a^b p(x)\,dx$. Two summaries matter most:

$$
\mathbb{E}[X] = \sum_x x\,P(X=x), \qquad \operatorname{Var}(X) = \mathbb{E}\big[(X - \mathbb{E}[X])^2\big].
$$

## Bernoulli and binomial — yes/no outcomes

A Bernoulli variable is 1 with probability $p$ and 0 otherwise. Logistic regression models $p = \sigma(\mathbf{w}\cdot\mathbf{x} + b)$, and maximising the likelihood of observed labels gives **binary cross-entropy**:

$$
-\log P(y \mid \mathbf{x}) = -\big[y \log p + (1-y)\log(1-p)\big].
$$

Counting successes in $n$ independent trials gives the binomial distribution, with mean $np$ and variance $np(1-p)$.

## Categorical — one of $K$ classes

The categorical distribution generalises Bernoulli to $K$ outcomes with probabilities $\pi_1,\dots,\pi_K$. A softmax layer produces them from scores $z_k$:

$$
\pi_k = \frac{e^{z_k}}{\sum_j e^{z_j}}.
$$

Its negative log-likelihood is the familiar **cross-entropy loss** used for classification and for next-token prediction in language models.

## Gaussian — noise and measurement

The normal distribution $\mathcal{N}(\mu, \sigma^2)$ has density

$$
p(x) = \frac{1}{\sqrt{2\pi\sigma^2}} \exp\!\left(-\frac{(x-\mu)^2}{2\sigma^2}\right).
$$

If we assume $y = f(\mathbf{x}) + \varepsilon$ with $\varepsilon \sim \mathcal{N}(0, \sigma^2)$, the negative log-likelihood is, up to constants, $\frac{1}{2\sigma^2}(y - f(\mathbf{x}))^2$ — so **minimising MSE is maximum-likelihood estimation under Gaussian noise**.

> [!TIP]
> If your errors have heavy tails (occasional huge outliers), the Gaussian assumption is wrong. A Laplace assumption gives mean *absolute* error instead, which is far less sensitive to outliers.

## Poisson — counts per interval

For counts of events in a fixed interval — patients per day, requests per second — the Poisson distribution with rate $\lambda$ is a natural model:

$$
P(X = k) = \frac{\lambda^k e^{-\lambda}}{k!}, \qquad \mathbb{E}[X] = \operatorname{Var}(X) = \lambda.
$$

Forecasting count data with a Poisson loss respects the fact that counts are non-negative integers whose spread grows with their mean.

## The central limit theorem

Averages of many independent variables are approximately Gaussian regardless of the original distribution:

$$
\sqrt{n}\,\big(\bar{X}_n - \mu\big) \xrightarrow{d} \mathcal{N}(0, \sigma^2).
$$

This is why confidence intervals for an evaluation metric averaged over a test set are usually computed with a normal approximation.

## A cheat sheet

| Situation | Distribution | Typical loss |
| --- | --- | --- |
| binary label | Bernoulli | binary cross-entropy |
| one of $K$ classes | categorical | cross-entropy |
| real value, symmetric noise | Gaussian | MSE |
| real value, outliers | Laplace | MAE |
| counts | Poisson | Poisson NLL |

## Simulate to build intuition

```python
import numpy as np
rng = np.random.default_rng(7)
samples = rng.exponential(scale=2.0, size=(10_000, 30)).mean(axis=1)
print(samples.mean(), samples.std())  # ≈ 2.0 and ≈ 2/sqrt(30)
```

Plot a histogram of `samples` and you will see the central limit theorem turn a skewed exponential into a bell curve.
