import { describe, expect, it } from 'vitest'

import {
  getThreadShortcutLegendKeyboardDispatchOutcome,
  getThreadShortcutLegendKeyboardRenderState,
  getThreadShortcutLegendKeyboardTransition,
  getThreadShortcutLegendPresentation,
  getThreadShortcutLegendRegionPresentation,
} from './main'
import { getShortcutChipPropsFromHint, getStatusAriaLabelWithShortcutChip } from './threadHintChips'

const assertShownLegendNoOpRenderState = (key: 'Escape' | 'Esc', shiftKey: boolean) => {
  const shownNoOpRenderState = getThreadShortcutLegendKeyboardRenderState({
    isVisible: true,
    key,
    shiftKey,
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    defaultPrevented: false,
    repeat: false,
    isEditableTarget: false,
  })
  expect(shownNoOpRenderState.handled).toBe(false)
  expect(shownNoOpRenderState.nextVisibility).toBe(true)
  expect(shownNoOpRenderState.statusHint).toBeNull()
  expect(shownNoOpRenderState.statusAriaLabel ?? null).toBeNull()

  const shownNoOpPresentation = getThreadShortcutLegendPresentation(shownNoOpRenderState.nextVisibility)
  expect(shownNoOpPresentation.ariaExpanded).toBe(shownNoOpRenderState.nextVisibility)
}

const assertShownLegendNoOpDispatch = (key: 'Escape' | 'Esc', shiftKey: boolean) => {
  const ignoredShownDispatch = getThreadShortcutLegendKeyboardDispatchOutcome({
    isVisible: true,
    key,
    shiftKey,
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    defaultPrevented: false,
    repeat: false,
    isEditableTarget: false,
  })
  expect(ignoredShownDispatch).toEqual({
    handled: false,
    nextVisibility: true,
    statusHint: null,
  })

  const shownNoOpPresentation = getThreadShortcutLegendPresentation(ignoredShownDispatch.nextVisibility)
  expect(shownNoOpPresentation.ariaExpanded).toBe(ignoredShownDispatch.nextVisibility)
}

const assertShownEditableLegendNoOpDispatch = (
  key: 'Escape' | 'Esc',
  shiftKey: boolean,
  defaultPrevented: boolean,
  repeat: boolean,
) => {
  const shownEditableNoOpDispatch = getThreadShortcutLegendKeyboardDispatchOutcome({
    isVisible: true,
    key,
    shiftKey,
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    defaultPrevented,
    repeat,
    isEditableTarget: true,
  })
  expect(shownEditableNoOpDispatch).toEqual({
    handled: false,
    nextVisibility: true,
    statusHint: null,
  })
}

const assertShownEditableLegendNoOpRenderState = (
  key: 'Escape' | 'Esc',
  shiftKey: boolean,
  defaultPrevented: boolean,
  repeat: boolean,
) => {
  const shownEditableNoOpRenderState = getThreadShortcutLegendKeyboardRenderState({
    isVisible: true,
    key,
    shiftKey,
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    defaultPrevented,
    repeat,
    isEditableTarget: true,
  })
  expect(shownEditableNoOpRenderState.handled).toBe(false)
  expect(shownEditableNoOpRenderState.nextVisibility).toBe(true)
  expect(shownEditableNoOpRenderState.statusHint).toBeNull()
  expect(shownEditableNoOpRenderState.statusAriaLabel ?? null).toBeNull()

  const shownNoOpPresentation = getThreadShortcutLegendPresentation(
    shownEditableNoOpRenderState.nextVisibility,
  )
  expect(shownNoOpPresentation.ariaExpanded).toBe(shownEditableNoOpRenderState.nextVisibility)
}


const legendModifierCases = [
  { metaKey: true, ctrlKey: false, altKey: false },
  { metaKey: false, ctrlKey: true, altKey: false },
  { metaKey: false, ctrlKey: false, altKey: true },
] as const

const legendEventGateCases = [
  { defaultPrevented: true, repeat: false },
  { defaultPrevented: false, repeat: true },
] as const

const shownShiftModifierEventGateDispatchNoOpCases = [
  { metaKey: true, ctrlKey: false, altKey: false, defaultPrevented: true, repeat: false },
  { metaKey: false, ctrlKey: true, altKey: false, defaultPrevented: false, repeat: true },
] as const

const shownShiftModifierEventGateRenderStateNoOpCases = [
  { metaKey: false, ctrlKey: false, altKey: true, defaultPrevented: true, repeat: false },
  { metaKey: true, ctrlKey: false, altKey: false, defaultPrevented: false, repeat: true },
] as const

const assertShownEditableNonShiftLegendEventGateNoOp = (key: 'Escape' | 'Esc') => {
  legendEventGateCases.forEach(({ defaultPrevented, repeat }) => {
    assertShownEditableLegendNoOpDispatch(key, false, defaultPrevented, repeat)
    assertShownEditableLegendNoOpRenderState(key, false, defaultPrevented, repeat)
  })
}

const assertShownEditableShiftLegendNoOp = (key: 'Escape' | 'Esc') => {
  assertShownEditableLegendNoOpDispatch(key, true, false, false)
  assertShownEditableLegendNoOpRenderState(key, true, false, false)
}

const assertShownEditableShiftLegendEventGateNoOp = (key: 'Escape' | 'Esc') => {
  legendEventGateCases.forEach(({ defaultPrevented, repeat }) => {
    assertShownEditableLegendNoOpDispatch(key, true, defaultPrevented, repeat)
    assertShownEditableLegendNoOpRenderState(key, true, defaultPrevented, repeat)
  })
}

