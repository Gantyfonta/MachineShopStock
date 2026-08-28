export function showToast(message: string, type: 'success' | 'warning' | 'danger' | 'info' = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  const borderCol =
    type === 'danger'
      ? 'border-rose-600 bg-rose-950/90 text-rose-200'
      : type === 'warning'
      ? 'border-amber-600 bg-amber-950/90 text-amber-200'
      : type === 'info'
      ? 'border-blue-600 bg-blue-950/90 text-blue-200'
      : 'border-emerald-600 bg-[#12241a]/95 text-emerald-200';

  toast.className = `px-3.5 py-2.5 rounded border shadow-xl text-xs flex items-center gap-2 pointer-events-auto transition-all transform duration-200 ${borderCol}`;
  toast.innerHTML = `
    <span class="w-2 h-2 rounded-full ${type === 'danger' ? 'bg-rose-400' : type === 'warning' ? 'bg-amber-400' : type === 'info' ? 'bg-blue-400' : 'bg-emerald-400'}"></span>
    <span class="font-medium">${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(10px)';
    setTimeout(() => toast.remove(), 200);
  }, 2800);
}
