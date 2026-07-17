const FOCUSABLE_SELECTOR = [
  '[autofocus]',
  'button:not(:disabled)',
  'a[href]',
  'input:not(:disabled)',
  'select:not(:disabled)',
  'textarea:not(:disabled)',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

export function useDialogFocus(
  open: () => boolean,
  container: Ref<HTMLElement | null>,
  close: () => void
) {
  let previousFocus: HTMLElement | null = null;

  const focusable = () => [...(container.value?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? [])]
    .filter((element) => !element.hasAttribute('hidden') && element.getClientRects().length > 0);

  const restore = () => {
    const target = previousFocus;
    previousFocus = null;
    if (target?.isConnected) queueMicrotask(() => target.focus());
  };

  watch(open, async (isOpen) => {
    if (!import.meta.client) return;
    if (!isOpen) { restore(); return; }
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    await nextTick();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const preferred = focusable().find((element) => element.hasAttribute('autofocus')) ?? focusable()[0];
    (preferred ?? container.value)?.focus();
  }, { flush: 'post' });

  const onKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== 'Tab') return;
    const elements = focusable();
    if (!elements.length) {
      event.preventDefault();
      container.value?.focus();
      return;
    }
    const first = elements[0]!;
    const last = elements.at(-1)!;
    if (event.shiftKey && (document.activeElement === first || !container.value?.contains(document.activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !container.value?.contains(document.activeElement))) {
      event.preventDefault();
      first.focus();
    }
  };

  onBeforeUnmount(restore);
  return { onKeydown };
}
