/**
 * sectionManager.js
 * -----------------
 * Creates, populates, and removes section cards in the editor panel.
 * Each card is a clone of the #section-template element in index.html.
 *
 * The DOM is the single source of truth for section order — SortableJS
 * reorders elements directly, so we always read the DOM rather than
 * maintaining a parallel array.
 *
 * Public API:
 *   addSection(title, desc, detail, tags) → void
 *   getAllSectionData()                   → SectionData[]
 *   setOnSectionChange(fn)               → void
 */

// Callback invoked whenever a section is added, removed, or edited.
// Set by main.js to trigger a preview re-render.
let onSectionChange = () => {};

/** Register the function to call whenever section data changes. */
export function setOnSectionChange(fn) {
  onSectionChange = fn;
}

/**
 * Clones the section template, optionally pre-fills fields, attaches
 * event listeners, and appends the card to the section list.
 *
 * @param {string}   title  - Section heading
 * @param {string}   desc   - Body text / description
 * @param {string}   detail - One-line detail (date, time, location, etc.)
 * @param {string[]} tags   - Array of tag values to pre-check
 */
export function addSection(title = '', desc = '', detail = '', tags = []) {
  const tmpl = document.getElementById('section-template').content.cloneNode(true);
  const card = tmpl.querySelector('.section-card');

  // ── Populate fields ───────────────────────────────────────────────────────
  card.querySelector('.section-title-input').value = title;
  card.querySelector('.section-desc').value        = desc;
  card.querySelector('.section-detail').value      = detail;

  card.querySelectorAll('.tag-check').forEach(cb => {
    cb.checked = tags.includes(cb.value);
  });

  // ── Event listeners ───────────────────────────────────────────────────────

  // Any text or checkbox change re-renders the preview
  card.querySelectorAll('input[type="text"], textarea').forEach(el =>
    el.addEventListener('input', onSectionChange)
  );
  card.querySelectorAll('input[type="checkbox"]').forEach(el =>
    el.addEventListener('change', onSectionChange)
  );

  // Remove button destroys the card and updates the preview
  card.querySelector('.section-delete-btn').addEventListener('click', () => {
    card.remove();
    onSectionChange();
  });

  document.getElementById('section-list').appendChild(card);
  onSectionChange();
}

/**
 * Reads the current field values out of a single section card element.
 *
 * @param   {HTMLElement} card
 * @returns {{ title: string, desc: string, detail: string, tags: string[] }}
 */
export function getSectionData(card) {
  return {
    title:  card.querySelector('.section-title-input').value.trim(),
    desc:   card.querySelector('.section-desc').value.trim(),
    detail: card.querySelector('.section-detail').value.trim(),
    tags:   [...card.querySelectorAll('.tag-check:checked')].map(cb => cb.value),
  };
}

/**
 * Reads all section cards from the DOM in their current display order
 * and returns an array of plain data objects.
 *
 * DOM order is authoritative because SortableJS reorders elements in place.
 *
 * @returns {Array<{ title: string, desc: string, detail: string, tags: string[] }>}
 */
export function getAllSectionData() {
  return [...document.querySelectorAll('.section-card')].map(getSectionData);
}
