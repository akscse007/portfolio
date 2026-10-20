Many real systems have memory: the next value of a signal depends on its own recent past *and* on inputs that drive it. **NARX** models — Nonlinear AutoRegressive models with eXogenous inputs — are a direct way to learn such dynamics from data. This note explains the model, the difference between one-step and recursive forecasting, and why *scheduled sampling* helps a model survive its own mistakes.

> [!NOTE]
> This is a general tutorial. It describes standard techniques and does not contain data, parameters or findings from any specific organisation or project.

## The model

Let $y(t)$ be the signal we want to predict and $\mathbf{u}(t)$ a vector of exogenous inputs. A NARX model assumes

$$
y(t) = f\big(y(t-1), \dots, y(t-d_y),\; \mathbf{u}(t-1), \dots, \mathbf{u}(t-d_u)\big) + \varepsilon(t),
$$

where $d_y$ and $d_u$ are the output and input **lags** and $f$ is a nonlinear function — classically a small neural network, but gradient-boosted trees or other regressors also work.

The past values are supplied through **tapped delay lines**: we build a feature vector from shifted copies of each series.

```python
import pandas as pd

def make_lagged(df: pd.DataFrame, target: str, inputs: list[str], dy: int, du: int):
    feats = {}
    for k in range(1, dy + 1):
        feats[f"{target}_lag{k}"] = df[target].shift(k)
    for col in inputs:
        for k in range(1, du + 1):
            feats[f"{col}_lag{k}"] = df[col].shift(k)
    X = pd.DataFrame(feats, index=df.index)
    y = df[target]
    mask = X.notna().all(axis=1)
    return X[mask], y[mask]
```

## Before modelling: alignment

Sensor and process data rarely arrive on a common clock. Each series may be sampled at different times or rates, so the first job is to put everything on one timeline:

1. Parse timestamps consistently (time zones and units!).
2. Choose a target sampling interval.
3. Resample each series — e.g. take the last value in each bin, or interpolate for slowly varying signals.
4. Join on the common index and decide explicitly how to treat gaps.

```python
aligned = (
    pd.concat(
        {name: s.resample("1s").last() for name, s in series.items()},
        axis=1,
    )
    .ffill(limit=5)        # bridge short gaps only
    .dropna()
)
```

> [!WARNING]
> Never fill gaps using future values when building training data — it leaks information the model will not have at prediction time.

## Two ways to use the model

**Open-loop (series-parallel).** During training the lagged outputs are the *true* past values $y(t-1), y(t-2), \dots$. This is ordinary supervised learning and is easy to optimise.

**Closed-loop (parallel / recursive).** To forecast many steps ahead, or to *simulate* the system offline, the true future values are unknown. The model must feed its own predictions back in:

$$
\hat{y}(t) = f\big(\hat{y}(t-1), \dots, \hat{y}(t-d_y),\; \mathbf{u}(t-1), \dots\big).
$$

```python
def simulate(model, y_init, U, dy, du):
    """Recursive rollout: feed predictions back as lagged outputs."""
    history = list(y_init[-dy:])
    preds = []
    for t in range(du, len(U)):
        y_lags = history[-1:-dy - 1:-1]
        u_lags = U[t - du:t][::-1].ravel()
        y_hat = model.predict([list(y_lags) + list(u_lags)])[0]
        preds.append(y_hat)
        history.append(y_hat)
    return preds
```

## Exposure bias: why recursive forecasts drift

A model trained only in open loop has never seen its own errors as inputs. At rollout time a small error at step $t$ becomes an input at step $t+1$, producing a slightly larger error, and so on. This mismatch between training and use is called **exposure bias**, and it is the main reason good one-step accuracy can still give poor multi-step simulations.

## Scheduled sampling

Scheduled sampling closes that gap gradually. At each training step, each lagged output is taken from the ground truth with probability $p$ and from the model's own prediction with probability $1-p$. The probability starts near 1 and decays over training, for example

$$
p_k = \max\!\left(p_{\min},\; 1 - \frac{k}{K}\right) \quad \text{or} \quad p_k = \frac{c}{c + e^{k/c}},
$$

where $k$ is the epoch. Early on the model learns the easy open-loop mapping; later it is increasingly trained on the kind of noisy inputs it will see in closed loop.

## Single-target versus multi-target

A **single-target** model predicts one variable. A **multi-target** model predicts several coupled variables at once, sharing representations between them — useful when outputs influence each other, but harder to balance because losses on different scales compete. Standardising every target and weighting the losses explicitly is essential.

## Evaluating honestly

- Split by **time**, never randomly: train on the past, validate on the future.
- Report both **one-step** and **closed-loop** errors — they answer different questions.
- Compare against simple baselines (persistence: $\hat{y}(t) = y(t-1)$). A complex model that cannot beat persistence is not learning dynamics.
- Plot residuals over time; structure in the residuals means the model is missing something.

## Summary

| Concept | Key idea |
| --- | --- |
| NARX | predict from lagged outputs and lagged exogenous inputs |
| Open loop | train on true lags — easy, but optimistic |
| Closed loop | feed predictions back — what simulation needs |
| Scheduled sampling | gradually replace true lags with predictions during training |

NARX models are a practical bridge between classical system identification and deep sequence models: simple enough to reason about, flexible enough to capture real nonlinear dynamics.
