import { icons } from '../scripts/icons';

export function showToast(
  message: string,
  durationOrType: number | 'success' | 'error' | 'info' = 3000,
  typeArg?: 'success' | 'error' | 'info'
): void {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const duration = typeof durationOrType === 'number' ? durationOrType : 3000;
  const type = typeof durationOrType === 'string' ? durationOrType : (typeArg || 'success');

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  if (type === 'error') {
    toast.style.backgroundColor = 'var(--status-danger, #ef4444)';
    toast.style.color = '#ffffff';
  }

  const iconSvg = type === 'error' ? icons.close(14) : icons.check(14);

  toast.innerHTML = `
    <span>${iconSvg}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 200ms ease';
    setTimeout(() => {
      toast.remove();
    }, 200);
  }, duration);
}
