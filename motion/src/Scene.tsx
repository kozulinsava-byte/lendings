import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
} from 'remotion';
import {C, CARDS, DISPLAY, TEXT, MONO} from './tokens';

const line = (
  text: string,
  frame: number,
  fps: number,
  from: number,
  step: number,
) => {
  return text.split('').map((ch, i) => {
    const s = spring({
      frame: frame - from - i * step,
      fps,
      config: {damping: 200, mass: 0.5, stiffness: 150},
    });
    return (
      <span
        key={i}
        style={{
          display: 'inline-block',
          whiteSpace: 'pre',
          opacity: s,
          transform: `translateY(${(1 - s) * 46}px)`,
          filter: `blur(${(1 - s) * 8}px)`,
          willChange: 'transform, opacity, filter',
        }}
      >
        {ch}
      </span>
    );
  });
};

const Hero: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  /* каркас браузера */
  const shell = spring({
    frame: frame - 22,
    fps,
    config: {damping: 200, mass: 0.85, stiffness: 105},
  });
  const tilt = interpolate(shell, [0, 1], [-7, 0]);

  /* подзаголовок и кнопки */
  const sub = spring({frame: frame - 92, fps, config: {damping: 200, mass: 0.6, stiffness: 140}});
  const btn = spring({frame: frame - 112, fps, config: {damping: 16, mass: 0.5, stiffness: 170}});

  /* метрика в правом верхнем углу */
  const metric = spring({frame: frame - 165, fps, config: {damping: 200, mass: 0.6, stiffness: 140}});

  /* блик по стеклу */
  const shine = interpolate(frame, [175, 235], [-140, 150], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        width: 1200,
        height: 700,
        borderRadius: 26,
        border: `1px solid ${C.line}`,
        background: 'linear-gradient(165deg, rgba(255,255,255,.07), rgba(255,255,255,.02))',
        backdropFilter: 'blur(6px)',
        boxShadow:
          '0 70px 140px -50px rgba(0,0,0,.95), 0 0 120px -40px rgba(217,255,58,.30)',
        overflow: 'hidden',
        opacity: shell,
        transform: `perspective(1900px) rotateY(${tilt}deg) scale(${0.93 + 0.07 * shell}) translateY(${(1 - shell) * 60}px)`,
        transformStyle: 'preserve-3d',
      }}
    >
      {/* шапка окна */}
      <div
        style={{
          height: 52,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 20px',
          background: 'rgba(255,255,255,.05)',
          borderBottom: `1px solid ${C.line}`,
        }}
      >
        {[0, 1, 2].map((i) => (
          <div key={i} style={{width: 11, height: 11, borderRadius: '50%', background: '#2F323A'}} />
        ))}
        <div
          style={{
            marginLeft: 14,
            flex: 1,
            maxWidth: 320,
            height: 26,
            borderRadius: 999,
            background: 'rgba(0,0,0,.4)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 14px',
            fontFamily: MONO,
            fontSize: 12,
            color: C.muted,
            letterSpacing: '.06em',
          }}
        >
          lavaflam.ru
        </div>
      </div>

      {/* содержимое */}
      <div
        style={{
          position: 'relative',
          padding: '46px 56px 46px',
          height: 648,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            fontFamily: MONO,
            fontSize: 13,
            letterSpacing: '.24em',
            textTransform: 'uppercase',
            color: C.lime,
            marginBottom: 22,
            opacity: sub,
            transform: `translateY(${(1 - sub) * 18}px)`,
          }}
        >
          Лендинг под ключ · общепит
        </div>

        <div
          style={{
            fontFamily: DISPLAY,
            fontSize: 94,
            lineHeight: 0.94,
            letterSpacing: '-.01em',
            textTransform: 'uppercase',
            color: C.fg,
          }}
        >
          <div style={{overflow: 'hidden'}}>{line('ЛЕНДИНГИ,', frame, fps, 50, 1.4)}</div>
          <div style={{overflow: 'hidden', display: 'flex'}}>
            {line('КОТОРЫЕ ', frame, fps, 66, 1.2)}
            <span style={{color: C.lime}}>{line('ПРОДАЮТ', frame, fps, 74, 1.2)}</span>
          </div>
        </div>

        <div
          style={{
            marginTop: 22,
            fontFamily: TEXT,
            fontSize: 19,
            lineHeight: 1.5,
            color: C.muted,
            maxWidth: 560,
            opacity: sub,
            transform: `translateY(${(1 - sub) * 20}px)`,
          }}
        >
          Мясо на углях, доставка горячей, онлайн-заказ за 30 секунд.
          <br />
          Срок от брифа до запуска — 7–14 дней.
        </div>

        {/* кнопки */}
        <div
          style={{
            display: 'flex',
            gap: 14,
            marginTop: 28,
            alignItems: 'center',
          }}
        >
          <div
            style={{
              padding: '16px 34px',
              borderRadius: 999,
              background: C.lime,
              color: '#0A0B0D',
              fontFamily: TEXT,
              fontWeight: 800,
              fontSize: 17,
              transform: `scale(${0.9 + 0.1 * btn})`,
              opacity: btn,
              boxShadow: '0 16px 40px -16px rgba(217,255,58,.75)',
            }}
          >
            Собрать заказ
          </div>
          <div
            style={{
              padding: '16px 30px',
              borderRadius: 999,
              border: `1px solid ${C.line}`,
              color: C.fg,
              fontFamily: TEXT,
              fontWeight: 700,
              fontSize: 17,
              opacity: sub,
              transform: `translateY(${(1 - sub) * 16}px)`,
            }}
          >
            Смотреть меню
          </div>
        </div>

        {/* карточки — в потоке, прижаты к низу, наложение невозможно */}
        <div
          style={{
            marginTop: 'auto',
            paddingTop: 24,
            display: 'flex',
            gap: 16,
          }}
        >
          {CARDS.map((c, i) => {
            const s = spring({
              frame: frame - 128 - i * 7,
              fps,
              config: {damping: 200, mass: 0.7, stiffness: 130},
            });
            return (
              <div
                key={c.seed}
                style={{
                  width: 206,
                  flex: 'none',
                  borderRadius: 14,
                  border: `1px solid ${C.line}`,
                  background: 'rgba(255,255,255,.035)',
                  overflow: 'hidden',
                  opacity: s,
                  transform: `translateY(${(1 - s) * 54}px) rotate(${(1 - s) * (i === 1 ? -3 : 3)}deg)`,
                }}
              >
                <div style={{height: 74, background: c.grad, position: 'relative'}}>
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundImage:
                        'radial-gradient(rgba(255,255,255,.22) 1px, transparent 1px)',
                      backgroundSize: '13px 13px',
                    }}
                  />
                </div>
                <div style={{padding: '10px 13px 12px'}}>
                  <div style={{fontFamily: MONO, fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: C.muted}}>
                    {c.tag}
                  </div>
                  <div style={{fontFamily: DISPLAY, fontSize: 20, textTransform: 'uppercase', color: C.fg, marginTop: 1}}>
                    {c.title}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* метрика */}
        <div
          style={{
            position: 'absolute',
            right: 56,
            top: 48,
            textAlign: 'right',
            opacity: metric,
            transform: `translateY(${(1 - metric) * 30}px)`,
          }}
        >
          <div
            style={{
              fontFamily: DISPLAY,
              fontSize: 84,
              lineHeight: 0.86,
              color: C.lime,
              textTransform: 'uppercase',
            }}
          >
            +38%
          </div>
          <div style={{fontFamily: MONO, fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase', color: C.muted, marginTop: 8}}>
            онлайн-заказов<br />за 2 месяца
          </div>
        </div>

        {/* блик */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: `${shine}%`,
            width: '36%',
            height: '100%',
            background:
              'linear-gradient(100deg, transparent, rgba(255,255,255,.07), transparent)',
            transform: 'skewX(-14deg)',
            pointerEvents: 'none',
          }}
        />
      </div>
    </div>
  );
};

