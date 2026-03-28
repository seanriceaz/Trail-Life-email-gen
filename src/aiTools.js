/**
 * aiTools.js
 * ----------
 * Two AI-assisted workflow features:
 *
 *   1. Prompt Generator — assembles a prompt users paste into any LLM (ChatGPT,
 *      Claude, Grok, etc.) to generate newsletter content in YAML format.
 *
 *   2. YAML Import — parses the LLM's YAML output and populates the builder
 *      (newsletter settings + all section cards).
 *
 * The shared YAML schema is documented in YAML_FORMAT_GUIDE below.
 * Both features reference it so the prompt and the parser stay in sync.
 */

import yaml from 'js-yaml';
import { TAGS } from './constants.js';
import { addSection } from './sectionManager.js';

// ─── YAML schema documentation (embedded in the AI prompt) ───────────────────
//
// subject:  string   — email subject line
// intro:    string   — opening greeting / body text (multiline ok)
// closing:  string   — sign-off / signature (multiline ok)
// sections: array    — one entry per newsletter section
//   - title:       string   — section heading (required)
//     description: string   — body text (required, multiline ok)
//     detail:      string   — one-liner: date · time · location (optional)
//     tags:        string[] — subset of valid tag values below (optional)
//
// Valid tag values (must match exactly):
//   "Woodland Trails"          — boys ages 5–10
//   "Navigators & Adventurers" — boys ages 11–17

// ─── AI prompt template ───────────────────────────────────────────────────────

/**
 * Static instructions portion of the AI prompt.
 * Teaches the LLM the YAML schema and the rules for Trail Life content.
 * The user's context is appended below the divider at the end.
 */
const PROMPT_INSTRUCTIONS = `\
You are helping create a newsletter email for a Trail Life troop.
Trail Life USA is a Christ-centered outdoor adventure program for boys ages 5–17,
organized into program divisions by age.

Generate the newsletter as YAML using this exact format:

---
subject: "Your email subject line"

intro: |
  Your opening greeting here.
  Each non-blank line becomes a separate paragraph in the email.

closing: |
  Your sign-off here.
  In His Service,
  Troop Leadership

sections:
  - title: Section Title
    description: |
      Body text for this section.
      Each non-blank line becomes a paragraph. Keep it encouraging and warm.
    detail: "Day, Month Date · Time · Location"  # optional — omit if not applicable
    tags: [Woodland Trails, Navigators & Adventurers]  # optional — see valid values below

  - title: Another Section
    description: A shorter announcement can be a single line.
    tags: [Navigators & Adventurers]
---

Valid tag values — use exactly these strings, include only relevant age groups:
  Woodland Trails          (boys ages 5–10)
  Navigators & Adventurers (boys ages 11–17)

Rules:
  - Output ONLY the YAML. No explanation, no extra text, no markdown code fences.
  - Every section must have at least a title and a description.
  - "detail" is optional — only include it for events with a specific date/time/location.
  - "tags" is optional — omit it for content that applies to all members.
  - Write in an encouraging, Christ-centered tone appropriate for a family newsletter.
  - Aim for 2–5 sections depending on how much context is provided.

════════════════════════════════════════════════════════════════════
Here is the context for this newsletter. Use it to write the sections:
════════════════════════════════════════════════════════════════════

`;

/**
 * Returns the full AI prompt string, with the user's context appended.
 * If no context is provided, a labeled placeholder is used instead.
 *
 * @param {string} userContext - Free-form notes from the user.
 * @returns {string}
 */
export function buildPrompt(userContext) {
  const context = userContext.trim()
    || '(Add your context here — upcoming events with dates/times/locations,\n'
     + 'recaps of past events, Bible verses, quotes, prayer requests, announcements, etc.)';

  return PROMPT_INSTRUCTIONS + context;
}

// ─── YAML import ──────────────────────────────────────────────────────────────

