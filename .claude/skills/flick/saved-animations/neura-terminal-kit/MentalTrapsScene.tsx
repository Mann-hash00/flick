import type {FC} from 'react';
import {AbsoluteFill, Audio, Img, Loop, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {theme} from '../theme';
import {sfx} from '../common';
import {CandleChart, DuotoneFilter, EASE_IN_OUT, EASE_OUT, Glow, Grain, Reveal, TerminalPanel, buildSwingSeries, useReveal} from '../terminal';

const PSY = staticFile('brand-assets/images/psy.png');

const NQ = {base: 20400, scale: 12};
const POINT_VALUE = 20; // one NQ contract

// ---------- trap 1 data: a position that just keeps bleeding ----------
// Lower highs (99, 96) over lower lows (98, 95, 91.5, 87) — one long drift
// down, never a clean break, which is exactly what keeps people in.
const BLEED = buildSwingSeries(
  [
    {to: 98, bars: 5},
    {to: 99, bars: 3},
    {to: 95, bars: 5},
    {to: 96, bars: 3},
    {to: 91.5, bars: 6},
    {to: 87, bars: 8},
  ],
  6.1,
  {start: 100, ...NQ, volatility: 1},
);
const BLEED_ENTRY = NQ.base; // opened at the very top

// ---------- trap 2 data: the feed ----------
type Signal = {text: string; agrees: boolean};
const FEED: Signal[] = [
  {text: 'Momentum still up', agrees: true},
  {text: 'Lower high forming', agrees: false},
  {text: 'Higher low held', agrees: true},
  {text: 'Volume fading', agrees: false},
  {text: 'Buyers defending support', agrees: true},
  {text: 'Momentum diverging', agrees: false},
  {text: 'Trend intact', agrees: true},
  {text: 'Sellers stepping in', agrees: false},
  {text: 'Volume rising on upticks', agrees: true},
  {text: 'Breadth weakening', agrees: false},
];

const CARD_H = 132;
const FEED_VIEWPORT = 660;

// ---------- shared heading ----------

const TrapHeading: FC<{index: string; name: string; sub: string}> = ({index, name, sub}) => (
  <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '0 52px'}}>
    <Reveal from={0} duration={14}>
      <div style={{display: 'flex', alignItems: 'baseline', gap: 22}}>
        <span style={{color: theme.orange, fontFamily: theme.fontFamily, fontSize: 126, fontWeight: theme.weightDisplay, letterSpacing: '-0.05em', lineHeight: 0.9}}>
          {index}
        </span>
        <span style={{color: theme.textPrimary, fontFamily: theme.fontFamily, fontSize: 62, fontWeight: theme.weightDisplay, letterSpacing: theme.trackingTight}}>
          {name}
        </span>
      </div>
    </Reveal>
    <Reveal from={7} duration={16}>
      <div
        style={{
          color: theme.textTertiary,
          fontFamily: theme.fontFamily,
          fontSize: 33,
          fontWeight: theme.weightBody,
          letterSpacing: '-0.01em',
          textAlign: 'center',
          lineHeight: 1.34,
          maxWidth: 860,
        }}
      >
        {sub}
      </div>
    </Reveal>
  </div>
);

// ---------- 1. hook ----------

