export const PAGE_SHELL_STYLE: React.CSSProperties = {
  width: '100%',
  maxWidth: 1400,
  margin: '0 auto',
  paddingLeft: 'clamp(12px, 2vw, 24px)',
  paddingRight: 'clamp(12px, 2vw, 24px)',
  boxSizing: 'border-box'
}

export const PANEL_GRID_STYLE: React.CSSProperties = {
  display: 'grid',
  gap: 'clamp(12px, 1.6vw, 20px)',
}

export const BREAKPOINTS = {
  mobile: 640,
  tablet: 1024,
  desktop: 1024,
}

export const TEXT_CLAMP = {
  title: 'clamp(20px, 4vw, 32px)',
  body: 'clamp(12px, 1.2vw, 14px)',
  mono: 'clamp(9px, 0.9vw, 11px)',
}

export const RESPONSIVE_SECTION_GAP = 'clamp(24px, 4vw, 48px)'
