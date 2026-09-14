import type {FC, ReactNode} from 'react';
import {AbsoluteFill, Easing, Img, interpolate, useCurrentFrame} from 'remotion';
import {theme} from './theme';

// ============================================================================
// Neura terminal kit
// Shared visual system for Neura short-form video: real trading-terminal chart
// chrome, dark glass panels, image backdrops, and smooth (never bouncy) motion.
// ============================================================================

// ---------- motion ----------
// Decisive, no overshoot. Bounce reads playful; this brand doesn't.
export const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);
export const EASE_IN_OUT = Easing.bezier(0.65, 0, 0.35, 1);

export const useReveal = (from: number, duration = 18) => {
  const frame = useCurrentFrame();
  return interpolate(frame, [from, from + duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_OUT,
  });
};

/** Rise-and-fade entrance. Replaces the old spring punch-ins. */
export const Reveal: FC<{from: number; duration?: number; y?: number; children: ReactNode; style?: React.CSSProperties}> = ({
  from,
  duration = 18,
  y = 26,
  children,
  style,
}) => {
  const t = useReveal(from, duration);
  return (
    <div style={{opacity: t, transform: `translateY(${(1 - t) * y}px)`, ...style}}>{children}</div>
  );
};

// ---------- chart data ----------

export type Candle = {o: number; h: number; l: number; c: number};

/**
 * Deterministic OHLC series with a controllable drift, so a chart can be told
 * to run up, bleed out, or chop without hand-authoring every bar.
 */
export const buildSeries = (
  count: number,
  seed: number,
  drift: number[],
  volatility = 1,
  /** Real instrument price the series is centred on, so axis and header agree. */
  base = 100,
  /** Price units per unit of drift. */
  scale = 1,
): Candle[] => {
  const rand = (i: number) => {
    const s = Math.sin((i + 1) * seed * 12.9898) * 43758.5453;
    return s - Math.floor(s);
  };
  const candles: Candle[] = [];
  let price = 100;
  const at = (v: number) => base + (v - 100) * scale;
  for (let i = 0; i < count; i++) {
    const seg = drift[Math.min(drift.length - 1, Math.floor((i / count) * drift.length))];
    const o = price;
    const move = seg + (rand(i) - 0.5) * 2.6 * volatility;
    const c = o + move;
    const wick = (0.4 + rand(i + 90) * 1.5) * volatility;
    candles.push({o: at(o), c: at(c), h: at(Math.max(o, c) + wick), l: at(Math.min(o, c) - wick)});
    price = c;
  }
  return candles;
};

/** Header readouts derived from the series itself — never hand-typed, so the
 *  panel price and the price axis can't drift apart. */
export const seriesStats = (candles: Candle[], decimals = 2) => {
  const first = candles[0].o;
  const last = candles[candles.length - 1].c;
  const pct = ((last - first) / first) * 100;
  const fmt = (v: number) => v.toLocaleString('en-US', {minimumFractionDigits: decimals, maximumFractionDigits: decimals});
  return {
    last: fmt(last),
    change: `${pct >= 0 ? '+' : '−'}${Math.abs(pct).toFixed(2)}%`,
    negative: pct < 0,
  };
};

/**
 * A leg of market structure: walk to `to` over `bars` bars.
 * Chaining legs is what produces real structure — an impulse, a pullback that
 * holds above the last low, then a push through the last high. Drift-plus-noise
 * can't do this; it just ramps.
 */
export type Swing = {to: number; bars: number};