const assertHiddenEditableLegendNoOpDispatch = (key: 'Escape' | 'Esc') => {
  const hiddenEditableNoOpDispatch = getThreadShortcutLegendKeyboardDispatchOutcome({
    isVisible: false,
    key,
    shiftKey: false,
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    defaultPrevented: false,
    repeat: false,
    isEditableTarget: true,
  })
  expect(hiddenEditableNoOpDispatch).toEqual({
    handled: false,
    nextVisibility: false,
    statusHint: null,
  })
}

const assertHiddenEditableLegendNoOpRenderState = (
  key: 'Escape' | 'Esc',
  defaultPrevented: boolean,
  repeat: boolean,
) => {
  const hiddenEditableNoOpRenderState = getThreadShortcutLegendKeyboardRenderState({
    isVisible: false,
    key,
    shiftKey: false,
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    defaultPrevented,
    repeat,
    isEditableTarget: true,
  })

  expect(hiddenEditableNoOpRenderState.handled).toBe(false)
  expect(hiddenEditableNoOpRenderState.nextVisibility).toBe(false)
  expect(hiddenEditableNoOpRenderState.statusHint).toBeNull()
  expect(hiddenEditableNoOpRenderState.statusAriaLabel ?? null).toBeNull()
}

const assertHiddenEditableLegendEventGateNoOpRenderState = (key: 'Escape' | 'Esc') => {
  legendEventGateCases.forEach(({ defaultPrevented, repeat }) => {
    assertHiddenEditableLegendNoOpRenderState(key, defaultPrevented, repeat)
  })
}

const assertHiddenEditableLegendEventGateNoOp = (key: 'Escape' | 'Esc') => {
  legendEventGateCases.forEach(({ defaultPrevented, repeat }) => {
    const hiddenEditableNoOpDispatch = getThreadShortcutLegendKeyboardDispatchOutcome({
      isVisible: false,
      key,
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      defaultPrevented,
      repeat,
      isEditableTarget: true,
    })
    expect(hiddenEditableNoOpDispatch).toEqual({
      handled: false,
      nextVisibility: false,
      statusHint: null,
    })
  })

  assertHiddenEditableLegendEventGateNoOpRenderState(key)
}

const assertHiddenLegendNoOpDispatch = (
  key: 'Escape' | 'Esc',
  modifier: Pick<
    Parameters<typeof getThreadShortcutLegendKeyboardDispatchOutcome>[0],
    'metaKey' | 'ctrlKey' | 'altKey'
  >,
) => {
  const hiddenNoOpDispatch = getThreadShortcutLegendKeyboardDispatchOutcome({
    isVisible: false,
    key,
    shiftKey: false,
    defaultPrevented: false,
    repeat: false,
    isEditableTarget: false,
    ...modifier,
  })
  expect(hiddenNoOpDispatch).toEqual({
    handled: false,
    nextVisibility: false,
    statusHint: null,
  })
}

const assertHiddenLegendModifierNoOpRenderState = (key: 'Escape' | 'Esc') => {
  legendModifierCases.forEach(({ metaKey, ctrlKey, altKey }) => {
    const ignoredHiddenRenderState = getThreadShortcutLegendKeyboardRenderState({
      isVisible: false,
      key,
      shiftKey: false,
      metaKey,
      ctrlKey,
      altKey,
      defaultPrevented: false,
      repeat: false,
      isEditableTarget: false,
    })
    expect(ignoredHiddenRenderState.handled).toBe(false)
    expect(ignoredHiddenRenderState.nextVisibility).toBe(false)
    expect(ignoredHiddenRenderState.statusHint).toBeNull()
    expect(ignoredHiddenRenderState.statusAriaLabel ?? null).toBeNull()
  })
}

const assertHiddenLegendEventGateNoOpDispatch = (key: 'Escape' | 'Esc') => {
  legendEventGateCases.forEach(({ defaultPrevented, repeat }) => {
    const ignoredHiddenDispatch = getThreadShortcutLegendKeyboardDispatchOutcome({
      isVisible: false,
      key,
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      defaultPrevented,
      repeat,
      isEditableTarget: false,
    })
    expect(ignoredHiddenDispatch).toEqual({
      handled: false,
      nextVisibility: false,
      statusHint: null,
    })
  })
}

const assertHiddenLegendEventGateNoOpRenderState = (key: 'Escape' | 'Esc') => {
  legendEventGateCases.forEach(({ defaultPrevented, repeat }) => {
    const ignoredHiddenRenderState = getThreadShortcutLegendKeyboardRenderState({
      isVisible: false,
      key,
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      defaultPrevented,
      repeat,
      isEditableTarget: false,
    })
    expect(ignoredHiddenRenderState.handled).toBe(false)
    expect(ignoredHiddenRenderState.nextVisibility).toBe(false)
    expect(ignoredHiddenRenderState.statusHint).toBeNull()
    expect(ignoredHiddenRenderState.statusAriaLabel ?? null).toBeNull()
  })
}

const assertShownLegendModifierNoOpRenderState = (key: 'Escape' | 'Esc') => {
  legendModifierCases.forEach(({ metaKey, ctrlKey, altKey }) => {
    const ignoredRenderState = getThreadShortcutLegendKeyboardRenderState({
      isVisible: true,
      key,
      shiftKey: false,
      metaKey,
      ctrlKey,
      altKey,
      defaultPrevented: false,
      repeat: false,
      isEditableTarget: false,
    })
    expect(ignoredRenderState.handled).toBe(false)
    expect(ignoredRenderState.nextVisibility).toBe(true)
    expect(ignoredRenderState.statusHint).toBeNull()
    expect(ignoredRenderState.statusAriaLabel ?? null).toBeNull()
  })
}

