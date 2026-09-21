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
  RsiPane,
  TerminalPanel,
  atr,
  buildSwingSeries,
  ema,
  rsi,
  seriesStats,
  useReveal,
} from '../terminal';

const CHART_MACRO = staticFile('brand-assets/images/chart-macro.jpg');
const DESK = staticFile('brand-assets/images/trading-desk.jpg');

const NQ = {base: 20400, scale: 12};

// ============================================================================
// 1 — ATR: volatility visibly expands then contracts, so the band has to move.
// ============================================================================
const ATR_SERIES = buildSwingSeries(
  [
    {to: 101, bars: 5, vol: 0.5}, // quiet
    {to: 99.5, bars: 4, vol: 0.5},
    {to: 108, bars: 6, vol: 2.6}, // volatility expansion
    {to: 101, bars: 5, vol: 2.8},
    {to: 106, bars: 5, vol: 2.4},
    {to: 104, bars: 7, vol: 0.6}, // contraction
    {to: 105.5, bars: 6, vol: 0.5},
  ],
  4.8,
  {start: 100, ...NQ, volatility: 1},
);
const ATR_VALUES = atr(ATR_SERIES, 9);
const ATR_MID = ema(ATR_SERIES, 10);
const ATR_K = 1.8;
const bandAt = (i: number, sign: number) => {
  const a = ATR_VALUES[i];
  const m = ATR_MID[i];
  return a == null || m == null ? null : m + sign * ATR_K * a;
};
const ATR_BAND = {
  upper: ATR_SERIES.map((_, i) => bandAt(i, 1)),
  lower: ATR_SERIES.map((_, i) => bandAt(i, -1)),
};
// The stop sits on the current lower band — sized by volatility, not a round number.
const ATR_STOP = bandAt(ATR_SERIES.length - 1, -1) as number;
const ATR_STATS = seriesStats(ATR_SERIES);

// ============================================================================
// 2 — RSI divergence. Verified numerically: price prints a higher high while
// RSI prints a ~14-point lower high. The second advance is a grinding
// staircase, which is what drags RSI down while price still makes new highs.
// ============================================================================
const RSI_SERIES = buildSwingSeries(
  [
    {to: 101, bars: 3},
    {to: 99, bars: 3},
    {to: 101.5, bars: 3},
    {to: 99.5, bars: 3},
    {to: 113, bars: 6}, // clean impulse
    {to: 105, bars: 5}, // pullback
    {to: 109.5, bars: 3},
    {to: 106.5, bars: 3},
    {to: 113, bars: 3},
    {to: 109.5, bars: 3},
    {to: 117, bars: 4}, // higher high, weaker momentum
    {to: 103, bars: 8}, // and it rolls over
  ],
  5.9,
  {start: 100, ...NQ, volatility: 1},
);
const RSI_VALUES = rsi(RSI_SERIES, 9);
// Peak indices confirmed by the numeric check.
const PRICE_PK1 = 18;
const PRICE_PK2 = 38;
const RSI_PK1 = 17;
const RSI_PK2 = 38;
const RSI_STATS = seriesStats(RSI_SERIES);

// ============================================================================
// 3 — EMA 20/50: price weaving around both, holding above them in trend.
// ============================================================================
const EMA_FULL = buildSwingSeries(
  [
    // 60 bars of history that never appear on screen, purely so EMA 20 and
    // EMA 50 are warmed up and fully drawn across the visible window.
    {to: 94, bars: 10},
    {to: 91, bars: 8},
    {to: 95, bars: 10},
    {to: 92.5, bars: 8},
    {to: 97, bars: 12},
    {to: 95, bars: 12},
    // visible window starts here
    {to: 103, bars: 7},
    {to: 100.5, bars: 5},
    {to: 108, bars: 8},
    {to: 105, bars: 5},
    {to: 114, bars: 8},
    {to: 110.5, bars: 5},
    {to: 120, bars: 10},
  ],
  6.4,
  {start: 96, ...NQ, volatility: 1.1},
);
const EMA_HISTORY = 60;
const EMA_SERIES = EMA_FULL.slice(EMA_HISTORY);
const EMA20 = ema(EMA_FULL, 20).slice(EMA_HISTORY);
const EMA50 = ema(EMA_FULL, 50).slice(EMA_HISTORY);
const EMA_STATS = seriesStats(EMA_SERIES);

