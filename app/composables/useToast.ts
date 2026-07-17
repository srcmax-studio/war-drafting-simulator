export interface ToastMessage {
  id: string;
  tone: 'info' | 'success' | 'warning' | 'danger';
  title: string;
  message?: string;
  duration: number;
}

export function useToast() {
  const toasts = useState<ToastMessage[]>('aeonfront-toasts', () => []);
  const remove = (id: string) => { toasts.value = toasts.value.filter((toast) => toast.id !== id); };
  const push = (toast: Omit<ToastMessage, 'id' | 'duration'> & { duration?: number }) => {
    const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
    const entry: ToastMessage = { ...toast, id, duration: toast.duration ?? 4_000 };
    toasts.value = [...toasts.value, entry].slice(-4);
    if (import.meta.client) setTimeout(() => remove(id), entry.duration);
    return id;
  };
  return { toasts, push, remove };
}
