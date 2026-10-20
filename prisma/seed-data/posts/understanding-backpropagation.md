Backpropagation is not a learning algorithm. It is an *efficient bookkeeping method* for the chain rule that computes the gradient of a loss with respect to every weight in a network in roughly the time of one forward pass. Gradient descent then uses those gradients to learn.

## The chain rule, revisited

If $L$ depends on $y$, and $y$ depends on $x$, then

$$
\frac{\partial L}{\partial x} = \frac{\partial L}{\partial y} \cdot \frac{\partial y}{\partial x}.
$$

A neural network is a long chain of such dependencies. Backprop applies this rule from the loss backwards, reusing each intermediate result instead of recomputing it.

## A tiny network by hand

Consider one hidden layer:

$$
\mathbf{z}_1 = W_1 \mathbf{x} + \mathbf{b}_1,\quad
\mathbf{h} = \operatorname{ReLU}(\mathbf{z}_1),\quad
\hat{y} = \mathbf{w}_2 \cdot \mathbf{h} + b_2,\quad
L = \tfrac{1}{2}(\hat{y} - y)^2 .
$$

Working backwards, define $\delta = \partial L / \partial \hat{y} = \hat{y} - y$. Then

$$
\frac{\partial L}{\partial \mathbf{w}_2} = \delta\, \mathbf{h}, \qquad
\frac{\partial L}{\partial \mathbf{h}} = \delta\, \mathbf{w}_2, \qquad
\frac{\partial L}{\partial \mathbf{z}_1} = \frac{\partial L}{\partial \mathbf{h}} \odot \mathbb{1}[\mathbf{z}_1 > 0],
$$

$$
\frac{\partial L}{\partial W_1} = \frac{\partial L}{\partial \mathbf{z}_1}\, \mathbf{x}^\top, \qquad
\frac{\partial L}{\partial \mathbf{b}_1} = \frac{\partial L}{\partial \mathbf{z}_1}.
$$

Each line uses only the quantity computed just before it plus values saved during the forward pass.

## The same thing in code

```python
import numpy as np

def forward_backward(x, y, W1, b1, w2, b2):
    # forward — keep intermediates
    z1 = W1 @ x + b1
    h = np.maximum(0, z1)
    y_hat = w2 @ h + b2
    loss = 0.5 * (y_hat - y) ** 2
    # backward
    d = y_hat - y
    grad_w2 = d * h
    grad_b2 = d
    dh = d * w2
    dz1 = dh * (z1 > 0)
    grad_W1 = np.outer(dz1, x)
    grad_b1 = dz1
    return loss, (grad_W1, grad_b1, grad_w2, grad_b2)
```

> [!TIP]
> Verify hand-written gradients with finite differences (see *Gradient Descent from First Principles*). Every framework author does.

## Why it is efficient

A network with $P$ parameters has $P$ partial derivatives. Estimating each with finite differences costs $P$ forward passes. Backprop computes all of them with **one forward and one backward pass** — the backward pass costs about the same as the forward. For a model with millions of parameters, that is the difference between impossible and routine.

## Computational graphs and autodiff

Frameworks such as PyTorch record every operation in a graph during the forward pass. Each operation knows its local derivative. Calling `.backward()` walks the graph in reverse topological order, multiplying local derivatives — exactly the hand derivation above, automated.

```python
import torch
W1 = torch.randn(4, 3, requires_grad=True)
x = torch.randn(3)
loss = torch.relu(W1 @ x).sum()
loss.backward()
print(W1.grad)  # ∂loss/∂W1
```

## Vanishing and exploding gradients

Backprop multiplies many local derivatives together. If they are mostly smaller than 1 (e.g. saturated sigmoids), the product shrinks towards zero in early layers — **vanishing gradients**. If they are larger than 1, it blows up. The standard remedies:

- ReLU-family activations, which have derivative 1 on their active side.
- Careful initialisation (He / Xavier) that keeps activations at a stable scale.
- Normalisation layers and residual connections, which give gradients a short path backwards.
- Gradient clipping for recurrent networks.

## Summary

Backpropagation = chain rule + caching. Understand it once by hand for a two-layer network and every architecture afterwards becomes "the same thing with more boxes".