// ---------- shared type ----------

const IndicatorHeading: FC<{index: string; name: string; full: string; sub: string}> = ({index, name, full, sub}) => (
  <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '0 52px'}}>
    <Reveal from={0} duration={12}>
      <div style={{display: 'flex', alignItems: 'baseline', gap: 20}}>
        <span style={{color: theme.orange, fontFamily: theme.fontFamily, fontSize: 122, fontWeight: theme.weightDisplay, letterSpacing: '-0.05em', lineHeight: 0.9}}>
          {index}
        </span>
        <span style={{color: theme.textPrimary, fontFamily: theme.fontFamily, fontSize: 66, fontWeight: theme.weightDisplay, letterSpacing: theme.trackingTight}}>
          {name}
        </span>
      </div>
    </Reveal>
    {/* What the acronym actually stands for — read as recognition, not prose. */}
    <Reveal from={5} duration={12}>
      <div
        style={{
          color: theme.orange,
          fontFamily: theme.fontFamily,
          fontSize: 25,
          fontWeight: theme.weightBody,
          letterSpacing: theme.trackingWide,
          textTransform: 'uppercase',
        }}
      >
        {full}
      </div>
    </Reveal>
    <Reveal from={11} duration={14}>
      <div
        style={{
          marginTop: 4,
          color: theme.textSecondary,
          fontFamily: theme.fontFamily,
          fontSize: 34,
          fontWeight: theme.weightBody,
          letterSpacing: '-0.01em',
          textAlign: 'center',
          lineHeight: 1.32,
          maxWidth: 840,
        }}
      >
        {sub}
      </div>
    </Reveal>
  </div>
);

/** A small annotated chip that names what the chart is showing. */
const ChartNote: FC<{from: number; colour?: string; children: React.ReactNode; style?: React.CSSProperties}> = ({
  from,
  colour = theme.orange,
  children,
  style,
}) => {
  const t = useReveal(from, 10);
  if (t <= 0) return null;
  return (
    <div
      style={{
        position: 'absolute',
        opacity: t,
        transform: `translateY(${(1 - t) * 10}px)`,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: `${theme.bg}D9`,
        border: `1px solid ${colour}59`,
        borderRadius: 10,
        padding: '11px 18px',
        ...style,
      }}
    >
      <span style={{width: 8, height: 8, borderRadius: 4, background: colour, flexShrink: 0}} />
      <span
        style={{
          color: theme.textPrimary,
          fontFamily: theme.fontFamily,
          fontSize: 25,
          fontWeight: theme.weightBody,
          letterSpacing: theme.trackingWide,
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}
      >
        {children}
      </span>
    </div>
  );
};

/** Three-step progress marker, so a list video reads as a list. */
const StepMarker: FC<{active: number}> = ({active}) => (
  <AbsoluteFill style={{alignItems: 'center', justifyContent: 'flex-start', paddingTop: 116}}>
    <div style={{display: 'flex', gap: 12}}>
      {[1, 2, 3].map((n) => (
        <div
          key={n}
          style={{
            width: n === active ? 54 : 26,
            height: 5,
            borderRadius: 3,
            background: n === active ? theme.orange : `${theme.textTertiary}2E`,
          }}
        />
      ))}
    </div>
  </AbsoluteFill>
);

/** Heavily treated supplied photography, sitting behind the panels. */
const PhotoBackdrop: FC<{src: string; opacity?: number; blur?: number; scaleFrom?: number; duration?: number}> = ({
  src,
  opacity = 0.2,
  blur = 26,
  scaleFrom = 1.12,
  duration = 90,
}) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, duration], [scaleFrom, 1.01], {extrapolateRight: 'clamp', easing: EASE_IN_OUT});
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <Img
        src={src}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          filter: `url(#neura-duotone) blur(${blur}px)`,
          opacity,
          transform: `scale(${scale})`,
        }}
      />
    </AbsoluteFill>
  );
};

// ---------- 1. hook ----------

