import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';
import { PageHero } from '@/components/ui/primitives';
import { Tex } from '@/components/playground/Tex';
import { Parametric } from '@/components/playground/Parametric';
import { FunctionPlot } from '@/components/playground/FunctionPlot';
import { VectorField } from '@/components/playground/VectorField';
import { GradientDescent } from '@/components/playground/GradientDescent';
import { MatrixTransform } from '@/components/playground/MatrixTransform';
import { NeuralNet } from '@/components/playground/NeuralNet';
import { Fourier } from '@/components/playground/Fourier';

export const metadata: Metadata = pageMetadata({
  title: 'Playground — Interactive mathematics',
  description:
    'Interactive parametric curves, function plots, vector fields, gradient descent, matrix transformations, a neural network and Fourier series.',
  path: '/playground',
});

const INDEX = [
  ['parametric', 'Parametric curves'],
  ['functions', 'Function plotter'],
  ['vector-fields', 'Vector fields'],
  ['gradient-descent', 'Gradient descent'],
  ['matrices', 'Matrix transformations'],
  ['neural-network', 'Neural network'],
  ['fourier', 'Fourier series'],
] as const;

export default function PlaygroundPage() {
  return (
    <>
      <PageHero
        index="06"
        label="Mathematics playground"
        title={
          <>
            Touch the{' '}
            <span className="font-serif font-normal normal-case italic text-accent">maths</span>
          </>
        }
        intro="Seven small laboratories. Change a parameter, watch the structure respond, then read why. Every canvas pauses when off-screen and respects reduced-motion settings."
      >
        <nav aria-label="Playground sections" className="mt-10">
          <ol className="flex flex-wrap gap-2">
            {INDEX.map(([id, label], i) => (
              <li key={id}>
                <a href={`#${id}`} className="chip">
                  <span className="text-accent">0{i + 1}</span> {label}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </PageHero>

      <div className="container-page pb-section">
        <Parametric
          explanation={
            <>
              <p>
                A parametric curve traces a point whose coordinates are both functions of a
                parameter <Tex>t</Tex>. Lissajous figures combine two sine waves:
              </p>
              <Tex display>{String.raw`x(t) = \sin(a t + \delta), \qquad y(t) = \sin(b t)`}</Tex>
              <p>
                When the ratio <Tex>a : b</Tex> is rational the curve closes; the phase{' '}
                <Tex>\delta</Tex> twists it. Oscilloscopes draw exactly these shapes when comparing
                two signals&rsquo; frequencies.
              </p>
            </>
          }
        />
        <FunctionPlot
          explanation={
            <>
              <p>
                Type a function of <Tex>x</Tex> and see it plotted alongside its derivative,
                estimated with a central difference:
              </p>
              <Tex display>{String.raw`f'(x) \approx \frac{f(x+h) - f(x-h)}{2h}`}</Tex>
              <p>
                The moving point shows the tangent line — the local linear approximation that
                gradient descent relies on. Expressions are parsed by a small restricted grammar,
                never executed as code.
              </p>
            </>
          }
        />
        <VectorField
          explanation={
            <>
              <p>
                A vector field assigns a direction to every point. Particles follow the field by
                solving
              </p>
              <Tex display>{String.raw`\frac{d\mathbf{x}}{dt} = F(\mathbf{x})`}</Tex>
              <p>
                Sinks, sources, saddles and spirals are the building blocks of dynamical systems;
                the damped pendulum shows how they combine in a real physical system.
              </p>
            </>
          }
        />
        <GradientDescent
          explanation={
            <>
              <p>Gradient descent walks downhill on a loss surface:</p>
              <Tex
                display
              >{String.raw`\mathbf{v}_{t+1} = \beta \mathbf{v}_t + \nabla L(\boldsymbol\theta_t), \qquad \boldsymbol\theta_{t+1} = \boldsymbol\theta_t - \eta\, \mathbf{v}_{t+1}`}</Tex>
              <p>
                On the narrow valley, plain descent (<Tex>\beta = 0</Tex>) zig-zags; momentum
                smooths the path. Push <Tex>\eta</Tex> too high and the iterates diverge. Tap the
                surface to choose a new starting point.
              </p>
            </>
          }
        />
        <MatrixTransform
          explanation={
            <>
              <p>
                A <Tex>2 \times 2</Tex> matrix is a function that moves every point of the plane.
                Its columns are where the basis vectors land:
              </p>
              <Tex
                display
              >{String.raw`A = \begin{bmatrix} a & b \\ c & d \end{bmatrix}, \quad A\hat{\imath} = \begin{bmatrix} a \\ c \end{bmatrix}, \quad A\hat{\jmath} = \begin{bmatrix} b \\ d \end{bmatrix}`}</Tex>
              <p>
                The shaded square&rsquo;s area scales by{' '}
                <Tex>{String.raw`|\det A| = |ad - bc|`}</Tex>. Dashed lines are eigenvectors —
                directions that are only stretched, never rotated. A determinant of zero collapses
                the plane onto a line.
              </p>
            </>
          }
        />
        <NeuralNet
          explanation={
            <>
              <p>
                A two-hidden-layer network with <Tex>\tanh</Tex> activations learns to separate two
                classes, trained live in your browser with backpropagation and stochastic gradient
                descent on the binary cross-entropy loss:
              </p>
              <Tex
                display
              >{String.raw`L = -\big[y \log \hat{y} + (1 - y)\log(1 - \hat{y})\big]`}</Tex>
              <p>
                Line thickness shows weight magnitude; colour shows sign. The background is the
                network&rsquo;s current decision boundary.
              </p>
            </>
          }
        />
        <Fourier
          explanation={
            <>
              <p>
                Any reasonable periodic signal is a sum of sines. A square wave, for example, is
              </p>
              <Tex
                display
              >{String.raw`f(\theta) = \frac{4}{\pi} \sum_{k=0}^{N-1} \frac{\sin\big((2k+1)\theta\big)}{2k+1}`}</Tex>
              <p>
                Each term is a rotating circle (an epicycle); stacking them draws the partial sum.
                Notice the overshoot near the jumps that never disappears — the Gibbs phenomenon.
              </p>
            </>
          }
        />
      </div>
    </>
  );
}
