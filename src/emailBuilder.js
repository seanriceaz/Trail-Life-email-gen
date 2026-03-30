/**
 * emailBuilder.js
 * ---------------
 * Generates the full HTML email document from the current editor state.
 *
 * Output is a standalone, table-based HTML file compatible with major
 * email clients (Gmail, Outlook, Apple Mail). All styles are inlined
 * because most email clients strip or ignore <style> blocks.
 *
 * Public API:
 *   buildEmailHtml() → string   (complete HTML document)
 *
 * Internal structure:
 *   buildEmailHtml()
 *     └─ buildHeaderBlock()
 *     └─ buildIntroBlock()
 *     └─ buildSectionBlock()  (one per section)
 *           └─ buildSectionHeader()
 *           └─ buildSectionBody()
 *     └─ buildClosingBlock()
 *     └─ buildFooterBlock()
 */

import { COLORS, TAGS } from './constants.js';
import { getAllSectionData } from './sectionManager.js';

// Build a lookup map from tag value → badge colors for quick access in loops.
// e.g. TAG_COLOR_MAP['Navigators & Adventurers'] → { bg: '#2B5FA1', text: '#fff' }
const TAG_COLOR_MAP = Object.fromEntries(
  TAGS.map(t => [t.value, { bg: t.bg, text: t.text }])
);

// ─── Public ───────────────────────────────────────────────────────────────────

/**
 * Reads the current form state and returns a complete HTML email string.
 * Safe to call on every keystroke — it's pure (no side effects).
 *
 * @returns {string} Full HTML document ready to paste into an email client.
 */
export function buildEmailHtml() {
  const troop   = document.getElementById('troop-number').value.trim();
  const subject = document.getElementById('email-subject').value.trim();
  const intro   = document.getElementById('email-intro').value.trim();
  const closing = document.getElementById('email-closing').value.trim();

  const sectionBlocks = getAllSectionData()
    .map(buildSectionBlock)
    .filter(Boolean)   // skip empty sections
    .join('\n');

  // The outermost table provides the grey background seen in email clients
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(subject)}</title>
</head>
<body style="margin:0; padding:0; background-color:#e8e3dc;">

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
       style="background-color:#e8e3dc;">
  <tr><td align="center" style="padding:24px 12px;">

    <!-- 600px email container -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600"
           style="max-width:600px; width:100%; background-color:#ffffff; border-radius:8px;
                  overflow:hidden; box-shadow:0 2px 16px rgba(0,0,0,0.10);">

      ${buildHeaderBlock(subject, troop)}
      ${intro   ? buildIntroBlock(intro)     : ''}
      ${sectionBlocks}
      ${closing ? buildClosingBlock(closing) : ''}
      ${buildFooterBlock(troop)}

    </table>

  </td></tr>
