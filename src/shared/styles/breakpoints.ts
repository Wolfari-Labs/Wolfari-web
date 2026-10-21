// Web responsive policy, not exported Figma variables. See the Phase 2 contract.
export const breakpoints = {
  mobile: 768,
  narrow: 360,
  compactHeader: 1100,
  shortWorkspace: 950,
} as const;
export const desktopMediaQuery = `(min-width: ${breakpoints.mobile + 1}px)`;