/**
 * Parses a YAML string and populates the newsletter builder with its content.
 *
 * Newsletter-level fields (subject, intro, closing) are only overwritten when
 * those keys are actually present in the YAML — so you can paste section-only
 * output without clearing your existing header text.
 *
 * All existing section cards are replaced with the sections from the YAML.
 *
 * Accepted field names are intentionally lenient — common variants are tried
 * so minor LLM formatting differences still work.
 *
 * @param {string} yamlString - Raw YAML text (``` fences stripped automatically).
 * @throws {Error} If the YAML is structurally invalid or not a mapping.
 */
export function importYaml(yamlString) {
  const cleaned = stripCodeFences(yamlString);
  const data    = yaml.load(cleaned);

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('The pasted text does not appear to be valid YAML. Expected a mapping at the top level.');
  }

  // ── Newsletter-level fields (only set when the key is present) ─────────────
  // This allows partial imports — e.g. pasting only a `sections:` block
  // won't wipe out a subject line the user already typed.
  if ('subject' in data) {
    document.getElementById('email-subject').value = String(data.subject ?? '');
  }
  if ('intro' in data) {
    document.getElementById('email-intro').value = multilineToString(data.intro);
  }
  if ('closing' in data) {
    document.getElementById('email-closing').value = multilineToString(data.closing);
  }

  // ── Sections ───────────────────────────────────────────────────────────────
  const rawSections = data.sections ?? data.section ?? null;

  if (rawSections === null) return; // no sections key — header-only import, done

  if (!Array.isArray(rawSections)) {
    throw new Error('"sections" must be a YAML list (each item starting with "- title: …").');
  }

  // Remove all existing section cards before importing the new ones
  document.querySelectorAll('.section-card').forEach(card => card.remove());

  for (const item of rawSections) {
    if (!item || typeof item !== 'object') continue;

    const title  = String(item.title       ?? item.heading ?? '').trim();
    const desc   = multilineToString(item.description ?? item.desc ?? item.body ?? '');
    const detail = normalizeDetail(item.detail ?? item.details ?? item.when ?? '');
    const tags   = normalizeTags(item.tags ?? item.tag ?? []);

    // Skip blank stubs (LLMs sometimes emit empty list entries)
    if (!title && !desc && !detail) continue;

    addSection(title, desc, detail, tags);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Strips optional ``` or ```yaml code fences that some LLMs wrap their output in,
 * even when instructed not to.
 *
 * @param {string} str
 * @returns {string}
 */
function stripCodeFences(str) {
  return str
    .replace(/^```(?:yaml)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();
}

/**
 * Normalizes the tags value from the YAML.
 * Handles: array of strings, a single string, or missing/null.
 *
 * Matching is case-insensitive so LLM output like "navigators & adventurers" or
 * "WOODLAND TRAILS" still resolves to the correct canonical value.
 * Unknown values that don't fuzzy-match any valid tag are silently dropped.
 *
 * @param {string|string[]|null} raw
 * @returns {string[]}  Canonical tag strings ready to match checkbox values.
 */
function normalizeTags(raw) {
  const VALID = TAGS.map(t => t.value); // ['Woodland Trails', 'Navigators & Adventurers']

  const candidates = Array.isArray(raw)       ? raw
                   : typeof raw === 'string'  ? [raw]
                   : [];

  return candidates
    .map(t => String(t).trim())
    .map(t => VALID.find(v => v.toLowerCase() === t.toLowerCase()) ?? null)
    .filter(Boolean);
}

/**
 * Normalizes a detail field value.
 * The detail field is a single-line input, but LLMs sometimes use a YAML block
 * scalar (|) producing a multi-line string. Join those lines with " · " so the
 * content is preserved without breaking the single-line field.
 *
 * @param {string|null} raw
 * @returns {string}
 */
function normalizeDetail(raw) {
  return String(raw ?? '')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .join(' · ');
}

/**
 * js-yaml parses YAML block scalars (the `|` style) as strings with a trailing
 * newline. Strip the trailing newline so text fields don't have extra blank space.
 *
 * @param {string|null} value
 * @returns {string}
 */
function multilineToString(value) {
  return String(value ?? '').replace(/\n$/, '');
}
