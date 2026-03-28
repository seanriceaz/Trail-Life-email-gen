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
           style="max-width:600px; width:100%; background-color:#ffffff; border-radius:4px;
                  overflow:hidden; box-shadow:0 2px 12px rgba(0,0,0,0.12);">

      ${buildHeaderBlock(subject)}
      ${intro   ? buildIntroBlock(intro)     : ''}
      ${sectionBlocks}
      ${closing ? buildClosingBlock(closing) : ''}
      ${buildFooterBlock()}

    </table>

  </td></tr>
</table>
</body>
</html>`;
}

// ─── Email block builders ─────────────────────────────────────────────────────
// Each function returns an HTML string for one logical row of the email.

/**
 * Dark navy header with the Trail Life logo mark, troop name, and subject line.
 * A gold stripe at the bottom acts as a visual divider.
 */
function buildHeaderBlock(subject) {
  return `
      <!-- HEADER: logo, troop name, subject line -->
      <tr>
        <td style="background-color:${COLORS.navy}; padding:0;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td style="padding:28px 32px 22px;">

                <!-- Logo mark + troop name side by side -->
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="padding-right:14px; vertical-align:middle;">
                      <!-- Red triangle: approximates the Trail Life logo mark -->
                      <div style="width:52px; height:52px; background-color:${COLORS.red};
                                  clip-path:polygon(50% 4%, 97% 92%, 3% 92%);
                                  display:inline-block;"></div>
                    </td>
                    <td style="vertical-align:middle;">
                      <div style="font-family:'Open Sans',Arial,sans-serif; font-size:11px;
                                  font-weight:700; letter-spacing:2px; text-transform:uppercase;
                                  color:${COLORS.gold}; margin-bottom:4px;">Trail Life USA</div>
                      <div style="font-family:'Open Sans',Arial,sans-serif; font-size:22px;
                                  font-weight:700; color:#ffffff; line-height:1.2;">
                        Troop ZZ-1234
                      </div>
                    </td>
                  </tr>
                </table>

                <!-- Subject line, separated by a subtle rule -->
                <div style="font-family:'Open Sans',Arial,sans-serif; font-size:14px;
                            color:rgba(255,255,255,0.65); margin-top:14px; padding-top:14px;
                            border-top:1px solid rgba(255,255,255,0.15);">
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
        <td style="padding:24px 32px 28px; border-top:1px solid ${COLORS.borderLight};">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            ${textToTableRows(closing)}
          </table>
        </td>
      </tr>`;
}

/**
 * Dark navy footer with troop name, tagline, and a link to traillifeusa.com.
 * The brown stripe at the top mirrors the header's gold stripe as a bookend.
 */
function buildFooterBlock() {
  return `
      <!-- FOOTER: troop name, tagline, website link -->
      <tr>
        <td style="background-color:${COLORS.navy}; padding:0;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <!-- Brown accent stripe (echoes the section header color) -->
            <tr><td style="background-color:${COLORS.brown}; height:4px;"></td></tr>
            <tr>
              <td style="padding:20px 32px; text-align:center;">
                <div style="font-family:'Open Sans',Arial,sans-serif; font-size:12px;
                            font-weight:700; color:${COLORS.gold}; letter-spacing:1px;
                            text-transform:uppercase; margin-bottom:4px;">
                  Trail Life USA · Troop ZZ-1234
                </div>
                <div style="font-family:'Open Sans',Arial,sans-serif; font-size:11px;
                            color:rgba(255,255,255,0.5); line-height:1.6;">
                  You are receiving this email as a member of Troop ZZ-1234.
                </div>
                <div style="font-family:'Open Sans',Arial,sans-serif; font-size:11px;
                            color:rgba(255,255,255,0.5); margin-top:4px;">
                  <a href="https://traillifeusa.com"
                     style="color:${COLORS.gold}; text-decoration:none;">traillifeusa.com</a>
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
                 style="margin:18px 0; border-radius:3px; overflow:hidden;
                        border:1px solid ${COLORS.borderLight};">
            ${buildSectionHeader(section.title)}
            ${buildSectionBody(section)}
          </table>
        </td>
      </tr>`;
}

/**
 * Brown header bar with the section title in white, all-caps.
 */
function buildSectionHeader(title) {
  return `
          <tr>
            <td style="background-color:${COLORS.brown}; padding:10px 16px;">
              <span style="font-family:'Open Sans',Arial,sans-serif; font-size:14px;
                           font-weight:700; color:#ffffff; letter-spacing:0.4px;
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
 *   1. Detail line  — light tan box with gold left border (date / time / location)
 *   2. Description  — plain paragraph text
 *   3. Tag badges   — colored pills for program divisions
 */
function buildSectionBody(section) {
  // ── Detail callout ────────────────────────────────────────────────────────
  const detailHtml = section.detail ? `
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
                 style="margin:0 0 12px;">
            <tr>
              <td style="padding:10px 14px; background-color:${COLORS.tanLight};
                         border-left:3px solid ${COLORS.gold}; border-radius:2px;
                         font-family:'Open Sans',Arial,sans-serif; font-size:13px;
                         color:${COLORS.brown}; font-weight:700;">
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
 *
 * Why table rows instead of <br> tags? Some email clients collapse
 * multiple <br>s or apply inconsistent line-height. Rows give us
 * predictable spacing across clients.
 *
 * @param {string} text    - Raw multi-line text from a textarea
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
                ${esc(line)}
              </td>
            </tr>`)
    .join('');
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