</table>
</body>
</html>`;
}

// ─── Email block builders ─────────────────────────────────────────────────────
// Each function returns an HTML string for one logical row of the email.

/**
 * Sage green header with two-line typographic treatment:
 *   Line 1 (small)  — "Trail Life Troop [number]"  — eyebrow/label
 *   Line 2 (large)  — subject line                 — primary heading
 *
 * Text contrast on sage (#4A6658):
 *   Eyebrow label — COLORS.headerSubject (#DAEEE7) = 4.92:1 ✓
 *   Subject line  — white (#FFFFFF)                = 5.94:1 ✓
 */
function buildHeaderBlock(subject, troop) {
  const eyebrow = troop ? `Trail Life Troop ${esc(troop)}` : 'Trail Life';

  return `
      <!-- HEADER: troop label + subject line as primary heading -->
      <tr>
        <td style="background-color:${COLORS.sage}; padding:0;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td style="padding:28px 32px 24px;">

                <!-- Eyebrow: "Trail Life Troop XX" -->
                <div style="font-family:'Open Sans',Arial,sans-serif; font-size:13px;
                            font-weight:600; letter-spacing:0.5px;
                            color:${COLORS.headerSubject}; margin-bottom:10px;">
                  ${eyebrow}
                </div>

                <!-- Primary heading: subject line -->
                <div style="font-family:'Open Sans',Arial,sans-serif; font-size:26px;
                            font-weight:700; color:#ffffff; line-height:1.25;">
                  ${esc(subject)}
                </div>

              </td>
            </tr>

            <!-- Gold accent stripe -->
            <tr><td style="background-color:${COLORS.gold}; height:5px;"></td></tr>
          </table>
        </td>
      </tr>`;
}

/**
 * Intro / greeting block. Each line of the textarea becomes a separate
 * table row to ensure consistent line-height across email clients.
 */
function buildIntroBlock(intro) {
  return `
      <!-- INTRO: greeting / opening message -->
      <tr>
        <td style="padding:28px 32px 8px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            ${textToTableRows(intro)}
          </table>
        </td>
      </tr>`;
}

/**
 * Closing message block (signature, sign-off, etc.).
 * Visually separated from sections by a thin border above it.
 */
function buildClosingBlock(closing) {
  return `
      <!-- CLOSING: sign-off / signature -->
      <tr>
        <td style="padding:24px 32px 28px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            ${textToTableRows(closing)}
          </table>
        </td>
      </tr>`;
}

/**
 * Sage footer matching the header, with troop name, disclaimer, and a link.
 * The brown stripe at the top mirrors the header's gold stripe as a bookend.
 *
 * Text contrast on sage (#4A6658):
 *   Troop line  — white (#FFFFFF)                 = 5.94:1 ✓
 *   Footer text — COLORS.footerMuted (#DAEEE7)    = 4.92:1 ✓
 *   Link        — white (#FFFFFF)                 = 5.94:1 ✓
 *
 * @param {string} troop - Troop number entered by the user (may be empty).
 */
function buildFooterBlock(troop) {
  const troopLine = troop ? `Trail Life USA · Troop ${esc(troop)}` : 'Trail Life USA';
  const memberLine = troop
    ? `You are receiving this email as a member of Troop ${esc(troop)}.`
    : 'You are receiving this email as a member of a Trail Life troop.';

  return `
      <!-- FOOTER: troop name, tagline, website link -->
      <tr>
        <td style="background-color:${COLORS.sage}; padding:0;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <!-- Brown accent stripe (echoes the section header color) -->
            <tr><td style="background-color:${COLORS.brown}; height:4px;"></td></tr>
            <tr>
              <td style="padding:20px 32px; text-align:center;">
                <div style="font-family:'Open Sans',Arial,sans-serif; font-size:12px;
                            font-weight:700; color:#ffffff; letter-spacing:1px;
                            text-transform:uppercase; margin-bottom:4px;">
                  ${troopLine}
                </div>
                <div style="font-family:'Open Sans',Arial,sans-serif; font-size:11px;
                            color:${COLORS.footerMuted}; line-height:1.6;">
                  ${memberLine}
                </div>
                <div style="font-family:'Open Sans',Arial,sans-serif; font-size:11px;
                            color:${COLORS.footerMuted}; margin-top:4px;">
                  <a href="https://traillifeusa.com"
                     style="color:#ffffff; text-decoration:underline;">traillifeusa.com</a>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>`;
}

/**
 * Builds the HTML block for a single content section.
 * Returns an empty string if all three fields are empty (section is a blank stub).
 *
 * @param {{ title: string, desc: string, detail: string, tags: string[] }} section
 * @returns {string} HTML string, or '' if section is empty.
 */
function buildSectionBlock(section) {
  if (!section.title && !section.desc && !section.detail) return '';

  return `
      <!-- SECTION: ${esc(section.title || '(untitled)')} -->
      <tr>
        <td style="padding:0 32px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
                 style="margin:12px 0; border-radius:6px; overflow:hidden;
                        border:1px solid ${COLORS.borderLight};">
            ${buildSectionHeader(section.title)}
            ${buildSectionBody(section)}
          </table>
        </td>
      </tr>`;
}

/**
 * Light warm-tan header row with the section title in brown.
 * Avoids a heavy reversed bar; still clearly separates header from body.
 * Contrast: brown (#835D32) on sectionHeaderBg (#EDE7DE) = 4.77:1 ✓
 */
function buildSectionHeader(title) {
  return `
          <tr>
            <td style="background-color:${COLORS.sectionHeaderBg}; padding:9px 16px;
                       border-bottom:1px solid ${COLORS.borderLight};">
              <span style="font-family:'Open Sans',Arial,sans-serif; font-size:12px;
                           font-weight:700; color:${COLORS.brown}; letter-spacing:0.8px;
                           text-transform:uppercase;">
                ${esc(title)}
              </span>
            </td>
          </tr>`;
}

/**
 * Section body: detail callout (if any), description text, and tag badges.
 *
 * Layout order:
 *   1. Detail line  — subtle full-width muted text with a light bottom border
 *   2. Description  — plain paragraph text
 *   3. Tag badges   — colored pills for program divisions
 */
function buildSectionBody(section) {
  // ── Detail callout ────────────────────────────────────────────────────────
  const detailHtml = section.detail ? `
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
                 style="margin:0 0 12px;">
            <tr>
              <td style="padding:6px 0 8px; border-bottom:1px solid ${COLORS.borderLight};
                         font-family:'Open Sans',Arial,sans-serif; font-size:12px;
                         color:${COLORS.textMuted}; letter-spacing:0.3px;">
                ${esc(section.detail)}
              </td>
            </tr>
          </table>` : '';

  // ── Description ───────────────────────────────────────────────────────────
  const descHtml = section.desc ? `
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
                 style="margin-bottom:4px;">
            ${textToTableRows(section.desc, '0 0 8px')}
          </table>` : '';

  // ── Tag badges ────────────────────────────────────────────────────────────
  const tagsHtml = section.tags.length ? `
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"
                 style="margin-top:10px;">
            <tr>
              ${section.tags.map(tag => {
                const c = TAG_COLOR_MAP[tag] ?? { bg: COLORS.brown, text: '#fff' };
                return `<td style="padding-right:6px;">
                  <span style="display:inline-block; padding:3px 10px;
                               background-color:${c.bg}; color:${c.text};
                               font-family:'Open Sans',Arial,sans-serif;
                               font-size:10px; font-weight:700; letter-spacing:1px;
                               text-transform:uppercase; border-radius:30px;">
                    ${esc(tag)}
                  </span>
                </td>`;
              }).join('')}
            </tr>
          </table>` : '';

  return `
          <tr>
            <td style="padding:16px 16px 12px; background-color:#ffffff;">
              ${detailHtml}
              ${descHtml}
              ${tagsHtml}
            </td>
          </tr>`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Converts a multi-line string into a series of <tr><td> rows.
 * Each non-empty line is passed through parseInlineMarkdown before insertion.
 *
 * Why table rows instead of <br> tags? Some email clients collapse
 * multiple <br>s or apply inconsistent line-height. Rows give us
 * predictable spacing across clients.
 *
 * @param {string} text    - Raw multi-line text (may contain Markdown)
 * @param {string} padding - CSS padding value for each <td> (default: bottom spacing)
 * @returns {string} HTML string of <tr> elements
 */
function textToTableRows(text, padding = '0 0 10px') {
  return text
    .split('\n')
    .filter(line => line.trim())
    .map(line => `
            <tr>
              <td style="padding:${padding}; font-family:'Open Sans',Arial,sans-serif;
                         font-size:15px; color:${COLORS.textDark}; line-height:1.6;">
                ${parseInlineMarkdown(line)}
              </td>
            </tr>`)
    .join('');
}

/**
 * Parses a small subset of Markdown in a single line of text and returns HTML.
 * Supported syntax:
 *   **text**       → bold
 *   *text*         → italic
 *   _text_         → underline
 *   [label](url)   → hyperlink (navy, underlined)
 *
 * Text between matches is HTML-escaped. Match contents are also escaped
 * before being wrapped in tags, preventing injection from user input.
 *
 * @param {string} text - One line of raw user text.
 * @returns {string} HTML string safe for insertion into the email.
 */
function parseInlineMarkdown(text) {
  const rules = [
    // Links first — they can contain other punctuation inside brackets
    [ /\[([^\]\n]+)\]\(([^)\n]+)\)/,
      (_, label, href) =>
        `<a href="${escAttr(href)}" style="color:${COLORS.navy};text-decoration:underline;">${esc(label)}</a>` ],
    [ /\*\*([^*\n]+)\*\*/,  (_, t) => `<strong>${esc(t)}</strong>` ],
    [ /\*([^*\n]+)\*/,      (_, t) => `<em>${esc(t)}</em>` ],
    [ /_([^_\n]+)_/,        (_, t) => `<span style="text-decoration:underline;">${esc(t)}</span>` ],
  ];

  let out  = '';
  let rest = text;

  while (rest.length) {
    // Find the earliest-occurring match across all rules
    let best = null;
    for (const [re, fn] of rules) {
      const m = rest.match(re);
      if (m && (best === null || m.index < best.m.index)) {
        best = { m, fn };
      }
    }

    if (!best) {
      out += esc(rest);   // no more markdown — escape and finish
      break;
    }

    out  += esc(rest.slice(0, best.m.index));   // text before the match
    out  += best.fn(...best.m);                 // rendered HTML for the match
    rest  = rest.slice(best.m.index + best.m[0].length);
  }

  return out;
}

/**
 * Escapes a string for safe insertion as HTML text content or attribute value.
 * Prevents accidental tag injection from user-typed content.
 *
 * @param {string} str
 * @returns {string}
 */
function esc(str) {
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;');
}

/** Escapes a string for safe use inside an HTML attribute value (e.g. href). */
function escAttr(str) {
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/"/g,  '&quot;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;');
}
