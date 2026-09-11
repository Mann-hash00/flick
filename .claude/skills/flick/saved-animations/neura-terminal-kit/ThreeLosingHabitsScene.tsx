import type {FC} from 'react';
import {AbsoluteFill, Audio, Loop, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {theme} from '../theme';
import {CapsLabel, PunchInText, sfx} from '../common';

// ---------- shared bits ----------

const CandleDrift: FC<{opacity?: number}> = ({opacity = 0.3}) => {
  const frame = useCurrentFrame();
  const drift = interpolate(frame, [0, 90], [0, -30]);
  const candles = Array.from({length: 12}, (_, i) => {
    const seed = Math.sin(i * 12.9898) * 43758.5453;
    const frac = seed - Math.floor(seed);
    return 70 + frac * 220;
  });
  return (
    <div style={{position: 'absolute', inset: -40, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-evenly', filter: 'blur(16px)', opacity, transform: `translateY(${drift}px)`}}>
      {candles.map((h, i) => (
        <div key={i} style={{width: 20, height: h, background: theme.warnRed, borderRadius: 3}} />
      ))}
    </div>
  );
};

// Illustrated, non-photographic thinking face — not a depiction of any real person.
const ThinkingFaceIcon: FC<{size?: number}> = ({size = 150}) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <circle cx="50" cy="48" r="40" fill={theme.orangeWash} stroke={theme.bg} strokeWidth="3" />
    {/* one raised brow, one flat — the "thinking" tell */}
    <path d="M24 32 Q33 24 42 30" stroke={theme.bg} strokeWidth="3.5" fill="none" strokeLinecap="round" />
    <path d="M58 33 L76 33" stroke={theme.bg} strokeWidth="3.5" fill="none" strokeLinecap="round" />
    {/* eyes looking up-left, as if pondering */}
    <circle cx="35" cy="45" r="5" fill={theme.bg} />
    <circle cx="67" cy="45" r="5" fill={theme.bg} />
    {/* pursed, skeptical mouth */}
    <path d="M38 68 Q50 63 62 69" stroke={theme.bg} strokeWidth="3.5" fill="none" strokeLinecap="round" />
    {/* curled hand resting under the chin */}
    <g transform="rotate(-12 58 86)">
      <rect x="40" y="76" width="36" height="22" rx="11" fill={theme.orangeTintA} stroke={theme.bg} strokeWidth="2.5" />
      <line x1="52" y1="78" x2="52" y2="96" stroke={theme.bg} strokeWidth="1.8" opacity={0.8} />
      <line x1="62" y1="78" x2="62" y2="96" stroke={theme.bg} strokeWidth="1.8" opacity={0.8} />
    </g>
  </svg>
);

// Consistent header block for each habit segment.
const HabitHeader: FC<{index: string; name: string; line: string}> = ({index, name, line}) => (
  <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14}}>
    <PunchInText startFrame={2} fontSize={30} fontWeight={theme.weightBody} letterSpacing={theme.trackingWide} color={theme.orange}>
      {index}
    </PunchInText>
    <PunchInText startFrame={5} fontSize={72} color={theme.textPrimary}>
      {name}
    </PunchInText>
    <PunchInText startFrame={14} fontSize={40} fontWeight={theme.weightBody} letterSpacing="-0.01em" color={theme.textTertiary}>
      {line}
    </PunchInText>
  </div>
);

// ---------- segment 1: hook ----------