const HookSegment: FC = () => {
  const frame = useCurrentFrame();
  const slam = useReveal(4, 9);
  const settle = interpolate(frame, [4, 10, 20], [1.15, 0.99, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE_OUT});
  const push = interpolate(frame, [0, 60], [1.1, 1], {extrapolateRight: 'clamp', easing: EASE_IN_OUT});

  return (
    <AbsoluteFill style={{backgroundColor: theme.ground}}>
      <Sequence from={0} durationInFrames={26}>
        <Audio src={sfx('Impact.mp3')} volume={0.9} />
      </Sequence>

      {/* a real chart, duotoned into the brand ramp */}
      <AbsoluteFill style={{overflow: 'hidden'}}>
        <Img
          src={CHART_MACRO}
          style={{width: '100%', height: '100%', objectFit: 'cover', filter: 'url(#neura-duotone)', opacity: 0.5, transform: `scale(${push})`}}
        />
      </AbsoluteFill>
      <AbsoluteFill style={{background: `linear-gradient(180deg, ${theme.ground}E8 0%, ${theme.ground}9C 34%, ${theme.ground}B4 54%, ${theme.ground}F0 100%)`}} />
      <AbsoluteFill style={{background: `radial-gradient(62% 26% at 50% 50%, ${theme.ground}D8 0%, transparent 76%)`}} />
      <Glow y="50%" strength={0.1} />

      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', padding: '0 54px'}}>
        <div style={{opacity: slam, transform: `scale(${settle})`, textAlign: 'center'}}>
          <div style={{color: theme.textPrimary, fontFamily: theme.fontFamily, fontSize: 92, fontWeight: theme.weightDisplay, letterSpacing: theme.trackingTight, lineHeight: 1.04}}>
            <span style={{color: theme.orange}}>3</span> INDICATORS
          </div>
          <div style={{marginTop: 20, color: theme.textTertiary, fontFamily: theme.fontFamily, fontSize: 40, fontWeight: theme.weightBody, letterSpacing: '0.01em', lineHeight: 1.26}}>
            intermediate traders
            <br />
            actually need
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------- 2. ATR ----------

const AtrSegment: FC = () => {
  const frame = useCurrentFrame();
  const print = interpolate(frame, [4, 58], [0.16, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE_OUT});
  const bandIn = interpolate(frame, [26, 52], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE_OUT});
  // The stop snaps to the band rather than fading in.
  const snap = interpolate(frame, [60, 66], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE_OUT});

  return (
    <AbsoluteFill style={{backgroundColor: theme.ground}}>
      <Sequence from={60} durationInFrames={16}>
        <Audio src={sfx('Pop.mp3')} volume={0.85} />
      </Sequence>

      <PhotoBackdrop src={DESK} opacity={0.24} blur={30} />
      <Glow y="60%" strength={0.08} />

      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', gap: 46}}>
        <IndicatorHeading index="1" name="ATR" full="Average True Range" sub="Sets your stop-loss by volatility, not by feel." />
        <Reveal from={3} duration={16} y={26}>
          <TerminalPanel symbol="NQ" timeframe="5M" price={ATR_STATS.last} change={ATR_STATS.change} changeNegative={ATR_STATS.negative} width={950}>
            <div style={{position: 'relative'}}>
              <CandleChart
                candles={ATR_SERIES}
                width={898}
                height={470}
                progress={print}
                band={{upper: ATR_BAND.upper, lower: ATR_BAND.lower, reveal: bandIn}}
                marker={snap > 0 ? {price: ATR_STOP, label: 'STOP', reveal: snap} : undefined}
              />
              <ChartNote from={34} style={{top: -4, right: 150}}>
                Wider band = more volatile
              </ChartNote>
              <ChartNote from={62} colour={theme.warnRed} style={{bottom: 52, right: 150}}>
                Stop = 1.8 &times; ATR
              </ChartNote>
            </div>
          </TerminalPanel>
        </Reveal>
      </AbsoluteFill>
      <StepMarker active={1} />
    </AbsoluteFill>
  );
};

// ---------- 3. RSI divergence ----------

