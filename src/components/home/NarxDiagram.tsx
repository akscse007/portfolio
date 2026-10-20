'use client';

import { useRef } from 'react';
import { ANY_MOTION, getGsap, useGsapEffect } from '@/components/motion/gsap';

/**
 * Conceptual NARX schematic (public-safe, no operational details):
 * exogenous inputs u(t) and fed-back predictions ŷ pass through tapped delay lines
 * into a nonlinear mapping f(·). Paths draw themselves as the diagram scrolls into view.
 */
export function NarxDiagram() {
  const ref = useRef<SVGSVGElement>(null);

  useGsapEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    const { gsap } = getGsap();
    const mm = gsap.matchMedia();
    mm.add(ANY_MOTION, () => {
      const paths = Array.from(svg.querySelectorAll<SVGPathElement>('[data-draw]'));
      paths.forEach((p) => {
        const len = p.getTotalLength();
        gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
      });
      gsap.to(paths, {
        strokeDashoffset: 0,
        duration: 1.6,
        ease: 'power2.inOut',
        stagger: 0.15,
        scrollTrigger: { trigger: svg, start: 'top 75%', once: true },
      });
      gsap.from(svg.querySelectorAll('[data-node]'), {
        opacity: 0,
        scale: 0.85,
        transformOrigin: 'center',
        duration: 0.8,
        stagger: 0.08,
        ease: 'expo.out',
        scrollTrigger: { trigger: svg, start: 'top 75%', once: true },
      });
      return () =>
        paths.forEach((p) => gsap.set(p, { clearProps: 'strokeDasharray,strokeDashoffset' }));
    });
    return () => mm.revert();
  }, []);

  const box = 'fill-[rgb(var(--c-surface))] stroke-[rgb(var(--c-line))]';
  const text = 'fill-[rgb(var(--c-fg))] font-mono';
  return (
    <figure className="overflow-x-auto">
      <svg
        ref={ref}
        viewBox="0 0 640 300"
        className="min-w-[540px] w-full"
        role="img"
        aria-labelledby="narx-title narx-desc"
      >
        <title id="narx-title">NARX model schematic</title>
        <desc id="narx-desc">
          Exogenous inputs u of t and previous predictions y-hat pass through tapped delay lines
          into a nonlinear function f, which outputs the next prediction. During recursive
          (closed-loop) forecasting the prediction is fed back as an input.
        </desc>
        <defs>
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M0 0 L10 5 L0 10 z" className="fill-[rgb(var(--c-accent))]" />
          </marker>
        </defs>

        <g data-node>
          <rect x="16" y="40" width="120" height="56" rx="3" className={box} />
          <text x="76" y="64" textAnchor="middle" className={text} fontSize="13">
            u(t)
          </text>
          <text
            x="76"
            y="82"
            textAnchor="middle"
            className="fill-[rgb(var(--c-muted))] font-mono"
            fontSize="9"
          >
            exogenous PVs
          </text>
        </g>
        <g data-node>
          <rect x="180" y="30" width="110" height="76" rx="3" className={box} />
          <text x="235" y="58" textAnchor="middle" className={text} fontSize="11">
            TDL
          </text>
          <text
            x="235"
            y="76"
            textAnchor="middle"
            className="fill-[rgb(var(--c-blue))] font-mono"
            fontSize="9"
          >
            u(t−1)…u(t−dᵤ)
          </text>
        </g>
        <g data-node>
          <rect x="180" y="170" width="110" height="76" rx="3" className={box} />
          <text x="235" y="198" textAnchor="middle" className={text} fontSize="11">
            TDL
          </text>
          <text
            x="235"
            y="216"
            textAnchor="middle"
            className="fill-[rgb(var(--c-blue))] font-mono"
            fontSize="9"
          >
            ŷ(t−1)…ŷ(t−d_y)
          </text>
        </g>
        <g data-node>
          <rect
            x="340"
            y="90"
            width="130"
            height="96"
            rx="3"
            className="fill-[rgb(var(--c-elevated))] stroke-[rgb(var(--c-accent))]"
          />
          <text x="405" y="132" textAnchor="middle" className={text} fontSize="16">
            f(·)
          </text>
          <text
            x="405"
            y="154"
            textAnchor="middle"
            className="fill-[rgb(var(--c-muted))] font-mono"
            fontSize="9"
          >
            nonlinear map
          </text>
        </g>
        <g data-node>
          <rect x="520" y="110" width="104" height="56" rx="3" className={box} />
          <text x="572" y="143" textAnchor="middle" className={text} fontSize="13">
            ŷ(t)
          </text>
        </g>

        <path
          data-draw
          d="M136 68 H178"
          fill="none"
          className="stroke-[rgb(var(--c-accent))]"
          strokeWidth="1.5"
          markerEnd="url(#arrow)"
        />
        <path
          data-draw
          d="M290 68 C 320 68, 320 120, 338 120"
          fill="none"
          className="stroke-[rgb(var(--c-accent))]"
          strokeWidth="1.5"
          markerEnd="url(#arrow)"
        />
        <path
          data-draw
          d="M290 208 C 320 208, 320 156, 338 156"
          fill="none"
          className="stroke-[rgb(var(--c-accent))]"
          strokeWidth="1.5"
          markerEnd="url(#arrow)"
        />
        <path
          data-draw
          d="M470 138 H518"
          fill="none"
          className="stroke-[rgb(var(--c-accent))]"
          strokeWidth="1.5"
          markerEnd="url(#arrow)"
        />
        <path
          data-node
          d="M572 166 V272 H120 V208 H178"
          fill="none"
          className="stroke-[rgb(var(--c-blue))]"
          strokeWidth="1.2"
          strokeDasharray="5 4"
          markerEnd="url(#arrow)"
        />
        <text
          x="346"
          y="290"
          textAnchor="middle"
          className="fill-[rgb(var(--c-blue))] font-mono"
          fontSize="9"
        >
          closed-loop feedback · scheduled sampling blends ground truth → predictions during
          training
        </text>
      </svg>
      <figcaption className="annot mt-3">
        Fig. — Conceptual NARX structure. Illustrative only; no operational parameters.
      </figcaption>
    </figure>
  );
}
