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
//   HOOK    0   – 75    "you weren't supposed to know this"
//   BEAT 1  75  – 165   "passing the evaluation isn't the hard part"
//   BEAT 2  165 – 300   funded stat + 100-dot grid
//   BEAT 3  300 – 420   paid stat, lit dots halve on screen
//   BEAT 4  420 – 570   the grid detonates
//   BEAT 5  570 – 735   Control Room footage
//   CTA     735 – 780   free -> link in bio
// ============================================================================

// ---------- palette (specified for this video) ----------
const C = {
  ground: '#0A0908',
  text: '#F2F1EC',
  accent: '#FF7A5C',
  accentDeep: '#C4462C',
  dim: '#6E6C67',
  dimFaint: '#2A2926',
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

/** Deterministic 0..1 from an integer. Keeps the explosion identical every render. */
const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// ---------- the 100-dot grid ----------
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
            strokeWidth={interpolate(frame, [BLOW, BLOW + 24], [10, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            })}
            opacity={1 - ease(frame, BLOW, BLOW + 22)}
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

          // Beat 4: detonation. Each dot takes a fixed heading off the centre
          // with a per-dot speed, spins out and burns off.
          let tx = 0;
          let ty = 0;
          let scale = 1;
          let blowFade = 1;
          if (blown) {
            // Stretched over ~3.5s so debris is still drifting behind the copy
            // rather than gone a beat after the bang.
            const t = ease(frame, BLOW, BLOW + 108);
            const ang = Math.atan2(cy - GRID_W / 2, cx - GRID_W / 2) + (hash(i * 7) - 0.5) * 1.1;
            const speed = 700 + hash(i * 13) * 1000;
            tx = Math.cos(ang) * speed * t;
            ty = Math.sin(ang) * speed * t - 140 * t * t;
            scale = 1 - 0.6 * t;
            // Linear, deliberately: EASE_OUT is front-loaded and burned the
            // debris off within a second of the bang.
            blowFade = interpolate(frame, [BLOW + 26, BLOW + 112], [1, 0], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
          }

          // Debris steps back so the beat-4 copy stays the brightest thing.
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
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// ---------- hook badge ----------
/**
 * The shocked/question mark called for in the brief, drawn rather than typed:
 * headless Chromium has no reliable emoji font, and a glyph that silently
 * renders as tofu in a render farm is not worth the risk.
 */
const QuestionBadge: FC<{from: number}> = ({from}) => {
  const frame = useCurrentFrame();
  const t = ease(frame, from, from + 16);
  const settle = interpolate(t, [0, 1], [1.35, 1]);
  const tilt = interpolate(t, [0, 1], [-14, 0]);
  // Slow breathing ring once it has landed.
  const pulse = 1 + 0.06 * Math.sin((frame - from) / 7);

  return (
    <div style={{opacity: t, transform: `scale(${settle}) rotate(${tilt}deg)`}}>
      <svg width={180} height={180} viewBox="0 0 180 180">
        <circle
          cx={90}
          cy={90}
          r={78 * (frame > from + 12 ? pulse : 1)}
          fill="none"
          stroke={C.accent}
          strokeWidth={3}
          opacity={0.28}
        />
        <rect x={26} y={26} width={128} height={128} rx={38} fill={C.accent} />
        <text
          x={90}
          y={92}
          textAnchor="middle"
          dominantBaseline="central"
          fill={C.ground}
          fontFamily={theme.fontFamily}
          fontSize={92}
          fontWeight={700}
        >
          ?
        </text>
      </svg>
    </div>
  );
};

// ---------- typography ----------
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

  // Grid sits still through beats 2-4 so the dimming reads as the same
  // population changing, not a new graphic.
  const gridX = (1080 - GRID_W) / 2;
  const gridY = 1010;

  return (
    <AbsoluteFill style={{background: C.ground}}>
      {/* ---------------- HOOK ---------------- */}
      <Sequence from={0} durationInFrames={B1}>
        <AbsoluteFill>
          <Glow y="42%" colour={C.accent} strength={0.15} />
          <AbsoluteFill
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 54,
              padding: '0 80px',
            }}
          >
            <QuestionBadge from={3} />
            <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
              <Slam from={11} size={104}>
                you weren&rsquo;t
              </Slam>
              <Slam from={16} size={104}>
                supposed to know
              </Slam>
              <Slam from={21} size={104} color={C.accent}>
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

      {/* ---------------- BEAT 1 — claim alone, no data ---------------- */}
      <Sequence from={B1} durationInFrames={B2 - B1}>
        <AbsoluteFill>
          <Glow y="50%" colour={C.accent} strength={0.08} />
          <AbsoluteFill
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 40,
              padding: '0 44px',
            }}
          >
            <Reveal from={2}>
              <div style={{width: 96, height: 3, background: C.accent, opacity: 0.8}} />
            </Reveal>
            <Slam from={6} size={80}>
              passing the evaluation
            </Slam>
            <Slam from={22} size={80} color={C.accent}>
              isn&rsquo;t the hard part
            </Slam>
          </AbsoluteFill>
          <Audio src={sfx('transitions.mp3')} volume={0.5} />
        </AbsoluteFill>
      </Sequence>

      {/* ---------------- BEATS 2-4 — the grid ---------------- */}
      <Sequence from={B2} durationInFrames={B5 - B2}>
        <AbsoluteFill>
          <Glow y="30%" colour={C.accent} strength={0.1} />

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
                  textShadow: `0 0 70px ${C.accent}55`,
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

          {/* Beat 4 copy — lands as the grid comes apart behind it. */}
          {frame >= B4 && (
            <AbsoluteFill
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: 30,
                padding: '0 84px',
              }}
            >
              <Slam from={B4 - B2 + 8} size={84}>
                they don&rsquo;t blow up
                <br />
                in the eval
              </Slam>
              <Slam from={B4 - B2 + 58} size={84} color={C.accent}>
                they blow up after
              </Slam>
              <div style={{marginTop: 14}}>
                <Slam from={B4 - B2 + 92} size={58} weight={theme.weightDisplay}>
                  once it&rsquo;s real money
                </Slam>
              </div>
            </AbsoluteFill>
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
          <Glow y="55%" colour={C.accent} strength={0.12} />

          {/* Copy above the device */}
          <div style={{position: 'absolute', top: 150, left: 0, right: 0, padding: '0 70px'}}>
            <Reveal from={4}>
              <Caps color={C.accent}>Neura Control Room</Caps>
            </Reveal>
            <div style={{marginTop: 26}}>
              <Reveal from={12} y={20}>
                <div
                  style={{
                    textAlign: 'center',
                    color: C.text,
                    fontFamily: theme.fontFamily,
                    fontSize: 62,
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

          {/* Device. The source capture is 720x1280; this frame is 660 wide, so
              the footage is scaled DOWN and never softens. */}
          <DeviceFrame from={10} />

          {/* Payoff line */}
          <div style={{position: 'absolute', bottom: 92, left: 0, right: 0, padding: '0 80px'}}>
            <Reveal from={96} y={20}>
              <div
                style={{
                  textAlign: 'center',
                  color: C.dim,
                  fontFamily: theme.fontFamily,
                  fontSize: 42,
                  fontWeight: theme.weightBody,
                  letterSpacing: '-0.01em',
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
          <Glow y="48%" colour={C.accent} strength={0.18} />
          <AbsoluteFill
            style={{alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 30}}
          >
            <Slam from={2} size={104} color={C.text}>
              free to start
            </Slam>
            <Slam from={10} size={86} color={C.accent}>
              link in bio
            </Slam>
          </AbsoluteFill>
          <div style={{position: 'absolute', bottom: 120, left: 0, right: 0}}>
            <Reveal from={16}>
              <Caps color={C.text} size={30} style={{opacity: 0.82}}>
                Neura
              </Caps>
            </Reveal>
          </div>
          <Audio src={sfx('aha-moment.MP3')} volume={0.85} />
        </AbsoluteFill>
      </Sequence>

      {/* ---------------- bed + texture ---------------- */}
      <Sequence from={0} durationInFrames={END}>
        <Audio src={sfx('energy.MP3')} volume={0.17} />
      </Sequence>
      <Grain opacity={0.045} />
    </AbsoluteFill>
  );
};

// ---------- device ----------
const DEV_W = 660;
const DEV_H = Math.round((DEV_W * 1280) / 720); // 1173 — source aspect, no stretch

const DeviceFrame: FC<{from: number}> = ({from}) => {
  const frame = useCurrentFrame();
  const t = ease(frame, from, from + 20);
  // Barely-there push-in; the capture already scrolls, so the camera stays calm.
  const scale = interpolate(t, [0, 1], [0.94, 1]);
  // Accent rim brightens on the slider drags in the capture.
  const rim = 0.3 + 0.35 * Math.max(0, Math.sin((frame - from) / 16));

  return (
    <div
      style={{
        position: 'absolute',
        left: (1080 - DEV_W) / 2,
        top: 470,
        width: DEV_W,
        height: DEV_H,
        opacity: t,
        transform: `scale(${scale})`,
        borderRadius: 42,
        overflow: 'hidden',
        border: `2px solid ${C.accent}${Math.round(rim * 255).toString(16).padStart(2, '0')}`,
        boxShadow: `0 40px 120px #000000CC, 0 0 90px ${C.accent}22`,
        background: '#000',
      }}
    >
      <OffthreadVideo
        src={staticFile('brand-assets/video/control-room.mp4')}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
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
          top: interpolate(frame, [from + 18, from + 78], [180, 760], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: EASE_IN_OUT,
          }),
          height: 150,
          background: `linear-gradient(180deg, transparent, ${C.accent}1F, transparent)`,
          opacity: interpolate(frame, [from + 18, from + 30, from + 66, from + 82], [0, 1, 1, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      />

      {/* No caption chip here — the capture already labels itself "Hard Risk
          Limits", and a chip pinned over the app's own tab bar read as chrome. */}
    </div>
  );
};
