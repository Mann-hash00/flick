import type {FC, ReactNode} from 'react';
import {interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {theme} from './theme';

// Shared punch-in helper: hard scale/opacity entrance used for every
// caption line across segments. Not a scene itself.
export const usePunchIn = (startFrame: number, durationInFrames = 14) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const progress = spring({frame: frame - startFrame, fps, config: {damping: 14, stiffness: 180, mass: 0.6}, durationInFrames});
  const opacity = interpolate(frame, [startFrame, startFrame + 4], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const scale = interpolate(progress, [0, 1], [0.7, 1]);
  return {opacity, scale, active: frame >= startFrame};
};

export const PunchInText: FC<{
  startFrame: number;
  children: ReactNode;
  color?: string;
  fontSize?: number;
  fontWeight?: number;
  letterSpacing?: string;
  style?: React.CSSProperties;
}> = ({startFrame, children, color = theme.textPrimary, fontSize = 64, fontWeight = theme.weightDisplay, letterSpacing = theme.trackingTight, style}) => {
  const {opacity, scale, active} = usePunchIn(startFrame);
  if (!active) return null;
  return (
    <div
      style={{
        opacity,
        transform: `scale(${scale})`,
        color,
        fontFamily: theme.fontFamily,
        fontSize,
        fontWeight,
        letterSpacing,
        textAlign: 'center',
        lineHeight: 1.15,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// Small wide-tracked caps label, matching the brand's label treatment.
export const CapsLabel: FC<{children: ReactNode; color?: string; fontSize?: number; style?: React.CSSProperties}> = ({
  children,
  color = theme.textTertiary,
  fontSize = 26,
  style,
}) => (
  <div
    style={{
      color,
      fontFamily: theme.fontFamily,
      fontSize,
      fontWeight: theme.weightBody,
      letterSpacing: theme.trackingWide,
      textTransform: 'uppercase',
      ...style,
    }}
  >
    {children}
  </div>
);

export const sfx = (name: string) => staticFile(`sounds/${name}`);