const assertShownLegendEventGateNoOpDispatch = (key: 'Escape' | 'Esc') => {
  legendEventGateCases.forEach(({ defaultPrevented, repeat }) => {
    const ignoredDispatch = getThreadShortcutLegendKeyboardDispatchOutcome({
      isVisible: true,
      key,
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      defaultPrevented,
      repeat,
      isEditableTarget: false,
    })
    expect(ignoredDispatch).toEqual({
      handled: false,
      nextVisibility: true,
      statusHint: null,
    })
  })
}

const assertShownLegendEventGateNoOpRenderState = (key: 'Escape' | 'Esc') => {
  legendEventGateCases.forEach(({ defaultPrevented, repeat }) => {
    const ignoredRenderState = getThreadShortcutLegendKeyboardRenderState({
      isVisible: true,
      key,
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      defaultPrevented,
      repeat,
      isEditableTarget: false,
    })
    expect(ignoredRenderState.handled).toBe(false)
    expect(ignoredRenderState.nextVisibility).toBe(true)
    expect(ignoredRenderState.statusHint).toBeNull()
    expect(ignoredRenderState.statusAriaLabel ?? null).toBeNull()
  })
}

const assertShownEditableLegendModifierNoOp = (key: 'Escape' | 'Esc') => {
  legendModifierCases.forEach(({ metaKey, ctrlKey, altKey }) => {
    const ignoredDispatch = getThreadShortcutLegendKeyboardDispatchOutcome({
      isVisible: true,
      key,
      shiftKey: false,
      metaKey,
      ctrlKey,
      altKey,
      defaultPrevented: false,
      repeat: false,
      isEditableTarget: true,
    })
    expect(ignoredDispatch).toEqual({
      handled: false,
      nextVisibility: true,
      statusHint: null,
    })

    const ignoredRenderState = getThreadShortcutLegendKeyboardRenderState({
      isVisible: true,
      key,
      shiftKey: false,
      metaKey,
      ctrlKey,
      altKey,
      defaultPrevented: false,
      repeat: false,
      isEditableTarget: true,
    })
    expect(ignoredRenderState.handled).toBe(false)
    expect(ignoredRenderState.nextVisibility).toBe(true)
    expect(ignoredRenderState.statusHint).toBeNull()
    expect(ignoredRenderState.statusAriaLabel ?? null).toBeNull()
  })

  const shownNoOpPresentation = getThreadShortcutLegendPresentation(true)
  expect(shownNoOpPresentation.ariaExpanded).toBe(true)
}

const assertShownEditableShiftLegendModifierNoOp = (key: 'Escape' | 'Esc') => {
  legendModifierCases.forEach(({ metaKey, ctrlKey, altKey }) => {
    const ignoredDispatch = getThreadShortcutLegendKeyboardDispatchOutcome({
      isVisible: true,
      key,
      shiftKey: true,
      metaKey,
      ctrlKey,
      altKey,
      defaultPrevented: false,
      repeat: false,
      isEditableTarget: true,
    })
    expect(ignoredDispatch).toEqual({
      handled: false,
      nextVisibility: true,
      statusHint: null,
    })

    const ignoredRenderState = getThreadShortcutLegendKeyboardRenderState({
      isVisible: true,
      key,
      shiftKey: true,
      metaKey,
      ctrlKey,
      altKey,
      defaultPrevented: false,
      repeat: false,
      isEditableTarget: true,
    })
    expect(ignoredRenderState.handled).toBe(false)
    expect(ignoredRenderState.nextVisibility).toBe(true)
    expect(ignoredRenderState.statusHint).toBeNull()
    expect(ignoredRenderState.statusAriaLabel ?? null).toBeNull()
  })

  const shownNoOpPresentation = getThreadShortcutLegendPresentation(true)
  expect(shownNoOpPresentation.ariaExpanded).toBe(true)
}

const assertShownShiftLegendModifierEventGateNoOp = (
  key: 'Escape' | 'Esc',
  isEditableTarget: boolean,
) => {
  shownShiftModifierEventGateDispatchNoOpCases.forEach(
    ({ metaKey, ctrlKey, altKey, defaultPrevented, repeat }) => {
      const noOpDispatch = getThreadShortcutLegendKeyboardDispatchOutcome({
        isVisible: true,
        key,
        shiftKey: true,
        metaKey,
        ctrlKey,
        altKey,
        defaultPrevented,
        repeat,
        isEditableTarget,
      })
      expect(noOpDispatch).toEqual({
        handled: false,
        nextVisibility: true,
        statusHint: null,
      })
    },
  )

  shownShiftModifierEventGateRenderStateNoOpCases.forEach(
    ({ metaKey, ctrlKey, altKey, defaultPrevented, repeat }) => {
      const noOpRenderState = getThreadShortcutLegendKeyboardRenderState({
        isVisible: true,
        key,
        shiftKey: true,
        metaKey,
        ctrlKey,
        altKey,
        defaultPrevented,
        repeat,
        isEditableTarget,
      })
      expect(noOpRenderState.handled).toBe(false)
      expect(noOpRenderState.nextVisibility).toBe(true)
      expect(noOpRenderState.statusHint).toBeNull()
      expect(noOpRenderState.statusAriaLabel ?? null).toBeNull()
    },
  )

  const shownNoOpPresentation = getThreadShortcutLegendPresentation(true)
  expect(shownNoOpPresentation.ariaExpanded).toBe(true)
}

