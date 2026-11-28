import compass from '../assets/figma/shell/7eb64.svg';
import compassActive from '../assets/figma/shell/0fee6.svg';
import map from '../assets/figma/shell/1cac9.svg';
import mapActive from '../assets/figma/shell/1d410.svg';
import calendar from '../assets/figma/shell/819a9.svg';
import calendarActive from '../assets/figma/shell/b027b.svg';
import dress from '../assets/figma/shell/3902a.svg';
import dressActive from '../assets/figma/shell/1ec77.svg';
import luggage from '../assets/figma/shell/80bbf.svg';
import luggageActive from '../assets/figma/shell/cf616.svg';
import members from '../assets/figma/shell/42dd9.svg';
import membersActive from '../assets/figma/shell/01131.svg';
import fund from '../assets/figma/shell/db9e0.svg';
import fundActive from '../assets/figma/shell/26d0a.svg';
import fare from '../assets/figma/shell/95054.svg';
import fareActive from '../assets/figma/shell/ce536.svg';
import settings from '../assets/figma/shell/a7fab.svg';
import settingsActive from '../assets/figma/shell/08a3f.svg';
import homeNav from '../assets/figma/shell/28fb1.svg';
import homeNavActive from '../assets/figma/shell/69eaf.svg';
import tripsNav from '../assets/figma/shell/c0594.svg';
import tripsNavActive from '../assets/figma/shell/0d482.svg';
import planNav from '../assets/figma/shell/7b471.svg';
import planNavActive from '../assets/figma/shell/8e2ae.svg';

const tripIcons = {
  overview: [compass, compassActive],
  map: [map, mapActive],
  plan: [calendar, calendarActive],
  dress: [dress, dressActive],
  packing: [luggage, luggageActive],
  members: [members, membersActive],
  fund: [fund, fundActive],
  fare: [fare, fareActive],
  settings: [settings, settingsActive],
} as const;
const topIcons = {
  home: [homeNav, homeNavActive],
  trips: [tripsNav, tripsNavActive],
  schedule: [planNav, planNavActive],
} as const;

/** Original Figma exports, including each selected-colour variant. Intrinsic SVG geometry is
 * preserved; no replacement icon set, recolouring filter or redrawn paths. */
export function FigmaTripIcon({
  section,
  active = false,
}: {
  section: keyof typeof tripIcons;
  active?: boolean;
}) {
  return <img src={tripIcons[section][active ? 1 : 0]} alt="" aria-hidden="true" />;
}

export function FigmaTopIcon({
  section,
  active = false,
}: {
  section: keyof typeof topIcons;
  active?: boolean;
}) {
  return <img src={topIcons[section][active ? 1 : 0]} alt="" aria-hidden="true" />;
}
