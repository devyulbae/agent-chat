import { describe, expect, it } from 'vitest'

import { getThreadShortcutLegendKeyboardDispatchOutcome } from './main'

describe('thread shortcut legend IME composition guard', () => {
  it('ignores legend shortcuts while composition is active', () => {
    const composingOutcome = getThreadShortcutLegendKeyboardDispatchOutcome({
      isVisible: false,
      key: '?',
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      defaultPrevented: false,
      repeat: false,
      isEditableTarget: false,
      isComposing: true,
    })

    expect(composingOutcome).toEqual({
      handled: false,
      nextVisibility: false,
      statusHint: null,
    })
  })
})