const RsiSegment: FC = () => {
  const frame = useCurrentFrame();
  // Print through the divergence, then let it roll over.
  const print = interpolate(frame, [3, 62], [0.2, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE_OUT});
  const slopeIn = interpolate(frame, [52, 70], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE_OUT});

  const priceSlope = [
    {
      from: PRICE_PK1,
      to: PRICE_PK2,
      fromValue: RSI_SERIES[PRICE_PK1].h,
      toValue: RSI_SERIES[PRICE_PK2].h,
      colour: theme.upGreen,
      reveal: slopeIn,
    },
  ];
  const rsiSlope = [
    {
      from: RSI_PK1,
      to: RSI_PK2,
      fromValue: RSI_VALUES[RSI_PK1] as number,
      toValue: RSI_VALUES[RSI_PK2] as number,
      colour: theme.warnRed,
      reveal: slopeIn,
    },
  ];

  return (
    <AbsoluteFill style={{backgroundColor: theme.ground}}>
      <Sequence from={52} durationInFrames={18}>
        <Audio src={sfx('Notification.mp3')} volume={0.8} />
      </Sequence>
      <Sequence from={72} durationInFrames={18}>
        <Audio src={sfx('Zoomin-OR-out.mp3')} volume={0.7} />
      </Sequence>

      <PhotoBackdrop src={DESK} opacity={0.24} blur={30} />
      <Glow y="60%" strength={0.08} />

      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', gap: 40}}>
        <IndicatorHeading index="2" name="RSI divergence" full="Relative Strength Index" sub="Shows exhaustion before price shows it." />
        <Reveal from={3} duration={16} y={26}>
          <TerminalPanel symbol="NQ" timeframe="5M" price={RSI_STATS.last} change={RSI_STATS.change} changeNegative={RSI_STATS.negative} width={950}>
            <div style={{position: 'relative'}}>
              <CandleChart
                candles={RSI_SERIES}
                width={898}
                height={340}
                progress={print}
                showTimeAxis={false}
                slopes={priceSlope}
              />
              <ChartNote from={56} colour={theme.upGreen} style={{top: 4, left: 150}}>
                Price: higher high
              </ChartNote>
            </div>
            <div style={{marginTop: 14, paddingTop: 14, borderTop: `1px solid ${theme.textTertiary}14`, position: 'relative'}}>
              <RsiPane values={RSI_VALUES} count={RSI_SERIES.length} width={898} height={190} progress={print} label="RSI 9" slopes={rsiSlope} />
              <ChartNote from={60} colour={theme.warnRed} style={{bottom: 8, left: 150}}>
                RSI: lower high
              </ChartNote>
            </div>
          </TerminalPanel>
        </Reveal>
      </AbsoluteFill>
      <StepMarker active={2} />
    </AbsoluteFill>
  );
};

// ---------- 4. EMA 20/50 ----------

