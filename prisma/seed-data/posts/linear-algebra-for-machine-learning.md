Machine learning papers look intimidating mostly because of notation. Underneath, a surprising amount of the field is four ideas from linear algebra used over and over: **vectors**, **matrices as functions**, **dot products as similarity**, and **decompositions**. This note builds each one from scratch and shows where it appears in practice.

> [!NOTE]
> You only need school algebra to follow along. Every formula is paired with a small piece of NumPy so you can check it yourself.

## Vectors are lists with geometry

A vector $\mathbf{x} \in \mathbb{R}^n$ is an ordered list of $n$ real numbers. In ML, a vector is almost always *one example*: a house described by its area, number of rooms and age is

$$
\mathbf{x} = \begin{bmatrix} 120 \\ 3 \\ 15 \end{bmatrix} \in \mathbb{R}^3 .
$$

The geometry matters because it gives us **length** and **angle**. The Euclidean length (the $\ell_2$ norm) is

$$
\lVert \mathbf{x} \rVert_2 = \sqrt{x_1^2 + x_2^2 + \dots + x_n^2}.
$$

```python
import numpy as np

x = np.array([120.0, 3.0, 15.0])
print(np.linalg.norm(x))      # length of the vector
```

> [!TIP]
> Notice that "area" dominates the length because its numbers are large. This is exactly why we **standardise features** before training distance-based models such as k-NN or k-means.

## The dot product measures agreement

For two vectors of the same size,

$$
\mathbf{a} \cdot \mathbf{b} = \sum_{i=1}^{n} a_i b_i = \lVert \mathbf{a} \rVert \, \lVert \mathbf{b} \rVert \cos\theta .
$$

The second form is the important one: the dot product is large when the vectors point the same way, zero when they are perpendicular and negative when they disagree. Dividing out the lengths gives **cosine similarity**, which is how embedding search ranks documents in a RAG system:

$$
\operatorname{cos\_sim}(\mathbf{a}, \mathbf{b}) = \frac{\mathbf{a} \cdot \mathbf{b}}{\lVert \mathbf{a} \rVert \, \lVert \mathbf{b} \rVert}.
$$

A linear model is nothing more than a dot product plus a bias:

$$
\hat{y} = \mathbf{w} \cdot \mathbf{x} + b .
$$

Each weight $w_i$ says how much feature $x_i$ "agrees" with the target.

## Matrices are functions

A matrix $A \in \mathbb{R}^{m \times n}$ is best understood as a **function** that takes a vector in $\mathbb{R}^n$ and returns a vector in $\mathbb{R}^m$:

$$
\mathbf{y} = A\mathbf{x}, \qquad y_i = \sum_{j=1}^{n} A_{ij} x_j .
$$

Each output is the dot product of one *row* of $A$ with $\mathbf{x}$. Equivalently, $A\mathbf{x}$ is a weighted sum of the *columns* of $A$, with the entries of $\mathbf{x}$ as weights. Keep both pictures in mind — the row picture explains computation, the column picture explains what is reachable.

### A neural network layer is a matrix

A dense layer with 3 inputs and 4 outputs is

$$
\mathbf{h} = \sigma(W\mathbf{x} + \mathbf{b}), \qquad W \in \mathbb{R}^{4 \times 3}.
$$

Stacking examples as rows of a data matrix $X \in \mathbb{R}^{N \times 3}$ lets us process a whole batch at once: $H = \sigma(XW^\top + \mathbf{b})$. That single matrix multiply is why GPUs are so effective for deep learning.

```python
rng = np.random.default_rng(0)
X = rng.normal(size=(32, 3))   # a batch of 32 examples
W = rng.normal(size=(4, 3))
b = np.zeros(4)
H = np.maximum(0, X @ W.T + b)  # ReLU(XWᵀ + b) → shape (32, 4)
```

## Composition and shape-checking

Applying $B$ after $A$ is the matrix $BA$ — and the inner dimensions must match: $(p \times m)(m \times n) = (p \times n)$. Most "my code crashed" moments in ML are shape mismatches, so get into the habit of writing shapes next to every line, as above.

| Object | Shape | Meaning |
| --- | --- | --- |
| $X$ | $N \times d$ | data, one example per row |
| $\mathbf{w}$ | $d$ | weights of a linear model |
| $X\mathbf{w}$ | $N$ | one prediction per example |
| $X^\top X$ | $d \times d$ | feature–feature interactions |

## Solving least squares

Given data $X$ and targets $\mathbf{y}$, linear regression chooses $\mathbf{w}$ to minimise the squared error $\lVert X\mathbf{w} - \mathbf{y} \rVert^2$. Setting the gradient to zero gives the **normal equations**:

$$
X^\top X \mathbf{w} = X^\top \mathbf{y}.
$$

In practice we never invert $X^\top X$ directly — it can be ill-conditioned. Libraries solve the system with a stable factorisation:

```python
w, *_ = np.linalg.lstsq(X, y, rcond=None)
```

## Eigenvectors: directions a matrix does not rotate

A non-zero vector $\mathbf{v}$ is an eigenvector of a square matrix $A$ if

$$
A\mathbf{v} = \lambda \mathbf{v}.
$$

$A$ only *stretches* $\mathbf{v}$ by the factor $\lambda$. For the covariance matrix of centred data, $C = \tfrac{1}{N} X^\top X$, the eigenvectors are the directions of greatest variance — that is **Principal Component Analysis**. Projecting onto the top $k$ eigenvectors compresses $d$ features into $k$ while keeping as much spread as possible.

## The SVD: the decomposition behind everything

Every matrix — square or not — factorises as

$$
X = U \Sigma V^\top ,
$$

where $U$ and $V$ have orthonormal columns and $\Sigma$ is diagonal with non-negative singular values. Reading it as "rotate, scale, rotate" explains PCA (the columns of $V$), low-rank approximation (keep the largest singular values), recommender systems (matrix factorisation) and the numerical stability of least squares.

## What to practise next

1. Write the shape of every array in a small neural network by hand.
2. Implement cosine similarity and rank five sentences by similarity to a query.
3. Run PCA on a dataset with `np.linalg.svd` and plot the first two components.

The [matrix transformation demo](/playground) in the playground lets you drag a $2 \times 2$ matrix and watch the grid, determinant and eigenvectors change in real time.
