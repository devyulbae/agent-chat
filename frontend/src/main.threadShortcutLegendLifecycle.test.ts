import { describe, expect, it } from 'vitest'

import {
  getThreadShortcutLegendKeyboardTransition,
  getThreadShortcutLegendPresentation,
} from './main'

describe('thread shortcut legend lifecycle presentation (main integration)', () => {
  it('keeps status hint and aria-keyshortcuts synchronized across hidden → shown → hidden transitions', () => {
    const hiddenBeforeToggle = getThreadShortcutLegendPresentation(false)
    expect(hiddenBeforeToggle.buttonAriaKeyshortcuts).toBe('Shift+Slash')
    expect(hiddenBeforeToggle.statusHint).toBe('Thread shortcut legend hidden (Esc).')

    const shownAfterQuestionToggle = getThreadShortcutLegendPresentation(true)
    expect(shownAfterQuestionToggle.buttonAriaKeyshortcuts).toBe('Escape')
    expect(shownAfterQuestionToggle.statusHint).toBe('Thread shortcut legend shown (? / Shift+/).')

    const hiddenAfterEscDismiss = getThreadShortcutLegendPresentation(false)
    expect(hiddenAfterEscDismiss.buttonAriaKeyshortcuts).toBe('Shift+Slash')
    expect(hiddenAfterEscDismiss.statusHint).toBe('Thread shortcut legend hidden (Esc).')

    expect(hiddenAfterEscDismiss).toEqual(hiddenBeforeToggle)
  })

  it('keeps toggle/dismiss control copy stable regardless of visibility state', () => {
    const hidden = getThreadShortcutLegendPresentation(false)
    const shown = getThreadShortcutLegendPresentation(true)

    expect(hidden.toggleControlCopy).toBe('? / Shift+/')
    expect(hidden.dismissControlCopy).toBe('Esc')

    expect(shown.toggleControlCopy).toBe(hidden.toggleControlCopy)
    expect(shown.dismissControlCopy).toBe(hidden.dismissControlCopy)
  })

  it('models keyboard lifecycle transitions for ? toggle then Esc dismiss', () => {
    const shownAfterQuestionKey = getThreadShortcutLegendKeyboardTransition(false, '?', false)
    expect(shownAfterQuestionKey.nextVisibility).toBe(true)
    expect(shownAfterQuestionKey.statusHint).toBe('Thread shortcut legend shown (? / Shift+/).')

    const hiddenAfterEscKey = getThreadShortcutLegendKeyboardTransition(
      shownAfterQuestionKey.nextVisibility,
      'Escape',
      false,
    )
    expect(hiddenAfterEscKey.nextVisibility).toBe(false)
    expect(hiddenAfterEscKey.statusHint).toBe('Thread shortcut legend hidden (Esc).')

    const ignoredEscWhenHidden = getThreadShortcutLegendKeyboardTransition(false, 'Escape', false)
    expect(ignoredEscWhenHidden.nextVisibility).toBe(false)
    expect(ignoredEscWhenHidden.statusHint).toBeNull()
  })
})
