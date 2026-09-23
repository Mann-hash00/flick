import type {FC, ReactNode} from 'react';
import {AbsoluteFill, Audio, Easing, Sequence, interpolate, useCurrentFrame} from 'remotion';
import {theme} from '../theme';
import {EASE_IN_OUT, EASE_OUT, Grain, Glow} from '../terminal';
import {sfx} from '../common';

// ============================================================================
// "Scar Tissue" — the cost of no emotional discipline
// 480 frames @ 30fps = 16.0s. 1080x1920, rendered --scale=2 for 2160x3840.
//
// One object carries the whole film. The piggy bank shatters in the hook and
// its shards fall into a line; that line is the equity curve, and it stays on
// screen and alive for the remaining fourteen seconds — it takes weight and
// snaps, resets clean, gets whipped down, gets sutured, and finally pulls back
// to reveal it has done this five times.
//
// Beat map (frames):
//   HOOK    0   – 78    piggy bank cracks and shatters
//   BEAT 1  78  – 138   shards fall into a line; weight lands; the line snaps
//   BEAT 2  138 – 198   clean green rise, metronomic
//   BEAT 3  198 – 264   the whip down; the earlier gain greys out as it goes
//   BEAT 4  264 – 336   sutures across the drawdown; a limping repair
//   BEAT 5  336 – 480   pull back: four scars behind, and this one still climbing
// ============================================================================

const C = {
  ground: '#0A0908',
  text: '#F4F1ED',
  // Brand orange, per the palette decision — this matches the other videos.
  accent: theme.orange,
  accentDeep: '#B85714',
  dim: '#6E6C67',
  dimFaint: '#2A2926',
  green: '#2FA36B',
  greenBright: '#3DD68C',
  red: '#E5484D',
  scar: '#7A5A4A',
} as const;

// ---------- beat boundaries ----------
const B1 = 78;
const B2 = 138;
const B3 = 198;
const B4 = 264;
const B5 = 336;
const END = 480;

// ---------- helpers ----------
const ease = (frame: number, a: number, b: number, from = 0, to = 1) =>
  interpolate(frame, [a, b], [from, to], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_OUT,
  });

const lin = (frame: number, a: number, b: number, from = 0, to = 1) =>
  interpolate(frame, [a, b], [from, to], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

/** Accelerating — for anything with mass. */
const fall = (frame: number, a: number, b: number, from = 0, to = 1) =>
  interpolate(frame, [a, b], [from, to], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.55, 0, 0.9, 0.35),
  });

const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const alpha = (hex: string, a: number) =>
  `${hex}${Math.round(Math.max(0, Math.min(1, a)) * 255)
    .toString(16)
    .padStart(2, '0')}`;

/** Decaying camera shake, for impacts. */
const shakeAt = (frame: number, at: number, mag = 18, dur = 16) => {
  if (frame < at || frame > at + dur) return '';
  const d = 1 - (frame - at) / dur;
  const x = Math.sin((frame - at) * 2.1) * mag * d;
  const y = Math.cos((frame - at) * 2.7) * mag * d * 0.6;
  return `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`;
};

// ============================================================================
// ambient
// ============================================================================

const DotLattice: FC = () => {
  const frame = useCurrentFrame();
  const dx = (frame * 0.26) % 64;
  const dy = (frame * 0.15) % 64;
  return (
    <AbsoluteFill style={{opacity: 0.5 + 0.14 * Math.sin(frame / 44)}}>
      <svg width="100%" height="100%">
        <defs>
          <pattern id="lat" width={64} height={64} patternUnits="userSpaceOnUse" x={dx} y={dy}>
            <circle cx={2} cy={2} r={2.3} fill={C.dim} opacity={0.42} />
          </pattern>
          <radialGradient id="latMaskG">
            <stop offset="0%" stopColor="#fff" stopOpacity={0.85} />
            <stop offset="100%" stopColor="#fff" stopOpacity={0.08} />
          </radialGradient>
          <mask id="latMask">
            <rect width="100%" height="100%" fill="url(#latMaskG)" />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="url(#lat)" mask="url(#latMask)" />
      </svg>
    </AbsoluteFill>
  );
};

