import { useEffect } from 'react';

interface TallyHotkeyOption {
  key: string; // The letter that triggers it, e.g., 'A' or 'V'
  action: () => void;
}

export function useTallyKeyboard(
  onArrowUp?: () => void,
  onArrowDown?: () => void,
  onEnter?: () => void,
  onEscape?: () => void,
  hotkeys?: TallyHotkeyOption[],
  disabled: boolean = false
) {
  useEffect(() => {
    if (disabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore keys when typing in standard text inputs or textareas, EXCEPT for Enter and Escape, 
      // or specific Function keys (like F4-F9) which are critical for vouchers.
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      // 1. Navigation & Actions
      if (e.key === 'ArrowUp') {
        if (!isInput && onArrowUp) {
          e.preventDefault();
          onArrowUp();
        }
      } else if (e.key === 'ArrowDown') {
        if (!isInput && onArrowDown) {
          e.preventDefault();
          onArrowDown();
        }
      } else if (e.key === 'Enter') {
        // We let Enter pass through inputs, but if there's custom Enter behavior (like switching fields) we intercept.
        if (onEnter) {
          // If in input, we might want to let the input handle it unless we explicitly override.
          onEnter();
        }
      } else if (e.key === 'Escape') {
        if (onEscape) {
          e.preventDefault();
          onEscape();
        }
      }

      // 2. Hotkey Letters (A-Z) - ONLY trigger when NOT typing in an input
      if (!isInput && hotkeys && hotkeys.length > 0) {
        const pressedKey = e.key.toUpperCase();
        const matched = hotkeys.find(h => h.key.toUpperCase() === pressedKey);
        if (matched) {
          e.preventDefault();
          matched.action();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onArrowUp, onArrowDown, onEnter, onEscape, hotkeys, disabled]);
}
