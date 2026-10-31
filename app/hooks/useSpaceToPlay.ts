import { useEffect, useRef } from 'react'

const isSpace = (e: KeyboardEvent) => e.code === 'Space' || e.key === ' '

/** Fields where a space is text (or a form control's own toggle), not a shortcut. */
export function isTextEntryTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  )
}

/**
 * The space bar is the Play/Pause button. Listens in the capture phase and
 * swallows both keydown and keyup, so a focused button (e.g. "Desde el
 * inicio" right after clicking it) isn't also activated by the same press,
 * and the page doesn't scroll. Holding the key toggles once.
 */
export function useSpaceToPlay({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }): void {
  const onToggleRef = useRef(onToggle)
  onToggleRef.current = onToggle

  useEffect(() => {
    if (!enabled) return
    let swallowKeyUp = false

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isSpace(e) || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return
      if (isTextEntryTarget(e.target)) return
      // A dialog on top (e.g. the MIDI recording view) owns the keyboard.
      if (document.querySelector('[aria-modal="true"]')) return
      e.preventDefault()
      swallowKeyUp = true
      if (!e.repeat) onToggleRef.current()
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (!swallowKeyUp || !isSpace(e)) return
      e.preventDefault()
      swallowKeyUp = false
    }

    window.addEventListener('keydown', handleKeyDown, true)
    window.addEventListener('keyup', handleKeyUp, true)
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
      window.removeEventListener('keyup', handleKeyUp, true)
    }
  }, [enabled])
}
