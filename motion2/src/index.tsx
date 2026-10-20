import React from 'react';
import {
  Composition,
  registerRoot,
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
  staticFile,
  Img,
} from 'remotion';

import timeline from './timeline_v4.json';

const W = 1920;
const H = 1080;
const FPS = 60;

const C = {
  bg: '#06070A',
  text: '#F6F8FB',
  muted: '#838C99',
  lime: '#D9FF3A',
  violet: '#8B5CFF',
  cyan: '#22E3FF',
  green: '#4ADE80',
  red: '#FF5A5A',
  line: 'rgba(255,255,255,.14)',
  card: '#12171E',
};

const DISPLAY = '"Oswald", "Bahnschrift Condensed", "Segoe UI", sans-serif';
const TEXT = '"Manrope", system-ui, sans-serif';
const MONO = '"JetBrains Mono", ui-monospace, monospace';

type Seg = { id: string; text: string; start: number; dur: number; gap: number; mood: string };

const SEGS = timeline.segments as Seg[];
const TOTAL = timeline.total;
const F = (s: number) => Math.round(s * FPS);
const S = (id: string) => SEGS.find((x) => x.id === id)!;
const local = (id: string) => useCurrentFrame() - F(S(id).start);

/* ══════════════ СЛОИ ГЛУБИНЫ ══════════════ */
const Backdrop: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const gy = (t * 34) % 84;
  const gs = 1.34 - Math.min(0.36, t * 0.0058);
  const rot = Math.sin(t * 0.15) * 1.8;

  return (
    <AbsoluteFill style={{ background: C.bg, overflow: 'hidden' }}>
      {/* дальний план: сетка */}
      <div
        style={{
          position: 'absolute',
          inset: '-48%',
          transform: `translateY(${gy}px) scale(${gs}) rotate(${rot}deg)`,
          backgroundImage: `linear-gradient(rgba(217,255,58,.24) 1px, transparent 1px),
            linear-gradient(90deg, rgba(217,255,58,.24) 1px, transparent 1px)`,
          backgroundSize: '84px 84px',
          maskImage: 'radial-gradient(58% 58% at 50% 48%, #000 6%, transparent 72%)',
          WebkitMaskImage: 'radial-gradient(58% 58% at 50% 48%, #000 6%, transparent 72%)',
        }}
      />
      {/* блумы */}
      <div style={{ position: 'absolute', width: 980, height: 980, right: -240, top: -400 + Math.sin(t * 0.34) * 110, background: 'radial-gradient(circle, rgba(217,255,58,.36), transparent 65%)', filter: 'blur(110px)', opacity: 0.62 }} />
      <div style={{ position: 'absolute', width: 940, height: 940, left: -260, bottom: -380 + Math.cos(t * 0.27) * 90, background: 'radial-gradient(circle, rgba(139,92,255,.38), transparent 65%)', filter: 'blur(110px)', opacity: 0.62 }} />
      <div style={{ position: 'absolute', width: 700, height: 700, left: '50%', top: '46%', transform: 'translate(-50%,-50%)', background: 'radial-gradient(circle, rgba(34,227,255,.17), transparent 66%)', filter: 'blur(90px)', opacity: 0.8 }} />
      {/* ключевой свет за объектом */}
      <div style={{ position: 'absolute', left: '50%', top: '44%', width: 1400, height: 840, transform: 'translate(-50%,-50%)', background: 'radial-gradient(ellipse, rgba(255,255,255,.15), transparent 66%)', filter: 'blur(90px)' }} />

      <Particles />
    </AbsoluteFill>
  );
};