const HookSegment: FC = () => {
  const frame = useCurrentFrame();
  const drift = interpolate(frame, [0, 90], [0.25, 1], {extrapolateRight: 'clamp', easing: EASE_OUT});
  const washScale = interpolate(frame, [0, 90], [1.16, 1.03], {extrapolateRight: 'clamp', easing: EASE_IN_OUT});
  const psyScale = interpolate(frame, [0, 90], [1.09, 1], {extrapolateRight: 'clamp', easing: EASE_IN_OUT});
  // The vignette tightens through the hook — the frame closing in.
  const closeIn = interpolate(frame, [0, 90], [118, 82], {extrapolateRight: 'clamp', easing: EASE_IN_OUT});
  const slam = useReveal(6, 9);
  const settle = interpolate(frame, [6, 12, 22], [1.16, 0.99, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE_OUT});

  return (
    <AbsoluteFill style={{backgroundColor: theme.ground}}>
      <Sequence from={0} durationInFrames={14}>
        <Audio src={sfx('transitions.mp3')} volume={0.85} />
      </Sequence>
      <Sequence from={6} durationInFrames={24}>
        <Audio src={sfx('Pop.mp3')} volume={0.95} />
      </Sequence>

      <DuotoneFilter id="neura-duotone" />

      {/* Supplied artwork, pushed well back: duotoned into the brand ramp and
          softened so it reads as texture rather than flat illustration. */}
      <AbsoluteFill style={{overflow: 'hidden'}}>
        <Img
          src={PSY}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'url(#neura-duotone) blur(54px)',
            opacity: 0.42,
            transform: `scale(${washScale})`,
          }}
        />
      </AbsoluteFill>
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
        <div
          style={{
            width: 1160,
            opacity: 0.27,
            transform: `translateY(-40px) scale(${psyScale})`,
            maskImage: 'linear-gradient(180deg, transparent 0%, #000 22%, #000 78%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, #000 22%, #000 78%, transparent 100%)',
          }}
        >
          <Img src={PSY} style={{width: '100%', display: 'block', filter: 'url(#neura-duotone) blur(2.5px)'}} />
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', opacity: 0.22}}>
        <CandleChart candles={BLEED} width={1120} height={560} progress={drift} showPriceAxis={false} showTimeAxis={false} showGrid={false} />
      </AbsoluteFill>
      <AbsoluteFill style={{background: `radial-gradient(${closeIn}% ${closeIn * 0.62}% at 50% 50%, transparent 0%, ${theme.ground} 72%)`}} />
      {/* Holds contrast under the slam where the artwork's starburst is hottest. */}
      <AbsoluteFill style={{background: `radial-gradient(58% 26% at 50% 52%, ${theme.ground}E0 0%, transparent 78%)`}} />
      <Glow y="50%" strength={0.1} />

      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', padding: '0 56px'}}>
        <div style={{opacity: slam, transform: `scale(${settle})`, textAlign: 'center'}}>
          <div style={{color: theme.textPrimary, fontFamily: theme.fontFamily, fontSize: 88, fontWeight: theme.weightDisplay, letterSpacing: theme.trackingTight, lineHeight: 1.06}}>
            <span style={{color: theme.orange}}>2</span> MENTAL
            <br />
            TRAPS
          </div>
          <div style={{marginTop: 22, color: theme.textTertiary, fontFamily: theme.fontFamily, fontSize: 38, fontWeight: theme.weightBody, letterSpacing: '0.02em'}}>
            every trader falls into
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------- 2. sunk cost ----------