const Motes: FC<{count?: number}> = ({count = 30}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <svg width={1080} height={1920}>
        {Array.from({length: count}, (_, i) => {
          const speed = 0.16 + hash(i * 11) * 0.48;
          const x = hash(i * 3) * 1080 + Math.sin(frame / (60 + hash(i) * 70)) * 24;
          let y = (hash(i * 7) * 1920 - frame * speed * 3.2) % 1920;
          if (y < 0) y += 1920;
          const warm = hash(i * 23) > 0.74;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={1.4 + hash(i * 17) * 3}
              fill={warm ? C.accent : C.dim}
              opacity={(warm ? 0.4 : 0.22) * (0.55 + 0.45 * Math.sin(frame / 25 + i))}
            />
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

// ============================================================================
// typography
// ============================================================================

const Line: FC<{
  from: number;
  children: ReactNode;
  size?: number;
  color?: string;
  weight?: number;
  drop?: boolean;
}> = ({from, children, size = 78, color = C.text, weight = 700, drop = false}) => {
  const frame = useCurrentFrame();
  const t = ease(frame, from, from + 10);
  // `drop` gives the line mass: it accelerates down into place instead of
  // easing up into it.
  const y = drop ? fall(frame, from, from + 12, -170, 0) : (1 - t) * 24;
  const sc = drop ? interpolate(t, [0, 1], [1.3, 1]) : interpolate(t, [0, 1], [1.12, 1]);
  return (
    <div
      style={{
        opacity: t,
        transform: `translateY(${y}px) scale(${sc})`,
        color,
        fontFamily: theme.fontFamily,
        fontSize: size,
        fontWeight: weight,
        letterSpacing: theme.trackingTight,
        lineHeight: 1.06,
        textAlign: 'center',
      }}
    >
      {children}
    </div>
  );
};

// ============================================================================
// the piggy bank
// ============================================================================

/** Iconographic, not cartoon-cute: flat fills, geometric, no gradients. */
const PiggyShapes: FC = () => (
  <>
    <path
      d="M -130,-10 C -130,-80 -70,-115 0,-115 C 70,-115 130,-80 130,-10 C 130,55 70,85 0,85 C -70,85 -130,55 -130,-10 Z"
      fill={C.accent}
    />
    <polygon points="52,-104 96,-142 102,-92" fill={C.accentDeep} />
    <rect x={-84} y={70} width={38} height={42} rx={9} fill={C.accentDeep} />
    <rect x={30} y={70} width={38} height={42} rx={9} fill={C.accentDeep} />
    <rect x={112} y={-28} width={62} height={56} rx={20} fill={C.accentDeep} />
    <circle cx={148} cy={-10} r={6} fill={C.ground} />
    <circle cx={148} cy={12} r={6} fill={C.ground} />
    <circle cx={66} cy={-46} r={9} fill={C.ground} />
    <rect x={-40} y={-114} width={80} height={17} rx={8} fill={C.ground} />
    <path
      d="M -126,-62 c -26,-16 -44,6 -28,20 c 12,10 28,2 24,-12"
      fill="none"
      stroke={C.accentDeep}
      strokeWidth={9}
      strokeLinecap="round"
    />
  </>
);

const SHARDS = 16;
const CRACK_AT = 20;
const SHATTER_AT = 44;

const PiggyBank: FC = () => {
  const frame = useCurrentFrame();
  const enter = ease(frame, 0, 16);
  const shattered = frame >= SHATTER_AT;

  // A tremble builds between the first crack and the break.
  const tremble =
    frame > CRACK_AT && !shattered ? Math.sin(frame * 2.3) * (frame - CRACK_AT) * 0.5 : 0;

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 380,
        display: 'flex',
        justifyContent: 'center',
        opacity: enter,
        transform: `scale(${interpolate(enter, [0, 1], [0.82, 1])})`,
      }}
    >
      <svg width={880} height={740} viewBox="-180 -150 360 300" style={{overflow: 'visible'}}>
        <defs>
          {Array.from({length: SHARDS}, (_, i) => {
            const a0 = (i / SHARDS) * Math.PI * 2;
            const a1 = ((i + 1) / SHARDS) * Math.PI * 2;
            const am = (a0 + a1) / 2;
            const Rr = 460;
            const pts = [
              '0,0',
              `${Math.cos(a0) * Rr},${Math.sin(a0) * Rr}`,
              `${Math.cos(am) * Rr},${Math.sin(am) * Rr}`,
              `${Math.cos(a1) * Rr},${Math.sin(a1) * Rr}`,
            ].join(' ');
            return (
              <clipPath key={i} id={`shard${i}`}>
                <polygon points={pts} />
              </clipPath>
            );
          })}
        </defs>

        {!shattered && (
          <g transform={`translate(${tremble} 0)`}>
            <PiggyShapes />
            {/* Cracks spidering out from the impact point. */}
            {[
              'M 0,-20 L -46,-72 L -96,-58',
              'M 0,-20 L 44,-70 L 58,-116',
              'M 0,-20 L -30,44 L -88,70',
              'M 0,-20 L 62,32 L 104,22',
            ].map((d, i) => {
              const g = ease(frame, CRACK_AT + i * 3, CRACK_AT + i * 3 + 12);
              return (
                <path
                  key={i}
                  d={d}
                  fill="none"
                  stroke={C.ground}
                  strokeWidth={6}
                  strokeLinecap="round"
                  strokeDasharray={200}
                  strokeDashoffset={200 * (1 - g)}
                />
              );
            })}
          </g>
        )}

        {/* The break: every wedge is a real clipped piece of the same drawing. */}
        {shattered &&
          Array.from({length: SHARDS}, (_, i) => {
            const t = ease(frame, SHATTER_AT, SHATTER_AT + 46);
            const a = (i / SHARDS) * Math.PI * 2 + 0.2;
            const sp = 210 + hash(i * 13) * 320;
            const tx = Math.cos(a) * sp * t;
            // Gravity pulls the pieces down as they fly out.
            const ty = Math.sin(a) * sp * t + 520 * t * t;
            const rot = (hash(i * 7) - 0.5) * 150 * t;
            return (
              <g
                key={i}
                transform={`translate(${tx} ${ty}) rotate(${rot})`}
                opacity={1 - ease(frame, SHATTER_AT + 20, SHATTER_AT + 52)}
              >
                <g clipPath={`url(#shard${i})`}>
                  <PiggyShapes />
                </g>
              </g>
            );
          })}
      </svg>
    </div>
  );
};

// ============================================================================
// the equity curve — one object for the rest of the film
// ============================================================================

const CYCLE_N = 72;
/** Rise, hard collapse, shallow repair. Deterministic per seed. */
const buildCycle = (seed: number): number[] => {
  const pts: number[] = [];
  for (let i = 0; i < CYCLE_N; i++) {
    const t = i / (CYCLE_N - 1);
    let v: number;
    if (t < 0.46) {
      v = (t / 0.46) * 1.0 + (hash(seed * 13 + i) - 0.5) * 0.08;
    } else if (t < 0.6) {
      const u = (t - 0.46) / 0.14;
      v = 1.0 - u * 1.66 + (hash(seed * 29 + i) - 0.5) * 0.17;
    } else {
      const u = (t - 0.6) / 0.4;
      v = -0.66 + u * 0.8 + (hash(seed * 47 + i) - 0.5) * 0.05;
    }
    pts.push(v);
  }
  return pts;
};

const RISE_END = Math.round(0.46 * (CYCLE_N - 1)); // 33
const DROP_END = Math.round(0.6 * (CYCLE_N - 1)); // 43

/** Five cycles; the one we watch is the last, so the others read as history. */
const CYCLES = [0, 1, 2, 3, 4].map((s) => buildCycle(s + 1));
const LIVE = 4;

/** The ascent that only the live cycle gets, in the final beat. */
const ASCENT_N = 26;
const ASCENT = Array.from({length: ASCENT_N}, (_, i) => {
  const u = (i + 1) / ASCENT_N;
  return 0.14 + u * 1.5 + (hash(i * 91) - 0.5) * 0.06;
});

// world geometry
const CW = 760; // one cycle's width
const PLOT_X = 160;
const BASE_Y = 1180;
const VS = 330;

const wx = (cycle: number, i: number) => cycle * CW + (i / (CYCLE_N - 1)) * CW;
const wy = (v: number) => BASE_Y - v * VS;

const poly = (cycle: number, vals: number[], a: number, b: number) =>
  vals
    .slice(a, b)
    .map((v, k) => `${k === 0 ? 'M' : 'L'}${wx(cycle, a + k).toFixed(1)} ${wy(v).toFixed(1)}`)
    .join(' ');

const Curve: FC = () => {
  const frame = useCurrentFrame();

  // ---- how much of the live cycle has been drawn ----
  let idx: number;
  if (frame < B2 + 4) idx = 0;
  else if (frame < B3) idx = lin(frame, B2 + 4, B3 - 2, 0, RISE_END);
  else if (frame < B3 + 30) idx = lin(frame, B3 + 2, B3 + 28, RISE_END, DROP_END);
  else if (frame < B4 + 22) idx = DROP_END;
  else idx = lin(frame, B4 + 22, B4 + 68, DROP_END, CYCLE_N - 1);
  const shown = Math.max(1, Math.round(idx));

  // The earlier gain greys out as the drop eats it — "lose it all", on screen.
  const wiped = ease(frame, B3 + 4, B3 + 32);
  const riseColour = wiped > 0 ? C.scar : C.green;

  // ---- beat 5 pull-back ----
  // x and y compress by different amounts, the way a real chart zooms out: you
  // get more history across, but the vertical range stays legible. A uniform
  // 0.2 would squash each cycle to 42px tall and the scars would disappear.
  const out = frame >= B5 ? ease(frame, B5 + 6, B5 + 74) : 0;
  const sx = interpolate(out, [0, 1], [1, 0.2]);
  const sy = interpolate(out, [0, 1], [1, 0.62]);
  const ox = interpolate(out, [0, 1], [PLOT_X - LIVE * CW, PLOT_X]);
  const oy = interpolate(out, [0, 1], [0, BASE_Y * 0.38]);
  // Screen-space projection, for anything that must not be distorted by the
  // non-uniform scale (the head marker).
  const sX = (x: number) => ox + x * sx;
  const sY = (y: number) => oy + y * sy;

  const ascentShown = frame >= B5 + 40 ? Math.round(lin(frame, B5 + 40, B5 + 104, 0, ASCENT_N)) : 0;

  // Sutures sit in the gap the collapse opened.
  const stitchGapTop = wy(CYCLES[LIVE][RISE_END]);
  const stitchGapBot = wy(CYCLES[LIVE][DROP_END]);

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {/* vectorEffect keeps every stroke at its true width through the
          non-uniform scale, so nothing thins out during the pull-back. */}
      <svg width={1080} height={1920} style={{overflow: 'visible'}}>
        <g transform={`translate(${ox} ${oy}) scale(${sx} ${sy})`} vectorEffect="non-scaling-stroke">
          {/* Baseline */}
          <line
            x1={out > 0.02 ? 0 : LIVE * CW}
            y1={BASE_Y}
            x2={(LIVE + 1) * CW}
            y2={BASE_Y}
            stroke={C.dim}
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
            opacity={0.26}
          />

          {/* Historical cycles — fade in during the pull-back. */}
          {out > 0.02 &&
            CYCLES.slice(0, LIVE).map((vals, c) => {
              const o = ease(frame, B5 + 14 + (LIVE - c) * 7, B5 + 40 + (LIVE - c) * 7) * 0.85;
              return (
                <g key={c} opacity={o}>
                  <path
                    d={poly(c, vals, 0, RISE_END + 1)}
                    stroke={C.scar}
                    strokeWidth={4}
                    vectorEffect="non-scaling-stroke"
                    fill="none"
                    strokeLinecap="round"
                  />
                  <path
                    d={poly(c, vals, RISE_END, DROP_END + 1)}
                    stroke={C.red}
                    strokeWidth={4}
                    vectorEffect="non-scaling-stroke"
                    fill="none"
                    strokeLinecap="round"
                  />
                  <path
                    d={poly(c, vals, DROP_END, CYCLE_N)}
                    stroke={C.scar}
                    strokeWidth={4}
                    vectorEffect="non-scaling-stroke"
                    fill="none"
                    strokeLinecap="round"
                  />
                </g>
              );
            })}

          {/* ---- the live cycle ---- */}
          {/* the rise */}
          {shown > 1 && (
            <path
              d={poly(LIVE, CYCLES[LIVE], 0, Math.min(shown, RISE_END) + 1)}
              stroke={riseColour}
              strokeWidth={6}
              vectorEffect="non-scaling-stroke"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* the collapse, with a wash under it */}
          {shown > RISE_END && (
            <>
              <path
                d={`${poly(LIVE, CYCLES[LIVE], RISE_END, Math.min(shown, DROP_END) + 1)} L${wx(
                  LIVE,
                  Math.min(shown, DROP_END),
                )} ${BASE_Y} L${wx(LIVE, RISE_END)} ${BASE_Y} Z`}
                fill={C.red}
                opacity={0.13}
                stroke="none"
              />
              <path
                d={poly(LIVE, CYCLES[LIVE], RISE_END, Math.min(shown, DROP_END) + 1)}
                stroke={C.red}
                strokeWidth={7}
                vectorEffect="non-scaling-stroke"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          )}

          {/* sutures across the drawdown */}
          {frame >= B4 + 4 &&
            Array.from({length: 6}, (_, i) => {
              const g = ease(frame, B4 + 4 + i * 5, B4 + 4 + i * 5 + 11);
              if (g <= 0) return null;
              const yy = stitchGapTop + ((i + 0.5) / 6) * (stitchGapBot - stitchGapTop);
              const xx = wx(LIVE, RISE_END + 4);
              const half = 34;
              return (
                <g key={i} opacity={g} stroke={C.scar} strokeWidth={5} strokeLinecap="round">
                  <line x1={xx - half} y1={yy - 11} x2={xx + half} y2={yy + 11} />
                  <line x1={xx - half} y1={yy + 11} x2={xx + half} y2={yy - 11} />
                </g>
              );
            })}

          {/* the limping repair */}
          {shown > DROP_END && (
            <path
              d={poly(LIVE, CYCLES[LIVE], DROP_END, shown + 1)}
              stroke={C.scar}
              strokeWidth={6}
              vectorEffect="non-scaling-stroke"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="26 9"
            />
          )}

          {/* the ascent — the one that does not stop */}
          {ascentShown > 0 && (
            <path
              d={[
                `M${wx(LIVE, CYCLE_N - 1).toFixed(1)} ${wy(CYCLES[LIVE][CYCLE_N - 1]).toFixed(1)}`,
                ...ASCENT.slice(0, ascentShown).map(
                  (v, k) =>
                    `L${((LIVE + 1) * CW + ((k + 1) / ASCENT_N) * CW * 0.55).toFixed(1)} ${wy(v).toFixed(1)}`,
                ),
              ].join(' ')}
              stroke={C.greenBright}
              strokeWidth={8}
              vectorEffect="non-scaling-stroke"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{filter: `drop-shadow(0 0 14px ${alpha(C.greenBright, 0.7)})`}}
            />
          )}

        </g>

        {/* Live head — drawn in screen space, outside the scaled group, so the
            non-uniform pull-back can't squash it into an ellipse. */}
        {(() => {
          if (frame < B2 + 6) return null;
          const onAscent = ascentShown > 0;
          const wxh = onAscent
            ? (LIVE + 1) * CW + (ascentShown / ASCENT_N) * CW * 0.55
            : wx(LIVE, shown);
          const wyh = onAscent ? wy(ASCENT[ascentShown - 1]) : wy(CYCLES[LIVE][shown]);
          const col = onAscent
            ? C.greenBright
            : shown > DROP_END
            ? C.scar
            : shown > RISE_END
            ? C.red
            : C.green;
          return (
            <>
              <circle cx={sX(wxh)} cy={sY(wyh)} r={10} fill={col} />
              <circle
                cx={sX(wxh)}
                cy={sY(wyh)}
                r={10 + (frame % 24) * 1.2}
                fill="none"
                stroke={col}
                strokeWidth={2.5}
                opacity={0.55 - (frame % 24) * 0.022}
              />
            </>
          );
        })()}
      </svg>
    </AbsoluteFill>
  );
};