const Particles: React.FC<{ near?: boolean }> = ({ near }) => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const n = near ? 26 : 44;
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const seed = i * 7.13 + (near ? 91 : 0);
        const x = ((Math.sin(seed) * 0.5 + 0.5) * 100 + Math.sin(t * (0.3 + (i % 5) * 0.1) + seed) * 11 + 100) % 100;
        const speed = (near ? 34 : 16) + (i % 7) * (near ? 16 : 10);
        const y = ((100 - ((t * speed + i * 41) % 150)) + 150) % 150 - 25;
        const sz = (near ? 2.4 : 1.5) + (i % 5) * (near ? 1.8 : 1.1);
        const c = i % 3 === 0 ? C.lime : i % 3 === 1 ? C.cyan : C.text;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${x}%`,
              top: `${y}%`,
              width: sz,
              height: sz,
              borderRadius: '50%',
              background: c,
              opacity: (near ? 0.24 : 0.4) * (0.4 + 0.6 * Math.abs(Math.sin(t * 1.6 + seed))),
              boxShadow: c === C.lime ? `0 0 ${near ? 18 : 12}px rgba(217,255,58,.95)` : 'none',
              filter: near ? 'blur(0.5px)' : 'none',
            }}
          />
        );
      })}
    </>
  );
};

/* ══════════════ ЭФФЕКТЫ ПЕРЕХОДА ══════════════ */
const RGBSplit: React.FC<{ start: number; children: React.ReactNode }> = ({ start, children }) => {
  const frame = useCurrentFrame();
  const d = frame - start;
  const amt = interpolate(d, [0, 5, 11], [0, 13, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (amt < 0.4) return <>{children}</>;
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, transform: `translateX(${-amt}px)`, opacity: 0.55, mixBlendMode: 'screen' }}>
        <div style={{ filter: 'url(#none)', color: '#ff2d55' }}>{children}</div>
      </div>
      <div style={{ position: 'absolute', inset: 0, transform: `translateX(${amt}px)`, opacity: 0.55, mixBlendMode: 'screen' }}>
        <div style={{ color: '#00e5ff' }}>{children}</div>
      </div>
      <div>{children}</div>
    </div>
  );
};

const Streaks: React.FC<{ start: number }> = ({ start }) => {
  const frame = useCurrentFrame();
  const d = frame - start;
  if (d < 0 || d > 16) return null;
  const p = d / 16;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', mixBlendMode: 'screen' }}>
      {Array.from({ length: 7 }, (_, i) => {
        const delay = i * 0.6;
        const lp = Math.max(0, Math.min(1, (d - delay) / 10));
        if (lp <= 0 || lp >= 1) return null;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: `${8 + i * 13}%`,
              left: `${-30 + lp * 130}%`,
              width: 340,
              height: 3,
              background: `linear-gradient(90deg, transparent, ${i % 2 ? C.cyan : C.lime}, transparent)`,
              transform: 'skewX(-22deg)',
              opacity: Math.sin(lp * Math.PI) * 0.85,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

const LightLeak: React.FC<{ start: number; color?: string }> = ({ start, color = C.lime }) => {
  const frame = useCurrentFrame();
  const d = frame - start;
  if (d < 0 || d > 22) return null;
  const p = d / 22;
  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        mixBlendMode: 'screen',
        background: `radial-gradient(60% 120% at ${20 + p * 70}% ${30 + p * 40}%, ${color}55, transparent 60%)`,
        opacity: Math.sin(p * Math.PI) * 0.9,
      }}
    />
  );
};

/* ══════════════ СВЕТЯЩИЙСЯ ТЕКСТ ══════════════ */
const Glow: React.FC<{
  children: React.ReactNode; color?: string; size: number; font?: string; weight?: number; glow?: number; gradient?: boolean;
}> = ({ children, color = C.text, size, font = TEXT, weight = 800, glow = 26, gradient = false }) => (
  <span
    style={{
      fontSize: size,
      fontFamily: font,
      fontWeight: weight,
      letterSpacing: '-.035em',
      lineHeight: 1.05,
      background: gradient
        ? `linear-gradient(100deg, ${C.text} 20%, ${color} 50%, ${C.text} 80%)`
        : undefined,
      backgroundSize: '220% 100%',
      WebkitBackgroundClip: gradient ? 'text' : undefined,
      backgroundClip: gradient ? 'text' : undefined,
      color: gradient ? 'transparent' : color,
      textShadow: gradient ? undefined : `0 0 ${glow}px ${color}70, 0 0 ${glow * 2.6}px ${color}38`,
    }}
  >
    {children}
  </span>
);

/* ══════════════ КИНЕТИЧЕСКАЯ ПОДПИСЬ ══════════════ */
const Caption: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / FPS;

  const active = SEGS.find((s) => frame >= F(s.start) - 2 && frame < F(s.start + s.dur + s.gap));
  if (!active) return null;

  const start = F(active.start);
  const words = active.text.split(' ');
  const per = Math.max(1, (active.dur * fps) / words.length);
  const accent = ['s09', 's14', 's16', 's20', 's21'].includes(active.id);
  const big = active.id === 's14';

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 104,
        padding: '0 110px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0 20px',
        justifyContent: 'center',
        zIndex: 30,
      }}
    >
      {words.map((w, i) => {
        const s = spring({ frame: frame - start - i * per * 0.46, fps, config: { damping: 190, mass: 0.45, stiffness: 220 } });
        const breathe = 1 + Math.sin(t * 2.6 + i * 0.62) * 0.014;
        const gl = 20 + 18 * (0.5 + 0.5 * Math.sin(t * 1.9 + i));
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              opacity: s,
              transform: `translateY(${(1 - s) * 36}px) scale(${breathe})`,
              filter: `blur(${(1 - s) * 6}px)`,
            }}
          >
            <Glow size={big ? 40 : 50} color={accent ? C.lime : C.text} glow={accent ? gl + 18 : gl} gradient={accent}>
              {w}
            </Glow>
          </span>
        );
      })}
    </div>
  );
};

/* ══════════════ КУРСОР (клик по интерфейсу) ══════════════ */
const Cursor: React.FC<{ from: number; x: number; y: number; clickAt?: number }> = ({ from, x, y, clickAt = 26 }) => {
  const frame = useCurrentFrame();
  const d = frame - from;
  const move = spring({ frame: d, fps: FPS, config: { damping: 16, mass: 0.5, stiffness: 190 } });
  const click = interpolate(d, [clickAt, clickAt + 4, clickAt + 14], [0, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (d < 0) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        zIndex: 40,
        pointerEvents: 'none',
        transform: `translate(${move * 0 + (1 - move) * 300}px, ${(1 - move) * 220}px) scale(${1 - click * 0.22})`,
        filter: 'drop-shadow(0 6px 14px rgba(0,0,0,.7))',
      }}
    >
      <svg width="34" height="34" viewBox="0 0 24 24" fill="#fff" stroke="#0A0B0D" strokeWidth="1.4">
        <path d="M4 2l14 9-6 1.6L9.4 19z" />
      </svg>
      {click > 0.05 && (
        <div
          style={{
            position: 'absolute',
            left: 2,
            top: 2,
            width: 30 + click * 60,
            height: 30 + click * 60,
            borderRadius: '50%',
            border: `2px solid ${C.lime}`,
            opacity: click,
          }}
        />
      )}
    </div>
  );
};

/* ══════════════ БЕГУЩАЯ СТРОКА ══════════════ */
const Marquee: React.FC<{ from: number; items: string[]; color?: string }> = ({ from, items, color = C.lime }) => {
  const frame = useCurrentFrame();
  const d = frame - from;
  if (d < 0) return null;
  const x = -((d * 90) % 1400);
  const row = [...items, ...items];
  return (
    <div style={{ overflow: 'hidden', height: 40, position: 'relative', maskImage: 'linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)', WebkitMaskImage: 'linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)' }}>
      <div style={{ display: 'flex', gap: 34, position: 'absolute', left: x, whiteSpace: 'nowrap' }}>
        {row.map((it, i) => (
          <span key={i} style={{ fontFamily: DISPLAY, fontSize: 26, textTransform: 'uppercase', color, letterSpacing: '.04em' }}>
            {it} <span style={{ color: C.muted, margin: '0 12px' }}>·</span>
          </span>
        ))}
      </div>
    </div>
  );
};

/* ══════════════ СЧЁТЧИК С ПРОКРУТКОЙ РАЗРЯДОВ ══════════════ */
const Roll: React.FC<{ from: number; value: number; suffix?: string; size: number; color?: string; font?: string; glow?: number }> = ({
  from, value, suffix = '', size, color = C.lime, font = DISPLAY, glow = 50,
}) => {
  const frame = useCurrentFrame();
  const d = frame - from;
  if (d < 0) return null;
  const v = interpolate(d, [0, 30], [0, value], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const s = spring({ frame: d, fps: FPS, config: { damping: 14, mass: 0.6, stiffness: 170 } });
  return (
    <span style={{ display: 'inline-block', transform: `scale(${0.85 + 0.15 * s})` }}>
      <Glow size={size} color={color} font={font} weight={900} glow={glow}>
        {Math.round(v)}
        {suffix}
      </Glow>
    </span>
  );
};

/* ══════════════ РЕАЛЬНЫЙ САЙТ В БРАУЗЕРЕ ══════════════ */
const SiteFrame: React.FC<{
  src: string; from: number; label: string; scrollTo: number; w?: number; h?: number;
}> = ({ src, from, label, scrollTo, w = 1400, h = 790 }) => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const s = spring({ frame: frame - from, fps: FPS, config: { damping: 22, mass: 0.7, stiffness: 150 } });
  const scroll = interpolate(frame, [from + 12, from + 120], [0, scrollTo], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.quad),
  });
  const sheen = (t * 0.55) % 1;

  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: 20,
        overflow: 'hidden',
        border: `1px solid ${C.line}`,
        background: '#0A0D12',
        boxShadow: '0 70px 150px -60px rgba(0,0,0,.95), 0 0 110px -45px rgba(139,92,255,.6)',
        opacity: s,
        transform: `translateY(${(1 - s) * 48}px) scale(${0.94 + 0.06 * s})`,
        position: 'relative',
      }}
    >
      <div style={{ height: 46, background: '#171C24', borderBottom: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px' }}>
        <i style={{ width: 11, height: 11, borderRadius: '50%', background: '#ff5f56' }} />
        <i style={{ width: 11, height: 11, borderRadius: '50%', background: '#ffbd2e' }} />
        <i style={{ width: 11, height: 11, borderRadius: '50%', background: '#27c93f' }} />
        <span style={{ marginLeft: 12, fontSize: 13, color: C.muted, fontFamily: MONO }}>{label}</span>
        <span style={{ marginLeft: 'auto', fontSize: 11.5, color: C.lime, fontFamily: MONO, letterSpacing: '.14em' }}>live</span>
      </div>
      <div style={{ position: 'relative', height: h - 46, overflow: 'hidden' }}>
        <Img
          src={src}
          style={{ width: '100%', height: 2400, objectFit: 'cover', objectPosition: 'top center', transform: `translateY(${scroll}px)` }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,.14), transparent 16%, transparent 70%, rgba(0,0,0,.38))' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(100deg, transparent 42%, rgba(255,255,255,.09) 50%, transparent 58%)', backgroundSize: '250% 100%', backgroundPosition: `${sheen * 160 - 30}% 0` }} />
      </div>
    </div>
  );
};

/* ══════════════ МОРФ: карточка 2ГИС → настоящий сайт ══════════════ */
const Morph: React.FC<{ from: number }> = ({ from }) => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const p = interpolate(frame, [from, from + 34], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) });
  const w = 450 + (1400 - 450) * p;
  const rad = 40 + (20 - 40) * p;
  const scroll = interpolate(frame, [from + 34, from + 160], [0, -560], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.quad) });

  return (
    <div
      style={{
        width: w,
        height: 790,
        borderRadius: rad,
        overflow: 'hidden',
        border: `1px solid ${C.line}`,
        background: '#0A0D12',
        boxShadow: '0 70px 150px -60px rgba(0,0,0,.95), 0 0 110px -45px rgba(217,255,58,.5)',
        position: 'relative',
      }}
    >
      <div style={{ height: 46, background: '#171C24', borderBottom: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px', opacity: p }}>
        <i style={{ width: 11, height: 11, borderRadius: '50%', background: '#ff5f56' }} />
        <i style={{ width: 11, height: 11, borderRadius: '50%', background: '#ffbd2e' }} />
        <i style={{ width: 11, height: 11, borderRadius: '50%', background: '#27c93f' }} />
        <span style={{ marginLeft: 12, fontSize: 13, color: C.muted, fontFamily: MONO }}>lavaflam.ru</span>
      </div>
      <div style={{ position: 'relative', height: 744, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 1 - p, padding: 34, background: C.card }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: C.text, marginBottom: 12 }}>Автосервис «Гараж 7»</div>
          <div style={{ fontSize: 15, lineHeight: 1.85, color: C.muted }}>
            Диагностика — 900 ₽
            <br />
            Подвеска — от 2 400 ₽
            <br />
            Замена масла — от 1 400 ₽
          </div>
        </div>
        <div style={{ position: 'absolute', inset: 0, opacity: p }}>
          <Img src={staticFile('shawarma.png')} style={{ width: '100%', height: 2400, objectFit: 'cover', objectPosition: 'top center', transform: `translateY(${scroll}px)` }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(100deg, transparent 42%, rgba(255,255,255,.12) 50%, transparent 58%)', backgroundSize: '250% 100%', backgroundPosition: `${(t * 0.5) % 1 * 160 - 30}% 0` }} />
        </div>
      </div>
    </div>
  );
};

/* ══════════════ ТЕЛЕФОН ══════════════ */
const Phone: React.FC<{ from: number; children: React.ReactNode; glow?: boolean }> = ({ children, from, glow }) => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const s = spring({ frame: frame - from, fps: FPS, config: { damping: 20, mass: 0.65, stiffness: 150 } });
  return (
    <div
      style={{
        width: 450,
        height: 780,
        borderRadius: 40,
        border: `1px solid ${glow ? 'rgba(217,255,58,.5)' : C.line}`,
        background: 'rgba(255,255,255,.1)',
        boxShadow: glow
          ? '0 0 110px -10px rgba(217,255,58,.55), 0 40px 90px -40px rgba(0,0,0,.9)'
          : '0 40px 90px -40px rgba(0,0,0,.9), 0 0 70px -30px rgba(255,255,255,.4)',
        overflow: 'hidden',
        transform: `translateY(${(1 - s) * 50 + Math.sin(t * 1.2) * 9}px) rotateY(${(1 - s) * -18}deg) scale(${0.94 + 0.06 * s})`,
        transformStyle: 'preserve-3d',
      }}
    >
      <div style={{ padding: 20, background: '#1A2028', borderBottom: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', gap: 7 }}>
        <i style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f56' }} />
        <i style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffbd2e' }} />
        <i style={{ width: 10, height: 10, borderRadius: '50%', background: '#27c93f' }} />
        <span style={{ marginLeft: 12, fontSize: 12, color: C.muted, fontFamily: MONO, letterSpacing: '.08em' }}>2ГИС · Автосервис «Гараж 7»</span>
      </div>
      <div style={{ padding: 28, background: '#1B2129', height: 'calc(100% - 60px)', position: 'relative' }}>{children}</div>
    </div>
  );
};

const Card2GIS: React.FC<{ from: number; mode: 'full' | 'empty' | 'site' }> = ({ from, mode }) => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const appear = spring({ frame: frame - from, fps: FPS, config: { damping: 20, mass: 0.6, stiffness: 160 } });
  const glow = 0.55 + 0.45 * Math.sin(t * 2.1);

  return (
    <Phone from={from} glow={mode === 'site'}>
      <div style={{ fontSize: 24, fontWeight: 800, color: C.text, marginBottom: 12 }}>Автосервис «Гараж 7»</div>
      <div style={{ fontSize: 14, lineHeight: 1.8, color: mode === 'empty' ? C.muted : C.text, marginBottom: 20 }}>
        {mode === 'empty' ? (
          <>
            Услуги: <b style={{ color: C.red }}>—</b>
            <br />
            Цены: <b style={{ color: C.red }}>—</b>
            <br />
            Запись: <b style={{ color: C.red }}>—</b>
          </>
        ) : (
          <>
            Диагностика — 900 ₽
            <br />
            Подвеска — от 2 400 ₽
            <br />
            Замена масла — от 1 400 ₽
          </>
        )}
      </div>
      {mode === 'empty' && (
        <div style={{ fontSize: 13, color: C.red, marginBottom: 16, fontFamily: MONO, opacity: 0.5 + 0.5 * Math.sin(t * 3) }}>ничего не понятно</div>
      )}
      <div style={{ padding: 15, borderRadius: 13, background: 'rgba(217,255,58,.08)', border: '1px solid rgba(217,255,58,.35)' }}>
        <div style={{ fontSize: 10, letterSpacing: '.18em', textTransform: 'uppercase', color: C.muted, marginBottom: 6, fontFamily: MONO }}>Контакты</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>+7 900 222-33-44</div>
        <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>ул. Автозаводская, 7</div>
      </div>
      {mode === 'site' && (
        <>
          <div
            style={{
              marginTop: 16,
              padding: 14,
              borderRadius: 13,
              background: C.lime,
              color: '#0A0B0D',
              fontSize: 15,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              opacity: appear,
              transform: `translateY(${(1 - appear) * 16}px)`,
              boxShadow: `0 0 ${34 * glow}px rgba(217,255,58,.85)`,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
              <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
              <path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
            </svg>
            Перейти на сайт
            <span style={{ position: 'absolute', top: 0, bottom: 0, width: 90, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.85),transparent)', transform: `translateX(${((t * 300) % 640) - 150}px)` }} />
          </div>
          <Cursor from={from + 16} x={-230} y={300} clickAt={22} />
        </>
      )}
    </Phone>
  );
};

/* ══════════════ СЦЕНЫ ══════════════ */
const QuestionCards: React.FC<{ from: number }> = ({ from }) => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const items = ['услуги', 'цены', 'свободное окно'];
  return (
    <div style={{ display: 'flex', gap: 26 }}>
      {items.map((label, i) => {
        const s = spring({ frame: frame - from - i * 7, fps: FPS, config: { damping: 15, mass: 0.6, stiffness: 175 } });
        const shake = Math.sin(t * 9 + i) * 4 * (1 - s);
        const glow = 0.35 + 0.35 * Math.sin(t * 3 + i * 1.4);
        return (
          <div
            key={label}
            style={{
              flex: 1,
              padding: 44,
              borderRadius: 24,
              border: `1px dashed rgba(255,90,90,${0.42 + glow})`,
              background: 'rgba(255,90,90,.06)',
              textAlign: 'center',
              opacity: s,
              transform: `translateY(${(1 - s) * 44 + shake}px)`,
              boxShadow: `0 0 ${50 * glow}px -12px rgba(255,90,90,.75)`,
            }}
          >
            <div style={{ fontSize: 68, color: C.red, fontWeight: 800, fontFamily: DISPLAY, lineHeight: 1 }}>?</div>
            <div style={{ fontSize: 20, color: C.muted, marginTop: 12 }}>{label}</div>
          </div>
        );
      })}
    </div>
  );
};

const Strike: React.FC<{ from: number }> = ({ from }) => {
  const frame = useCurrentFrame();
  const s = spring({ frame: frame - from, fps: FPS, config: { damping: 18, mass: 0.6, stiffness: 170 } });
  const strike = interpolate(frame, [from + 12, from + 30], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const sparks = Array.from({ length: 9 }, (_, i) => {
    const a = (i / 9) * Math.PI * 2;
    const p = strike;
    return { x: Math.cos(a) * 60 * p, y: Math.sin(a) * 60 * p, o: (1 - p) * 0.9 };
  });
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ position: 'relative', display: 'inline-block', padding: '32px 60px', borderRadius: 999, border: `2px solid ${C.line}`, opacity: s, transform: `scale(${0.9 + 0.1 * s})` }}>
        <div style={{ fontSize: 36, color: C.text, fontWeight: 800 }}>Позвонить</div>
        {sparks.map((sp, i) => (
          <div key={i} style={{ position: 'absolute', left: '50%', top: '50%', width: 7, height: 7, borderRadius: '50%', background: C.red, transform: `translate(${sp.x}px, ${sp.y}px)`, opacity: sp.o, boxShadow: `0 0 14px ${C.red}` }} />
        ))}
        <div style={{ position: 'absolute', left: -16, right: -16, top: '50%', height: 6, background: `linear-gradient(90deg, transparent, ${C.red}, transparent)`, transform: `rotate(-13deg) scaleX(${strike})`, boxShadow: `0 0 ${34 * strike}px ${C.red}`, borderRadius: 3 }} />
      </div>
    </div>
  );
};

const Rival: React.FC<{ from: number }> = ({ from }) => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const s = spring({ frame: frame - from, fps: FPS, config: { damping: 20, mass: 0.6, stiffness: 150 } });
  const arrow = Math.sin(t * 2.6) * 34;
  const pulse = 0.6 + 0.4 * Math.sin(t * 3.2);
  const gone = spring({ frame: frame - from - 40, fps: FPS, config: { damping: 18, mass: 0.6, stiffness: 180 } });
  return (
    <div style={{ display: 'flex', gap: 54, alignItems: 'center' }}>
      <div style={{ width: 440, padding: 32, borderRadius: 22, border: `1px solid ${C.line}`, background: 'rgba(255,255,255,.05)', opacity: s, transform: `translateX(${(1 - s) * -44}px)`, position: 'relative' }}>
        <div style={{ fontSize: 23, fontWeight: 800, color: C.text, marginBottom: 16 }}>Мастер Тюнинг</div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, padding: '12px 22px', borderRadius: 11, background: `rgba(74,222,128,${0.12 + pulse * 0.1})`, border: `1px solid ${C.green}`, color: C.green, fontSize: 18, fontWeight: 700, boxShadow: `0 0 ${32 * pulse}px -4px rgba(74,222,128,.9)` }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" /><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" /></svg>
          сайт
        </div>
        <div style={{ position: 'absolute', right: 26, top: 24, opacity: gone, transform: `translateX(${(1 - gone) * 40}px)`, padding: '7px 14px', borderRadius: 999, background: 'rgba(255,90,90,.18)', border: `1px solid ${C.red}`, color: C.red, fontSize: 14, fontWeight: 700, fontFamily: MONO }}>
          ушёл
        </div>
      </div>
      <div style={{ fontSize: 96, color: C.muted, fontFamily: DISPLAY, transform: `translateX(${arrow}px)`, textShadow: '0 0 50px rgba(255,255,255,.35)' }}>→</div>
    </div>
  );
};

const Shock: React.FC<{ from: number }> = ({ from }) => {
  const frame = useCurrentFrame();
  const d = frame - from;
  const s = spring({ frame: d + 22, fps: FPS, config: { damping: 18, mass: 0.6, stiffness: 190 } });
  // сцена живёт всю длину своего сегмента — иначе подпись висит над пустым кадром
  const seg = S('s09');
  const life = (seg.dur + seg.gap) * FPS;
  if (d < -24 || d > life) return null;
  const ring = interpolate(d, [0, 26], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const flash = interpolate(d, [0, 6, 22], [0, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const fade = interpolate(d, [life - 30, life], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const t = frame / FPS;
  return (
    <>
      <AbsoluteFill style={{ background: `rgba(217,255,58,${flash * 0.24})` }} />
      <div style={{ position: 'absolute', left: '50%', top: '44%', width: 200 + ring * 1700, height: 200 + ring * 1700, marginLeft: -(100 + ring * 850), marginTop: -(100 + ring * 850), borderRadius: '50%', border: `4px solid rgba(217,255,58,${(1 - ring) * 0.8})` }} />
      <div style={{ position: 'absolute', left: '50%', top: '44%', width: 120 + ring * 900, height: 120 + ring * 900, marginLeft: -(60 + ring * 450), marginTop: -(60 + ring * 450), borderRadius: '50%', border: `3px solid rgba(34,227,255,${(1 - ring) * 0.7})` }} />

      {/* за горизонтом — реальные сайты наплывают */}
      {['shawarma.png', 'beauty.png', 'auto.png', 'dental.png'].map((f, i) => {
        const is = spring({ frame: d + 16 + i * 4, fps: FPS, config: { damping: 19, mass: 0.7, stiffness: 150 } });
        const ang = -0.5 + i * 0.62;
        return (
          <div
            key={f}
            style={{
              position: 'absolute',
              left: 960 + Math.cos(ang) * 520 - 170,
              top: 430 + Math.sin(ang) * 120 - 110,
              width: 340,
              height: 220,
              borderRadius: 12,
              overflow: 'hidden',
              border: `1px solid ${C.line}`,
              opacity: is * 0.55,
              transform: `scale(${0.24 * is}) rotate(${Math.sin(ang) * 8}deg)`,
              boxShadow: '0 20px 60px -20px rgba(0,0,0,.9)',
            }}
          >
            <Img src={staticFile(f)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} />
          </div>
        );
      })}

      <div style={{ position: 'absolute', left: 0, right: 0, top: '30%', textAlign: 'center', opacity: s * fade, transform: `scale(${0.86 + 0.14 * s})` }}>
        <Glow size={112} color={C.lime} font={DISPLAY} weight={900} glow={70}>ЧТО МЕНЯЕТСЯ</Glow>
      </div>
    </>
  );
};

const Percent: React.FC<{ from: number }> = ({ from }) => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const s = spring({ frame: frame - from, fps: FPS, config: { damping: 20, mass: 0.7, stiffness: 140 } });
  const flare = 0.5 + 0.5 * Math.sin(t * 2.2);
  return (
    <div style={{ textAlign: 'center', opacity: s, transform: `scale(${0.9 + 0.1 * s})` }}>
      <div style={{ fontSize: 54, color: C.muted, fontFamily: TEXT, marginBottom: 8 }}>ссылка на сайт в карточке 2ГИС</div>
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <Roll from={from + 4} value={23} suffix="%" size={210} glow={60 + 50 * flare} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(105deg, transparent 42%, rgba(255,255,255,.6) 50%, transparent 58%)', backgroundSize: '250% 100%', backgroundPosition: `${(t * 100) % 170 - 35}% 0`, mixBlendMode: 'overlay' }} />
      </div>
      <div style={{ fontSize: 21, color: C.muted, marginTop: 12 }}>рост конверсии в звонок или запись</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 150, marginTop: 40, justifyContent: 'center' }}>
        {[30, 42, 38, 58, 66, 88, 108, 128].map((h, i) => {
          const bs = spring({ frame: frame - from - 14 - i * 4, fps: FPS, config: { damping: 18, mass: 0.6, stiffness: 170 } });
          return (
            <div key={i} style={{ width: 32, height: h * bs, borderRadius: 5, background: i >= 5 ? `linear-gradient(to top, ${C.lime}, ${C.green})` : 'rgba(217,255,58,.32)', opacity: bs, boxShadow: i >= 5 ? `0 0 ${28 * flare}px rgba(217,255,58,.7)` : 'none' }} />
          );
        })}
      </div>
    </div>
  );
};

const Price: React.FC<{ from: number }> = ({ from }) => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const s = spring({ frame: frame - from, fps: FPS, config: { damping: 13, mass: 0.6, stiffness: 175 } });
  const s2 = spring({ frame: frame - from - 14, fps: FPS, config: { damping: 20, mass: 0.6, stiffness: 150 } });
  const glow = 0.55 + 0.45 * Math.sin(t * 2.4);
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ position: 'relative', display: 'inline-block', padding: '30px 74px', borderRadius: 32, background: `linear-gradient(140deg, ${C.lime}, #bce42c)`, color: '#0A0B0D', fontSize: 96, fontWeight: 900, fontFamily: DISPLAY, overflow: 'hidden', transform: `scale(${0.78 + 0.22 * s}) rotate(${(1 - s) * -5}deg)`, opacity: s, boxShadow: `0 0 ${80 * glow + 30}px rgba(217,255,58,.85)` }}>
        8 000 ₽
        <span style={{ position: 'absolute', top: 0, bottom: 0, width: 150, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.9),transparent)', transform: `translateX(${((t * 340) % 800) - 200}px)` }} />
      </div>
      <div style={{ marginTop: 24, fontSize: 23, color: C.muted, opacity: s2, transform: `translateY(${(1 - s2) * 14}px)` }}>половина оплаты — вперёд</div>
    </div>
  );
};

