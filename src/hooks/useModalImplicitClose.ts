import { useCallback, useEffect } from 'react';
import type { MouseEvent } from 'react';

export interface UseModalImplicitCloseOptions {
  isOpen: boolean;
  onClose: () => void;
  /**
   * When true, blocks implicit dismissal via Escape/backdrop.
   * Explicit close controls (e.g. X / Cancel button) should still call `onClose()` directly.
   */
  disableImplicitClose?: boolean;
}

export interface UseModalImplicitCloseResult {
  onBackdropMouseDown: (event: MouseEvent<HTMLElement>) => void;
}

/**
 * Standardizes modal implicit close behavior across the app:
 * - Escape closes the modal unless `disableImplicitClose` is true
 * - Backdrop mouse down closes the modal unless `disableImplicitClose` is true
 *
 * IMPORTANT: This only guards *implicit* close mechanisms. Your explicit close buttons
 * should call `onClose()` directly.
 */
export function useModalImplicitClose({
  isOpen,
  onClose,
  disableImplicitClose = false,
}: UseModalImplicitCloseOptions): UseModalImplicitCloseResult {
  const onBackdropMouseDown = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      if (event.target !== event.currentTarget) return;
      if (disableImplicitClose) return;
      onClose();
    },
    [disableImplicitClose, onClose]
  );

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (disableImplicitClose) return;
      onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [disableImplicitClose, isOpen, onClose]);

  return { onBackdropMouseDown };
}
