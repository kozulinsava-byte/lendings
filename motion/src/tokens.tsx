import React from 'react';

/* Псевдослучайные, но стабильные между кадрами значения */
const rand = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

export const PARTICLES = Array.from({length: 22}, (_, i) => ({
  x: rand(i + 1) * 100,
  y: rand(i + 40) * 100,
  size: 1.5 + rand(i + 90) * 3.2,
  speed: 0.25 + rand(i + 140) * 0.75,
  phase: rand(i + 200) * Math.PI * 2,
  opacity: 0.15 + rand(i + 300) * 0.5,
}));

export const CARDS = [
  {
    grad: 'linear-gradient(150deg,#ff8a3d,#7b1d12)',
    tag: 'общепит',
    title: 'Шаурмячная',
    seed: 3,
  },
  {
    grad: 'linear-gradient(150deg,#e6c9b6,#8a5b44)',
    tag: 'бьюти',
    title: 'Салон красоты',
    seed: 7,
  },
  {
    grad: 'linear-gradient(150deg,#7fd8c8,#0b6f72)',
    tag: 'медицина',
    title: 'Стоматология',
    seed: 11,
  },
];

export const DISPLAY =
  '"Bahnschrift SemiBold Condensed", "Bahnschrift", "Arial Narrow", "Segoe UI", sans-serif';
export const TEXT = '"Segoe UI", Inter, system-ui, -apple-system, sans-serif';
export const MONO = '"Consolas", "Cascadia Mono", ui-monospace, monospace';

export const C = {
  bg: '#08090B',
  fg: '#F4F5F7',
  muted: '#8D8F99',
  lime: '#D9FF3A',
  violet: '#7C5CFF',
  line: 'rgba(255,255,255,.14)',
};

export const Grain: React.FC = () => (
  <>
    <svg width="0" height="0" style={{position: 'absolute'}}>
      <filter id="grainFilter">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.82"
          numOctaves="3"
          stitchTiles="stitch"
        />
        <feColorMatrix type="saturate" values="0" />
      </filter>
    </svg>
    <svg
      width="100%"
      height="100%"
      style={{position: 'absolute', inset: 0, mixBlendMode: 'overlay', opacity: 0.05}}
    >
      <rect width="100%" height="100%" filter="url(#grainFilter)" />
    </svg>
  </>
);

export const Vignette: React.FC = () => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      background:
        'radial-gradient(120% 90% at 50% 45%, transparent 40%, rgba(0,0,0,.55) 100%)',
      pointerEvents: 'none',
    }}
  />
);