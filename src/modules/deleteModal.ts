/**
 * Machined Steel Delete Confirmation Dialog
 * Provides an in-DOM modal confirmation that is never blocked by iframe sandbox limitations.
 */

let activeResolve: ((confirmed: boolean) => void) | null = null;

export function initDeleteModal() {
  const modal = document.getElementById('modal-confirm-delete');
  const closeBtn = document.getElementById('modal-confirm-delete-close');
  const cancelBtn = document.getElementById('modal-confirm-delete-cancel');
  const confirmBtn = document.getElementById('modal-confirm-delete-btn');

  const closeDialog = (confirmed: boolean) => {
    if (modal) modal.classList.add('hidden');
    if (activeResolve) {
      activeResolve(confirmed);
      activeResolve = null;
    }
  };

  closeBtn?.addEventListener('click', () => closeDialog(false));
  cancelBtn?.addEventListener('click', () => closeDialog(false));
  confirmBtn?.addEventListener('click', () => closeDialog(true));
  
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeDialog(false);
  });
}

export function confirmDelete(message: string, title = 'Confirm Delete'): Promise<boolean> {
  const modal = document.getElementById('modal-confirm-delete');
  const msgEl = document.getElementById('modal-confirm-delete-msg');
  const titleEl = modal?.querySelector('h2');

  if (msgEl) msgEl.textContent = message;
  if (titleEl) titleEl.textContent = title;

  if (modal) {
    modal.classList.remove('hidden');
  }

  return new Promise((resolve) => {
    activeResolve = resolve;
  });
}
