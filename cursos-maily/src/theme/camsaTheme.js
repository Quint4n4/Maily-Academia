/**
 * Corporativo CAMSA — Black & Gold Executive Theme
 * Use these tokens anywhere the section is 'corporativo-camsa'.
 */

export const CAMSA = {
  // Backgrounds
  bg:          '#0e0e0c',
  bgSurface:   '#141311',
  bgCard:      '#1f1f1c',
  bgCard2:     '#20201d',
  bgSidebar:   '#0e0e0c',

  // Gold accents
  gold:        '#e6c364',
  goldDim:     '#c9a84c',
  goldBorder:  'rgba(201,168,76,0.2)',
  goldGlow:    'rgba(230,195,100,0.12)',

  // Text
  textPrimary:  '#f5f0e8',
  textMuted:    '#d0c5b2',
  textDim:      '#8a8578',

  // Borders
  border:      'rgba(77,70,55,0.2)',
  borderHover: 'rgba(230,195,100,0.35)',
};

/** Returns inline style overrides for the root page wrapper */
export const camsaPageStyle = {
  background: CAMSA.bg,
  color:      CAMSA.textPrimary,
  minHeight:  '100vh',
};

/** Tailwind-friendly className string for a dark CAMSA card */
export const camsaCard =
  'rounded-xl border bg-[#1f1f1c] border-[rgba(77,70,55,0.3)] hover:border-[rgba(230,195,100,0.35)] transition-colors';

/** Check if current section is CAMSA */
export const isCamsa = (section) => section === 'corporativo-camsa';
