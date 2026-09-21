import type {FC, ReactNode} from 'react';
import {
  AbsoluteFill,
  Audio,
  OffthreadVideo,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from 'remotion';
import {theme} from '../theme';
import {EASE_IN_OUT, EASE_OUT, Grain, Glow, Reveal} from '../terminal';
import {sfx} from '../common';

// ============================================================================
// "you weren't supposed to know this" — prop firm payout stat
// 780 frames @ 30fps = 26.0s. 1080x1920, rendered --scale=2 for 2160x3840.
//
// Beat map (frames):
//   HOOK    0   – 75    shocked face + "you weren't supposed to know this"
//   BEAT 1  75  – 165   eval bar fills, stamps PASSED, claim lands
//   BEAT 2  165 – 300   funded stat + 100-dot grid
//   BEAT 3  300 – 420   paid stat, lit dots halve on screen
//   BEAT 4  420 – 570   grid detonates, equity curve rises then collapses
//   BEAT 5  570 – 735   Control Room footage
//   CTA     735 – 780   free -> link in bio
//
// Everything sits on a global ambient layer (dot lattice + drifting motes) so
// no beat is ever type on flat black.
// ============================================================================

// ---------- palette (specified for this video) ----------
const C = {
  ground: '#0A0908',
  text: '#F2F1EC',
  accent: '#FF7A5C',
  accentDeep: '#C4462C',
  dim: '#6E6C67',
  dimFaint: '#2A2926',
  green: '#3DD68C',
  red: '#E5484D',
} as const;

// ---------- the two figures ----------
// SUPPLIED BY THE BRIEF, NOT VERIFIED HERE. This environment has no outbound
// web access, so neither number could be checked against a source. They are
// isolated as constants so a sourced pair can be dropped in without touching
// layout or timing: the grid lights FUNDED_PCT dots and dims down to PAID_PCT.
const FUNDED_PCT = 14;
const PAID_PCT = 7;

// ---------- beat boundaries ----------
const B1 = 75;
const B2 = 165;
const B3 = 300;
const B4 = 420;
const B5 = 570;
const CTA = 735;
const END = 780;

// ---------- helpers ----------
const ease = (frame: number, a: number, b: number, from = 0, to = 1) =>
  interpolate(frame, [a, b], [from, to], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_OUT,
  });

