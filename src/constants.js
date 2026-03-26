/**
 * constants.js
 * ------------
 * Central source of truth for brand colors and program tag definitions.
 * Imported by emailBuilder.js (for inline email styles) and referenced
 * in index.html / style.css (for the app UI).
 *
 * Color reference: Trail Life USA 2024 Brand Style Guide
 *   Navy  (#1C3557): headers, footer, section nav
 *   Brown (#835D32): PMS 7575 C — accent bars, section headers, labels
 *   Red   (#CC2029): logo, primary CTA
 *   Gold  (#C8922A): accent stripes, callout borders, footer text
 */

// ─── Email output colors (used as inline styles) ──────────────────────────────

export const COLORS = {
  navy:        '#1C3557',
  brown:       '#835D32',
  red:         '#CC2029',
  gold:        '#C8922A',
  tanLight:    '#F5EDD6',  // light tan background for detail callouts
  white:       '#FFFFFF',
  textDark:    '#1a1a1a',
  textMuted:   '#555555',
  borderLight: '#DDD5C8',
};

// ─── Program division tags ────────────────────────────────────────────────────

/**
 * The three Trail Life program divisions.
 *   Woodlands Trails — ages 5–10
 *   Navigators       — ages 11–13
 *   Adventurers      — ages 14–17
 *
 * Each tag object drives both the editor UI (cssClass) and the email
 * output (bg / text colors on the badge pills).
 */
export const TAGS = [
  { value: 'Woodlands Trails', cssClass: 'tag-woodland',    bg: '#4A7A3C', text: '#fff' },
  { value: 'Navigators',       cssClass: 'tag-navigators',  bg: '#2B5FA1', text: '#fff' },
  { value: 'Adventurers',      cssClass: 'tag-adventurers', bg: '#C85A1F', text: '#fff' },
];
