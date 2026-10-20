Almost every model you will train — from linear regression to a large language model — is fitted by some variant of one algorithm: **walk downhill on the loss**. This note derives gradient descent from the definition of a derivative, implements it in a few lines and explains the knobs you will tune in practice.

## The problem: minimise a function you cannot solve

Training means choosing parameters $\boldsymbol\theta$ to minimise a loss $L(\boldsymbol\theta)$ averaged over the data:

$$
L(\boldsymbol\theta) = \frac{1}{N} \sum_{i=1}^{N} \ell\big(f_{\boldsymbol\theta}(\mathbf{x}_i), y_i\big).
$$

For linear regression there is a closed-form answer. For a neural network there is not. We need a method that only asks one question repeatedly: *if I nudge the parameters, does the loss go up or down?*

## One dimension: the derivative tells you which way is down

Near a point $\theta$, a smooth function is approximately a straight line:

$$
L(\theta + \Delta) \approx L(\theta) + L'(\theta)\,\Delta .
$$

If we choose $\Delta = -\eta\, L'(\theta)$ for a small positive step size $\eta$, then

$$
L(\theta + \Delta) \approx L(\theta) - \eta\, L'(\theta)^2 \le L(\theta).
$$

The loss decreases (to first order) whenever the derivative is non-zero. Repeating the step gives the update rule

$$
\theta_{t+1} = \theta_t - \eta\, L'(\theta_t).
$$

## Many dimensions: the gradient

With many parameters, the derivative becomes the **gradient** — the vector of partial derivatives

$$
\nabla L(\boldsymbol\theta) = \left( \frac{\partial L}{\partial \theta_1}, \dots, \frac{\partial L}{\partial \theta_d} \right).
$$

By the same first-order argument, $-\nabla L$ is the direction of steepest descent, and the update is

$$
\boldsymbol\theta_{t+1} = \boldsymbol\theta_t - \eta\, \nabla L(\boldsymbol\theta_t).
$$

## A complete implementation

Here is linear regression trained with gradient descent on mean squared error. For $L(\mathbf{w}) = \frac{1}{N}\lVert X\mathbf{w} - \mathbf{y}\rVert^2$, the gradient is $\nabla L = \frac{2}{N} X^\top (X\mathbf{w} - \mathbf{y})$.

```python
import numpy as np

rng = np.random.default_rng(42)
N, d = 200, 3
X = rng.normal(size=(N, d))
true_w = np.array([2.0, -1.0, 0.5])
y = X @ true_w + 0.1 * rng.normal(size=N)

w = np.zeros(d)
lr = 0.1
for step in range(200):
    residual = X @ w - y
    grad = (2 / N) * X.T @ residual
    w -= lr * grad
    if step % 50 == 0:
        print(step, np.mean(residual ** 2))

print(w)  # close to [2.0, -1.0, 0.5]
```

> [!TIP]
> Always print the loss during training. A loss that explodes means the learning rate is too large; a loss that barely moves means it is too small (or your gradient is wrong).

## The learning rate

The step size $\eta$ is the most important hyperparameter. For a quadratic bowl $L(\theta) = \tfrac{a}{2}\theta^2$, the update is $\theta_{t+1} = (1 - \eta a)\theta_t$:

| $\eta a$ | behaviour |
| --- | --- |
| between 0 and 1 | smooth, monotone convergence |
| between 1 and 2 | converges while oscillating |
| greater than 2 | diverges |

Real losses have different curvature in different directions, so a single $\eta$ that is safe for the steepest direction is painfully slow for the flattest. This mismatch — a large **condition number** — is why plain gradient descent zig-zags across narrow valleys.

## Stochastic and mini-batch gradient descent

Computing the exact gradient needs a pass over all $N$ examples. Instead, we estimate it from a random mini-batch $B$:

$$
\nabla L(\boldsymbol\theta) \approx \frac{1}{|B|} \sum_{i \in B} \nabla \ell_i(\boldsymbol\theta).
$$

The estimate is unbiased but noisy. The noise is not only tolerable — it helps the optimiser escape flat regions and poor local minima. Batch sizes of 32–512 are common.

## Momentum: remember where you were going

Momentum keeps a running velocity so that consistent directions accelerate and oscillating ones cancel:

$$
\mathbf{v}_{t+1} = \beta \mathbf{v}_t + \nabla L(\boldsymbol\theta_t), \qquad
\boldsymbol\theta_{t+1} = \boldsymbol\theta_t - \eta\, \mathbf{v}_{t+1}.
$$

With $\beta = 0.9$, the effective step along a consistent direction is about ten times larger, while zig-zag components largely average out.

## Adam in one paragraph

Adam combines momentum with a per-parameter step size. It tracks the running mean $\mathbf{m}$ and running mean square $\mathbf{s}$ of the gradients and divides one by the square root of the other, so parameters with large, noisy gradients take smaller steps:

$$
\boldsymbol\theta_{t+1} = \boldsymbol\theta_t - \eta \,\frac{\hat{\mathbf{m}}_t}{\sqrt{\hat{\mathbf{s}}_t} + \epsilon}.
$$

It is a robust default, though well-tuned SGD with momentum still generalises better on some vision tasks.

## Checking your gradients

When you implement a gradient by hand, compare it with a finite-difference estimate:

$$
\frac{\partial L}{\partial \theta_j} \approx \frac{L(\boldsymbol\theta + h\mathbf{e}_j) - L(\boldsymbol\theta - h\mathbf{e}_j)}{2h}.
$$

```python
def numerical_grad(f, theta, h=1e-5):
    g = np.zeros_like(theta)
    for j in range(theta.size):
        e = np.zeros_like(theta); e[j] = h
        g[j] = (f(theta + e) - f(theta - e)) / (2 * h)
    return g
```

If the relative difference is above about $10^{-6}$, there is probably a bug.

## Try it

The [gradient descent demo](/playground) lets you change the learning rate and momentum on a 2-D loss surface and watch the path — including what divergence looks like. Next in this series: **Understanding Backpropagation**, which is simply an efficient way to compute $\nabla L$ for a neural network.
