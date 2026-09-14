# Neura video visual system (v2)

Replaces the flat-infographic look used in the first three videos. Applies from
this run onward.

## What changed and why

| Old (read as corny) | New |
|---|---|
| Cartoon emoji faces | **Cut entirely.** Hooks carry on type + motion. |
| Flat solid bars, no chart chrome | **Real terminal charts** — candle bodies + wicks, gridlines, price ladder, time axis |
| Loading-bar / battery metaphors | Terminal panels with symbol, timeframe, live price, % change |
| Bouncy overshoot springs | **Smooth cubic easing, no overshoot** (`EASE_OUT`, `EASE_IN_OUT`) |
| Everything dead-centred, same stack each time | Panel-led composition, asymmetric where it helps |
| Pure flat fills | Film grain, soft directional glow, layered panel gradients |

## Kit — `remotion/src/terminal.tsx`

- `buildSeries(count, seed, drift[], volatility, base, scale)` — deterministic OHLC.
  `base`/`scale` centre it on a real instrument price.
- `seriesStats(candles)` — derives the header price and % change **from the series**,
  so the panel readout and the price axis can never disagree.
- `CandleChart` — wicks, bodies, gridlines, price ladder, time axis, `progress`
  for progressive printing, `highlight` to spotlight one candle with a glow.
  - `trade` draws a full entry / stop / target with shaded risk and reward zones.
  - `openPosition` draws an entry line plus a loss zone that grows with each bar —
    for showing a position bleeding rather than a planned trade.
  - Trade levels are folded into the price range, so a stop placed beyond the
    data can't be clipped at the plot edge. Labels paint after the candles on
    dark chips, or candle bodies swallow them.
- `TerminalPanel` — dark glass panel with symbol / timeframe / price / change header.
- `ImageBackdrop` — full-bleed supplied image under a dark scrim with a slow push-in,
  for captions over supplied trading photography.
- `Grain`, `Glow` — depth. Use sparingly.
- `Reveal` / `useReveal` — the standard entrance. No springs.

## Colour rules
- Up candles `#2FA36B` (muted on purpose), down candles `#E5484D`.
- Brand orange `#F97316` stays the loudest colour in frame — used for the
  highlighted candle, labels, and one accent per composition.
- Never more than one accent focus per frame.

## Supplied images
Dropped into `brand-assets/images/`, used via `ImageBackdrop` — full-bleed,
darkened, type over the top. Must be images Mann owns or has rights to.

## Typography (unchanged from v1.5)
System sans, weight 500–600, `-0.03em` on display text, `+0.18em` on small caps labels.