export const buildSwingSeries = (
  swings: Swing[],
  seed: number,
  {start = 100, base = 100, scale = 1, volatility = 1}: {start?: number; base?: number; scale?: number; volatility?: number} = {},
): Candle[] => {
  const rand = (i: number) => {
    const s = Math.sin((i + 1) * seed * 12.9898) * 43758.5453;
    return s - Math.floor(s);
  };
  const at = (v: number) => base + (v - 100) * scale;
  const candles: Candle[] = [];
  let price = start;
  let n = 0;

  for (const leg of swings) {
    const legFrom = price;
    for (let b = 0; b < leg.bars; b++) {
      const o = price;
      const path = legFrom + (leg.to - legFrom) * ((b + 1) / leg.bars);
      // Final bar lands exactly on the swing level, so highs and lows stay
      // where the structure says they are.
      const c = b === leg.bars - 1 ? leg.to : path + (rand(n) - 0.5) * 1.4 * volatility;
      const wick = (0.25 + rand(n + 77) * 1.0) * volatility;
      candles.push({o: at(o), c: at(c), h: at(Math.max(o, c) + wick), l: at(Math.min(o, c) - wick)});
      price = c;
      n++;
    }
  }
  return candles;
};

/** Simple moving average aligned to the candle array (null until the window fills). */
export const movingAverage = (candles: Candle[], period: number): (number | null)[] =>
  candles.map((_, i) => {
    if (i < period - 1) return null;
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += candles[j].c;
    return sum / period;
  });

// ---------- chart ----------