const Trio: React.FC<{ from: number }> = ({ from }) => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const items = [
    { t: 'Услуги', d: 'полный прайс', m: ['диагностика', 'ремонт', 'шины', 'кузов'] },
    { t: 'Цены', d: 'сразу видно', m: ['от 900 ₽', 'от 1 400 ₽', 'от 2 400 ₽'] },
    { t: 'Фото работ', d: 'реальные работы', m: ['бокс №4', 'подъёмник', 'шиномонтаж'] },
  ];
  return (
    <div style={{ display: 'flex', gap: 30 }}>
      {items.map((it, i) => {
        const s = spring({ frame: frame - from - i * 7, fps: FPS, config: { damping: 17, mass: 0.7, stiffness: 165 } });
        const gl = 0.45 + 0.55 * Math.sin(t * 2.4 + i * 1.3);
        return (
          <div key={it.t} style={{ flex: 1, padding: 44, borderRadius: 26, border: `1px solid ${C.line}`, background: 'rgba(255,255,255,.05)', opacity: s, transform: `translateY(${(1 - s) * 54}px)`, boxShadow: `0 0 ${60 * gl}px -18px rgba(217,255,58,.6)`, position: 'relative', overflow: 'hidden' }}>
            <div style={{ width: 68, height: 68, borderRadius: 20, background: 'rgba(217,255,58,.16)', display: 'grid', placeItems: 'center', marginBottom: 24, boxShadow: `0 0 ${30 * gl}px -4px rgba(217,255,58,.8)` }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.lime} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
            </div>
            <div style={{ fontSize: 42, fontWeight: 800, color: C.text, fontFamily: DISPLAY, textTransform: 'uppercase' }}>{it.t}</div>
            <div style={{ fontSize: 19, color: C.muted, marginTop: 6, marginBottom: 16 }}>{it.d}</div>
            <div style={{ height: 34, overflow: 'hidden', position: 'relative', maskImage: 'linear-gradient(90deg,transparent,#000 15%,#000 85%,transparent)', WebkitMaskImage: 'linear-gradient(90deg,transparent,#000 15%,#000 85%,transparent)' }}>
              <div style={{ display: 'flex', gap: 26, position: 'absolute', left: -((t * 110 + i * 40) % 900), whiteSpace: 'nowrap' }}>
                {[...it.m, ...it.m].map((m, k) => (
                  <span key={k} style={{ fontFamily: MONO, fontSize: 15, color: C.lime, letterSpacing: '.06em' }}>{m} ·</span>
                ))}
              </div>
            </div>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(100deg, transparent 45%, rgba(255,255,255,.1) 50%, transparent 55%)', backgroundSize: '250% 100%', backgroundPosition: `${((t * 0.6 + i * 0.33) % 1) * 160 - 30}% 0` }} />
          </div>
        );
      })}
    </div>
  );
};