const HookSegment: FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const faceIn = spring({frame: frame - 2, fps, config: {damping: 10, stiffness: 180}});
  // gentle ponder-tilt that keeps the face alive through the hold
  const tilt = Math.sin(frame / 14) * 4;
  const punch = interpolate(frame, [12, 16, 22], [1, 1.05, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  return (
    <AbsoluteFill style={{backgroundColor: theme.bg}}>
      <Sequence from={0} durationInFrames={90}>
        <Audio src={sfx('riser.mp3')} volume={0.55} />
      </Sequence>
      <Sequence from={12} durationInFrames={20}>
        <Audio src={sfx('Impact.mp3')} volume={0.85} />
      </Sequence>

      <CandleDrift />
      <AbsoluteFill style={{background: `radial-gradient(120% 90% at 50% 45%, transparent 0%, ${theme.bg} 70%)`}} />

      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', gap: 40, padding: '0 60px', transform: `scale(${punch})`}}>
        <div style={{transform: `scale(${interpolate(faceIn, [0, 1], [0.3, 1])}) rotate(${tilt}deg)`, opacity: interpolate(frame, [2, 10], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}}>
          <ThinkingFaceIcon size={230} />
        </div>
        <PunchInText startFrame={12} fontSize={78} color={theme.textPrimary}>
          3 TRADING HABITS
        </PunchInText>
        <PunchInText startFrame={18} fontSize={78} color={theme.orange} style={{marginTop: -24}}>
          THAT MAKE YOU LOSE!
        </PunchInText>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------- segment 2: revenge trading ----------

// Five bars, matching the "one loss becomes five" line.
const BAR_FRAMES = [20, 30, 40, 50, 60];
const BAR_HEIGHTS = [55, 95, 140, 195, 255];

const RevengeTradingSegment: FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  return (
    <AbsoluteFill style={{backgroundColor: theme.bg}}>
      <Sequence from={0} durationInFrames={20}>
        <Audio src={sfx('Impact.mp3')} volume={0.8} />
      </Sequence>
      {BAR_FRAMES.map((f, i) => (
        <Sequence key={i} from={f} durationInFrames={12}>
          <Audio src={sfx('Click.mp3')} volume={0.75} />
        </Sequence>
      ))}

      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', gap: 90, padding: '0 60px'}}>
        <HabitHeader index="01" name="REVENGE TRADING" line="One loss becomes five." />

        {/* Loss bars hanging from a baseline, each one bigger than the last. */}
        <div style={{width: 760, position: 'relative', height: 300}}>
          <div style={{position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: theme.textTertiary, opacity: 0.35}} />
          <div style={{position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-evenly'}}>
            {BAR_FRAMES.map((f, i) => {
              const drop = spring({frame: frame - f, fps, config: {damping: 11, stiffness: 200}});
              if (frame < f) return <div key={i} style={{width: 84}} />;
              return (
                <div
                  key={i}
                  style={{
                    width: 84,
                    height: BAR_HEIGHTS[i] * drop,
                    background: theme.warnRed,
                    borderRadius: '0 0 6px 6px',
                    opacity: interpolate(drop, [0, 0.3], [0, 1], {extrapolateRight: 'clamp'}),
                  }}
                />
              );
            })}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------- segment 3: moving your stop ----------

const DRAG_ONE = 36;
const DRAG_TWO = 54;

const MovingStopSegment: FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const dragOne = spring({frame: frame - DRAG_ONE, fps, config: {damping: 13, stiffness: 200}});
  const dragTwo = spring({frame: frame - DRAG_TWO, fps, config: {damping: 13, stiffness: 200}});
  // Stop starts as a small planned loss, then gets widened twice.
  const stopY = 90 + interpolate(dragOne, [0, 1], [0, 105]) + interpolate(dragTwo, [0, 1], [0, 125]);

  // Price line falls steadily across the segment, always pushing past the stop.
  const priceDraw = interpolate(frame, [10, 74], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const pricePoints = [
    [0, 40],
    [130, 85],
    [260, 70],
    [390, 150],
    [520, 200],
    [650, 250],
    [760, 320],
  ];
  const pricePath = pricePoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ');
  const priceLen = 1000;

  return (
    <AbsoluteFill style={{backgroundColor: theme.bg}}>
      <Sequence from={DRAG_ONE} durationInFrames={10}>
        <Audio src={sfx('transitions.mp3')} volume={0.7} />
      </Sequence>
      <Sequence from={DRAG_TWO} durationInFrames={10}>
        <Audio src={sfx('transitions.mp3')} volume={0.8} />
      </Sequence>
      <Sequence from={DRAG_TWO + 8} durationInFrames={18}>
        <Audio src={sfx('Impact.mp3')} volume={0.8} />
      </Sequence>

      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', gap: 80, padding: '0 60px'}}>
        <HabitHeader index="02" name="MOVING YOUR STOP" line="A small loss becomes a huge one." />

        <div style={{width: 760, height: 360, position: 'relative'}}>
          <svg width="760" height="360" viewBox="0 0 760 360">
            {/* the growing loss zone between entry and the widened stop */}
            <rect x="0" y="40" width="760" height={Math.max(0, stopY - 40)} fill={theme.warnRed} opacity={0.16} />
            {/* entry line */}
            <line x1="0" y1="40" x2="760" y2="40" stroke={theme.textTertiary} strokeWidth="2" strokeDasharray="10 10" opacity={0.5} />
            {/* price falling away */}
            <path
              d={pricePath}
              fill="none"
              stroke={theme.orange}
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={priceLen}
              strokeDashoffset={priceLen * (1 - priceDraw)}
            />
            {/* the stop, dragged down twice */}
            <line x1="0" y1={stopY} x2="760" y2={stopY} stroke={theme.warnRed} strokeWidth="4" strokeDasharray="16 12" />
          </svg>
          <div style={{position: 'absolute', left: 0, top: stopY - 42, transition: 'none'}}>
            <CapsLabel color={theme.warnRed} fontSize={22}>
              Stop
            </CapsLabel>
          </div>
          <div style={{position: 'absolute', left: 0, top: 8}}>
            <CapsLabel color={theme.textTertiary} fontSize={22}>
              Entry
            </CapsLabel>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------- segment 4: oversizing ----------

const LOSS_FRAMES = [40, 52, 64];
const EQUITY_STEPS = [1, 0.68, 0.38, 0.12];

const OversizingSegment: FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const sizeIn = spring({frame: frame - 20, fps, config: {damping: 12, stiffness: 190}});
  // Equity drains one step per loss.
  let step = 0;
  LOSS_FRAMES.forEach((f, i) => {
    if (frame >= f) step = i + 1;
  });
  const prev = EQUITY_STEPS[Math.max(0, step - 1)];
  const target = EQUITY_STEPS[step];
  const lastFrame = step === 0 ? 0 : LOSS_FRAMES[step - 1];
  const equity = interpolate(frame, [lastFrame, lastFrame + 8], [prev, target], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  return (
    <AbsoluteFill style={{backgroundColor: theme.bg}}>
      <Sequence from={20} durationInFrames={18}>
        <Audio src={sfx('Impact.mp3')} volume={0.8} />
      </Sequence>
      {LOSS_FRAMES.map((f, i) => (
        <Sequence key={i} from={f} durationInFrames={10}>
          <Audio src={sfx('Click.mp3')} volume={0.75} />
        </Sequence>
      ))}
      <Sequence from={LOSS_FRAMES[2]} durationInFrames={16}>
        <Audio src={sfx('Zoomin-OR-out.mp3')} volume={0.7} />
      </Sequence>

      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', gap: 76, padding: '0 60px'}}>
        <HabitHeader index="03" name="OVERSIZING" line="Normal losing streaks wipe you out." />

        {/* The reference container is 560 wide inside a 940 block, so the
            position bar's 140% overflow stays inside the frame — the size
            comparison is the whole point of this beat. */}
        <div style={{width: 940, display: 'flex', flexDirection: 'column', gap: 44}}>
          {/* account equity, draining with each loss */}
          <div>
            <CapsLabel style={{marginBottom: 12}}>Account</CapsLabel>
            <div style={{width: 560, height: 62, borderRadius: 10, border: `2px solid ${theme.textTertiary}66`, overflow: 'hidden'}}>
              <div style={{width: `${equity * 100}%`, height: '100%', background: theme.orange}} />
            </div>
          </div>

          {/* position size, visibly too big for the account it sits in */}
          <div>
            <CapsLabel style={{marginBottom: 12}}>Position size</CapsLabel>
            <div style={{width: 560, height: 62, position: 'relative'}}>
              <div style={{position: 'absolute', inset: 0, borderRadius: 10, border: `2px dashed ${theme.textTertiary}66`}} />
              <div
                style={{
                  height: 62,
                  width: `${140 * sizeIn}%`,
                  borderRadius: 10,
                  background: `linear-gradient(90deg, ${theme.orange} 0%, ${theme.orange} 69%, ${theme.warnRed} 71%, ${theme.warnRed} 100%)`,
                }}
              />
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------- segment 5: CTA ----------

const CtaSegment: FC = () => {
  const frame = useCurrentFrame();
  const vignette = interpolate(frame, [0, 20], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{backgroundColor: theme.bg}}>
      <Sequence from={8} durationInFrames={22}>
        <Audio src={sfx('aha-moment.MP3')} volume={0.85} />
      </Sequence>
      <AbsoluteFill style={{background: `radial-gradient(90% 60% at 50% 48%, ${theme.orange}22 0%, transparent 66%)`, opacity: vignette}} />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', padding: '0 74px'}}>
        <PunchInText startFrame={8} fontSize={62} color={theme.textPrimary} style={{lineHeight: 1.25}}>
          Use <span style={{color: theme.orange}}>Neura</span> to find the habits that hurt your portfolio the most
        </PunchInText>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------- combined composition ----------

export const ThreeLosingHabitsScene: FC = () => (
  <AbsoluteFill style={{backgroundColor: theme.bg}}>
    {/* Constructed pulse bed: a 0.68s swell (silent at both ends) looped for the
        full 15s. No bundled track is long enough to serve as a real bed. */}
    <Loop durationInFrames={20}>
      <Audio src={sfx('energy.MP3')} volume={0.22} />
    </Loop>

    <Sequence from={0} durationInFrames={90}>
      <HookSegment />
    </Sequence>
    <Sequence from={90} durationInFrames={90}>
      <RevengeTradingSegment />
    </Sequence>
    <Sequence from={180} durationInFrames={90}>
      <MovingStopSegment />
    </Sequence>
    <Sequence from={270} durationInFrames={90}>
      <OversizingSegment />
    </Sequence>
    <Sequence from={360} durationInFrames={90}>
      <CtaSegment />
    </Sequence>
  </AbsoluteFill>
);

export default ThreeLosingHabitsScene;
