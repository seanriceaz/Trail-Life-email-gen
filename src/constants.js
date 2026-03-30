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
  navy:             '#1C3557',  // kept for UI; not used in email header/footer
  brown:            '#835D32',
  red:              '#CC2029',
  gold:             '#C8922A',
  sage:             '#4A6658',  // dusty green — email header & footer background
  white:            '#FFFFFF',
  textDark:         '#1a1a1a',
  textMuted:        '#555555',
  borderLight:      '#DDD5C8',
  sectionHeaderBg:  '#EDE7DE',  // light warm tan for section header bg; brown text = 4.77:1 ✓
  // Text colors designed for use on the sage (#4A6658) background:
  headerSubject:    '#DAEEE7',  // muted light sage — subject line & "Trail Life USA" label = 4.92:1 ✓
  footerMuted:      '#DAEEE7',  // muted light sage — footer disclaimer text = 4.92:1 ✓
};

// ─── Program division tags ────────────────────────────────────────────────────

/**
 * The two Trail Life program tag groups.
 *   Woodland Trails        — ages 5–10
 *   Navigators & Adventurers — ages 11–17
 *
 * Each tag object drives both the editor UI (cssClass) and the email
 * output (bg / text colors on the badge pills).
 */
export const TAGS = [
  { value: 'Woodland Trails',          cssClass: 'tag-woodland',  bg: '#4A7A3C', text: '#fff' },
  { value: 'Navigators & Adventurers', cssClass: 'tag-nav-adv',   bg: '#2B5FA1', text: '#fff' },
];