const CallPulse: React.FC<{ from: number }> = ({ from }) => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const s = spring({ frame: frame - from, fps: FPS, config: { damping: 12, mass: 0.5, stiffness: 190 } });
  // реальные сайты кружат вокруг звонка
  const orbit = [
    { s: 'shawarma.png', r: 470, a: -0.6, z: 1 },
    { s: 'beauty.png', r: 430, a: 0.9, z: 0.9 },
    { s: 'auto.png', r: 520, a: 2.4, z: 0.8 },
    { s: 'dental.png', r: 490, a: 3.9, z: 0.85 },
  ];
  return (
    <div style={{ textAlign: 'center', position: 'relative', width: 900, height: 620 }}>
      {orbit.map((o, i) => {
        const ang = o.a + t * 0.32;
        const x = Math.cos(ang) * o.r;
        const y = Math.sin(ang) * o.r * 0.42;
        const sc = 0.26 * o.z;
        const gs = spring({ frame: frame - from - i * 6, fps: FPS, config: { damping: 18, mass: 0.7, stiffness: 160 } });
        return (
          <div
            key={o.s}
            style={{
              position: 'absolute',
              left: 450 + x - 190,
              top: 250 + y - 130,
              width: 380,
              height: 260,
              borderRadius: 12,
              overflow: 'hidden',
              border: `1px solid ${C.line}`,
              opacity: gs * 0.9,
              transform: `scale(${sc * gs}) rotate(${Math.sin(ang) * 6}deg)`,
              boxShadow: '0 20px 50px -25px rgba(0,0,0,.95)',
              zIndex: o.z > 0.9 ? 3 : 1,
            }}
          >
            <Img src={staticFile(o.s)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} />
          </div>
        );
      })}
      {[0, 1, 2].map((i) => {
        const p = (t * 0.9 + i * 0.33) % 1;
        return <div key={i} style={{ position: 'absolute', left: '50%', top: 180, width: 180, height: 180, marginLeft: -90, borderRadius: '50%', border: `2px solid ${C.green}`, opacity: (1 - p) * 0.65, transform: `scale(${1 + p * 1.7})` }} />;
      })}
      <div style={{ position: 'absolute', left: '50%', top: 180, width: 158, height: 158, marginLeft: -79, borderRadius: '50%', background: `radial-gradient(circle at 35% 30%, #8dffc0, ${C.green})`, display: 'grid', placeItems: 'center', transform: `scale(${0.6 + 0.4 * s})`, boxShadow: `0 0 ${80 + 30 * Math.sin(t * 5)}px rgba(74,222,128,.95)`, zIndex: 5 }}>
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#06110A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" /></svg>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 400, fontSize: 26, color: C.green, fontWeight: 700, opacity: s, textShadow: '0 0 34px rgba(74,222,128,.8)' }}>
        звонит уже готовым клиентом
      </div>
    </div>
  );
};

