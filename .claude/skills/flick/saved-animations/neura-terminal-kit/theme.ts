// Neura brand tokens, distilled from brand-assets/brand-notes.md
export const theme = {
  bg: '#050506',
  bgAlt: '#0B0B0D',
  bgCard: '#15130F',
  bgCardAlt: '#1A1512',
  orange: '#F97316',
  orangeLight: '#FDBA74',
  orangeTintA: '#F6BE93',
  orangeTintB: '#F5945A',
  orangeSoft: '#FFD9B8',
  orangeDeep: '#B85714',
  orangeDeepest: '#8A3A0C',
  orangeWash: '#FFEBD8',
  textPrimary: '#F4F1ED',
  textSecondary: '#EDEAE6',
  textTertiary: '#E9E6E1',
  // Warning red is used strictly for loss/deny states, never as a brand accent.
  warnRed: '#E5484D',
  warnRedDeep: '#7A1F22',
  successGreen: '#3DD68C',
  // Muted up-candle green — terminal-conventional, desaturated so brand orange
  // stays the loudest colour in frame.
  upGreen: '#2FA36B',
  // Dark ground specified for this video.
  ground: '#0A0908',
  fontFamily: '-apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif',
  fontMono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  // Typography taken from the brand system: light-to-medium weights, tight
  // negative tracking on display text, wide positive tracking on small caps.
  // 600 is the approved ceiling for phone legibility.
  weightDisplay: 600,
  weightBody: 500,
  trackingTight: '-0.03em',
  trackingWide: '0.18em',
} as const;