const lin = (frame: number, a: number, b: number, from = 0, to = 1) =>
  interpolate(frame, [a, b], [from, to], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

/** Deterministic 0..1 from an integer. Keeps every render identical. */
const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const alpha = (hex: string, a: number) =>
  `${hex}${Math.round(Math.max(0, Math.min(1, a)) * 255)
    .toString(16)
    .padStart(2, '0')}`;

// ============================================================================
// ambient layers — these run the whole 26s so nothing is ever flat black
// ============================================================================

/**
 * The muted grid-dot lattice called for in the brief, drifting slowly with a
 * breathing brightness. Drawn as an SVG pattern: 500-odd dots for the cost of
 * one rect.
 */
const DotLattice: FC = () => {
  const frame = useCurrentFrame();
  const dx = (frame * 0.28) % 64;
  const dy = (frame * 0.16) % 64;
  const breathe = 0.5 + 0.16 * Math.sin(frame / 42);

  return (
    <AbsoluteFill style={{opacity: breathe}}>
      <svg width="100%" height="100%">
        <defs>
          <pattern id="lattice" width={64} height={64} patternUnits="userSpaceOnUse" x={dx} y={dy}>
            <circle cx={2} cy={2} r={2.4} fill={C.dim} opacity={0.5} />
          </pattern>
          <radialGradient id="latticeMask">
            <stop offset="0%" stopColor="#fff" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#fff" stopOpacity={0.1} />
          </radialGradient>
          <mask id="latticeFade">
            <rect width="100%" height="100%" fill="url(#latticeMask)" />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="url(#lattice)" mask="url(#latticeFade)" />
      </svg>
    </AbsoluteFill>
  );
};

/** Slow-drifting motes. Cheap, and the frame stops feeling dead. */
const Motes: FC<{count?: number}> = ({count = 34}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <svg width={1080} height={1920}>
        {Array.from({length: count}, (_, i) => {
          const speed = 0.16 + hash(i * 11) * 0.5;
          const x = hash(i * 3) * 1080 + Math.sin(frame / (60 + hash(i) * 70)) * 26;
          const y = (hash(i * 7) * 1920 - frame * speed * 3.4) % 1920;
          const r = 1.4 + hash(i * 17) * 3.1;
          const warm = hash(i * 23) > 0.72;
          return (
            <circle
              key={i}
              cx={x}
              cy={y < 0 ? y + 1920 : y}
              r={r}
              fill={warm ? C.accent : C.dim}
              opacity={(warm ? 0.46 : 0.24) * (0.55 + 0.45 * Math.sin(frame / 25 + i))}
            />
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

/** One-frame-ish accent bloom on a beat change. Cuts stop feeling like cuts. */
const BeatFlash: FC<{at: number}> = ({at}) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [at - 1, at + 1, at + 9], [0, 0.17, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  if (o <= 0.001) return null;
  return <AbsoluteFill style={{background: C.accent, opacity: o, mixBlendMode: 'screen'}} />;
};

/** HUD corner brackets — frames a beat without adding a word to read. */
const Brackets: FC<{from: number; inset?: number; size?: number}> = ({
  from,
  inset = 54,
  size = 62,
}) => {
  const frame = useCurrentFrame();
  const t = ease(frame, from, from + 22);
  const push = (1 - t) * 26;
  const s = {stroke: C.accent, strokeWidth: 3, fill: 'none', opacity: t * 0.5} as const;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <svg width={1080} height={1920}>
        <path
          d={`M${inset - push} ${inset + size - push} V${inset - push} H${inset + size - push}`}
          {...s}
        />
        <path
          d={`M${1080 - inset - size + push} ${inset - push} H${1080 - inset + push} V${
            inset + size - push
          }`}
          {...s}
        />
        <path
          d={`M${inset - push} ${1920 - inset - size + push} V${1920 - inset + push} H${
            inset + size - push
          }`}
          {...s}
        />
        <path
          d={`M${1080 - inset - size + push} ${1920 - inset + push} H${1080 - inset + push} V${
            1920 - inset - size + push
          }`}
          {...s}
        />
      </svg>
    </AbsoluteFill>
  );
};

// ============================================================================
// hook — the shocked face
// ============================================================================

/**
 * Drawn as SVG rather than typed as an emoji character: headless Chromium in
 * this environment has no emoji font, so a real 🤯 renders as a tofu box. Flat
 * shapes in the video's own palette, not a gradient cartoon.
 */
const ShockFace: FC<{from: number}> = ({from}) => {
  const frame = useCurrentFrame();
  const f = frame - from;
  const t = ease(frame, from, from + 14);

  const pop = interpolate(t, [0, 1], [0.3, 1]);
  // Settles, then keeps a small nervous shake going.
  const shake = f > 14 ? Math.sin(f / 2.4) * 2.1 : 0;
  const tilt = interpolate(t, [0, 1], [-22, 0]) + shake;

  // Eyes widen after the face lands; mouth drops a beat later.
  const eye = ease(frame, from + 8, from + 20);
  const mouth = ease(frame, from + 12, from + 26);

  const R = 118;
  return (
    <div style={{opacity: t, transform: `scale(${pop}) rotate(${tilt}deg)`}}>
      <svg width={300} height={300} viewBox="-150 -150 300 300" style={{overflow: 'visible'}}>
        {/* Impact burst — eight spokes, gone in half a second. */}
        {Array.from({length: 8}, (_, i) => {
          const a = (i / 8) * Math.PI * 2 + 0.4;
          const g = ease(frame, from + 2, from + 18);
          const o = 1 - ease(frame, from + 8, from + 26);
          return (
            <line
              key={i}
              x1={Math.cos(a) * (R + 18 + g * 22)}
              y1={Math.sin(a) * (R + 18 + g * 22)}
              x2={Math.cos(a) * (R + 30 + g * 74)}
              y2={Math.sin(a) * (R + 30 + g * 74)}
              stroke={C.accent}
              strokeWidth={7}
              strokeLinecap="round"
              opacity={o * 0.85}
            />
          );
        })}

        {/* Halo */}
        <circle
          r={R + 22 + Math.sin(f / 9) * 5}
          fill="none"
          stroke={C.accent}
          strokeWidth={3}
          opacity={0.26 * t}
        />

        {/* Face */}
        <circle r={R} fill={C.accent} />

        {/* Eyes — wide, dark cutouts */}
        <ellipse cx={-44} cy={-22} rx={20 + eye * 5} ry={26 + eye * 21} fill={C.ground} />
        <ellipse cx={44} cy={-22} rx={20 + eye * 5} ry={26 + eye * 21} fill={C.ground} />

        {/* Raised brows */}
        <path
          d={`M-70 ${-72 - eye * 12} q26 -17 52 -3`}
          stroke={C.ground}
          strokeWidth={9}
          strokeLinecap="round"
          fill="none"
          opacity={eye}
        />
        <path
          d={`M18 ${-75 - eye * 12} q26 -14 52 3`}
          stroke={C.ground}
          strokeWidth={9}
          strokeLinecap="round"
          fill="none"
          opacity={eye}
        />

        {/* Dropped jaw */}
        <ellipse cx={0} cy={52 + mouth * 8} rx={26 + mouth * 8} ry={8 + mouth * 34} fill={C.ground} />
      </svg>
    </div>
  );
};

// ============================================================================
// beat 1 — the evaluation bar
// ============================================================================

/**
 * Fills to 100% and stamps PASSED, so "passing the evaluation" has something
 * to be true of before the copy calls it the easy part.
 */
const EvalBar: FC<{from: number}> = ({from}) => {
  const frame = useCurrentFrame();
  const t = ease(frame, from, from + 12);
  const fill = ease(frame, from + 6, from + 42);
  const passed = ease(frame, from + 44, from + 56);
  const W = 780;

  return (
    <div style={{opacity: t, width: W}}>
      <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 18}}>
        <Caps size={23} style={{textAlign: 'left'}}>
          Evaluation
        </Caps>
        <Caps size={23} color={fill > 0.97 ? C.green : C.accent} style={{textAlign: 'right'}}>
          {Math.round(fill * 100)}%
        </Caps>
      </div>

      <div style={{position: 'relative', height: 16, borderRadius: 999, background: C.dimFaint}}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            width: `${fill * 100}%`,
            borderRadius: 999,
            background: `linear-gradient(90deg, ${C.accentDeep}, ${
              fill > 0.97 ? C.green : C.accent
            })`,
            boxShadow: `0 0 26px ${alpha(fill > 0.97 ? C.green : C.accent, 0.55)}`,
          }}
        />
        {/* Leading edge pip */}
        {fill < 0.99 && fill > 0.02 && (
          <div
            style={{
              position: 'absolute',
              left: `${fill * 100}%`,
              top: -5,
              width: 5,
              height: 26,
              marginLeft: -2,
              borderRadius: 3,
              background: C.text,
              opacity: 0.85,
            }}
          />
        )}
      </div>

      {/* PASSED stamp — lands hard, then relaxes. */}
      <div
        style={{
          marginTop: 26,
          textAlign: 'center',
          opacity: passed,
          transform: `scale(${interpolate(passed, [0, 1], [1.5, 1])}) rotate(${interpolate(
            passed,
            [0, 1],
            [-9, -3],
          )}deg)`,
        }}
      >
        <span
          style={{
            display: 'inline-block',
            padding: '10px 30px',
            border: `3px solid ${C.green}`,
            borderRadius: 10,
            color: C.green,
            fontFamily: theme.fontFamily,
            fontSize: 38,
            fontWeight: 700,
            letterSpacing: '0.2em',
          }}
        >
          PASSED
        </span>
      </div>
    </div>
  );
};

// ============================================================================
// the 100-dot grid
// ============================================================================

const COLS = 10;
const ROWS = 10;
const TOTAL = COLS * ROWS;
const GAP = 66;
const R = 13;
const GRID_W = (COLS - 1) * GAP + R * 2;

/**
 * Which cells are lit, scattered rather than blocked, so the grid reads as a
 * population sample instead of a progress bar. Deterministic: a seeded shuffle
 * of 0..99, first FUNDED_PCT taken as funded, of which the tail halves off.
 */
const shuffled = (() => {
  const idx = Array.from({length: TOTAL}, (_, i) => i);
  for (let i = TOTAL - 1; i > 0; i--) {
    const j = Math.floor(hash(i * 3 + 1) * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx;
})();

const LIT = shuffled.slice(0, FUNDED_PCT);
/** The ones that go grey in beat 3 — the difference between funded and paid. */
const LOST = LIT.slice(PAID_PCT);
const LOST_SET = new Set(LOST);

// DotGrid lives inside <Sequence from={B2}>, so useCurrentFrame() hands it
// frames local to that sequence. Its cues are expressed the same way.
const GRID_IN = 4;
const DIM_FROM = B3 - B2 + 6;
const BLOW = B4 - B2 + 4;

const DotGrid: FC<{x: number; y: number}> = ({x, y}) => {
  const frame = useCurrentFrame();
  const blown = frame >= BLOW;
  // A scan line rides down the grid as it fills.
  const scan = lin(frame, GRID_IN + 4, GRID_IN + 54, -30, GRID_W + 30);

  return (
    <div style={{position: 'absolute', left: x, top: y, width: GRID_W, height: GRID_W}}>
      <svg width={GRID_W} height={GRID_W} style={{overflow: 'visible'}}>
        {/* Shockwave — one ring, gone in half a second. */}
        {blown && (
          <circle
            cx={GRID_W / 2}
            cy={GRID_W / 2}
            r={40 + ease(frame, BLOW, BLOW + 24) * 760}
            fill="none"
            stroke={C.accent}
            strokeWidth={lin(frame, BLOW, BLOW + 24, 10, 1)}
            opacity={1 - ease(frame, BLOW, BLOW + 22)}
          />
        )}

        {!blown && frame > GRID_IN && frame < GRID_IN + 58 && (
          <line
            x1={-20}
            y1={scan}
            x2={GRID_W + 20}
            y2={scan}
            stroke={C.accent}
            strokeWidth={2}
            opacity={0.5}
          />
        )}

        {Array.from({length: TOTAL}, (_, i) => {
          const col = i % COLS;
          const row = Math.floor(i / COLS);
          const cx = R + col * GAP;
          const cy = R + row * GAP;

          // Entrance: staggered outward from the grid centre, so it fills like
          // a population being counted rather than a wipe.
          const dc = Math.hypot(col - 4.5, row - 4.5);
          const appear = ease(frame, GRID_IN + dc * 3.4, GRID_IN + dc * 3.4 + 16);
          if (appear <= 0) return null;

          const isLit = LIT.includes(i);
          const isLost = LOST_SET.has(i);

          // Beat 3: the lost half fades from accent to grey, one at a time.
          const lostStagger = isLost ? LOST.indexOf(i) * 4 : 0;
          const lost = isLost
            ? interpolate(frame, [DIM_FROM + lostStagger, DIM_FROM + lostStagger + 14], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
                easing: EASE_IN_OUT,
              })
            : 0;

          const fill = isLit ? (lost > 0.5 ? C.dim : C.accent) : C.dimFaint;
          const litNow = isLit && lost < 0.5;

          // Beat 4: detonation.
          let tx = 0;
          let ty = 0;
          let scale = 1;
          let blowFade = 1;
          if (blown) {
            const t = ease(frame, BLOW, BLOW + 108);
            const ang = Math.atan2(cy - GRID_W / 2, cx - GRID_W / 2) + (hash(i * 7) - 0.5) * 1.1;
            const speed = 700 + hash(i * 13) * 1000;
            tx = Math.cos(ang) * speed * t;
            ty = Math.sin(ang) * speed * t - 140 * t * t;
            scale = 1 - 0.6 * t;
            // Linear, deliberately: EASE_OUT is front-loaded and burned the
            // debris off within a second of the bang.
            blowFade = lin(frame, BLOW + 26, BLOW + 112, 1, 0);
          }

          const opacity = appear * blowFade * (isLit ? 1 : 0.9) * (blown ? 0.62 : 1);

          return (
            <g key={i} transform={`translate(${tx} ${ty})`} opacity={opacity}>
              <circle
                cx={cx}
                cy={cy}
                r={R * scale * (0.7 + 0.3 * appear)}
                fill={fill}
                style={litNow ? {filter: `drop-shadow(0 0 ${12 * scale}px ${C.accent}AA)`} : undefined}
              />
              {/* A struck-through mark on each dot that drops out in beat 3. */}
              {isLost && lost > 0.55 && !blown && (
                <g opacity={(lost - 0.55) / 0.45} stroke={C.dim} strokeWidth={2.6} strokeLinecap="round">
                  <line x1={cx - 8} y1={cy - 8} x2={cx + 8} y2={cy + 8} />
                  <line x1={cx + 8} y1={cy - 8} x2={cx - 8} y2={cy + 8} />
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// ============================================================================
// beat 4 — the equity curve
// ============================================================================

const EQ_N = 64;
/** Rises cleanly through the eval, tops out at funding, then gives it all back. */
const EQUITY = (() => {
  const pts: number[] = [];
  for (let i = 0; i < EQ_N; i++) {
    const t = i / (EQ_N - 1);
    const v =
      t < 0.5
        ? (t / 0.5) * 1.0
        : 1.0 - Math.pow((t - 0.5) / 0.5, 1.8) * 1.42;
    pts.push(v + (hash(i * 5) - 0.5) * 0.07);
  }
  return pts;
})();
const EQ_FUND = Math.floor(EQ_N * 0.5);

const EquityCurve: FC<{from: number; x: number; y: number; w: number; h: number}> = ({
  from,
  x,
  y,
  w,
  h,
}) => {
  const frame = useCurrentFrame();
  const t = ease(frame, from, from + 82);
  const shown = Math.max(2, Math.floor(t * EQ_N));
  const fade = ease(frame, from, from + 14);

  const px = (i: number) => (i / (EQ_N - 1)) * w;
  const py = (v: number) => h - ((v + 0.5) / 1.6) * h;

  const path = (a: number, b: number) =>
    EQUITY.slice(a, b)
      .map((v, k) => `${k === 0 ? 'M' : 'L'}${px(a + k).toFixed(1)} ${py(v).toFixed(1)}`)
      .join(' ');

  const upEnd = Math.min(shown, EQ_FUND + 1);
  const headI = shown - 1;
  const headX = px(headI);
  const headY = py(EQUITY[headI]);
  const down = shown > EQ_FUND;

  return (
    <div style={{position: 'absolute', left: x, top: y, width: w, height: h, opacity: fade * 0.95}}>
      <svg width={w} height={h} style={{overflow: 'visible'}}>
        {/* Baseline */}
        <line x1={0} y1={py(0)} x2={w} y2={py(0)} stroke={C.dim} strokeWidth={1.5} opacity={0.3} />

        {/* Under-curve wash on the collapse */}
        {down && (
          <path
            d={`${path(EQ_FUND, shown)} L${px(shown - 1)} ${py(0)} L${px(EQ_FUND)} ${py(0)} Z`}
            fill={C.red}
            opacity={0.12}
          />
        )}

        <path d={path(0, upEnd)} stroke={C.green} strokeWidth={5} fill="none" strokeLinecap="round" />
        {down && (
          <path d={path(EQ_FUND, shown)} stroke={C.red} strokeWidth={5} fill="none" strokeLinecap="round" />
        )}

        {/* FUNDED marker at the top of the curve */}
        {shown > EQ_FUND && (
          <g opacity={ease(frame, from + 40, from + 52)}>
            <line
              x1={px(EQ_FUND)}
              y1={py(EQUITY[EQ_FUND]) - 14}
              x2={px(EQ_FUND)}
              y2={h}
              stroke={C.accent}
              strokeWidth={2}
              strokeDasharray="7 7"
              opacity={0.65}
            />
            <text
              x={px(EQ_FUND)}
              y={py(EQUITY[EQ_FUND]) - 26}
              textAnchor="middle"
              fill={C.accent}
              fontFamily={theme.fontFamily}
              fontSize={24}
              fontWeight={600}
              letterSpacing="0.18em"
            >
              FUNDED
            </text>
          </g>
        )}

        {/* Live head */}
        <circle cx={headX} cy={headY} r={8} fill={down ? C.red : C.green} />
        <circle cx={headX} cy={headY} r={8 + (frame % 26) * 0.9} fill="none" stroke={down ? C.red : C.green} strokeWidth={2} opacity={0.5 - (frame % 26) * 0.019} />
      </svg>
    </div>
  );
};

// ============================================================================
// typography
// ============================================================================

const Slam: FC<{
  from: number;
  children: ReactNode;
  size?: number;
  color?: string;
  weight?: number;
}> = ({from, children, size = 96, color = C.text, weight = 700}) => {
  const frame = useCurrentFrame();
  const t = ease(frame, from, from + 9);
  return (
    <div
      style={{
        opacity: t,
        transform: `scale(${interpolate(t, [0, 1], [1.18, 1])})`,
        color,
        fontFamily: theme.fontFamily,
        fontSize: size,
        fontWeight: weight,
        letterSpacing: theme.trackingTight,
        lineHeight: 1.04,
        textAlign: 'center',
      }}
    >
      {children}
    </div>
  );
};

const Caps: FC<{children: ReactNode; color?: string; size?: number; style?: React.CSSProperties}> = ({
  children,
  color = C.dim,
  size = 25,
  style,
}) => (
  <div
    style={{
      color,
      fontFamily: theme.fontFamily,
      fontSize: size,
      fontWeight: theme.weightBody,
      letterSpacing: theme.trackingWide,
      textTransform: 'uppercase',
      textAlign: 'center',
      ...style,
    }}
  >
    {children}
  </div>
);

/**
 * Legend pill above the product shot. Labels only, no values: the capture is
 * mid-drag for most of the beat, so a chip reading "6.2%" next to a screen
 * reading "10.7%" contradicts itself. The device supplies the numbers.
 */
const Chip: FC<{from: number; label: string}> = ({from, label}) => {
  const frame = useCurrentFrame();
  const t = ease(frame, from, from + 14);
  return (
    <div
      style={{
        opacity: t,
        transform: `translateY(${(1 - t) * 14}px)`,
        padding: '14px 24px',
        borderRadius: 999,
        background: '#14110FE6',
        border: `1px solid ${alpha(C.accent, 0.34)}`,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <div
        style={{
          width: 9,
          height: 9,
          borderRadius: 999,
          background: C.accent,
          boxShadow: `0 0 12px ${C.accent}`,
        }}
      />
      <Caps size={22} color={C.text} style={{textAlign: 'left', opacity: 0.9}}>
        {label}
      </Caps>
    </div>
  );
};

// ============================================================================

export const PayoutStatScene: FC = () => {
  const frame = useCurrentFrame();

  // The big percentage: counts up to funded, then counts down to paid.
  const stat =
    frame < B2 + 15
      ? 0
      : frame < B3 + 2
      ? interpolate(frame, [B2 + 15, B2 + 42], [0, FUNDED_PCT], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: EASE_OUT,
        })
      : interpolate(frame, [B3 + 2, B3 + 26], [FUNDED_PCT, PAID_PCT], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: EASE_IN_OUT,
        });

  const gridX = (1080 - GRID_W) / 2;
  const gridY = 1010;

  return (
    <AbsoluteFill style={{background: C.ground}}>
      {/* ---------------- ambient, whole runtime ---------------- */}
      <DotLattice />
      <Motes />

      {/* ---------------- HOOK ---------------- */}
      <Sequence from={0} durationInFrames={B1}>
        <AbsoluteFill>
          <Glow y="38%" colour={C.accent} strength={0.19} />
          <Brackets from={4} />
          <AbsoluteFill
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 46,
              padding: '0 60px',
            }}
          >
            <ShockFace from={2} />
            <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
              <Slam from={14} size={100}>
                you weren&rsquo;t
              </Slam>
              <Slam from={19} size={100}>
                supposed to know
              </Slam>
              <Slam from={24} size={100} color={C.accent}>
                this
              </Slam>
            </div>
          </AbsoluteFill>
          <Audio src={sfx('Impact.mp3')} volume={0.9} />
          <Sequence from={18}>
            <Audio src={sfx('Suspense.mp3')} volume={0.34} />
          </Sequence>
        </AbsoluteFill>
      </Sequence>

      {/* ---------------- BEAT 1 — eval bar + claim ---------------- */}
      <Sequence from={B1} durationInFrames={B2 - B1}>
        <AbsoluteFill>
          <Glow y="50%" colour={C.accent} strength={0.1} />
          <AbsoluteFill
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 56,
              padding: '0 44px',
            }}
          >
            <EvalBar from={2} />
            <div style={{display: 'flex', flexDirection: 'column', gap: 14}}>
              <Slam from={56} size={78}>
                passing the evaluation
              </Slam>
              <Slam from={68} size={78} color={C.accent}>
                isn&rsquo;t the hard part
              </Slam>
            </div>
          </AbsoluteFill>
          <Audio src={sfx('Typing.mp3')} volume={0.3} />
          <Sequence from={44}>
            <Audio src={sfx('Correct.mp3')} volume={0.6} />
          </Sequence>
        </AbsoluteFill>
      </Sequence>

      {/* ---------------- BEATS 2-4 — the grid ---------------- */}
      <Sequence from={B2} durationInFrames={B5 - B2}>
        <AbsoluteFill>
          <Glow y="30%" colour={C.accent} strength={0.12} />

          {/* Stat block — present for beats 2 and 3, gone by the detonation. */}
          {frame < B4 + 2 && (
            <>
              <div style={{position: 'absolute', top: 330, left: 0, right: 0}}>
                <Caps>Of everyone who starts an evaluation</Caps>
              </div>

              <div
                style={{
                  position: 'absolute',
                  top: 400,
                  left: 0,
                  right: 0,
                  textAlign: 'center',
                  color: C.accent,
                  fontFamily: theme.fontFamily,
                  fontSize: 260,
                  fontWeight: 700,
                  letterSpacing: '-0.05em',
                  lineHeight: 1,
                  textShadow: `0 0 70px ${alpha(C.accent, 0.36)}`,
                }}
              >
                {Math.round(stat)}%
              </div>

              {/* Beat 2 sub-line */}
              {frame < B3 && (
                <div style={{position: 'absolute', top: 700, left: 0, right: 0}}>
                  <Reveal from={46}>
                    <div
                      style={{
                        textAlign: 'center',
                        color: C.text,
                        fontFamily: theme.fontFamily,
                        fontSize: 62,
                        fontWeight: theme.weightDisplay,
                        letterSpacing: theme.trackingTight,
                      }}
                    >
                      ever get funded
                    </div>
                  </Reveal>
                </div>
              )}

              {/* Beat 3 sub-line — a second, separate wall */}
              {frame >= B3 && (
                <div style={{position: 'absolute', top: 700, left: 0, right: 0}}>
                  <Reveal from={B3 - B2 + 6} y={18}>
                    <div
                      style={{
                        textAlign: 'center',
                        color: C.text,
                        fontFamily: theme.fontFamily,
                        fontSize: 62,
                        fontWeight: theme.weightDisplay,
                        letterSpacing: theme.trackingTight,
                      }}
                    >
                      ever actually get paid
                    </div>
                  </Reveal>
                  <div style={{marginTop: 26}}>
                    <Reveal from={B3 - B2 + 40} y={14}>
                      <Caps color={C.accent}>Funded is not the same as paid</Caps>
                    </Reveal>
                  </div>
                </div>
              )}
            </>
          )}

          <DotGrid x={gridX} y={gridY} />

          {/* Beat 4 — copy up top, equity curve underneath, debris between. */}
          {frame >= B4 && (
            <>
              <div style={{position: 'absolute', top: 300, left: 0, right: 0, padding: '0 84px'}}>
                <Slam from={B4 - B2 + 8} size={78}>
                  they don&rsquo;t blow up
                  <br />
                  in the eval
                </Slam>
                <div style={{marginTop: 26}}>
                  <Slam from={B4 - B2 + 52} size={78} color={C.accent}>
                    they blow up after
                  </Slam>
                </div>
                <div style={{marginTop: 22}}>
                  <Slam from={B4 - B2 + 84} size={52} weight={theme.weightDisplay}>
                    once it&rsquo;s real money
                  </Slam>
                </div>
              </div>

              <EquityCurve from={B4 - B2 + 34} x={110} y={1040} w={860} h={560} />
            </>
          )}

          <Sequence from={4}>
            <Audio src={sfx('Popups.mp3')} volume={0.6} />
          </Sequence>
          <Sequence from={B3 - B2}>
            <Audio src={sfx('Notification.mp3')} volume={0.72} />
          </Sequence>
          <Sequence from={B4 - B2 + 2}>
            <Audio src={sfx('Impact.mp3')} volume={0.95} />
          </Sequence>
        </AbsoluteFill>
      </Sequence>

      {/* ---------------- BEAT 5 — Control Room ---------------- */}
      <Sequence from={B5} durationInFrames={CTA - B5}>
        <AbsoluteFill>
          <Glow y="55%" colour={C.accent} strength={0.14} />

          <div style={{position: 'absolute', top: 118, left: 0, right: 0, padding: '0 70px'}}>
            <Reveal from={4}>
              <Caps color={C.accent}>Neura Control Room</Caps>
            </Reveal>
            <div style={{marginTop: 22}}>
              <Reveal from={12} y={20}>
                <div
                  style={{
                    textAlign: 'center',
                    color: C.text,
                    fontFamily: theme.fontFamily,
                    fontSize: 58,
                    fontWeight: 700,
                    letterSpacing: theme.trackingTight,
                    lineHeight: 1.1,
                  }}
                >
                  the same limits carry
                  <br />
                  into the funded account
                </div>
              </Reveal>
            </div>
          </div>

          {/* Legend chips — what the Control Room is actually enforcing. */}
          <div
            style={{
              position: 'absolute',
              top: 332,
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'center',
              gap: 16,
            }}
          >
            <Chip from={30} label="Daily loss" />
            <Chip from={38} label="Risk / trade" />
            <Chip from={46} label="Trades / day" />
          </div>

          <DeviceFrame from={10} />

          <div style={{position: 'absolute', bottom: 74, left: 0, right: 0, padding: '0 80px'}}>
            <Reveal from={100} y={20}>
              <div
                style={{
                  textAlign: 'center',
                  color: C.dim,
                  fontFamily: theme.fontFamily,
                  fontSize: 40,
                  fontWeight: theme.weightBody,
                  lineHeight: 1.25,
                }}
              >
                so the discipline doesn&rsquo;t reset
                <br />
                when the pressure does
              </div>
            </Reveal>
          </div>

          <Audio src={sfx('Zoomin-OR-out.mp3')} volume={0.6} />
          <Sequence from={30}>
            <Audio src={sfx('Click.mp3')} volume={0.4} />
          </Sequence>
        </AbsoluteFill>
      </Sequence>

      {/* ---------------- CTA ---------------- */}
      <Sequence from={CTA} durationInFrames={END - CTA}>
        <AbsoluteFill>
          <Glow y="46%" colour={C.accent} strength={0.22} />
          <Brackets from={2} inset={70} size={74} />
          <CtaCard from={2} />
          <Audio src={sfx('aha-moment.MP3')} volume={0.85} />
        </AbsoluteFill>
      </Sequence>

      {/* ---------------- beat transitions ---------------- */}
      <BeatFlash at={B1} />
      <BeatFlash at={B2} />
      <BeatFlash at={B3} />
      <BeatFlash at={B4} />
      <BeatFlash at={B5} />
      <BeatFlash at={CTA} />

      {/* ---------------- bed + texture ---------------- */}
      <Sequence from={0} durationInFrames={END}>
        <Audio src={sfx('energy.MP3')} volume={0.17} />
      </Sequence>
      <Grain opacity={0.045} />
    </AbsoluteFill>
  );
};

// ============================================================================
// device
// ============================================================================

const DEV_W = 660;
const DEV_H = Math.round((DEV_W * 1280) / 720); // 1173 — source aspect, no stretch

const DeviceFrame: FC<{from: number}> = ({from}) => {
  const frame = useCurrentFrame();
  const t = ease(frame, from, from + 20);
  const scale = interpolate(t, [0, 1], [0.94, 1]);
  const rim = 0.3 + 0.35 * Math.max(0, Math.sin((frame - from) / 16));

  return (
    <div
      style={{
        position: 'absolute',
        left: (1080 - DEV_W) / 2,
        top: 500,
        width: DEV_W,
        height: DEV_H,
        opacity: t,
        transform: `scale(${scale})`,
        // Small radius on purpose: at 42 the rounding ate the app's own tab row
        // and bottom nav in the corners.
        borderRadius: 14,
        overflow: 'hidden',
        border: `2px solid ${alpha(C.accent, rim)}`,
        boxShadow: `0 40px 120px #000000CC, 0 0 90px ${alpha(C.accent, 0.13)}`,
        background: '#000',
      }}
    >
      <OffthreadVideo
        src={staticFile('brand-assets/video/control-room.mp4')}
        style={{
          width: '100%',
          height: '100%',
          // contain, not cover: nothing gets cropped off the edges.
          objectFit: 'contain',
          // The capture is a dark UI shot on a dark ground; without this lift
          // the sliders sink into the panel on a phone screen.
          filter: 'brightness(1.14) contrast(1.07) saturate(1.06)',
        }}
        muted
      />

      {/* One slow accent sweep across the risk-limit rows, so "highlighted"
          reads without pinning an overlay to a scrolling capture. */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: interpolate(frame, [from + 18, from + 84], [150, 800], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: EASE_IN_OUT,
          }),
          height: 150,
          background: `linear-gradient(180deg, transparent, ${alpha(C.accent, 0.12)}, transparent)`,
          opacity: interpolate(frame, [from + 18, from + 30, from + 72, from + 88], [0, 1, 1, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      />
    </div>
  );
};

// ============================================================================
// CTA
// ============================================================================

const CtaCard: FC<{from: number}> = ({from}) => {
  const frame = useCurrentFrame();
  const t = ease(frame, from, from + 16);
  const W = 860;
  const H = 372;
  // Border draws itself on.
  const peri = (W + H) * 2;
  const draw = ease(frame, from + 4, from + 30);
  // Arrow nudges forward, forever.
  const nudge = Math.sin((frame - from) / 6) * 7;

  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
      <div
        style={{
          position: 'relative',
          width: W,
          height: H,
          opacity: t,
          transform: `scale(${interpolate(t, [0, 1], [0.9, 1])})`,
          borderRadius: 34,
          background: `radial-gradient(120% 90% at 50% 0%, ${alpha(C.accent, 0.13)} 0%, #16110E 45%, ${
            C.ground
          } 100%)`,
          boxShadow: `0 40px 120px #000000AA, 0 0 110px ${alpha(C.accent, 0.17)}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 18,
        }}
      >
        <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
          <rect
            x={1.5}
            y={1.5}
            width={W - 3}
            height={H - 3}
            rx={33}
            fill="none"
            stroke={C.accent}
            strokeWidth={3}
            strokeDasharray={peri}
            strokeDashoffset={peri * (1 - draw)}
            opacity={0.75}
          />
        </svg>

        <div
          style={{
            color: C.text,
            fontFamily: theme.fontFamily,
            fontSize: 92,
            fontWeight: 700,
            letterSpacing: theme.trackingTight,
          }}
        >
          free to start
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            color: C.accent,
            fontFamily: theme.fontFamily,
            fontSize: 74,
            fontWeight: 700,
            letterSpacing: theme.trackingTight,
          }}
        >
          <span>link in bio</span>
          <svg width={52} height={52} viewBox="0 0 52 52" style={{transform: `translateX(${nudge}px)`}}>
            <path
              d="M8 26 H40 M28 14 L42 26 L28 38"
              stroke={C.accent}
              strokeWidth={6}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        </div>
      </div>

      <div style={{position: 'absolute', bottom: 132}}>
        <Reveal from={from + 18}>
          <Caps color={C.text} size={30} style={{opacity: 0.82}}>
            Neura
          </Caps>
        </Reveal>
      </div>
    </AbsoluteFill>
  );
};