// ============================================================================
// beat 1 — the shards settle into a line, the weight lands, the line snaps
// ============================================================================

const SNAP_AT = B1 + 36;

const WeightedLine: FC = () => {
  const frame = useCurrentFrame();
  const settle = ease(frame, B1 + 2, B1 + 18);
  const bow = frame < SNAP_AT ? ease(frame, B1 + 20, SNAP_AT, 0, 1) : 1;
  const snapped = frame >= SNAP_AT;
  const drop = snapped ? fall(frame, SNAP_AT, SNAP_AT + 40, 0, 560) : 0;
  const Y = 1180;

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <svg width={1080} height={1920} style={{overflow: 'visible'}}>
        {!snapped ? (
          <path
            d={`M140 ${Y} C400 ${Y + bow * 300} 680 ${Y + bow * 300} 940 ${Y}`}
            stroke={C.accent}
            strokeWidth={8}
            fill="none"
            strokeLinecap="round"
            opacity={settle}
          />
        ) : (
          <>
            <path
              d={`M140 ${Y} Q360 ${Y + 150 + drop * 0.5} 520 ${Y + 190 + drop}`}
              stroke={C.accent}
              strokeWidth={8}
              fill="none"
              strokeLinecap="round"
              opacity={1 - ease(frame, SNAP_AT + 16, SNAP_AT + 44)}
            />
            <path
              d={`M940 ${Y} Q720 ${Y + 150 + drop * 0.5} 560 ${Y + 190 + drop}`}
              stroke={C.accent}
              strokeWidth={8}
              fill="none"
              strokeLinecap="round"
              opacity={1 - ease(frame, SNAP_AT + 16, SNAP_AT + 44)}
            />
            {/* fracture sparks */}
            {Array.from({length: 14}, (_, i) => {
              const t = ease(frame, SNAP_AT, SNAP_AT + 30);
              const a = Math.PI + (hash(i * 5) - 0.5) * Math.PI * 1.4;
              const sp = 120 + hash(i * 9) * 300;
              return (
                <circle
                  key={i}
                  cx={540 + Math.cos(a) * sp * t}
                  cy={Y + 40 + Math.sin(a) * sp * t + 300 * t * t}
                  r={3 + hash(i * 3) * 4}
                  fill={C.accent}
                  opacity={(1 - t) * 0.9}
                />
              );
            })}
          </>
        )}
      </svg>
    </AbsoluteFill>
  );
};