const CTA: React.FC<{ from: number }> = ({ from }) => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const s = spring({ frame: frame - from, fps: FPS, config: { damping: 12, mass: 0.6, stiffness: 185 } });
  const s2 = spring({ frame: frame - from - 14, fps: FPS, config: { damping: 20, mass: 0.6, stiffness: 150 } });
  const pulse = 1 + Math.sin(t * 3.2) * 0.024;
  return (
    <div style={{ textAlign: 'center' }}>
      {[0, 1, 2].map((i) => {
        const p = (t * 0.75 + i * 0.33) % 1;
        return <div key={i} style={{ position: 'absolute', left: '50%', top: 46, width: 360, height: 110, marginLeft: -180, borderRadius: 999, border: `2px solid ${C.lime}`, opacity: (1 - p) * 0.4, transform: `scale(${1 + p * 0.95})` }} />;
      })}
      <div style={{ position: 'relative', display: 'inline-block', padding: '28px 70px', borderRadius: 999, background: `linear-gradient(120deg, ${C.lime}, #c4ef3a)`, color: '#0A0B0D', fontSize: 48, fontWeight: 900, fontFamily: DISPLAY, textTransform: 'uppercase', overflow: 'hidden', transform: `scale(${pulse * (0.88 + 0.12 * s)})`, opacity: s, boxShadow: `0 0 ${70 + 40 * Math.sin(t * 3.2)}px rgba(217,255,58,.95)` }}>
        Напиши «сайт»
        <span style={{ position: 'absolute', top: 0, bottom: 0, width: 160, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.9),transparent)', transform: `translateX(${((t * 380) % 840) - 210}px)` }} />
      </div>
      <div style={{ marginTop: 26, fontSize: 24, color: C.muted, opacity: s2, transform: `translateY(${(1 - s2) * 16}px)` }}>— и я скину портфолио</div>
      <div style={{ marginTop: 26, opacity: s2, transform: `translateY(${(1 - s2) * 20}px)`, display: 'flex', gap: 14, justifyContent: 'center' }}>
        {['shawarma.png', 'beauty.png', 'auto.png', 'dental.png'].map((f, i) => {
          const is = spring({ frame: frame - from - 20 - i * 5, fps: FPS, config: { damping: 17, mass: 0.6, stiffness: 170 } });
          return (
            <div key={f} style={{ width: 190, height: 128, borderRadius: 10, overflow: 'hidden', border: `1px solid ${C.line}`, opacity: is, transform: `translateY(${(1 - is) * 26}px)`, boxShadow: '0 16px 40px -24px rgba(0,0,0,.9)' }}>
              <Img src={staticFile(f)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} />
            </div>
          );
        })}
      </div>
      <Cursor from={from + 20} x={-140} y={-30} clickAt={26} />
    </div>
  );
};

