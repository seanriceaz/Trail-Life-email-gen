/**
 * modal.js
 * --------
 * Lightweight modal open/close utility.
 * Modals are identified by their element id.
 * Clicking the backdrop or any [data-modal-close] element closes the modal.
 */

/**
 * Opens a modal by id and locks body scroll.
 * @param {string} id - The id of the modal element.
 */
export function openModal(id) {
  const modal = document.getElementById(id);
  modal.classList.add('modal-open');
  document.body.style.overflow = 'hidden';
}

/**
 * Closes a modal by id and restores body scroll.
 * @param {string} id - The id of the modal element.
 */
export function closeModal(id) {
  const modal = document.getElementById(id);
  modal.classList.remove('modal-open');
  document.body.style.overflow = '';
}

/**
 * Attaches close behavior to all modals on the page:
 *   - Clicking the semi-transparent backdrop closes the modal
 *   - Clicking any element with [data-modal-close] closes its parent modal
 * Call once from main.js after DOMContentLoaded.
 */
export function initModals() {
  document.querySelectorAll('.modal').forEach(modal => {
    // Close on backdrop click (the modal overlay itself, not the card inside it)
    modal.addEventListener('click', e => {
      if (e.target === modal) closeModal(modal.id);
    });
  });

  document.querySelectorAll('[data-modal-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal');
      if (modal) closeModal(modal.id);
    });
  });
}