const assertShownEditableShiftLegendModifierEventGateNoOp = (key: 'Escape' | 'Esc') => {
  assertShownShiftLegendModifierEventGateNoOp(key, true)
}

const assertShownShiftLegendNonEditableModifierEventGateNoOp = (key: 'Escape' | 'Esc') => {
  assertShownShiftLegendModifierEventGateNoOp(key, false)
}

const assertPlainSlashNoOp = (isVisible: boolean) => {
  const slashDispatch = getThreadShortcutLegendKeyboardDispatchOutcome({
    isVisible,
    key: '/',
    shiftKey: false,
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    defaultPrevented: false,
    repeat: false,
    isEditableTarget: false,
  })
  expect(slashDispatch).toEqual({
    handled: false,
    nextVisibility: isVisible,
    statusHint: null,
  })

  const slashRenderState = getThreadShortcutLegendKeyboardRenderState({
    isVisible,
    key: '/',
    shiftKey: false,
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    defaultPrevented: false,
    repeat: false,
    isEditableTarget: false,
  })
  expect(slashRenderState.handled).toBe(false)
  expect(slashRenderState.nextVisibility).toBe(isVisible)
  expect(slashRenderState.statusHint).toBeNull()
  expect(slashRenderState.statusAriaLabel ?? null).toBeNull()
}

