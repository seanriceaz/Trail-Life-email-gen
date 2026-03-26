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
//   "Woodlands Trails"  — boys ages 5–10
//   "Navigators"        — boys ages 11–13
//   "Adventurers"       — boys ages 14–17

// ─── AI prompt template ───────────────────────────────────────────────────────

/**
 * Static instructions portion of the AI prompt.
 * Teaches the LLM the YAML schema and the rules for Trail Life content.
 * The user's context is appended below the divider at the end.
 */
const PROMPT_INSTRUCTIONS = `\
You are helping create a newsletter email for Trail Life Troop PA-0002.
Trail Life USA is a Christ-centered outdoor adventure program for boys ages 5–17,
organized into three program divisions by age.

Generate the newsletter as YAML using this exact format:

---
subject: "Your email subject line"

intro: |
  Your opening greeting here.
  Each non-blank line becomes a separate paragraph in the email.

closing: |
  Your sign-off here.
  In His Service,
  Troop PA-0002 Leadership

sections:
  - title: Section Title
    description: |
      Body text for this section.
      Each non-blank line becomes a paragraph. Keep it encouraging and warm.
    detail: "Day, Month Date · Time · Location"  # optional — omit if not applicable
    tags: [Woodlands Trails, Navigators, Adventurers]  # optional — see valid values below

  - title: Another Section
    description: A shorter announcement can be a single line.
    tags: [Navigators]
---

Valid tag values — use exactly these strings, include only relevant age groups:
  Woodlands Trails  (boys ages 5–10)
  Navigators        (boys ages 11–13)
  Adventurers       (boys ages 14–17)

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
 * Clears all existing sections first, then adds the sections from the YAML.
 *
 * Accepted field names are intentionally lenient — both snake_case and
 * camelCase variants are tried so minor LLM formatting variations still work.
 *
 * @param {string} yamlString - Raw YAML text (may include ``` fences — stripped automatically).
 * @throws {Error} If the YAML is structurally invalid or missing required fields.
 */
export function importYaml(yamlString) {
  const cleaned = stripCodeFences(yamlString);
  const data    = yaml.load(cleaned);

  if (!data || typeof data !== 'object') {
    throw new Error('The pasted text does not appear to be valid YAML.');
  }

  // ── Newsletter-level fields ────────────────────────────────────────────────
  const subject = data.subject ?? '';
  const intro   = data.intro   ?? '';
  const closing = data.closing ?? '';

  document.getElementById('email-subject').value = subject;
  document.getElementById('email-intro').value   = intro.replace(/\n$/, '');
  document.getElementById('email-closing').value = closing.replace(/\n$/, '');

  // ── Sections ───────────────────────────────────────────────────────────────
  const rawSections = data.sections ?? data.section ?? [];

  if (!Array.isArray(rawSections)) {
    throw new Error('Expected "sections" to be a list of items.');
  }

  // Remove all existing section cards before importing
  document.querySelectorAll('.section-card').forEach(card => card.remove());

  for (const item of rawSections) {
    const title  = item.title       ?? item.heading     ?? '';
    const desc   = item.description ?? item.desc        ?? item.body ?? '';
    const detail = item.detail      ?? item.details     ?? item.when ?? '';
    const tags   = normalizeTags(item.tags ?? item.tag  ?? []);

    // Silently skip entirely empty entries (LLMs sometimes emit blank list items)
    if (!title && !desc && !detail) continue;

    addSection(title, multilineToString(desc), detail, tags);
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
 * Silently drops any value that isn't one of the three valid tag names.
 *
 * @param {string|string[]|null} raw
 * @returns {string[]}
 */
function normalizeTags(raw) {
  const VALID = new Set(['Woodlands Trails', 'Navigators', 'Adventurers']);

  const candidates = Array.isArray(raw)  ? raw
                   : typeof raw === 'string' ? [raw]
                   : [];

  return candidates
    .map(t => String(t).trim())
    .filter(t => VALID.has(t));
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