const SiteStrip: React.FC<{ from: number }> = ({ from }) => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const sites = [
    { s: 'shawarma.png', n: 'Лавa & Огонь' },
    { s: 'beauty.png', n: 'Бархат' },
    { s: 'auto.png', n: 'Гараж 7' },
    { s: 'dental.png', n: 'Белая линия' },
  ];
  return (
    <div style={{ overflow: 'hidden', width: 1720, maskImage: 'linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)', WebkitMaskImage: 'linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)' }}>
      <div style={{ display: 'flex', gap: 22, transform: `translateX(${-(t * 70) % 1700})` }}>
        {[...sites, ...sites].map((site, i) => {
          const s = spring({ frame: frame - from - (i % 4) * 5, fps: FPS, config: { damping: 17, mass: 0.65, stiffness: 165 } });
          const gl = 0.4 + 0.6 * Math.sin(t * 2 + i);
          return (
            <div key={i} style={{ width: 400, flex: 'none', borderRadius: 16, overflow: 'hidden', border: `1px solid ${C.line}`, background: '#0A0D12', opacity: s, transform: `translateY(${(1 - s) * 54}px)`, boxShadow: `0 30px 70px -40px rgba(0,0,0,.9), 0 0 ${44 * gl}px -18px rgba(217,255,58,.65)` }}>
              <div style={{ height: 34, background: '#171C24', borderBottom: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', padding: '0 12px', gap: 6 }}>
                <i style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff5f56' }} />
                <i style={{ width: 8, height: 8, borderRadius: '50%', background: '#ffbd2e' }} />
                <i style={{ width: 8, height: 8, borderRadius: '50%', background: '#27c93f' }} />
                <span style={{ marginLeft: 8, fontSize: 11, color: C.muted, fontFamily: MONO }}>{site.n}</span>
              </div>
              <Img src={staticFile(site.s)} style={{ width: '100%', height: 460, objectFit: 'cover', objectPosition: 'top center' }} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Finale: React.FC<{ from: number }> = ({ from }) => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const s = spring({ frame: frame - from, fps: FPS, config: { damping: 20, mass: 0.7, stiffness: 150 } });
  const s2 = spring({ frame: frame - from - 10, fps: FPS, config: { damping: 20, mass: 0.6, stiffness: 150 } });
  const glow = 0.6 + 0.4 * Math.sin(t * 2.6);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, opacity: s, transform: `translateY(${(1 - s) * 30}px)` }}>
        <span style={{ width: 76, height: 76, borderRadius: 22, background: `linear-gradient(140deg, ${C.lime}, #bce42c)`, color: '#0A0B0D', display: 'grid', placeItems: 'center', fontSize: 44, fontWeight: 900, fontFamily: DISPLAY, boxShadow: `0 0 ${50 * glow + 22}px rgba(217,255,58,.9)` }}>Л</span>
        <span style={{ fontSize: 72, fontWeight: 800, color: C.text, fontFamily: DISPLAY, textTransform: 'uppercase', textShadow: '0 0 50px rgba(255,255,255,.3)' }}>Лендинги</span>
      </div>
      <div style={{ fontSize: 24, color: C.muted, opacity: s2, transform: `translateY(${(1 - s2) * 18}px)` }}>уже есть довольные клиенты</div>
      <div style={{ opacity: s2, transform: `translateY(${(1 - s2) * 24}px)` }}>
        <SiteStrip from={from + 16} />
      </div>
    </div>
  );
};

/* ══════════════ КАРТА СЦЕН ══════════════ */
const SceneBody: React.FC<{ seg: Seg }> = ({ seg }) => {
  const f = F(seg.start);
  switch (seg.id) {
    case 's01': return <Card2GIS from={f} mode="full" />;
    case 's03': return <Card2GIS from={f} mode="empty" />;
    case 's04': return <Card2GIS from={f} mode="empty" />;
    case 's05': return <QuestionCards from={f} />;
    case 's06': return <Strike from={f} />;
    case 's07': return <QuestionCards from={f} />;
    case 's08': return <Rival from={f} />;
    case 's09': return <Shock from={f} />;
    case 's10': return <Card2GIS from={f} mode="site" />;
    case 's11': return <Morph from={f} />;
    case 's12': return <SiteFrame src={staticFile('beauty.png')} from={f} label="barhat-beauty.ru" scrollTo={-620} />;
    case 's13': return <CallPulse from={f} />;
    case 's14': return <Percent from={f} />;
    case 's15': return <Price from={f} />;
    case 's16': return <Price from={f} />;
    case 's17': return <Trio from={f} />;
    case 's18': return <SiteFrame src={staticFile('auto.png')} from={f} label="garag7.ru" scrollTo={-520} />;
    case 's19': return <SiteFrame src={staticFile('dental.png')} from={f} label="belaya-liniya.ru" scrollTo={-420} />;
    case 's20': return <CTA from={f} />;
    case 's21': return <Finale from={f} />;
    default: return null;
  }
};

/* ══════════════ ГЛАВЫ СЦЕНЫ (лейблер в углу) ══════════════ */
const CHAPTER: Record<string, string> = {
  s01: 'КАРТОЧКА В 2ГИС',
  s03: 'КАРТОЧКА В 2ГИС',
  s04: 'КАРТОЧКА В 2ГИС',
  s05: 'ЧЕГО НЕ ВИДНО',
  s06: 'ЧЕЛОВЕК НЕ ЗВОНИТ',
  s07: 'ЧЕЛОВЕК НЕ ЗВОНИТ',
  s08: 'УХОДИТ К КОНКУРЕНТУ',
  s09: 'ССЫЛКА НА САЙТ',
  s10: 'ССЫЛКА НА САЙТ',
  s11: 'ГОТОВЫЙ САЙТ',
  s12: 'ГОТОВЫЙ САЙТ',
  s13: 'ГОТОВЫЙ КЛИЕНТ',
  s14: 'ДАННЫЕ САМОГО 2ГИС',
  s15: 'СТОИМОСТЬ',
  s16: 'СТОИМОСТЬ',
  s17: 'ЧТО ВНУТРИ САЙТА',
  s18: 'ЧТО ВНУТРИ САЙТА',
  s19: 'ЧТО ВНУТРИ САЙТА',
  s20: 'ПОРТФОЛИО',
  s21: 'ПОРТФОЛИО',
};

const ChapterLabel: React.FC = () => {
  const frame = useCurrentFrame();
  const active = SEGS.find((s) => frame >= F(s.start) - 20 && frame < F(s.start + s.dur + s.gap));
  if (!active) return null;
  const label = CHAPTER[active.id] || '';
  const s = spring({ frame: frame - F(active.start) + 20, fps: FPS, config: { damping: 22, mass: 0.5, stiffness: 180 } });
  return (
    <div
      style={{
        position: 'absolute',
        left: 62,
        top: 44,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        opacity: s * 0.9,
        transform: `translateX(${(1 - s) * -26}px)`,
        zIndex: 25,
      }}
    >
      <span style={{ width: 26, height: 2, background: C.lime, display: 'block' }} />
      <span style={{ fontFamily: MONO, fontSize: 13, letterSpacing: '.22em', textTransform: 'uppercase', color: C.lime }}>{label}</span>
    </div>
  );
};

/* ══════════════ СБОРКА ══════════════ */
const Video: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = frame / FPS;

  const push = interpolate(frame, [0, durationInFrames], [1, 1.12], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.cubic),
  });
  const driftX = Math.sin(t * 0.23) * 20;
  const driftY = Math.cos(t * 0.19) * 13;
  const progress = frame / durationInFrames;
  const tc = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

  return (
    <AbsoluteFill style={{ background: C.bg, overflow: 'hidden' }}>
      <Backdrop />

      <AbsoluteFill style={{ transform: `scale(${push}) translate(${driftX}px, ${driftY}px)`, transformOrigin: 'center' }}>
        {SEGS.map((s) => {
          const start = F(s.start);
          const end = F(s.start + s.dur + s.gap);
          if (frame < start - 20 || frame > end + 20) return null;
          const IN = 20;
          const d = frame - start;
          // появление начинается ЗА 20 кадров до старта сцены — настоящий кросс-фейд
          const inS = spring({ frame: d + IN, fps: FPS, config: { damping: 24, mass: 0.6, stiffness: 165 } });
          const outP = interpolate(d, [end - start - IN, end - start], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          const op = inS * (1 - outP);
          if (op < 0.015) return null;
          return (
            <React.Fragment key={s.id}>
              <Streaks start={start} />
              <LightLeak start={start} color={['s09', 's14', 's16', 's21'].includes(s.id) ? C.lime : C.violet} />
              <div style={{ position: 'absolute', inset: '0 0 240px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ opacity: op, transform: `scale(${1.07 - 0.07 * inS - 0.07 * outP}) translateX(${(1 - inS) * 80 - outP * 80}px)`, filter: `blur(${(1 - inS) * 12 + outP * 12}px)` }}>
                  <RGBSplit start={start}>
                    <SceneBody seg={s} />
                  </RGBSplit>
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </AbsoluteFill>

      <Caption />
      <ChapterLabel />
      <Particles near />

      {/* Затемнение под подпись — чтобы текст читался поверх светлых сайтов */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 300,
          background: 'linear-gradient(to top, rgba(6,7,10,.96) 34%, rgba(6,7,10,.72) 62%, transparent 100%)',
          pointerEvents: 'none',
          zIndex: 22,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: 150,
          background: 'linear-gradient(to bottom, rgba(6,7,10,.72), transparent 100%)',
          pointerEvents: 'none',
          zIndex: 22,
        }}
      />

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 5, background: 'rgba(255,255,255,.08)' }}>
        <div style={{ width: `${progress * 100}%`, height: '100%', background: `linear-gradient(90deg, ${C.lime}, ${C.violet}, ${C.cyan})`, boxShadow: `0 0 22px ${C.lime}` }} />
      </div>
      <div style={{ position: 'absolute', left: 62, bottom: 26, fontFamily: MONO, fontSize: 13, letterSpacing: '.2em', textTransform: 'uppercase', color: C.muted }}>лендинг под ключ · 8 000 ₽</div>
      <div style={{ position: 'absolute', right: 62, bottom: 26, fontFamily: MONO, fontSize: 13, letterSpacing: '.2em', color: C.muted, display: 'flex', gap: 14 }}>
        <span>2ГИС · +23%</span>
        <span style={{ color: C.lime }}>{tc}</span>
      </div>
    </AbsoluteFill>
  );
};

export const RemotionRoot: React.FC = () => (
  <Composition id="Main" component={Video} durationInFrames={Math.ceil(TOTAL * FPS)} fps={FPS} width={W} height={H} />
);

registerRoot(RemotionRoot);