const Wordmark: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: frame - 205, fps, config: {damping: 200, mass: 0.6, stiffness: 130}});
  const draw = interpolate(frame, [215, 270], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 54,
        left: 0,
        right: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
        opacity: s,
        transform: `translateY(${(1 - s) * 24}px)`,
      }}
    >
      <div style={{display: 'flex', alignItems: 'center', gap: 18}}>
        <span
          style={{
            width: 44,
            height: 44,
            borderRadius: 13,
            background: C.lime,
            color: '#0A0B0D',
            display: 'grid',
            placeItems: 'center',
            fontFamily: DISPLAY,
            fontSize: 26,
          }}
        >
          Л
        </span>
        <span
          style={{
            fontFamily: DISPLAY,
            fontSize: 44,
            textTransform: 'uppercase',
            letterSpacing: '.02em',
            color: C.fg,
          }}
        >
          Лендинги
        </span>
      </div>
      <div style={{width: 340, height: 2, background: 'rgba(255,255,255,.12)', borderRadius: 2}}>
        <div
          style={{
            width: `${draw * 100}%`,
            height: '100%',
            background: `linear-gradient(90deg, ${C.lime}, ${C.violet})`,
            borderRadius: 2,
          }}
        />
      </div>
      <div
        style={{
          fontFamily: MONO,
          fontSize: 12,
          letterSpacing: '.3em',
          textTransform: 'uppercase',
          color: C.muted,
        }}
      >
        портфолио
      </div>
    </div>
  );
};

export const Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();

  /* кинематографичный медленный наезд в финале */
  const push = interpolate(frame, [230, durationInFrames], [1, 1.035], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  return (
    <AbsoluteFill style={{background: C.bg}}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingBottom: 40,
        }}
      >
        {/* отражение браузера */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 1200,
            height: 700,
            transform: 'translate(-50%, 350px) scaleY(-1)',
            transformOrigin: 'top center',
            opacity: 0.16,
            filter: 'blur(14px)',
            overflow: 'hidden',
            borderRadius: 26,
            maskImage: 'linear-gradient(to top, #000, transparent 55%)',
            WebkitMaskImage: 'linear-gradient(to top, #000, transparent 55%)',
          }}
        >
          <Hero />
        </div>

        <div style={{transform: `scale(${push})`}}>
          <Hero />
        </div>
      </div>
      <Wordmark />
    </AbsoluteFill>
  );
};