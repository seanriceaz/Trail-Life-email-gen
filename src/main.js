/**
 * main.js
 * -------
 * Application entry point. Responsible for:
 *   1. Wiring up event listeners on the newsletter settings fields
 *   2. Initializing SortableJS drag-and-drop on the section list
 *   3. Registering the preview render callback with sectionManager
 *   4. Loading example sections on first run
 *   5. Handling the "Copy HTML" button and clipboard toast
 *
 * Everything else lives in the imported modules below.
 */

import Sortable from 'sortablejs';
import { addSection, setOnSectionChange } from './sectionManager.js';
import { buildEmailHtml } from './emailBuilder.js';

// ─── Preview ──────────────────────────────────────────────────────────────────

/**
 * Rebuilds the email HTML and writes it into the preview iframe-like div.
 * Called any time settings fields or section content change.
 */
function renderPreview() {
  document.getElementById('email-preview').innerHTML = buildEmailHtml();
}

// ─── Clipboard ────────────────────────────────────────────────────────────────

/**
 * Copies the full email HTML to the clipboard and briefly shows a toast.
 * Falls back to the older execCommand API for browsers that block
 * navigator.clipboard (e.g. non-HTTPS, some older mobile browsers).
 */
function copyHtml() {
  const html = buildEmailHtml();

  const onSuccess = () => showToast('HTML copied to clipboard!');

  navigator.clipboard.writeText(html).then(onSuccess).catch(() => {
    // execCommand fallback: works in older / restricted environments
    const ta = document.createElement('textarea');
    ta.value = html;
    ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none;';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    onSuccess();
  });
}

/**
 * Briefly shows the copy confirmation toast next to the Copy HTML button.
 * @param {string} message
 */
function showToast(message) {
  const toast = document.getElementById('copy-toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2200);
}

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {

  // Tell sectionManager what to call when any section changes
  setOnSectionChange(renderPreview);

  // Re-render preview when newsletter-level fields (subject, intro, closing) change
  ['email-subject', 'email-intro', 'email-closing'].forEach(id =>
    document.getElementById(id).addEventListener('input', renderPreview)
  );

  // Enable drag-and-drop section reordering via SortableJS.
  // The handle class prevents accidental drags when clicking inputs inside cards.
  Sortable.create(document.getElementById('section-list'), {
    animation:   150,
    handle:      '.drag-handle',
    ghostClass:  'sortable-ghost',
    chosenClass: 'sortable-chosen',
    onEnd:       renderPreview,  // re-render after user drops a section in a new position
  });

  document.getElementById('add-section-btn').addEventListener('click', () => addSection());
  document.getElementById('copy-html-btn').addEventListener('click', copyHtml);

  // ── Demo content ────────────────────────────────────────────────────────────
  // Pre-load two example sections so the app looks useful on first visit.
  // Remove or replace these as needed.

  addSection(
    'Upcoming Meeting',
    "Join us for our regular troop meeting! We'll be working on badge requirements and planning our next campout.",
    'Thursday, April 3 · 6:30 PM · First Baptist Church, Fellowship Hall',
    ['Woodlands Trails', 'Navigators', 'Adventurers']
  );

  addSection(
    'Spring Campout',
    "Don't miss our annual spring campout! Activities include orienteering, fire-starting, and shelter building. Permission slips due by April 7th.",
    'April 18–20 · Blue Knob State Park · Bring full gear',
    ['Navigators', 'Adventurers']
  );

  renderPreview();
});
