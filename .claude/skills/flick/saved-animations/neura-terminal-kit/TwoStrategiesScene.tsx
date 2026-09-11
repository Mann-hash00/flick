import type {FC} from 'react';
import {AbsoluteFill, Audio, Img, Loop, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {theme} from '../theme';
import {sfx} from '../common';
import {
  CandleChart,
  DuotoneFilter,
  EASE_IN_OUT,
  EASE_OUT,
  Glow,
  Grain,
  Reveal,
  TerminalPanel,
  buildSwingSeries,
  movingAverage,
  seriesStats,
  useReveal,
} from '../terminal';

const BULL_BEAR = staticFile('brand-assets/images/bull-bear.png');

// ============================================================================
// Market structure
// Both charts are built from swing legs, so the structure is exact rather than
// emergent: an uptrend that prints higher highs and higher lows, and a range
// that holds its boundaries before over-extending and reverting.
// ============================================================================

const NQ = {base: 20400, scale: 12};

// --- Strategy 1: trending. Highs 108 → 116 → 124 → 133, lows 104 → 111 → 119.
const TREND = buildSwingSeries(
  [
    {to: 108, bars: 5}, // impulse
    {to: 104, bars: 3}, // pullback
    {to: 116, bars: 5}, // higher high
    {to: 111, bars: 3}, // higher low
    {to: 124, bars: 5}, // higher high
    {to: 119, bars: 3}, // higher low  ← the entry
    {to: 133, bars: 6}, // higher high → target
  ],
  4.4,
  {start: 100, ...NQ, volatility: 1.05},
);
const TREND_STATS = seriesStats(TREND);
// Entry on the pullback that holds above the last higher low.
const TREND_ENTRY_INDEX = 23;
const TREND_TRADE = {
  index: TREND_ENTRY_INDEX,
  entry: NQ.base + (119 - 100) * NQ.scale,
  stop: NQ.base + (115.2 - 100) * NQ.scale, // under structure
  target: NQ.base + (131 - 100) * NQ.scale,
};

// --- Strategy 2: ranging. Highs ~106/105.5/104.5, lows ~98.5/99 — then a spike
// far below the range, then reversion to the mean.
const RANGE = buildSwingSeries(
  [
    {to: 106, bars: 4},
    {to: 98.5, bars: 4},
    {to: 105.5, bars: 4},
    {to: 99, bars: 4},
    {to: 104.5, bars: 3},
    {to: 91, bars: 5}, // over-extension  ← the entry
    {to: 101.5, bars: 7}, // snap back to the mean → target
  ],
  9.2,
  {start: 102, ...NQ, volatility: 0.95},
);
const RANGE_MA = movingAverage(RANGE, 8);
const RANGE_STATS = seriesStats(RANGE);
const RANGE_ENTRY_INDEX = 23;
const RANGE_TRADE = {
  index: RANGE_ENTRY_INDEX,
  entry: NQ.base + (91 - 100) * NQ.scale,
  stop: NQ.base + (87.8 - 100) * NQ.scale,
  target: NQ.base + (101.5 - 100) * NQ.scale, // the mean
};

// ---------- shared type ----------

const StrategyHeading: FC<{index: string; name: string; sub: string}> = ({index, name, sub}) => (
  <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, padding: '0 56px'}}>
    <Reveal from={0} duration={14}>
      <div style={{display: 'flex', alignItems: 'baseline', gap: 22}}>
        <span style={{color: theme.orange, fontFamily: theme.fontFamily, fontSize: 132, fontWeight: theme.weightDisplay, letterSpacing: '-0.05em', lineHeight: 0.9}}>
          {index}
        </span>
        <span style={{color: theme.textPrimary, fontFamily: theme.fontFamily, fontSize: 68, fontWeight: theme.weightDisplay, letterSpacing: theme.trackingTight}}>
          {name}
        </span>
      </div>
    </Reveal>
    <Reveal from={8} duration={16}>
      <div
        style={{
          color: theme.textTertiary,
          fontFamily: theme.fontFamily,
          fontSize: 36,
          fontWeight: theme.weightBody,
          letterSpacing: '-0.01em',
          textAlign: 'center',
          lineHeight: 1.35,
          maxWidth: 810,
        }}
      >
        {sub}
      </div>
    </Reveal>
  </div>
);