describe('thread shortcut legend lifecycle presentation (main integration)', () => {
  it('keeps status hint and aria-keyshortcuts synchronized across hidden → shown → hidden transitions', () => {
    const hiddenBeforeToggle = getThreadShortcutLegendPresentation(false)
    expect(hiddenBeforeToggle.ariaExpanded).toBe(false)
    expect(hiddenBeforeToggle.buttonAriaKeyshortcuts).toBe('Question Shift+Slash')
    expect(hiddenBeforeToggle.regionAriaKeyshortcuts).toBe(
      'J K ArrowUp ArrowDown Home End PageUp PageDown Shift+G Shift+End Shift+PageDown U N P Shift+U Z Shift+Home Shift+R Slash C Y Escape Esc',
    )
    expect(hiddenBeforeToggle.statusHint).toBe('Thread shortcut legend hidden (Esc).')

    const shownAfterQuestionToggle = getThreadShortcutLegendPresentation(true)
    expect(shownAfterQuestionToggle.ariaExpanded).toBe(true)
    expect(shownAfterQuestionToggle.buttonAriaKeyshortcuts).toBe('Question Shift+Slash Escape Esc')
    expect(shownAfterQuestionToggle.regionAriaKeyshortcuts).toBe(
      hiddenBeforeToggle.regionAriaKeyshortcuts,
    )
    expect(shownAfterQuestionToggle.statusHint).toBe('Thread shortcut legend shown (? / Shift+/).')

    const hiddenAfterEscDismiss = getThreadShortcutLegendPresentation(false)
    expect(hiddenAfterEscDismiss.ariaExpanded).toBe(false)
    expect(hiddenAfterEscDismiss.buttonAriaKeyshortcuts).toBe('Question Shift+Slash')
    expect(hiddenAfterEscDismiss.statusHint).toBe('Thread shortcut legend hidden (Esc).')

    expect(hiddenAfterEscDismiss).toEqual(hiddenBeforeToggle)
  })

  it('renders thread shortcut legend region metadata only when legend is visible', () => {
    const hiddenRegion = getThreadShortcutLegendRegionPresentation(false)
    expect(hiddenRegion).toBeNull()

    const shownRegion = getThreadShortcutLegendRegionPresentation(true)
    expect(shownRegion).toEqual({
      id: 'thread-shortcut-legend',
      role: 'region',
      ariaLabel: 'Thread keyboard shortcuts',
      ariaKeyshortcuts:
        'J K ArrowUp ArrowDown Home End PageUp PageDown Shift+G Shift+End Shift+PageDown U N P Shift+U Z Shift+Home Shift+R Slash C Y Escape Esc',
    })
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

  it('treats Shift+/ as the same show toggle lifecycle as ? and keeps hidden Esc as no-op', () => {
    const shownAfterShiftSlash = getThreadShortcutLegendKeyboardTransition(false, '/', true)
    expect(shownAfterShiftSlash.nextVisibility).toBe(true)
    expect(shownAfterShiftSlash.statusHint).toBe('Thread shortcut legend shown (? / Shift+/).')

    const shownAfterSlashKeyAlias = getThreadShortcutLegendKeyboardTransition(false, 'Slash', true)
    expect(shownAfterSlashKeyAlias).toEqual(shownAfterShiftSlash)

    const hiddenAfterEscFromShiftSlash = getThreadShortcutLegendKeyboardTransition(
      shownAfterShiftSlash.nextVisibility,
      'Escape',
      false,
    )
    expect(hiddenAfterEscFromShiftSlash.nextVisibility).toBe(false)
    expect(hiddenAfterEscFromShiftSlash.statusHint).toBe('Thread shortcut legend hidden (Esc).')

    const ignoredEscWhenAlreadyHidden = getThreadShortcutLegendKeyboardTransition(false, 'Escape', false)
    expect(ignoredEscWhenAlreadyHidden.nextVisibility).toBe(false)
    expect(ignoredEscWhenAlreadyHidden.statusHint).toBeNull()
  })

  it('keeps shifted escape and unrelated keys as no-op while visible', () => {
    const shownLegend = true

    const ignoredShiftEscape = getThreadShortcutLegendKeyboardTransition(shownLegend, 'Escape', true)
    expect(ignoredShiftEscape.nextVisibility).toBe(true)
    expect(ignoredShiftEscape.statusHint).toBeNull()

    const ignoredUnrelatedKey = getThreadShortcutLegendKeyboardTransition(shownLegend, 'Enter', false)
    expect(ignoredUnrelatedKey.nextVisibility).toBe(true)
    expect(ignoredUnrelatedKey.statusHint).toBeNull()
  })

  it('treats Esc alias as the same dismiss lifecycle as Escape', () => {
    const shownAfterQuestionKey = getThreadShortcutLegendKeyboardTransition(false, '?', false)
    expect(shownAfterQuestionKey.nextVisibility).toBe(true)

    const hiddenAfterEscAlias = getThreadShortcutLegendKeyboardTransition(
      shownAfterQuestionKey.nextVisibility,
      'Esc',
      false,
    )
    expect(hiddenAfterEscAlias.nextVisibility).toBe(false)
    expect(hiddenAfterEscAlias.statusHint).toBe('Thread shortcut legend hidden (Esc).')

    const ignoredEscAliasWhenHidden = getThreadShortcutLegendKeyboardTransition(false, 'Esc', false)
    expect(ignoredEscAliasWhenHidden.nextVisibility).toBe(false)
    expect(ignoredEscAliasWhenHidden.statusHint).toBeNull()
  })

  it('keeps status chip aria semantics synchronized with keyboard lifecycle transitions (? show → Esc hide)', () => {
    const hiddenBeforeTogglePresentation = getThreadShortcutLegendPresentation(false)
    expect(hiddenBeforeTogglePresentation.buttonAriaKeyshortcuts).toBe('Question Shift+Slash')

    const shownTransition = getThreadShortcutLegendKeyboardTransition(false, '?', false)
    expect(shownTransition.nextVisibility).toBe(true)

    const shownChip = getShortcutChipPropsFromHint(shownTransition.statusHint, 'filter jump', 'thread-jump')
    const shownStatusAria = getStatusAriaLabelWithShortcutChip(shownTransition.statusHint, shownChip)
    const shownPresentation = getThreadShortcutLegendPresentation(shownTransition.nextVisibility)

    expect(shownStatusAria).toContain('Thread shortcut legend shown (? / Shift+/).')
    expect(shownStatusAria).toContain('Shortcut badge /: Slash (filter jump).')
    expect(shownPresentation.buttonAriaKeyshortcuts).toBe('Question Shift+Slash Escape Esc')

    const hiddenTransition = getThreadShortcutLegendKeyboardTransition(
      shownTransition.nextVisibility,
      'Escape',
      false,
    )
    expect(hiddenTransition.nextVisibility).toBe(false)

    const hiddenChip = getShortcutChipPropsFromHint(hiddenTransition.statusHint, 'filter jump', 'thread-jump')
    const hiddenStatusAria = getStatusAriaLabelWithShortcutChip(hiddenTransition.statusHint, hiddenChip)
    const hiddenPresentation = getThreadShortcutLegendPresentation(hiddenTransition.nextVisibility)

    expect(hiddenStatusAria).toContain('Thread shortcut legend hidden (Esc).')
    expect(hiddenStatusAria).toContain('Shortcut badge Esc: Escape (filter jump).')
    expect(hiddenPresentation.buttonAriaKeyshortcuts).toBe('Question Shift+Slash')
  })

  it('models window keydown dispatch lifecycle for ?/Shift+/ show then Esc/Esc alias hide with no-op guards', () => {
    const shownDispatch = getThreadShortcutLegendKeyboardDispatchOutcome({
      isVisible: false,
      key: '?',
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      defaultPrevented: false,
      repeat: false,
      isEditableTarget: false,
    })
    expect(shownDispatch).toEqual({
      handled: true,
      nextVisibility: true,
      statusHint: 'Thread shortcut legend shown (? / Shift+/).',
    })

    const shownByShiftSlashDispatch = getThreadShortcutLegendKeyboardDispatchOutcome({
      isVisible: false,
      key: '/',
      shiftKey: true,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      defaultPrevented: false,
      repeat: false,
      isEditableTarget: false,
    })
    expect(shownByShiftSlashDispatch).toEqual(shownDispatch)

    const hiddenDispatch = getThreadShortcutLegendKeyboardDispatchOutcome({
      isVisible: shownDispatch.nextVisibility,
      key: 'Escape',
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      defaultPrevented: false,
      repeat: false,
      isEditableTarget: false,
    })
    expect(hiddenDispatch).toEqual({
      handled: true,
      nextVisibility: false,
      statusHint: 'Thread shortcut legend hidden (Esc).',
    })

    const hiddenEscAliasDispatch = getThreadShortcutLegendKeyboardDispatchOutcome({
      isVisible: shownDispatch.nextVisibility,
      key: 'Esc',
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      defaultPrevented: false,
      repeat: false,
      isEditableTarget: false,
    })
    expect(hiddenEscAliasDispatch).toEqual(hiddenDispatch)

    const ignoredEditableDispatch = getThreadShortcutLegendKeyboardDispatchOutcome({
      isVisible: false,
      key: '?',
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      defaultPrevented: false,
      repeat: false,
      isEditableTarget: true,
    })
    expect(ignoredEditableDispatch).toEqual({
      handled: false,
      nextVisibility: false,
      statusHint: null,
    })

    const ignoredModifiedDispatch = getThreadShortcutLegendKeyboardDispatchOutcome({
      isVisible: true,
      key: 'Escape',
      shiftKey: false,
      metaKey: true,
      ctrlKey: false,
      altKey: false,
      defaultPrevented: false,
      repeat: false,
      isEditableTarget: false,
    })
    expect(ignoredModifiedDispatch).toEqual({
      handled: false,
      nextVisibility: true,
      statusHint: null,
    })
  })

  it('keeps aria-expanded presentation synchronized with dispatch nextVisibility for ? show and Esc hide', () => {
    const hiddenPresentation = getThreadShortcutLegendPresentation(false)
    expect(hiddenPresentation.ariaExpanded).toBe(false)

    const shownDispatch = getThreadShortcutLegendKeyboardDispatchOutcome({
      isVisible: false,
      key: '?',
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      defaultPrevented: false,
      repeat: false,
      isEditableTarget: false,
    })
    expect(shownDispatch).toEqual({
      handled: true,
      nextVisibility: true,
      statusHint: 'Thread shortcut legend shown (? / Shift+/).',
    })

    const shownPresentation = getThreadShortcutLegendPresentation(shownDispatch.nextVisibility)
    expect(shownPresentation.ariaExpanded).toBe(shownDispatch.nextVisibility)

    const hiddenEscAliasDispatch = getThreadShortcutLegendKeyboardDispatchOutcome({
      isVisible: shownDispatch.nextVisibility,
      key: 'Esc',
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      defaultPrevented: false,
      repeat: false,
      isEditableTarget: false,
    })
    expect(hiddenEscAliasDispatch).toEqual({
      handled: true,
      nextVisibility: false,
      statusHint: 'Thread shortcut legend hidden (Esc).',
    })

    const hiddenAfterDismissPresentation = getThreadShortcutLegendPresentation(
      hiddenEscAliasDispatch.nextVisibility,
    )
    expect(hiddenAfterDismissPresentation.ariaExpanded).toBe(hiddenEscAliasDispatch.nextVisibility)
  })

  it('keeps aria-expanded presentation stable across no-op dispatch paths for hidden Esc and shown Shift+Escape', () => {
    const hiddenEscNoOpDispatch = getThreadShortcutLegendKeyboardDispatchOutcome({
      isVisible: false,
      key: 'Esc',
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      defaultPrevented: false,
      repeat: false,
      isEditableTarget: false,
    })
    expect(hiddenEscNoOpDispatch).toEqual({
      handled: false,
      nextVisibility: false,
      statusHint: null,
    })

    const hiddenNoOpPresentation = getThreadShortcutLegendPresentation(hiddenEscNoOpDispatch.nextVisibility)
    expect(hiddenNoOpPresentation.ariaExpanded).toBe(false)

    const shownShiftEscapeNoOpDispatch = getThreadShortcutLegendKeyboardDispatchOutcome({
      isVisible: true,
      key: 'Escape',
      shiftKey: true,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      defaultPrevented: false,
      repeat: false,
      isEditableTarget: false,
    })
    expect(shownShiftEscapeNoOpDispatch).toEqual({
      handled: false,
      nextVisibility: true,
      statusHint: null,
    })

    const shownNoOpPresentation = getThreadShortcutLegendPresentation(
      shownShiftEscapeNoOpDispatch.nextVisibility,
    )
    expect(shownNoOpPresentation.ariaExpanded).toBe(true)
  })

  it('keeps no-op render-state nullish aria synchronized with aria-expanded for hidden Esc and shown Shift+Escape', () => {
    const hiddenEscNoOpRenderState = getThreadShortcutLegendKeyboardRenderState({
      isVisible: false,
      key: 'Esc',
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      defaultPrevented: false,
      repeat: false,
      isEditableTarget: false,
    })
    expect(hiddenEscNoOpRenderState.handled).toBe(false)
    expect(hiddenEscNoOpRenderState.nextVisibility).toBe(false)
    expect(hiddenEscNoOpRenderState.statusHint).toBeNull()
    expect(hiddenEscNoOpRenderState.statusAriaLabel ?? null).toBeNull()

    const hiddenNoOpPresentation = getThreadShortcutLegendPresentation(
      hiddenEscNoOpRenderState.nextVisibility,
    )
    expect(hiddenNoOpPresentation.ariaExpanded).toBe(hiddenEscNoOpRenderState.nextVisibility)

    const shownShiftEscapeNoOpRenderState = getThreadShortcutLegendKeyboardRenderState({
      isVisible: true,
      key: 'Escape',
      shiftKey: true,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      defaultPrevented: false,
      repeat: false,
      isEditableTarget: false,
    })
    expect(shownShiftEscapeNoOpRenderState.handled).toBe(false)
    expect(shownShiftEscapeNoOpRenderState.nextVisibility).toBe(true)
    expect(shownShiftEscapeNoOpRenderState.statusHint).toBeNull()
    expect(shownShiftEscapeNoOpRenderState.statusAriaLabel ?? null).toBeNull()

    const shownNoOpPresentation = getThreadShortcutLegendPresentation(
      shownShiftEscapeNoOpRenderState.nextVisibility,
    )
    expect(shownNoOpPresentation.ariaExpanded).toBe(shownShiftEscapeNoOpRenderState.nextVisibility)
  })

  it('keeps hidden Escape with modifier keys as no-op dispatch outcomes matching keyboard guard rails', () => {
    assertHiddenLegendNoOpDispatch('Escape', { metaKey: true, ctrlKey: false, altKey: false })
    assertHiddenLegendNoOpDispatch('Escape', { metaKey: false, ctrlKey: true, altKey: false })
    assertHiddenLegendNoOpDispatch('Escape', { metaKey: false, ctrlKey: false, altKey: true })
  })

  it('keeps hidden Esc alias with modifier keys as no-op dispatch outcomes', () => {
    assertHiddenLegendNoOpDispatch('Esc', { metaKey: true, ctrlKey: false, altKey: false })
    assertHiddenLegendNoOpDispatch('Esc', { metaKey: false, ctrlKey: true, altKey: false })
    assertHiddenLegendNoOpDispatch('Esc', { metaKey: false, ctrlKey: false, altKey: true })
  })

  it('keeps hidden Esc alias as no-op dispatch when event is defaultPrevented or repeat', () => {
    assertHiddenLegendEventGateNoOpDispatch('Esc')
  })

  it('keeps hidden Escape as no-op dispatch when event is defaultPrevented or repeat', () => {
    assertHiddenLegendEventGateNoOpDispatch('Escape')
  })

  it('keeps hidden Escape as no-op dispatch when target is editable', () => {
    assertHiddenEditableLegendNoOpDispatch('Escape')
  })

  it('keeps hidden Escape as no-op dispatch/render-state when target is editable and event is defaultPrevented or repeat', () => {
    assertHiddenEditableLegendEventGateNoOp('Escape')
  })

  it('keeps hidden Esc alias as no-op dispatch when target is editable', () => {
    assertHiddenEditableLegendNoOpDispatch('Esc')
  })

  it('keeps hidden Esc alias as no-op dispatch/render-state when target is editable and event is defaultPrevented or repeat', () => {
    assertHiddenEditableLegendEventGateNoOp('Esc')
  })

  it('keeps shown Escape as no-op dispatch when target is editable and event is defaultPrevented or repeat', () => {
    assertShownEditableNonShiftLegendEventGateNoOp('Escape')
  })

  it('keeps shown Esc alias as no-op dispatch when target is editable and event is defaultPrevented or repeat', () => {
    assertShownEditableNonShiftLegendEventGateNoOp('Esc')
  })

  it('keeps shown Escape as no-op dispatch when event is defaultPrevented or repeat', () => {
    assertShownLegendEventGateNoOpDispatch('Escape')
  })

  it('keeps shown Esc alias as no-op dispatch when event is defaultPrevented or repeat', () => {
    assertShownLegendEventGateNoOpDispatch('Esc')
  })

  it('keeps shown Escape with shiftKey=true as no-op dispatch outcome with stable aria-expanded presentation parity', () => {
    assertShownLegendNoOpDispatch('Escape', true)
  })

  it('keeps shown Esc alias with shiftKey=true as no-op dispatch outcome with stable aria-expanded presentation parity', () => {
    assertShownLegendNoOpDispatch('Esc', true)
  })

  it('keeps shown Escape with shiftKey=true as no-op dispatch/render-state when target is editable', () => {
    assertShownEditableShiftLegendNoOp('Escape')
  })

  it('keeps shown Esc alias with shiftKey=true as no-op dispatch/render-state when target is editable', () => {
    assertShownEditableShiftLegendNoOp('Esc')
  })

  it('keeps shown Escape with shiftKey=true as no-op for editable target when event is defaultPrevented or repeat', () => {
    assertShownEditableShiftLegendEventGateNoOp('Escape')
  })

  it('keeps shown Esc alias with shiftKey=true as no-op for editable target when event is defaultPrevented or repeat', () => {
    assertShownEditableShiftLegendEventGateNoOp('Esc')
  })

  it('keeps shown Escape/Esc editable-target modifier-key paths as no-op dispatch outcomes', () => {
    assertShownEditableLegendModifierNoOp('Escape')
    assertShownEditableLegendModifierNoOp('Esc')
  })

  it('keeps legend visibility transition and live status chip aria synchronized on keyboard render-state path', () => {
    const shownRenderState = getThreadShortcutLegendKeyboardRenderState({
      isVisible: false,
      key: '?',
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      defaultPrevented: false,
      repeat: false,
      isEditableTarget: false,
    })
    expect(shownRenderState.handled).toBe(true)
    expect(shownRenderState.nextVisibility).toBe(true)
    expect(shownRenderState.statusHint).toBe('Thread shortcut legend shown (? / Shift+/).')
    expect(shownRenderState.statusAriaLabel).toContain('Shortcut badge /: Slash (filter jump).')

    const hiddenRenderState = getThreadShortcutLegendKeyboardRenderState({
      isVisible: shownRenderState.nextVisibility,
      key: 'Escape',
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      defaultPrevented: false,
      repeat: false,
      isEditableTarget: false,
    })
    expect(hiddenRenderState.handled).toBe(true)
    expect(hiddenRenderState.nextVisibility).toBe(false)
    expect(hiddenRenderState.statusHint).toBe('Thread shortcut legend hidden (Esc).')
    expect(hiddenRenderState.statusAriaLabel).toContain('Shortcut badge Esc: Escape (filter jump).')
  })

  it('keeps render-state aria/status parity on Shift+/ show then Esc alias hide lifecycle', () => {
    const shownRenderState = getThreadShortcutLegendKeyboardRenderState({
      isVisible: false,
      key: '/',
      shiftKey: true,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      defaultPrevented: false,
      repeat: false,
      isEditableTarget: false,
    })
    expect(shownRenderState.handled).toBe(true)
    expect(shownRenderState.nextVisibility).toBe(true)
    expect(shownRenderState.statusHint).toBe('Thread shortcut legend shown (? / Shift+/).')
    expect(shownRenderState.statusAriaLabel).toContain('Shortcut badge /: Slash (filter jump).')

    const hiddenRenderState = getThreadShortcutLegendKeyboardRenderState({
      isVisible: shownRenderState.nextVisibility,
      key: 'Esc',
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      defaultPrevented: false,
      repeat: false,
      isEditableTarget: false,
    })
    expect(hiddenRenderState.handled).toBe(true)
    expect(hiddenRenderState.nextVisibility).toBe(false)
    expect(hiddenRenderState.statusHint).toBe('Thread shortcut legend hidden (Esc).')
    expect(hiddenRenderState.statusAriaLabel).toContain('Shortcut badge Esc: Escape (filter jump).')
  })

  it('keeps hidden Esc alias dismiss as a no-op render-state with no stale status aria emission', () => {
    const ignoredHiddenEscAlias = getThreadShortcutLegendKeyboardRenderState({
      isVisible: false,
      key: 'Esc',
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      defaultPrevented: false,
      repeat: false,
      isEditableTarget: false,
    })

    expect(ignoredHiddenEscAlias.handled).toBe(false)
    expect(ignoredHiddenEscAlias.nextVisibility).toBe(false)
    expect(ignoredHiddenEscAlias.statusHint).toBeNull()
    expect(ignoredHiddenEscAlias.statusAriaLabel ?? null).toBeNull()
  })

  it('keeps hidden Escape with modifier keys as no-op render-state parity with dispatch guard rails', () => {
    assertHiddenLegendModifierNoOpRenderState('Escape')
  })

  it('keeps hidden Esc alias with modifier keys as no-op render-state outcomes with nullish aria', () => {
    assertHiddenLegendModifierNoOpRenderState('Esc')
  })

  it('keeps hidden Escape as no-op render-state when event is defaultPrevented or repeat', () => {
    assertHiddenLegendEventGateNoOpRenderState('Escape')
  })

  it('keeps hidden Esc alias as no-op render-state when event is defaultPrevented or repeat', () => {
    assertHiddenLegendEventGateNoOpRenderState('Esc')
  })

  it('keeps hidden Escape as no-op render-state when target is editable', () => {
    assertHiddenEditableLegendNoOpRenderState('Escape', false, false)
  })

  it('keeps hidden Escape as no-op render-state when target is editable and event is defaultPrevented or repeat', () => {
    assertHiddenEditableLegendEventGateNoOpRenderState('Escape')
  })

  it('keeps hidden Esc alias as no-op render-state when target is editable', () => {
    assertHiddenEditableLegendNoOpRenderState('Esc', false, false)
  })

  it('keeps hidden Esc alias as no-op render-state when target is editable and event is defaultPrevented or repeat', () => {
    assertHiddenEditableLegendEventGateNoOpRenderState('Esc')
  })

  it('keeps shown Escape as no-op render-state when target is editable and event is defaultPrevented or repeat', () => {
    assertShownEditableNonShiftLegendEventGateNoOp('Escape')
  })

  it('keeps shown Escape/Esc with modifier keys as no-op render-state outcomes with nullish aria', () => {
    assertShownLegendModifierNoOpRenderState('Escape')
    assertShownLegendModifierNoOpRenderState('Esc')
  })

  it('keeps shown Esc alias as no-op render-state when target is editable and event is defaultPrevented or repeat', () => {
    assertShownEditableNonShiftLegendEventGateNoOp('Esc')
  })

  it('keeps shown Escape and Esc alias as no-op render-state when event is defaultPrevented or repeat', () => {
    assertShownLegendEventGateNoOpRenderState('Escape')
    assertShownLegendEventGateNoOpRenderState('Esc')
  })

  it('keeps shown Escape/Esc with shiftKey=true as no-op render-state parity with nullish aria and stable aria-expanded', () => {
    assertShownLegendNoOpRenderState('Escape', true)
    assertShownLegendNoOpRenderState('Esc', true)
  })

  it('keeps shown Escape/Esc editable-target modifier-key paths as no-op render-state outcomes', () => {
    assertShownEditableLegendModifierNoOp('Escape')
    assertShownEditableLegendModifierNoOp('Esc')
  })

  it('keeps shown Escape with shiftKey=true editable-target modifier-key paths as no-op dispatch/render-state outcomes', () => {
    assertShownEditableShiftLegendModifierNoOp('Escape')
  })
  it('keeps shown Esc alias with shiftKey=true editable-target modifier-key paths as no-op dispatch/render-state outcomes', () => {
    assertShownEditableShiftLegendModifierNoOp('Esc')
  })
  it('keeps shown Escape with shiftKey=true editable-target modifier+event-gate paths as no-op dispatch/render-state outcomes', () => {
    assertShownEditableShiftLegendModifierEventGateNoOp('Escape')
  })

  it('keeps shown Esc alias with shiftKey=true editable-target modifier+event-gate paths as no-op dispatch/render-state outcomes', () => {
    assertShownEditableShiftLegendModifierEventGateNoOp('Esc')
  })

  it('keeps shown Escape/Esc with shiftKey=true non-editable modifier+event-gate paths as no-op dispatch/render-state outcomes', () => {
    assertShownShiftLegendNonEditableModifierEventGateNoOp('Escape')
    assertShownShiftLegendNonEditableModifierEventGateNoOp('Esc')
  })

  it('keeps plain Slash (without Shift) as a no-op for hidden and shown legend states', () => {
    assertPlainSlashNoOp(false)
    assertPlainSlashNoOp(true)
  })
})