const EmaSegment: FC = () => {
  const frame = useCurrentFrame();
  const print = interpolate(frame, [3, 62], [0.18, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE_OUT});
  const arrow = interpolate(frame, [56, 78], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE_OUT});

  return (
    <AbsoluteFill style={{backgroundColor: theme.ground}}>
      {[20, 38].map((f) => (
        <Sequence key={f} from={f} durationInFrames={10}>
          <Audio src={sfx('Click.mp3')} volume={0.42} />
        </Sequence>
      ))}
      <Sequence from={56} durationInFrames={20}>
        <Audio src={sfx('Correct.mp3')} volume={0.72} />
      </Sequence>

      <PhotoBackdrop src={DESK} opacity={0.24} blur={30} />
      <Glow y="60%" strength={0.08} />

      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', gap: 46}}>
        <IndicatorHeading index="3" name="EMA 20/50" full="Exponential Moving Average" sub="Tells you the direction you should even be trading in." />
        <Reveal from={3} duration={16} y={26}>
          <TerminalPanel symbol="NQ" timeframe="15M" price={EMA_STATS.last} change={EMA_STATS.change} changeNegative={EMA_STATS.negative} width={950}>
            {/* Notes need a positioned wrapper, or they anchor to the panel
                and land on top of the header row. */}
            <div style={{position: 'relative'}}>
              <CandleChart
                candles={EMA_SERIES}
                width={898}
                height={470}
                progress={print}
                lines={[
                  {values: EMA50, colour: `${theme.textTertiary}66`, width: 3, dash: '9 7'},
                  {values: EMA20, colour: theme.orange, width: 4},
                ]}
                trend={{from: 4, to: EMA_SERIES.length - 2, reveal: arrow}}
              />
              {/* A legend alone doesn't teach; say what the ordering means. */}
              <ChartNote from={30} style={{top: 6, left: 130}}>
                20 above 50 = uptrend
              </ChartNote>
              <ChartNote from={58} colour={theme.upGreen} style={{bottom: 56, left: 130}}>
                Price holding above both
              </ChartNote>
            </div>
          </TerminalPanel>
        </Reveal>
      </AbsoluteFill>

      {/* line key, so the two colours are identifiable */}
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 148}}>
        <div style={{display: 'flex', gap: 30, alignItems: 'center'}}>
          {[
            {label: 'EMA 20', colour: theme.orange, dashed: false},
            {label: 'EMA 50', colour: `${theme.textTertiary}99`, dashed: true},
          ].map((l) => (
            <div key={l.label} style={{display: 'flex', alignItems: 'center', gap: 10}}>
              <span
                style={{
                  width: 30,
                  height: 0,
                  borderTop: `3px ${l.dashed ? 'dashed' : 'solid'} ${l.colour}`,
                }}
              />
              <span
                style={{
                  color: l.colour,
                  fontFamily: theme.fontFamily,
                  fontSize: 24,
                  fontWeight: theme.weightBody,
                  letterSpacing: theme.trackingWide,
                }}
              >
                {l.label}
              </span>
            </div>
          ))}
        </div>
      </AbsoluteFill>

      <StepMarker active={3} />
    </AbsoluteFill>
  );
};

// ---------- 5. CTA ----------

const CtaSegment: FC = () => {
  const card = useReveal(3, 16);
  return (
    <AbsoluteFill style={{backgroundColor: theme.ground}}>
      <Sequence from={4} durationInFrames={24}>
        <Audio src={sfx('aha-moment.MP3')} volume={0.85} />
      </Sequence>
      <Glow y="46%" strength={0.18} />

      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', padding: '0 66px'}}>
        <div
          style={{
            opacity: card,
            transform: `translateY(${(1 - card) * 22}px)`,
            width: '100%',
            maxWidth: 900,
            background: `linear-gradient(180deg, ${theme.bgCard} 0%, ${theme.bgAlt} 100%)`,
            border: `1px solid ${theme.orange}44`,
            borderRadius: 24,
            padding: '58px 48px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 28,
            boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
          }}
        >
          <div style={{color: theme.textTertiary, fontFamily: theme.fontMono, fontSize: 22, fontWeight: 500, letterSpacing: '0.34em'}}>NEURA</div>
          <div
            style={{
              color: theme.textPrimary,
              fontFamily: theme.fontFamily,
              fontSize: 62,
              fontWeight: theme.weightDisplay,
              letterSpacing: theme.trackingTight,
              textAlign: 'center',
              lineHeight: 1.2,
            }}
          >
            Which <span style={{color: theme.orange}}>indicator</span> are you using?
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------- combined: 13.0s ----------

export const ThreeIndicatorsScene: FC = () => (
  <AbsoluteFill style={{backgroundColor: theme.ground}}>
    <DuotoneFilter id="neura-duotone" />

    {/* Driving pulse bed, cut before the end so the CTA resolves into silence. */}
    <Sequence from={0} durationInFrames={366}>
      <Loop durationInFrames={20}>
        <Audio src={sfx('energy.MP3')} volume={0.19} />
      </Loop>
    </Sequence>

    <Sequence from={0} durationInFrames={60}>
      <HookSegment />
    </Sequence>
    <Sequence from={60} durationInFrames={90}>
      <AtrSegment />
    </Sequence>
    <Sequence from={150} durationInFrames={90}>
      <RsiSegment />
    </Sequence>
    <Sequence from={240} durationInFrames={90}>
      <EmaSegment />
    </Sequence>
    <Sequence from={330} durationInFrames={60}>
      <CtaSegment />
    </Sequence>

    <Grain opacity={0.04} />
  </AbsoluteFill>
);

export default ThreeIndicatorsScene;
