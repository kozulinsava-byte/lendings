import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing} from 'remotion';
import {C, PARTICLES, Grain, Vignette} from './tokens';

/* Фон: сетка, свечения, частицы */
export const Backdrop: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();

  const intro = interpolate(frame, [0, 24], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // перспектива: линии уходят вдаль и медленно наползают
  const gridY = interpolate(frame, [0, durationInFrames], [-140, 220], {
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.quad),
  });
  const gridScale = interpolate(frame, [0, durationInFrames], [1.35, 0.86], {
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.quad),
  });

  // свечения дрейфуют
  const driftA = Math.sin((frame / fps) * 0.5) * 70;
  const driftB = Math.cos((frame / fps) * 0.38) * 60;
  const glowFade = interpolate(frame, [0, 30, durationInFrames - 25, durationInFrames], [0, 1, 1, 0.55], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{background: C.bg, overflow: 'hidden'}}>
      <AbsoluteFill style={{opacity: intro}}>
        {/* горизонт — «пол» под сценой */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 340,
            background:
              'linear-gradient(to top, rgba(217,255,58,.10), rgba(124,92,255,.06) 45%, transparent)',
            opacity: intro,
          }}
        />

        {/* сетка */}
        <div
          style={{
            position: 'absolute',
            inset: '-25% -25%',
            transform: `translateY(${gridY}px) scale(${gridScale})`,
            backgroundImage: `
              linear-gradient(rgba(217,255,58,.16) 1px, transparent 1px),
              linear-gradient(90deg, rgba(217,255,58,.16) 1px, transparent 1px)
            `,
            backgroundSize: '92px 92px',
            maskImage:
              'radial-gradient(72% 68% at 50% 46%, #000 12%, transparent 82%)',
            WebkitMaskImage:
              'radial-gradient(72% 68% at 50% 46%, #000 12%, transparent 82%)',
          }}
        />

        {/* свечения */}
        <div
          style={{
            position: 'absolute',
            width: 1100,
            height: 1100,
            right: -280,
            top: -400 + driftA,
            background:
              'radial-gradient(circle, rgba(217,255,58,.34), transparent 66%)',
            filter: 'blur(70px)',
            opacity: glowFade,
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: 900,
            height: 900,
            left: -300,
            bottom: -360 + driftB,
            background:
              'radial-gradient(circle, rgba(124,92,255,.34), transparent 66%)',
            filter: 'blur(70px)',
            opacity: glowFade,
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: 700,
            height: 460,
            left: '50%',
            top: '46%',
            transform: `translate(-50%, -50%) translateY(${driftB * 0.4}px)`,
            background:
              'radial-gradient(ellipse, rgba(255,255,255,.07), transparent 70%)',
            filter: 'blur(40px)',
            opacity: intro,
          }}
        />

        {/* частицы */}
        {PARTICLES.map((p, i) => {
          const rise = ((frame * p.speed) / durationInFrames) * 100;
          const y = ((p.y - rise) % 120 + 120) % 120 - 10;
          const tw = 0.5 + 0.5 * Math.sin((frame / fps) * 1.6 + p.phase);
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: `${p.x}%`,
                top: `${y}%`,
                width: p.size,
                height: p.size,
                borderRadius: '50%',
                background: i % 4 === 0 ? C.lime : C.fg,
                opacity: p.opacity * (0.45 + tw * 0.55) * intro,
                boxShadow: i % 4 === 0 ? '0 0 10px rgba(217,255,58,.9)' : 'none',
              }}
            />
          );
        })}
      </AbsoluteFill>

      <Grain />
      <Vignette />
    </AbsoluteFill>
  );
};