export const CandleChart: FC<{
  candles: Candle[];
  width: number;
  height: number;
  /** 0-1: how much of the series has printed. */
  progress?: number;
  /** Index of a candle to spotlight with a glow. */
  highlight?: number;
  showGrid?: boolean;
  showPriceAxis?: boolean;
  showTimeAxis?: boolean;
  /** Moving-average overlay, from movingAverage(). */
  ma?: (number | null)[];
  maLabel?: string;
  /** Horizontal entry marker pinned to a candle's close. */
  entry?: {index: number; label?: string; reveal?: number};
  /** An open position bleeding: entry line plus a loss zone that tracks price. */
  openPosition?: {index: number; entry: number};
  /** Full trade: entry, stop under structure, target — with risk/reward zones. */
  trade?: {
    index: number;
    entry: number;
    stop: number;
    target: number;
    entryReveal?: number;
    stopReveal?: number;
    targetReveal?: number;
  };
  /** Directional guide drawn between two candles, with an arrowhead. */
  trend?: {from: number; to: number; reveal?: number};
}> = ({
  candles,
  width,
  height,
  progress = 1,
  highlight,
  showGrid = true,
  showPriceAxis = true,
  showTimeAxis = true,
  ma,
  maLabel,
  entry,
  trend,
  trade,
  openPosition,
}) => {
  // Wide enough for 5-figure prices with 2 decimals; too narrow and the SVG
  // viewport clips the last digit.
  const axisW = showPriceAxis ? 142 : 0;
  const axisH = showTimeAxis ? 40 : 0;
  const plotW = width - axisW;
  const plotH = height - axisH;

  const highs = candles.map((c) => c.h);
  const lows = candles.map((c) => c.l);
  // Trade levels must be inside the visible range, or a stop placed beyond the
  // data gets clipped at the plot edge.
  const levels = [...(trade ? [trade.entry, trade.stop, trade.target] : []), ...(openPosition ? [openPosition.entry] : [])];
  const max = Math.max(...highs, ...levels);
  const min = Math.min(...lows, ...levels);
  const pad = (max - min) * 0.12;
  const top = max + pad;
  const bottom = min - pad;
  const y = (v: number) => ((top - v) / (top - bottom)) * plotH;

  const slot = plotW / candles.length;
  const bodyW = Math.max(4, slot * 0.62);
  const shown = Math.round(candles.length * progress);

  // Price ladder — real terminals label round levels, not raw data points.
  const ticks = Array.from({length: 5}, (_, i) => bottom + ((top - bottom) * (i + 0.5)) / 5);
  const times = ['09:30', '10:15', '11:00', '11:45', '12:30'];

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {showGrid &&
        ticks.map((t, i) => (
          <line key={i} x1={0} y1={y(t)} x2={plotW} y2={y(t)} stroke={theme.textTertiary} strokeWidth={1} opacity={0.06} />
        ))}

      {showPriceAxis && (
        <>
          <line x1={plotW} y1={0} x2={plotW} y2={plotH} stroke={theme.textTertiary} strokeWidth={1} opacity={0.1} />
          {ticks.map((t, i) => (
            <text
              key={i}
              x={plotW + 16}
              y={y(t) + 6}
              fill={theme.textTertiary}
              opacity={0.45}
              fontFamily={theme.fontFamily}
              fontSize={19}
              letterSpacing="0.04em"
            >
              {t.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </text>
          ))}
        </>
      )}

      {showTimeAxis &&
        times.map((label, i) => (
          <text
            key={label}
            x={(plotW / (times.length - 1)) * i}
            y={plotH + 28}
            fill={theme.textTertiary}
            opacity={0.35}
            fontFamily={theme.fontFamily}
            fontSize={18}
            letterSpacing="0.08em"
            textAnchor={i === 0 ? 'start' : i === times.length - 1 ? 'end' : 'middle'}
          >
            {label}
          </text>
        ))}

      {/* moving average, drawn under the candles */}
      {ma &&
        (() => {
          const pts = ma
            .map((v, i) => (v === null || i >= shown ? null : `${slot * i + slot / 2},${y(v)}`))
            .filter(Boolean) as string[];
          if (pts.length < 2) return null;
          // Anchor the label where the line actually starts, not to a value
          // from the far end of the series.
          const i0 = ma.findIndex((v) => v !== null);
          const firstVal = i0 >= 0 ? ma[i0] : null;
          return <polyline points={pts.join(' ')} fill="none" stroke={theme.orange} strokeWidth={3} opacity={0.75} strokeLinecap="round" />;
        })()}

      {/* directional guide with arrowhead */}
      {trend &&
        (() => {
          const r = trend.reveal ?? 1;
          if (r <= 0) return null;
          const a = candles[trend.from];
          const b = candles[trend.to];
          const x1 = slot * trend.from + slot / 2;
          const y1 = y(a.l) + 26;
          const x2 = slot * trend.to + slot / 2;
          const y2 = y(b.h) + 26;
          const cx2 = x1 + (x2 - x1) * r;
          const cy2 = y1 + (y2 - y1) * r;
          const ang = Math.atan2(cy2 - y1, cx2 - x1);
          const head = 16;
          return (
            <g opacity={0.9}>
              <line x1={x1} y1={y1} x2={cx2} y2={cy2} stroke={theme.orange} strokeWidth={3} strokeDasharray="9 7" strokeLinecap="round" />
              {r > 0.9 && (
                <polygon
                  points={[
                    `${cx2},${cy2}`,
                    `${cx2 - head * Math.cos(ang - 0.42)},${cy2 - head * Math.sin(ang - 0.42)}`,
                    `${cx2 - head * Math.cos(ang + 0.42)},${cy2 - head * Math.sin(ang + 0.42)}`,
                  ].join(' ')}
                  fill={theme.orange}
                />
              )}
            </g>
          );
        })()}

      {/* entry marker */}
      {entry &&
        (() => {
          const r = entry.reveal ?? 1;
          if (r <= 0 || entry.index >= shown) return null;
          const px = candles[entry.index].c;
          const ey = y(px);
          const ex = slot * entry.index + slot / 2;
          return (
            <g opacity={r}>
              <line x1={0} y1={ey} x2={plotW * r} y2={ey} stroke={theme.textPrimary} strokeWidth={2} strokeDasharray="10 8" opacity={0.45} />
              <circle cx={ex} cy={ey} r={9} fill={theme.orange} style={{filter: `drop-shadow(0 0 12px ${theme.orange})`}} />
              {entry.label && (
                <text
                  x={ex + 22}
                  y={ey - 30}
                  fill={theme.textPrimary}
                  fontFamily={theme.fontFamily}
                  fontSize={21}
                  fontWeight={600}
                  letterSpacing="0.14em"
                >
                  {entry.label}
                </text>
              )}
            </g>
          );
        })()}

      {/* open position: the loss zone grows with every bar that prints */}
      {openPosition &&
        shown > openPosition.index &&
        (() => {
          const ex = slot * openPosition.index + slot / 2;
          const eY = y(openPosition.entry);
          const last = candles[Math.max(0, shown - 1)].c;
          const lY = y(last);
          const losing = lY > eY;
          return (
            <g>
              <rect
                x={ex}
                y={Math.min(eY, lY)}
                width={Math.max(0, plotW - ex)}
                height={Math.abs(lY - eY)}
                fill={losing ? theme.warnRed : theme.upGreen}
                opacity={0.17}
              />
              <line x1={0} y1={eY} x2={plotW} y2={eY} stroke={theme.textPrimary} strokeWidth={2} strokeDasharray="10 8" opacity={0.55} />
              <circle cx={ex} cy={eY} r={8} fill={theme.textPrimary} opacity={0.9} />
            </g>
          );
        })()}

      {/* full trade: risk/reward zones from the entry bar, lines across the plot */}
      {trade &&
        (() => {
          const eR = trade.entryReveal ?? 1;
          const sR = trade.stopReveal ?? 1;
          const tR = trade.targetReveal ?? 1;
          if (eR <= 0) return null;
          const ex = slot * trade.index + slot / 2;
          const eY = y(trade.entry);
          const sY = y(trade.stop);
          const tY = y(trade.target);
          const zoneW = Math.max(0, plotW - ex);
          return (
            <g>
              {/* reward zone */}
              {tR > 0 && (
                <rect x={ex} y={Math.min(eY, tY)} width={zoneW * tR} height={Math.abs(eY - tY)} fill={theme.upGreen} opacity={0.13} />
              )}
              {/* risk zone */}
              {sR > 0 && (
                <rect x={ex} y={Math.min(eY, sY)} width={zoneW * sR} height={Math.abs(eY - sY)} fill={theme.warnRed} opacity={0.15} />
              )}
              {tR > 0 && (
                <line x1={0} y1={tY} x2={plotW} y2={tY} stroke={theme.upGreen} strokeWidth={2} strokeDasharray="11 8" opacity={0.85 * tR} />
              )}
              {sR > 0 && (
                <line x1={0} y1={sY} x2={plotW} y2={sY} stroke={theme.warnRed} strokeWidth={2} strokeDasharray="11 8" opacity={0.85 * sR} />
              )}
              <line x1={0} y1={eY} x2={plotW} y2={eY} stroke={theme.orange} strokeWidth={3} opacity={eR} />
            </g>
          );
        })()}

      {candles.slice(0, shown).map((c, i) => {
        const up = c.c >= c.o;
        const colour = up ? theme.upGreen : theme.warnRed;
        const cx = slot * i + slot / 2;
        const bodyTop = y(Math.max(c.o, c.c));
        const bodyH = Math.max(2, Math.abs(y(c.o) - y(c.c)));
        const isHot = highlight === i;
        return (
          <g key={i} opacity={highlight !== undefined && !isHot ? 0.55 : 1}>
            <line x1={cx} y1={y(c.h)} x2={cx} y2={y(c.l)} stroke={colour} strokeWidth={2} />
            <rect
              x={cx - bodyW / 2}
              y={bodyTop}
              width={bodyW}
              height={bodyH}
              fill={colour}
              rx={1}
              style={isHot ? {filter: `drop-shadow(0 0 14px ${theme.orange})`} : undefined}
            />
          </g>
        );
      })}

      {/* Labels paint last, on chips, so candles can't swallow them. */}
      {ma &&
        maLabel &&
        (() => {
          const i0 = ma.findIndex((v) => v !== null);
          const v0 = i0 >= 0 ? ma[i0] : null;
          if (v0 == null || i0 >= shown) return null;
          const lx = slot * i0 + slot / 2 + 10;
          const ly = y(v0) - 18;
          const w = maLabel.length * 19 * 0.8 + 18;
          return (
            <g>
              <rect x={lx - 7} y={ly - 20} width={w} height={28} rx={5} fill={theme.bg} opacity={0.8} />
              <text x={lx} y={ly} fill={theme.orange} opacity={0.95} fontFamily={theme.fontFamily} fontSize={19} letterSpacing="0.14em">
                {maLabel}
              </text>
            </g>
          );
        })()}

      {openPosition &&
        (() => {
          const yy = y(openPosition.entry);
          return (
            <g>
              <rect x={4} y={yy - 34} width={124} height={34} rx={5} fill={theme.bg} opacity={0.82} />
              <text x={14} y={yy - 12} fill={theme.textPrimary} fontFamily={theme.fontFamily} fontSize={20} fontWeight={600} letterSpacing="0.16em">
                ENTRY
              </text>
            </g>
          );
        })()}

      {/* Trade labels paint last, on chips, so candles can't swallow them. */}
      {trade &&
        (() => {
          const eR = trade.entryReveal ?? 1;
          const sR = trade.stopReveal ?? 1;
          const tR = trade.targetReveal ?? 1;
          if (eR <= 0) return null;
          const ex = slot * trade.index + slot / 2;
          const chip = (label: string, yy: number, colour: string, op: number, size = 20) => {
            const w = label.length * size * 0.82 + 20;
            return (
              <g opacity={op}>
                <rect x={4} y={yy - size - 14} width={w} height={size + 14} rx={5} fill={theme.bg} opacity={0.82} />
                <text x={14} y={yy - 12} fill={colour} fontFamily={theme.fontFamily} fontSize={size} fontWeight={600} letterSpacing="0.16em">
                  {label}
                </text>
              </g>
            );
          };
          return (
            <g>
              {tR > 0 && chip('TARGET', y(trade.target), theme.upGreen, tR)}
              {sR > 0 && chip('STOP', y(trade.stop), theme.warnRed, sR)}
              {chip('ENTRY', y(trade.entry), theme.orange, eR, 21)}
              <circle cx={ex} cy={y(trade.entry)} r={10} fill={theme.orange} opacity={eR} style={{filter: `drop-shadow(0 0 14px ${theme.orange})`}} />
            </g>
          );
        })()}
    </svg>
  );
};