// ============================================================================

export const ScarTissueScene: FC = () => {
  const frame = useCurrentFrame();

  // Impacts felt by the whole frame.
  const shake =
    shakeAt(frame, SHATTER_AT, 22, 18) ||
    shakeAt(frame, SNAP_AT, 20, 16) ||
    shakeAt(frame, B3 + 6, 26, 20) ||
    '';

  return (
    <AbsoluteFill style={{background: C.ground}}>
      <AbsoluteFill style={{transform: shake || undefined}}>
        <DotLattice />
        <Motes />

        {/* ---------------- HOOK ---------------- */}
        <Sequence from={0} durationInFrames={B1}>
          <AbsoluteFill>
            <Glow y="36%" colour={C.accent} strength={0.17} />
            <PiggyBank />
            <div style={{position: 'absolute', top: 1180, left: 0, right: 0, padding: '0 66px'}}>
              <Line from={50} size={76}>
                the lack of emotional discipline
              </Line>
              <div style={{marginTop: 14}}>
                <Line from={58} size={76} color={C.accent}>
                  has a cost.
                </Line>
              </div>
            </div>
            <Audio src={sfx('Suspense.mp3')} volume={0.4} />
            <Sequence from={SHATTER_AT}>
              <Audio src={sfx('Impact.mp3')} volume={1} />
            </Sequence>
          </AbsoluteFill>
        </Sequence>

        {/* ---------------- BEAT 1 — the weight ---------------- */}
        <Sequence from={B1} durationInFrames={B2 - B1}>
          <AbsoluteFill>
            <Glow y="58%" colour={C.accent} strength={0.12} />
            <Audio src={sfx('transitions.mp3')} volume={0.45} />
            <Sequence from={SNAP_AT - B1}>
              <Audio src={sfx('Impact.mp3')} volume={0.95} />
            </Sequence>
          </AbsoluteFill>
        </Sequence>

        {/* The line and its weight live outside the beat-1 Sequence so they can
            keep their absolute timing while the curve takes over. */}
        {frame >= B1 && frame < B2 && (
          <>
            <WeightedLine />
            <div style={{position: 'absolute', top: 830, left: 0, right: 0, padding: '0 66px'}}>
              <Line from={B1 + 20} size={96} drop>
                and it&rsquo;s a
              </Line>
              <div style={{marginTop: 10}}>
                <Line from={B1 + 26} size={122} color={C.accent} drop>
                  heavy one.
                </Line>
              </div>
            </div>
          </>
        )}

        {/* ---------------- BEATS 2-5 — the curve ---------------- */}
        {frame >= B2 && (
          <>
            <Glow
              y={frame >= B5 ? '62%' : '60%'}
              colour={frame >= B3 && frame < B5 ? C.red : C.accent}
              strength={0.1}
            />
            <Curve />
          </>
        )}

        {/* beat 2 copy */}
        {frame >= B2 && frame < B3 && (
          <div style={{position: 'absolute', top: 560, left: 0, right: 0, padding: '0 66px'}}>
            <Line from={B2 + 4} size={80}>
              you&rsquo;re consistent
              <br />
              for a while&hellip;
            </Line>
          </div>
        )}

        {/* beat 3 copy */}
        {frame >= B3 && frame < B4 && (
          <div style={{position: 'absolute', top: 500, left: 0, right: 0, padding: '0 60px'}}>
            <Line from={B3 + 2} size={80}>
              then you go tilt
            </Line>
            <div style={{marginTop: 14}}>
              <Line from={B3 + 22} size={92} color={C.red}>
                and lose it all.
              </Line>
            </div>
          </div>
        )}

        {/* beat 4 copy */}
        {frame >= B4 && frame < B5 && (
          <div style={{position: 'absolute', top: 500, left: 0, right: 0, padding: '0 60px'}}>
            <Line from={B4 + 4} size={74}>
              so effectively, you
              <br />
              spend your time
            </Line>
            <div style={{marginTop: 14}}>
              <Line from={B4 + 28} size={86} color={C.accent}>
                repairing damage.
              </Line>
            </div>
          </div>
        )}

        {/* beat 5 copy */}
        {frame >= B5 && (
          <div style={{position: 'absolute', top: 430, left: 0, right: 0, padding: '0 60px'}}>
            <Line from={B5 + 8} size={80}>
              that cycle is exhausting
            </Line>
            <div style={{marginTop: 20}}>
              <Line from={B5 + 62} size={80} color={C.greenBright}>
                but you should not stop.
              </Line>
            </div>
          </div>
        )}

        {/* ---------------- audio for the curve beats ---------------- */}
        <Sequence from={B2} durationInFrames={B3 - B2}>
          <Audio src={sfx('Typing.mp3')} volume={0.26} />
        </Sequence>
        <Sequence from={B3 + 2} durationInFrames={40}>
          <Audio src={sfx('Zoomin-OR-out.mp3')} volume={0.8} />
        </Sequence>
        <Sequence from={B4 + 4} durationInFrames={50}>
          <Audio src={sfx('Popups.mp3')} volume={0.5} />
        </Sequence>
        <Sequence from={B5} durationInFrames={END - B5}>
          <Audio src={sfx('riser.mp3')} volume={0.38} />
        </Sequence>
        <Sequence from={B5 + 60}>
          <Audio src={sfx('aha-moment.MP3')} volume={0.8} />
        </Sequence>
        <Sequence from={0} durationInFrames={END}>
          <Audio src={sfx('energy.MP3')} volume={0.16} />
        </Sequence>
      </AbsoluteFill>

      <Grain opacity={0.045} />
    </AbsoluteFill>
  );
};
