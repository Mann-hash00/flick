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
- `RsiPane` — an oscillator sub-pane beneath price, sharing the price chart's
  x-scale, with 30/70 guides. Takes `slopes` in RSI space so a divergence can be
  drawn against the matching price slopes.
- `Grain`, `Glow` — depth. Use sparingly.

## Real indicators

`ema()`, `rsi()` (Wilder) and `atr()` compute from the candles on screen, so a
line is genuinely the indicator of the price shown. Two traps worth knowing:

- **Warm-up.** An indicator is `null` until its period fills. If a move happens
  inside the warm-up window the indicator has no value there, and any peak you
  detect will be measuring something else. For lines that must span the whole
  visible chart (EMA 20/50), build extra bars of history, compute on the full
  series, then slice both candles and indicator arrays to the visible window —
  which is what a real platform is doing with off-screen data.
- **Claims need checking.** If a scene asserts "divergence", verify numerically
  that price prints a higher high while the oscillator prints a lower high, and
  that the gap is large enough to see (~10+ RSI points). A weakening advance
  needs real pullbacks inside it — one smooth leg to a higher high will
  re-saturate the oscillator and produce no divergence at all.

Bands read better centred on a smoothed line (Keltner-style, `ema ± k*atr`) than
on every close, which produces a jagged shadow rather than an envelope.
- `Reveal` / `useReveal` — the standard entrance. No springs.

## Colour rules
- Up candles `#2FA36B` (muted on purpose), down candles `#E5484D`.
- Brand orange `#F97316` stays the loudest colour in frame — used for the
  highlighted candle, labels, and one accent per composition.
- Never more than one accent focus per frame.

## Keeping a frame alive
Type on flat black reads as dull however good the type is. Every scene should
carry an ambient layer underneath the content, running the whole duration:

- A drifting dot lattice (SVG `<pattern>` — 500 dots for the cost of one rect)
  with a slow offset and a breathing opacity.
- A few dozen motes at different speeds, a minority of them in the accent.
- HUD corner brackets that draw in on a beat, and a short accent bloom on each
  beat boundary so cuts don't land flat.

Beyond that, a beat that is only a claim needs something to be true of: the
evaluation beat gets a progress bar that fills and stamps PASSED, the blow-up
beat gets an equity curve that climbs green through the eval, marks FUNDED at
the top, and gives it all back in red. Build the visual the sentence describes
rather than setting the sentence on an empty frame.

## One object, one take
A beat sheet that lists a different metaphor per beat (piggy bank, then falling
rock, then chart, then band-aid, then mountain) is five visual worlds in one
short — it reads as a slideshow and the object-metaphors read as clip art.
Prefer carrying a single object through the whole film and letting it take the
punishment: in `ScarTissueScene.tsx` the equity curve bows under a weight and
snaps, resets clean, gets whipped down with its earlier gain greying out behind
the drop, gets sutured, and finally pulls back to reveal it has done this five
times. The curve is native to the audience, so no beat has to explain itself.

Zooming out at the end is the strongest move available for "this keeps
happening" — but **scale x and y by different amounts**. A uniform pull-back to
0.2 squashes each cycle to 42px tall and the scars vanish; 0.2 across and 0.62
down is what a real chart does when you zoom out, and it stays legible. Use
`vectorEffect="non-scaling-stroke"` so nothing thins out, and project anything
that must stay circular (a head marker) into screen space outside the scaled
group, or the non-uniform scale turns it into an ellipse.

## Emoji
Headless Chromium here has no emoji font, so a literal emoji character renders
as a tofu box. Draw the glyph as SVG instead — flat shapes in the video's own
palette, animated in parts (eyes widening, jaw dropping, an impact burst) so it
reads as designed rather than as clip art.

## Stated figures
Any percentage, count or statistic that appears on screen lives in a named
constant at the top of the scene with a comment saying where it came from and
whether it was verified. This environment has no outbound web access, so a
figure supplied in a brief cannot be checked here — say so when delivering,
rather than letting a rendered number carry an authority nobody earned. Keeping
it as a constant also means a sourced replacement is a one-line change.

## Supplied screen recordings
Frame the capture in a device rather than running it full-bleed, and size the
frame so the footage scales **down**. A 720x1280 capture in a 1080x1920
composition is a 3x upscale at full-bleed and looks it; at 660px wide it is a
downscale and looks sharp.

- Dark app UI on a dark ground needs a lift — `brightness(1.14) contrast(1.07)`
  or it sinks into the panel on a phone.
- Never pin a highlight overlay to a scrolling capture; it drifts. Sweep a soft
  accent band across the region instead, or let the UI's own labels do the work.
- **Check what the capture actually says.** The Control Room clip used here
  showed limits being *loosened* while the copy claimed discipline holds. Playing
  it reversed fixed the contradiction and gave a stronger closing frame.

## Supplied images
Dropped into `brand-assets/images/`, used via `ImageBackdrop` — full-bleed,
darkened, type over the top. Must be images Mann owns or has rights to.

## Typography (unchanged from v1.5)
System sans, weight 500–600, `-0.03em` on display text, `+0.18em` on small caps labels.