// ---------- panel chrome ----------

export const TerminalPanel: FC<{
  symbol: string;
  timeframe?: string;
  price?: string;
  change?: string;
  changeNegative?: boolean;
  width: number;
  children: ReactNode;
  style?: React.CSSProperties;
}> = ({symbol, timeframe = '1M', price, change, changeNegative, width, children, style}) => (
  <div
    style={{
      width,
      background: `linear-gradient(180deg, ${theme.bgAlt} 0%, ${theme.bg} 100%)`,
      border: `1px solid ${theme.textTertiary}14`,
      borderRadius: 18,
      overflow: 'hidden',
      boxShadow: '0 30px 70px rgba(0,0,0,0.55)',
      ...style,
    }}
  >
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '20px 26px',
        borderBottom: `1px solid ${theme.textTertiary}12`,
      }}
    >
      <span style={{color: theme.textPrimary, fontFamily: theme.fontFamily, fontSize: 26, fontWeight: theme.weightDisplay, letterSpacing: '-0.01em'}}>
        {symbol}
      </span>
      <span
        style={{
          color: theme.textTertiary,
          fontFamily: theme.fontFamily,
          fontSize: 17,
          fontWeight: theme.weightBody,
          letterSpacing: theme.trackingWide,
          border: `1px solid ${theme.textTertiary}22`,
          borderRadius: 6,
          padding: '3px 9px',
        }}
      >
        {timeframe}
      </span>
      <div style={{flex: 1}} />
      {price && (
        <span style={{color: theme.textSecondary, fontFamily: theme.fontFamily, fontSize: 25, fontWeight: theme.weightBody, letterSpacing: '-0.01em'}}>
          {price}
        </span>
      )}
      {change && (
        <span style={{color: changeNegative ? theme.warnRed : theme.upGreen, fontFamily: theme.fontFamily, fontSize: 22, fontWeight: theme.weightBody}}>
          {change}
        </span>
      )}
    </div>
    <div style={{padding: '24px 26px 18px'}}>{children}</div>
  </div>
);