const SunkCostSegment: FC = () => {
  const frame = useCurrentFrame();
  // One unbroken drift across the whole segment — never a cut.
  const print = interpolate(frame, [4, 116], [0.18, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE_IN_OUT});

  const shown = Math.max(1, Math.round(BLEED.length * print));
  const last = BLEED[shown - 1].c;
  const points = last - BLEED_ENTRY;
  const dollars = points * POINT_VALUE;
  const pnl = `${dollars < 0 ? '−' : '+'}$${Math.abs(Math.round(dollars)).toLocaleString('en-US')}`;
  const pct = ((last - BLEED_ENTRY) / BLEED_ENTRY) * 100;

  // The exit is right there the whole time, pulsing, untouched.
  const pulse = interpolate(Math.sin(frame / 7), [-1, 1], [0.35, 1]);

  return (
    <AbsoluteFill style={{backgroundColor: theme.ground}}>
      <Sequence from={0} durationInFrames={108}>
        <Audio src={sfx('riser.mp3')} volume={0.42} />
      </Sequence>
      {[30, 66, 100].map((f) => (
        <Sequence key={f} from={f} durationInFrames={10}>
          <Audio src={sfx('Click.mp3')} volume={0.4} />
        </Sequence>
      ))}

      <Glow y="60%" strength={0.09} colour={theme.warnRed} />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', gap: 44}}>
        <TrapHeading
          index="1"
          name="Sunk cost fallacy"
          sub="You stay in a bad trade because you already put money in — not because it's still a good trade."
        />

        <Reveal from={4} duration={18} y={28}>
          <TerminalPanel
            symbol="NQ"
            timeframe="5M"
            price={last.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            change={`${pct < 0 ? '−' : '+'}${Math.abs(pct).toFixed(2)}%`}
            changeNegative={pct < 0}
            width={950}
          >
            <CandleChart candles={BLEED} width={898} height={400} progress={print} openPosition={{index: 0, entry: BLEED_ENTRY}} />

            {/* position readout + the exit nobody presses */}
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, paddingTop: 20, borderTop: `1px solid ${theme.textTertiary}14`}}>
              <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
                <span style={{color: theme.textTertiary, fontFamily: theme.fontFamily, fontSize: 19, fontWeight: theme.weightBody, letterSpacing: theme.trackingWide}}>
                  UNREALISED
                </span>
                <span style={{color: theme.warnRed, fontFamily: theme.fontFamily, fontSize: 50, fontWeight: theme.weightDisplay, letterSpacing: theme.trackingTight}}>
                  {pnl}
                </span>
              </div>
              <div
                style={{
                  padding: '20px 34px',
                  borderRadius: 12,
                  border: `2px solid ${theme.orange}`,
                  background: `${theme.orange}${Math.round(pulse * 30).toString(16).padStart(2, '0')}`,
                  boxShadow: `0 0 ${28 * pulse}px ${theme.orange}${Math.round(pulse * 130).toString(16).padStart(2, '0')}`,
                  color: theme.orange,
                  fontFamily: theme.fontFamily,
                  fontSize: 27,
                  fontWeight: theme.weightDisplay,
                  letterSpacing: '0.06em',
                }}
              >
                CLOSE POSITION
              </div>
            </div>
          </TerminalPanel>
        </Reveal>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------- 3. confirmation bias ----------

const ConfirmationBiasSegment: FC = () => {
  const frame = useCurrentFrame();
  // One continuous scroll for the whole segment.
  const totalH = FEED.length * CARD_H;
  const scroll = interpolate(frame, [0, 150], [FEED_VIEWPORT * 0.55, -(totalH - FEED_VIEWPORT * 0.5)], {
    extrapolateRight: 'clamp',
    easing: EASE_IN_OUT,
  });

  return (
    <AbsoluteFill style={{backgroundColor: theme.ground}}>
      <Sequence from={0} durationInFrames={150}>
        <Loop durationInFrames={243}>
          <Audio src={sfx('Typing.mp3')} volume={0.3} />
        </Loop>
      </Sequence>
      {[22, 58, 94, 128].map((f) => (
        <Sequence key={f} from={f} durationInFrames={12}>
          <Audio src={sfx('Pop.mp3')} volume={0.5} />
        </Sequence>
      ))}

      <Glow y="62%" strength={0.1} />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', gap: 40}}>
        <TrapHeading
          index="2"
          name="Confirmation bias"
          sub="You notice the news and signals that agree with your trade — and scroll straight past the ones that don't."
        />

        <Reveal from={4} duration={18} y={28}>
          <div
            style={{
              width: 900,
              height: FEED_VIEWPORT,
              position: 'relative',
              overflow: 'hidden',
              maskImage: 'linear-gradient(180deg, transparent 0%, #000 16%, #000 84%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, #000 16%, #000 84%, transparent 100%)',
            }}
          >
            <div style={{position: 'absolute', top: 0, left: 0, right: 0, transform: `translateY(${scroll}px)`}}>
              {FEED.map((s, i) => {
                const cardCentre = i * CARD_H + CARD_H / 2 + scroll;
                const dist = Math.abs(cardCentre - FEED_VIEWPORT / 2);
                // Agreeing signals brighten as they cross the middle and keep it.
                const focus = interpolate(dist, [0, 260], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
                const lit = s.agrees;
                return (
                  <div
                    key={i}
                    style={{
                      height: CARD_H - 18,
                      marginBottom: 18,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 22,
                      padding: '0 34px',
                      borderRadius: 16,
                      background: lit ? `${theme.bgCard}` : `${theme.bgAlt}`,
                      border: `1px solid ${lit ? `${theme.orange}${Math.round((0.35 + focus * 0.55) * 255).toString(16).padStart(2, '0')}` : `${theme.textTertiary}0F`}`,
                      opacity: lit ? 1 : 0.22,
                      filter: lit ? 'none' : 'blur(3.5px)',
                      transform: `scale(${lit ? 1 + focus * 0.035 : 0.97})`,
                      boxShadow: lit ? `0 0 ${34 * focus}px ${theme.orange}22` : 'none',
                    }}
                  >
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        background: lit ? theme.orange : theme.textTertiary,
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        color: lit ? theme.textPrimary : theme.textTertiary,
                        fontFamily: theme.fontFamily,
                        fontSize: 38,
                        fontWeight: lit ? theme.weightDisplay : theme.weightBody,
                        letterSpacing: theme.trackingTight,
                      }}
                    >
                      {s.text}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </Reveal>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------- 4. CTA ----------

const CtaSegment: FC = () => {
  const card = useReveal(4, 20);
  return (
    <AbsoluteFill style={{backgroundColor: theme.ground}}>
      <Sequence from={6} durationInFrames={26}>
        <Audio src={sfx('Impact.mp3')} volume={0.8} />
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
            Neura helps you catch the <span style={{color: theme.orange}}>psychology patterns</span> you don&rsquo;t see in yourself
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------- combined ----------

export const MentalTrapsScene: FC = () => (
  <AbsoluteFill style={{backgroundColor: theme.ground}}>
    <Sequence from={0} durationInFrames={90}>
      <HookSegment />
    </Sequence>
    <Sequence from={90} durationInFrames={120}>
      <SunkCostSegment />
    </Sequence>
    <Sequence from={210} durationInFrames={150}>
      <ConfirmationBiasSegment />
    </Sequence>
    <Sequence from={360} durationInFrames={90}>
      <CtaSegment />
    </Sequence>

    <Grain opacity={0.045} />
  </AbsoluteFill>
);

export default MentalTrapsScene;