/** Small caption that names what the chart is doing, bottom of frame. */
const StructureNote: FC<{from: number; children: React.ReactNode; colour?: string}> = ({from, children, colour = theme.textTertiary}) => {
  const t = useReveal(from, 12);
  if (t <= 0) return null;
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 190}}>
      <div
        style={{
          opacity: t,
          color: colour,
          fontFamily: theme.fontFamily,
          fontSize: 30,
          fontWeight: theme.weightBody,
          letterSpacing: theme.trackingWide,
          textTransform: 'uppercase',
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};

// ---------- 1. hook ----------

const HookSegment: FC = () => {
  const frame = useCurrentFrame();
  // Slow push-in on both layers so the hook has motion from frame one.
  const washScale = interpolate(frame, [0, 90], [1.14, 1.02], {extrapolateRight: 'clamp', easing: EASE_IN_OUT});
  const bandScale = interpolate(frame, [0, 90], [1.1, 1], {extrapolateRight: 'clamp', easing: EASE_IN_OUT});
  const bandIn = interpolate(frame, [0, 16], [0, 1], {extrapolateRight: 'clamp', easing: EASE_OUT});
  const slam = useReveal(6, 10);
  const settle = interpolate(frame, [6, 12, 20], [1.14, 0.99, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE_OUT});

  return (
    <AbsoluteFill style={{backgroundColor: theme.ground}}>
      <Sequence from={0} durationInFrames={30}>
        <Audio src={sfx('energy.MP3')} volume={0.8} />
      </Sequence>
      <Sequence from={6} durationInFrames={26}>
        <Audio src={sfx('Zoomin-OR-out.mp3')} volume={0.95} />
      </Sequence>

      <DuotoneFilter id="neura-duotone" />

      {/* The source is 800x450 landscape. Full-bleed in 9:16 would mean a ~4.3x
          upscale, so it runs as a blurred wash for presence, with a sharp band
          at near-native scale carrying the actual image. */}
      <AbsoluteFill style={{overflow: 'hidden'}}>
        <Img
          src={BULL_BEAR}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'url(#neura-duotone) blur(46px)',
            opacity: 0.5,
            transform: `scale(${washScale})`,
          }}
        />
      </AbsoluteFill>

      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
        <div
          style={{
            width: 1080,
            opacity: bandIn,
            // Sits above the type rather than behind it.
            transform: `translateY(-210px) scale(${bandScale})`,
            maskImage: 'linear-gradient(180deg, transparent 0%, #000 18%, #000 82%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, #000 18%, #000 82%, transparent 100%)',
          }}
        >
          {/* Source is mostly dark with mid-luminance wireframe; lift it before
              the duotone or the ramp lands entirely in the shadow end. */}
          <Img src={BULL_BEAR} style={{width: '100%', display: 'block', filter: 'brightness(1.75) contrast(1.2) url(#neura-duotone)'}} />
        </div>
      </AbsoluteFill>

      {/* Scrim stays light over the artwork and heavy under the type. */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, ${theme.ground}E6 0%, ${theme.ground}40 22%, ${theme.ground}4D 44%, ${theme.ground}D9 58%, ${theme.ground}F2 100%)`,
        }}
      />
      <Glow y="58%" strength={0.12} />

      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', padding: '0 58px'}}>
        <div style={{opacity: slam, transform: `scale(${settle})`, textAlign: 'center'}}>
          <div style={{color: theme.textPrimary, fontFamily: theme.fontFamily, fontSize: 86, fontWeight: theme.weightDisplay, letterSpacing: theme.trackingTight, lineHeight: 1.08}}>
            <span style={{color: theme.orange}}>2</span> TRADING
            <br />
            STRATEGIES
          </div>
          <div style={{marginTop: 22, color: theme.textTertiary, fontFamily: theme.fontFamily, fontSize: 40, fontWeight: theme.weightBody, letterSpacing: '0.02em'}}>
            every trader should know
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------- 2. trend following ----------

const TrendSegment: FC = () => {
  const frame = useCurrentFrame();
  const print = interpolate(frame, [4, 62], [0.14, 1], {extrapolateRight: 'clamp', easing: EASE_OUT});
  const entryReveal = interpolate(frame, [64, 76], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE_OUT});
  const stopReveal = interpolate(frame, [78, 90], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE_OUT});
  const targetReveal = interpolate(frame, [90, 104], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE_OUT});

  return (
    <AbsoluteFill style={{backgroundColor: theme.ground}}>
      <Sequence from={26} durationInFrames={10}>
        <Audio src={sfx('Click.mp3')} volume={0.5} />
      </Sequence>
      <Sequence from={48} durationInFrames={10}>
        <Audio src={sfx('Click.mp3')} volume={0.55} />
      </Sequence>
      <Sequence from={64} durationInFrames={18}>
        <Audio src={sfx('Notification.mp3')} volume={0.8} />
      </Sequence>
      <Sequence from={78} durationInFrames={14}>
        <Audio src={sfx('Popups.mp3')} volume={0.6} />
      </Sequence>
      <Sequence from={90} durationInFrames={16}>
        <Audio src={sfx('Popups.mp3')} volume={0.7} />
      </Sequence>

      <Glow y="62%" strength={0.1} />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', gap: 52}}>
        <StrategyHeading index="1" name="Trend following" sub="Price is moving one way. You trade with it — not against it." />
        <Reveal from={4} duration={18} y={30}>
          <TerminalPanel symbol="NQ" timeframe="15M" price={TREND_STATS.last} change={TREND_STATS.change} changeNegative={TREND_STATS.negative} width={950}>
            <CandleChart
              candles={TREND}
              width={898}
              height={470}
              progress={print}
              trade={{...TREND_TRADE, entryReveal, stopReveal, targetReveal}}
            />
          </TerminalPanel>
        </Reveal>
      </AbsoluteFill>

      {frame < 64 && (
        <StructureNote from={30} colour={theme.upGreen}>
          Higher highs · higher lows
        </StructureNote>
      )}
      {frame >= 64 && (
        <StructureNote from={64} colour={theme.orange}>
          Buy the pullback
        </StructureNote>
      )}
    </AbsoluteFill>
  );
};

// ---------- 3. mean reversion ----------

const SPIKE_FRAME = 62;
const REVERT_ENTRY = 78;

const ReversionSegment: FC = () => {
  const frame = useCurrentFrame();
  // Range holds, then over-extends, then reverts — one continuous print.
  const print = interpolate(frame, [4, 52, 62, 86, 138], [0.12, 0.6, 0.72, 0.78, 1], {
    extrapolateRight: 'clamp',
    easing: EASE_OUT,
  });
  const entryReveal = interpolate(frame, [REVERT_ENTRY, REVERT_ENTRY + 12], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE_OUT});
  const stopReveal = interpolate(frame, [REVERT_ENTRY + 10, REVERT_ENTRY + 22], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE_OUT});
  const targetReveal = interpolate(frame, [REVERT_ENTRY + 20, REVERT_ENTRY + 34], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE_OUT});

  return (
    <AbsoluteFill style={{backgroundColor: theme.ground}}>
      <Sequence from={SPIKE_FRAME} durationInFrames={20}>
        <Audio src={sfx('Impact.mp3')} volume={0.75} />
      </Sequence>
      <Sequence from={REVERT_ENTRY} durationInFrames={18}>
        <Audio src={sfx('Notification.mp3')} volume={0.8} />
      </Sequence>
      <Sequence from={REVERT_ENTRY + 10} durationInFrames={14}>
        <Audio src={sfx('Popups.mp3')} volume={0.6} />
      </Sequence>
      <Sequence from={REVERT_ENTRY + 20} durationInFrames={16}>
        <Audio src={sfx('Popups.mp3')} volume={0.7} />
      </Sequence>
      <Sequence from={112} durationInFrames={20}>
        <Audio src={sfx('Zoomin-OR-out.mp3')} volume={0.7} />
      </Sequence>

      <Glow y="62%" strength={0.1} />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', gap: 52}}>
        <StrategyHeading index="2" name="Mean reversion" sub="Price stretches too far, too fast — then snaps back. You trade the snapback." />
        <Reveal from={4} duration={18} y={30}>
          <TerminalPanel symbol="NQ" timeframe="15M" price={RANGE_STATS.last} change={RANGE_STATS.change} changeNegative={RANGE_STATS.negative} width={950}>
            <CandleChart
              candles={RANGE}
              width={898}
              height={470}
              progress={print}
              ma={RANGE_MA}
              maLabel="AVERAGE"
              trade={{...RANGE_TRADE, entryReveal, stopReveal, targetReveal}}
            />
          </TerminalPanel>
        </Reveal>
      </AbsoluteFill>

      {frame < SPIKE_FRAME && (
        <StructureNote from={28} colour={theme.textTertiary}>
          Range holds
        </StructureNote>
      )}
      {frame >= SPIKE_FRAME && frame < REVERT_ENTRY && (
        <StructureNote from={SPIKE_FRAME} colour={theme.warnRed}>
          Stretched too far
        </StructureNote>
      )}
      {frame >= REVERT_ENTRY && (
        <StructureNote from={REVERT_ENTRY} colour={theme.orange}>
          Buy the extreme · exit at the average
        </StructureNote>
      )}
    </AbsoluteFill>
  );
};

// ---------- 4. CTA ----------

const CtaSegment: FC = () => {
  const card = useReveal(4, 20);
  return (
    <AbsoluteFill style={{backgroundColor: theme.ground}}>
      <Sequence from={6} durationInFrames={26}>
        <Audio src={sfx('Correct.mp3')} volume={0.85} />
      </Sequence>
      <Glow y="46%" strength={0.18} />

      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', padding: '0 66px'}}>
        <div
          style={{
            opacity: card,
            transform: `translateY(${(1 - card) * 24}px)`,
            width: '100%',
            maxWidth: 900,
            background: `linear-gradient(180deg, ${theme.bgCard} 0%, ${theme.bgAlt} 100%)`,
            border: `1px solid ${theme.orange}44`,
            borderRadius: 24,
            padding: '56px 48px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 30,
            boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
          }}
        >
          <div style={{color: theme.textTertiary, fontFamily: theme.fontMono, fontSize: 22, fontWeight: 500, letterSpacing: '0.34em'}}>NEURA</div>
          <div
            style={{
              color: theme.textPrimary,
              fontFamily: theme.fontFamily,
              fontSize: 46,
              fontWeight: theme.weightDisplay,
              letterSpacing: theme.trackingTight,
              textAlign: 'center',
              lineHeight: 1.28,
            }}
          >
            Neura shows you <span style={{color: theme.orange}}>which strategy fits</span> the market you&rsquo;re actually trading
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------- combined ----------

export const TwoStrategiesScene: FC = () => (
  <AbsoluteFill style={{backgroundColor: theme.ground}}>
    {/* Atmospheric bed, cut before the end so the CTA resolves into silence. */}
    <Sequence from={0} durationInFrames={424}>
      <Loop durationInFrames={121}>
        <Audio src={sfx('Suspense.mp3')} volume={0.16} />
      </Loop>
    </Sequence>

    <Sequence from={0} durationInFrames={90}>
      <HookSegment />
    </Sequence>
    <Sequence from={90} durationInFrames={120}>
      <TrendSegment />
    </Sequence>
    <Sequence from={210} durationInFrames={150}>
      <ReversionSegment />
    </Sequence>
    <Sequence from={360} durationInFrames={90}>
      <CtaSegment />
    </Sequence>

    <Grain opacity={0.045} />
  </AbsoluteFill>
);

export default TwoStrategiesScene;