// ---------- image backdrop ----------

/**
 * Full-bleed supplied image under a dark scrim, so captions stay readable.
 * `src` comes from staticFile('brand-assets/images/…').
 */
const hexToUnit = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255];
};

/**
 * Duotone filter: desaturate, then remap luminance across a two-colour ramp so
 * a supplied image sits inside the brand palette instead of fighting it.
 */
export const DuotoneFilter: FC<{id: string; shadow?: string; highlight?: string}> = ({
  id,
  shadow = theme.ground,
  highlight = theme.orange,
}) => {
  const [sr, sg, sb] = hexToUnit(shadow);
  const [hr, hg, hb] = hexToUnit(highlight);
  return (
    <svg width={0} height={0} style={{position: 'absolute'}}>
      <filter id={id} colorInterpolationFilters="sRGB">
        <feColorMatrix
          type="matrix"
          values="0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0 0 0 1 0"
        />
        <feComponentTransfer>
          <feFuncR type="table" tableValues={`${sr} ${hr}`} />
          <feFuncG type="table" tableValues={`${sg} ${hg}`} />
          <feFuncB type="table" tableValues={`${sb} ${hb}`} />
        </feComponentTransfer>
      </filter>
    </svg>
  );
};

export const ImageBackdrop: FC<{src: string; scrim?: number; zoomFrom?: number; blur?: number; duotone?: boolean}> = ({
  src,
  scrim = 0.72,
  zoomFrom = 1.08,
  blur = 0,
  duotone = false,
}) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, 120], [zoomFrom, 1], {extrapolateRight: 'clamp', easing: EASE_IN_OUT});
  const filters = [duotone ? 'url(#neura-duotone)' : '', blur ? `blur(${blur}px)` : ''].filter(Boolean).join(' ');
  return (
    <AbsoluteFill>
      {duotone && <DuotoneFilter id="neura-duotone" />}
      <AbsoluteFill style={{overflow: 'hidden'}}>
        <Img
          src={src}
          style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${scale})`, filter: filters || undefined}}
        />
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, ${theme.bg}${Math.round(scrim * 255).toString(16).padStart(2, '0')} 0%, ${theme.bg}CC 45%, ${theme.bg} 100%)`,
        }}
      />
    </AbsoluteFill>
  );
};

// ---------- depth ----------

/** Fine film grain. Kills the flat vector look at almost no cost. */
export const Grain: FC<{opacity?: number}> = ({opacity = 0.05}) => (
  <AbsoluteFill style={{opacity, mixBlendMode: 'overlay', pointerEvents: 'none'}}>
    <svg width="100%" height="100%">
      <filter id="neura-grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#neura-grain)" />
    </svg>
  </AbsoluteFill>
);

/** Soft directional glow, used sparingly to lift a focal area off the black. */
export const Glow: FC<{x?: string; y?: string; colour?: string; strength?: number}> = ({
  x = '50%',
  y = '45%',
  colour = theme.orange,
  strength = 0.16,
}) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(80% 50% at ${x} ${y}, ${colour}${Math.round(strength * 255)
        .toString(16)
        .padStart(2, '0')} 0%, transparent 68%)`,
    }}
  />
);
