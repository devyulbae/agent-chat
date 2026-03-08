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

const assertShownEditableLegendNoOpDispatch = (
  key: 'Escape' | 'Esc',
  defaultPrevented: boolean,
  repeat: boolean,
) => {
  const shownEditableNoOpDispatch = getThreadShortcutLegendKeyboardDispatchOutcome({
    isVisible: true,
    key,
    shiftKey: true,
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
  defaultPrevented: boolean,
  repeat: boolean,
) => {
  const shownEditableNoOpRenderState = getThreadShortcutLegendKeyboardRenderState({
    isVisible: true,
    key,
    shiftKey: true,
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



const assertShownLegendModifierNoOpRenderState = (key: 'Escape' | 'Esc') => {
  const modifierCases = [
    { metaKey: true, ctrlKey: false, altKey: false },
    { metaKey: false, ctrlKey: true, altKey: false },
    { metaKey: false, ctrlKey: false, altKey: true },
  ]

  modifierCases.forEach(({ metaKey, ctrlKey, altKey }) => {
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

const assertShownEditableLegendModifierNoOp = (key: 'Escape' | 'Esc') => {
  const modifierCases = [
    { metaKey: true, ctrlKey: false, altKey: false },
    { metaKey: false, ctrlKey: true, altKey: false },
    { metaKey: false, ctrlKey: false, altKey: true },
  ]

  modifierCases.forEach(({ metaKey, ctrlKey, altKey }) => {
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
  const ignoredShownEditableMetaShiftDispatch = getThreadShortcutLegendKeyboardDispatchOutcome({
    isVisible: true,
    key,
    shiftKey: true,
    metaKey: true,
    ctrlKey: false,
    altKey: false,
    defaultPrevented: false,
    repeat: false,
    isEditableTarget: true,
  })
  expect(ignoredShownEditableMetaShiftDispatch).toEqual({
    handled: false,
    nextVisibility: true,
    statusHint: null,
  })

  const ignoredShownEditableCtrlShiftDispatch = getThreadShortcutLegendKeyboardDispatchOutcome({
    isVisible: true,
    key,
    shiftKey: true,
    metaKey: false,
    ctrlKey: true,
    altKey: false,
    defaultPrevented: false,
    repeat: false,
    isEditableTarget: true,
  })
  expect(ignoredShownEditableCtrlShiftDispatch).toEqual({
    handled: false,
    nextVisibility: true,
    statusHint: null,
  })

  const ignoredShownEditableAltShiftDispatch = getThreadShortcutLegendKeyboardDispatchOutcome({
    isVisible: true,
    key,
    shiftKey: true,
    metaKey: false,
    ctrlKey: false,
    altKey: true,
    defaultPrevented: false,
    repeat: false,
    isEditableTarget: true,
  })
  expect(ignoredShownEditableAltShiftDispatch).toEqual({
    handled: false,
    nextVisibility: true,
    statusHint: null,
  })

  const ignoredShownEditableMetaShiftRenderState = getThreadShortcutLegendKeyboardRenderState({
    isVisible: true,
    key,
    shiftKey: true,
    metaKey: true,
    ctrlKey: false,
    altKey: false,
    defaultPrevented: false,
    repeat: false,
    isEditableTarget: true,
  })
  expect(ignoredShownEditableMetaShiftRenderState.handled).toBe(false)
  expect(ignoredShownEditableMetaShiftRenderState.nextVisibility).toBe(true)
  expect(ignoredShownEditableMetaShiftRenderState.statusHint).toBeNull()
  expect(ignoredShownEditableMetaShiftRenderState.statusAriaLabel ?? null).toBeNull()

  const ignoredShownEditableCtrlShiftRenderState = getThreadShortcutLegendKeyboardRenderState({
    isVisible: true,
    key,
    shiftKey: true,
    metaKey: false,
    ctrlKey: true,
    altKey: false,
    defaultPrevented: false,
    repeat: false,
    isEditableTarget: true,
  })
  expect(ignoredShownEditableCtrlShiftRenderState.handled).toBe(false)
  expect(ignoredShownEditableCtrlShiftRenderState.nextVisibility).toBe(true)
  expect(ignoredShownEditableCtrlShiftRenderState.statusHint).toBeNull()
  expect(ignoredShownEditableCtrlShiftRenderState.statusAriaLabel ?? null).toBeNull()

  const ignoredShownEditableAltShiftRenderState = getThreadShortcutLegendKeyboardRenderState({
    isVisible: true,
    key,
    shiftKey: true,
    metaKey: false,
    ctrlKey: false,
    altKey: true,
    defaultPrevented: false,
    repeat: false,
    isEditableTarget: true,
  })
  expect(ignoredShownEditableAltShiftRenderState.handled).toBe(false)
  expect(ignoredShownEditableAltShiftRenderState.nextVisibility).toBe(true)
  expect(ignoredShownEditableAltShiftRenderState.statusHint).toBeNull()
  expect(ignoredShownEditableAltShiftRenderState.statusAriaLabel ?? null).toBeNull()

  const shownNoOpPresentation = getThreadShortcutLegendPresentation(
    ignoredShownEditableAltShiftRenderState.nextVisibility,
  )
  expect(shownNoOpPresentation.ariaExpanded).toBe(ignoredShownEditableAltShiftRenderState.nextVisibility)
}

const assertShownEditableShiftLegendModifierEventGateNoOp = (key: 'Escape' | 'Esc') => {
  const dispatchNoOpCases = [
    { metaKey: true, ctrlKey: false, altKey: false, defaultPrevented: true, repeat: false },
    { metaKey: false, ctrlKey: true, altKey: false, defaultPrevented: false, repeat: true },
  ]

  dispatchNoOpCases.forEach(({ metaKey, ctrlKey, altKey, defaultPrevented, repeat }) => {
    const noOpDispatch = getThreadShortcutLegendKeyboardDispatchOutcome({
      isVisible: true,
      key,
      shiftKey: true,
      metaKey,
      ctrlKey,
      altKey,
      defaultPrevented,
      repeat,
      isEditableTarget: true,
    })
    expect(noOpDispatch).toEqual({
      handled: false,
      nextVisibility: true,
      statusHint: null,
    })
  })

  const renderStateNoOpCases = [
    { metaKey: false, ctrlKey: false, altKey: true, defaultPrevented: true, repeat: false },
    { metaKey: true, ctrlKey: false, altKey: false, defaultPrevented: false, repeat: true },
  ]

  renderStateNoOpCases.forEach(({ metaKey, ctrlKey, altKey, defaultPrevented, repeat }) => {
    const noOpRenderState = getThreadShortcutLegendKeyboardRenderState({
      isVisible: true,
      key,
      shiftKey: true,
      metaKey,
      ctrlKey,
      altKey,
      defaultPrevented,
      repeat,
      isEditableTarget: true,
    })
    expect(noOpRenderState.handled).toBe(false)
    expect(noOpRenderState.nextVisibility).toBe(true)
    expect(noOpRenderState.statusHint).toBeNull()
    expect(noOpRenderState.statusAriaLabel ?? null).toBeNull()
  })

  const shownNoOpPresentation = getThreadShortcutLegendPresentation(true)
  expect(shownNoOpPresentation.ariaExpanded).toBe(true)
}

const assertShownShiftLegendNonEditableModifierEventGateNoOp = (key: 'Escape' | 'Esc') => {
  const dispatchNoOpCases = [
    { metaKey: true, ctrlKey: false, altKey: false, defaultPrevented: true, repeat: false },
    { metaKey: false, ctrlKey: true, altKey: false, defaultPrevented: false, repeat: true },
  ]

  dispatchNoOpCases.forEach(({ metaKey, ctrlKey, altKey, defaultPrevented, repeat }) => {
    const noOpDispatch = getThreadShortcutLegendKeyboardDispatchOutcome({
      isVisible: true,
      key,
      shiftKey: true,
      metaKey,
      ctrlKey,
      altKey,
      defaultPrevented,
      repeat,
      isEditableTarget: false,
    })
    expect(noOpDispatch).toEqual({
      handled: false,
      nextVisibility: true,
      statusHint: null,
    })
  })

  const renderStateNoOpCases = [
    { metaKey: false, ctrlKey: false, altKey: true, defaultPrevented: true, repeat: false },
    { metaKey: true, ctrlKey: false, altKey: false, defaultPrevented: false, repeat: true },
  ]

  renderStateNoOpCases.forEach(({ metaKey, ctrlKey, altKey, defaultPrevented, repeat }) => {
    const noOpRenderState = getThreadShortcutLegendKeyboardRenderState({
      isVisible: true,
      key,
      shiftKey: true,
      metaKey,
      ctrlKey,
      altKey,
      defaultPrevented,
      repeat,
      isEditableTarget: false,
    })
    expect(noOpRenderState.handled).toBe(false)
    expect(noOpRenderState.nextVisibility).toBe(true)
    expect(noOpRenderState.statusHint).toBeNull()
    expect(noOpRenderState.statusAriaLabel ?? null).toBeNull()
  })

  const shownNoOpPresentation = getThreadShortcutLegendPresentation(true)
  expect(shownNoOpPresentation.ariaExpanded).toBe(true)
}

describe('thread shortcut legend lifecycle presentation (main integration)', () => {
  it('keeps status hint and aria-keyshortcuts synchronized across hidden → shown → hidden transitions', () => {
    const hiddenBeforeToggle = getThreadShortcutLegendPresentation(false)
    expect(hiddenBeforeToggle.ariaExpanded).toBe(false)
    expect(hiddenBeforeToggle.buttonAriaKeyshortcuts).toBe('Shift+Slash')
    expect(hiddenBeforeToggle.regionAriaKeyshortcuts).toBe(
      'J K ArrowUp ArrowDown Home End PageUp PageDown Shift+End Shift+PageDown U N P Shift+U Z Shift+Home Shift+R Slash C Y Escape Esc',
    )
    expect(hiddenBeforeToggle.statusHint).toBe('Thread shortcut legend hidden (Esc).')

    const shownAfterQuestionToggle = getThreadShortcutLegendPresentation(true)
    expect(shownAfterQuestionToggle.ariaExpanded).toBe(true)
    expect(shownAfterQuestionToggle.buttonAriaKeyshortcuts).toBe('Shift+Slash Escape Esc')
    expect(shownAfterQuestionToggle.regionAriaKeyshortcuts).toBe(
      hiddenBeforeToggle.regionAriaKeyshortcuts,
    )
    expect(shownAfterQuestionToggle.statusHint).toBe('Thread shortcut legend shown (? / Shift+/).')

    const hiddenAfterEscDismiss = getThreadShortcutLegendPresentation(false)
    expect(hiddenAfterEscDismiss.ariaExpanded).toBe(false)
    expect(hiddenAfterEscDismiss.buttonAriaKeyshortcuts).toBe('Shift+Slash')
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
        'J K ArrowUp ArrowDown Home End PageUp PageDown Shift+End Shift+PageDown U N P Shift+U Z Shift+Home Shift+R Slash C Y Escape Esc',
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
    expect(hiddenBeforeTogglePresentation.buttonAriaKeyshortcuts).toBe('Shift+Slash')

    const shownTransition = getThreadShortcutLegendKeyboardTransition(false, '?', false)
    expect(shownTransition.nextVisibility).toBe(true)

    const shownChip = getShortcutChipPropsFromHint(shownTransition.statusHint, 'filter jump', 'thread-jump')
    const shownStatusAria = getStatusAriaLabelWithShortcutChip(shownTransition.statusHint, shownChip)
    const shownPresentation = getThreadShortcutLegendPresentation(shownTransition.nextVisibility)

    expect(shownStatusAria).toContain('Thread shortcut legend shown (? / Shift+/).')
    expect(shownStatusAria).toContain('Shortcut badge /: Slash (filter jump).')
    expect(shownPresentation.buttonAriaKeyshortcuts).toBe('Shift+Slash Escape Esc')

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
    expect(hiddenPresentation.buttonAriaKeyshortcuts).toBe('Shift+Slash')
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
    const ignoredHiddenDefaultPreventedEscAliasDispatch = getThreadShortcutLegendKeyboardDispatchOutcome({
      isVisible: false,
      key: 'Esc',
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      defaultPrevented: true,
      repeat: false,
      isEditableTarget: false,
    })
    expect(ignoredHiddenDefaultPreventedEscAliasDispatch).toEqual({
      handled: false,
      nextVisibility: false,
      statusHint: null,
    })

    const ignoredHiddenRepeatEscAliasDispatch = getThreadShortcutLegendKeyboardDispatchOutcome({
      isVisible: false,
      key: 'Esc',
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      defaultPrevented: false,
      repeat: true,
      isEditableTarget: false,
    })
    expect(ignoredHiddenRepeatEscAliasDispatch).toEqual({
      handled: false,
      nextVisibility: false,
      statusHint: null,
    })
  })

  it('keeps hidden Escape as no-op dispatch when event is defaultPrevented or repeat', () => {
    const ignoredHiddenDefaultPreventedEscapeDispatch = getThreadShortcutLegendKeyboardDispatchOutcome({
      isVisible: false,
      key: 'Escape',
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      defaultPrevented: true,
      repeat: false,
      isEditableTarget: false,
    })
    expect(ignoredHiddenDefaultPreventedEscapeDispatch).toEqual({
      handled: false,
      nextVisibility: false,
      statusHint: null,
    })

    const ignoredHiddenRepeatEscapeDispatch = getThreadShortcutLegendKeyboardDispatchOutcome({
      isVisible: false,
      key: 'Escape',
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      defaultPrevented: false,
      repeat: true,
      isEditableTarget: false,
    })
    expect(ignoredHiddenRepeatEscapeDispatch).toEqual({
      handled: false,
      nextVisibility: false,
      statusHint: null,
    })
  })

  it('keeps hidden Escape as no-op dispatch when target is editable', () => {
    const ignoredHiddenEditableEscapeDispatch = getThreadShortcutLegendKeyboardDispatchOutcome({
      isVisible: false,
      key: 'Escape',
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      defaultPrevented: false,
      repeat: false,
      isEditableTarget: true,
    })
    expect(ignoredHiddenEditableEscapeDispatch).toEqual({
      handled: false,
      nextVisibility: false,
      statusHint: null,
    })
  })

  it('keeps hidden Escape as no-op dispatch when target is editable and event is defaultPrevented or repeat', () => {
    const ignoredHiddenEditableDefaultPreventedEscapeDispatch =
      getThreadShortcutLegendKeyboardDispatchOutcome({
        isVisible: false,
        key: 'Escape',
        shiftKey: false,
        metaKey: false,
        ctrlKey: false,
        altKey: false,
        defaultPrevented: true,
        repeat: false,
        isEditableTarget: true,
      })
    expect(ignoredHiddenEditableDefaultPreventedEscapeDispatch).toEqual({
      handled: false,
      nextVisibility: false,
      statusHint: null,
    })

    const ignoredHiddenEditableRepeatEscapeDispatch = getThreadShortcutLegendKeyboardDispatchOutcome({
      isVisible: false,
      key: 'Escape',
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      defaultPrevented: false,
      repeat: true,
      isEditableTarget: true,
    })
    expect(ignoredHiddenEditableRepeatEscapeDispatch).toEqual({
      handled: false,
      nextVisibility: false,
      statusHint: null,
    })
  })

  it('keeps hidden Esc alias as no-op dispatch when target is editable', () => {
    const ignoredHiddenEditableEscAliasDispatch = getThreadShortcutLegendKeyboardDispatchOutcome({
      isVisible: false,
      key: 'Esc',
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      defaultPrevented: false,
      repeat: false,
      isEditableTarget: true,
    })
    expect(ignoredHiddenEditableEscAliasDispatch).toEqual({
      handled: false,
      nextVisibility: false,
      statusHint: null,
    })
  })

  it('keeps hidden Esc alias as no-op dispatch when target is editable and event is defaultPrevented or repeat', () => {
    const ignoredHiddenEditableDefaultPreventedEscAliasDispatch =
      getThreadShortcutLegendKeyboardDispatchOutcome({
        isVisible: false,
        key: 'Esc',
        shiftKey: false,
        metaKey: false,
        ctrlKey: false,
        altKey: false,
        defaultPrevented: true,
        repeat: false,
        isEditableTarget: true,
      })
    expect(ignoredHiddenEditableDefaultPreventedEscAliasDispatch).toEqual({
      handled: false,
      nextVisibility: false,
      statusHint: null,
    })

    const ignoredHiddenEditableRepeatEscAliasDispatch =
      getThreadShortcutLegendKeyboardDispatchOutcome({
        isVisible: false,
        key: 'Esc',
        shiftKey: false,
        metaKey: false,
        ctrlKey: false,
        altKey: false,
        defaultPrevented: false,
        repeat: true,
        isEditableTarget: true,
      })
    expect(ignoredHiddenEditableRepeatEscAliasDispatch).toEqual({
      handled: false,
      nextVisibility: false,
      statusHint: null,
    })
  })

  it('keeps shown Escape as no-op dispatch when target is editable and event is defaultPrevented or repeat', () => {
    const ignoredShownEditableDefaultPreventedEscapeDispatch =
      getThreadShortcutLegendKeyboardDispatchOutcome({
        isVisible: true,
        key: 'Escape',
        shiftKey: false,
        metaKey: false,
        ctrlKey: false,
        altKey: false,
        defaultPrevented: true,
        repeat: false,
        isEditableTarget: true,
      })
    expect(ignoredShownEditableDefaultPreventedEscapeDispatch).toEqual({
      handled: false,
      nextVisibility: true,
      statusHint: null,
    })

    const ignoredShownEditableRepeatEscapeDispatch =
      getThreadShortcutLegendKeyboardDispatchOutcome({
        isVisible: true,
        key: 'Escape',
        shiftKey: false,
        metaKey: false,
        ctrlKey: false,
        altKey: false,
        defaultPrevented: false,
        repeat: true,
        isEditableTarget: true,
      })
    expect(ignoredShownEditableRepeatEscapeDispatch).toEqual({
      handled: false,
      nextVisibility: true,
      statusHint: null,
    })
  })

  it('keeps shown Esc alias as no-op dispatch when target is editable and event is defaultPrevented or repeat', () => {
    const ignoredShownEditableDefaultPreventedEscAliasDispatch =
      getThreadShortcutLegendKeyboardDispatchOutcome({
        isVisible: true,
        key: 'Esc',
        shiftKey: false,
        metaKey: false,
        ctrlKey: false,
        altKey: false,
        defaultPrevented: true,
        repeat: false,
        isEditableTarget: true,
      })
    expect(ignoredShownEditableDefaultPreventedEscAliasDispatch).toEqual({
      handled: false,
      nextVisibility: true,
      statusHint: null,
    })

    const ignoredShownEditableRepeatEscAliasDispatch =
      getThreadShortcutLegendKeyboardDispatchOutcome({
        isVisible: true,
        key: 'Esc',
        shiftKey: false,
        metaKey: false,
        ctrlKey: false,
        altKey: false,
        defaultPrevented: false,
        repeat: true,
        isEditableTarget: true,
      })
    expect(ignoredShownEditableRepeatEscAliasDispatch).toEqual({
      handled: false,
      nextVisibility: true,
      statusHint: null,
    })
  })

  it('keeps shown Escape/Esc as no-op dispatch when event is defaultPrevented or repeat', () => {
    const ignoredShownDefaultPreventedEscapeDispatch = getThreadShortcutLegendKeyboardDispatchOutcome({
      isVisible: true,
      key: 'Escape',
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      defaultPrevented: true,
      repeat: false,
      isEditableTarget: false,
    })
    expect(ignoredShownDefaultPreventedEscapeDispatch).toEqual({
      handled: false,
      nextVisibility: true,
      statusHint: null,
    })

    const ignoredShownRepeatEscapeDispatch = getThreadShortcutLegendKeyboardDispatchOutcome({
      isVisible: true,
      key: 'Escape',
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      defaultPrevented: false,
      repeat: true,
      isEditableTarget: false,
    })
    expect(ignoredShownRepeatEscapeDispatch).toEqual({
      handled: false,
      nextVisibility: true,
      statusHint: null,
    })

    const ignoredShownDefaultPreventedEscAliasDispatch =
      getThreadShortcutLegendKeyboardDispatchOutcome({
        isVisible: true,
        key: 'Esc',
        shiftKey: false,
        metaKey: false,
        ctrlKey: false,
        altKey: false,
        defaultPrevented: true,
        repeat: false,
        isEditableTarget: false,
      })
    expect(ignoredShownDefaultPreventedEscAliasDispatch).toEqual({
      handled: false,
      nextVisibility: true,
      statusHint: null,
    })

    const ignoredShownRepeatEscAliasDispatch = getThreadShortcutLegendKeyboardDispatchOutcome({
      isVisible: true,
      key: 'Esc',
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      defaultPrevented: false,
      repeat: true,
      isEditableTarget: false,
    })
    expect(ignoredShownRepeatEscAliasDispatch).toEqual({
      handled: false,
      nextVisibility: true,
      statusHint: null,
    })
  })

  it('keeps shown Escape with shiftKey=true as no-op dispatch outcome with stable aria-expanded presentation parity', () => {
    const ignoredShownEscapeShiftDispatch = getThreadShortcutLegendKeyboardDispatchOutcome({
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
    expect(ignoredShownEscapeShiftDispatch).toEqual({
      handled: false,
      nextVisibility: true,
      statusHint: null,
    })

    const shownNoOpPresentation = getThreadShortcutLegendPresentation(
      ignoredShownEscapeShiftDispatch.nextVisibility,
    )
    expect(shownNoOpPresentation.ariaExpanded).toBe(ignoredShownEscapeShiftDispatch.nextVisibility)
  })

  it('keeps shown Esc alias with shiftKey=true as no-op dispatch outcome with stable aria-expanded presentation parity', () => {
    const ignoredShownEscAliasShiftDispatch = getThreadShortcutLegendKeyboardDispatchOutcome({
      isVisible: true,
      key: 'Esc',
      shiftKey: true,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      defaultPrevented: false,
      repeat: false,
      isEditableTarget: false,
    })
    expect(ignoredShownEscAliasShiftDispatch).toEqual({
      handled: false,
      nextVisibility: true,
      statusHint: null,
    })

    const shownNoOpPresentation = getThreadShortcutLegendPresentation(
      ignoredShownEscAliasShiftDispatch.nextVisibility,
    )
    expect(shownNoOpPresentation.ariaExpanded).toBe(ignoredShownEscAliasShiftDispatch.nextVisibility)
  })

  it('keeps shown Escape with shiftKey=true as no-op dispatch/render-state when target is editable', () => {
    const ignoredShownEditableEscapeShiftDispatch = getThreadShortcutLegendKeyboardDispatchOutcome({
      isVisible: true,
      key: 'Escape',
      shiftKey: true,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      defaultPrevented: false,
      repeat: false,
      isEditableTarget: true,
    })
    expect(ignoredShownEditableEscapeShiftDispatch).toEqual({
      handled: false,
      nextVisibility: true,
      statusHint: null,
    })

    const ignoredShownEditableEscapeShiftRenderState = getThreadShortcutLegendKeyboardRenderState({
      isVisible: true,
      key: 'Escape',
      shiftKey: true,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      defaultPrevented: false,
      repeat: false,
      isEditableTarget: true,
    })
    expect(ignoredShownEditableEscapeShiftRenderState.handled).toBe(false)
    expect(ignoredShownEditableEscapeShiftRenderState.nextVisibility).toBe(true)
    expect(ignoredShownEditableEscapeShiftRenderState.statusHint).toBeNull()
    expect(ignoredShownEditableEscapeShiftRenderState.statusAriaLabel ?? null).toBeNull()

    const shownNoOpPresentation = getThreadShortcutLegendPresentation(
      ignoredShownEditableEscapeShiftRenderState.nextVisibility,
    )
    expect(shownNoOpPresentation.ariaExpanded).toBe(
      ignoredShownEditableEscapeShiftRenderState.nextVisibility,
    )
  })

  it('keeps shown Escape with shiftKey=true as no-op for editable target when event is defaultPrevented or repeat', () => {
    assertShownEditableLegendNoOpDispatch('Escape', true, false)
    assertShownEditableLegendNoOpDispatch('Escape', false, true)

    assertShownEditableLegendNoOpRenderState('Escape', true, false)
    assertShownEditableLegendNoOpRenderState('Escape', false, true)
  })

  it('keeps shown Esc alias with shiftKey=true as no-op for editable target when event is defaultPrevented or repeat', () => {
    assertShownEditableLegendNoOpDispatch('Esc', true, false)
    assertShownEditableLegendNoOpDispatch('Esc', false, true)

    assertShownEditableLegendNoOpRenderState('Esc', true, false)
    assertShownEditableLegendNoOpRenderState('Esc', false, true)
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
    const ignoredHiddenMetaEscape = getThreadShortcutLegendKeyboardRenderState({
      isVisible: false,
      key: 'Escape',
      shiftKey: false,
      metaKey: true,
      ctrlKey: false,
      altKey: false,
      defaultPrevented: false,
      repeat: false,
      isEditableTarget: false,
    })
    expect(ignoredHiddenMetaEscape.handled).toBe(false)
    expect(ignoredHiddenMetaEscape.nextVisibility).toBe(false)
    expect(ignoredHiddenMetaEscape.statusHint).toBeNull()
    expect(ignoredHiddenMetaEscape.statusAriaLabel ?? null).toBeNull()

    const ignoredHiddenCtrlEscape = getThreadShortcutLegendKeyboardRenderState({
      isVisible: false,
      key: 'Escape',
      shiftKey: false,
      metaKey: false,
      ctrlKey: true,
      altKey: false,
      defaultPrevented: false,
      repeat: false,
      isEditableTarget: false,
    })
    expect(ignoredHiddenCtrlEscape.handled).toBe(false)
    expect(ignoredHiddenCtrlEscape.nextVisibility).toBe(false)
    expect(ignoredHiddenCtrlEscape.statusHint).toBeNull()
    expect(ignoredHiddenCtrlEscape.statusAriaLabel ?? null).toBeNull()

    const ignoredHiddenAltEscape = getThreadShortcutLegendKeyboardRenderState({
      isVisible: false,
      key: 'Escape',
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
      altKey: true,
      defaultPrevented: false,
      repeat: false,
      isEditableTarget: false,
    })
    expect(ignoredHiddenAltEscape.handled).toBe(false)
    expect(ignoredHiddenAltEscape.nextVisibility).toBe(false)
    expect(ignoredHiddenAltEscape.statusHint).toBeNull()
    expect(ignoredHiddenAltEscape.statusAriaLabel ?? null).toBeNull()
  })

  it('keeps hidden Esc alias with modifier keys as no-op render-state outcomes with nullish aria', () => {
    const ignoredHiddenMetaEscAlias = getThreadShortcutLegendKeyboardRenderState({
      isVisible: false,
      key: 'Esc',
      shiftKey: false,
      metaKey: true,
      ctrlKey: false,
      altKey: false,
      defaultPrevented: false,
      repeat: false,
      isEditableTarget: false,
    })
    expect(ignoredHiddenMetaEscAlias.handled).toBe(false)
    expect(ignoredHiddenMetaEscAlias.nextVisibility).toBe(false)
    expect(ignoredHiddenMetaEscAlias.statusHint).toBeNull()
    expect(ignoredHiddenMetaEscAlias.statusAriaLabel ?? null).toBeNull()

    const ignoredHiddenCtrlEscAlias = getThreadShortcutLegendKeyboardRenderState({
      isVisible: false,
      key: 'Esc',
      shiftKey: false,
      metaKey: false,
      ctrlKey: true,
      altKey: false,
      defaultPrevented: false,
      repeat: false,
      isEditableTarget: false,
    })
    expect(ignoredHiddenCtrlEscAlias.handled).toBe(false)
    expect(ignoredHiddenCtrlEscAlias.nextVisibility).toBe(false)
    expect(ignoredHiddenCtrlEscAlias.statusHint).toBeNull()
    expect(ignoredHiddenCtrlEscAlias.statusAriaLabel ?? null).toBeNull()

    const ignoredHiddenAltEscAlias = getThreadShortcutLegendKeyboardRenderState({
      isVisible: false,
      key: 'Esc',
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
      altKey: true,
      defaultPrevented: false,
      repeat: false,
      isEditableTarget: false,
    })
    expect(ignoredHiddenAltEscAlias.handled).toBe(false)
    expect(ignoredHiddenAltEscAlias.nextVisibility).toBe(false)
    expect(ignoredHiddenAltEscAlias.statusHint).toBeNull()
    expect(ignoredHiddenAltEscAlias.statusAriaLabel ?? null).toBeNull()
  })

  it('keeps hidden Escape as no-op render-state when event is defaultPrevented or repeat', () => {
    const ignoredHiddenDefaultPreventedEscape = getThreadShortcutLegendKeyboardRenderState({
      isVisible: false,
      key: 'Escape',
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      defaultPrevented: true,
      repeat: false,
      isEditableTarget: false,
    })
    expect(ignoredHiddenDefaultPreventedEscape.handled).toBe(false)
    expect(ignoredHiddenDefaultPreventedEscape.nextVisibility).toBe(false)
    expect(ignoredHiddenDefaultPreventedEscape.statusHint).toBeNull()
    expect(ignoredHiddenDefaultPreventedEscape.statusAriaLabel ?? null).toBeNull()

    const ignoredHiddenRepeatEscape = getThreadShortcutLegendKeyboardRenderState({
      isVisible: false,
      key: 'Escape',
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      defaultPrevented: false,
      repeat: true,
      isEditableTarget: false,
    })
    expect(ignoredHiddenRepeatEscape.handled).toBe(false)
    expect(ignoredHiddenRepeatEscape.nextVisibility).toBe(false)
    expect(ignoredHiddenRepeatEscape.statusHint).toBeNull()
    expect(ignoredHiddenRepeatEscape.statusAriaLabel ?? null).toBeNull()
  })

  it('keeps hidden Esc alias as no-op render-state when event is defaultPrevented or repeat', () => {
    const ignoredHiddenDefaultPreventedEscAlias = getThreadShortcutLegendKeyboardRenderState({
      isVisible: false,
      key: 'Esc',
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      defaultPrevented: true,
      repeat: false,
      isEditableTarget: false,
    })
    expect(ignoredHiddenDefaultPreventedEscAlias.handled).toBe(false)
    expect(ignoredHiddenDefaultPreventedEscAlias.nextVisibility).toBe(false)
    expect(ignoredHiddenDefaultPreventedEscAlias.statusHint).toBeNull()
    expect(ignoredHiddenDefaultPreventedEscAlias.statusAriaLabel ?? null).toBeNull()

    const ignoredHiddenRepeatEscAlias = getThreadShortcutLegendKeyboardRenderState({
      isVisible: false,
      key: 'Esc',
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      defaultPrevented: false,
      repeat: true,
      isEditableTarget: false,
    })
    expect(ignoredHiddenRepeatEscAlias.handled).toBe(false)
    expect(ignoredHiddenRepeatEscAlias.nextVisibility).toBe(false)
    expect(ignoredHiddenRepeatEscAlias.statusHint).toBeNull()
    expect(ignoredHiddenRepeatEscAlias.statusAriaLabel ?? null).toBeNull()
  })

  it('keeps hidden Escape as no-op render-state when target is editable', () => {
    const ignoredHiddenEditableEscape = getThreadShortcutLegendKeyboardRenderState({
      isVisible: false,
      key: 'Escape',
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      defaultPrevented: false,
      repeat: false,
      isEditableTarget: true,
    })

    expect(ignoredHiddenEditableEscape.handled).toBe(false)
    expect(ignoredHiddenEditableEscape.nextVisibility).toBe(false)
    expect(ignoredHiddenEditableEscape.statusHint).toBeNull()
    expect(ignoredHiddenEditableEscape.statusAriaLabel ?? null).toBeNull()
  })

  it('keeps hidden Escape as no-op render-state when target is editable and event is defaultPrevented or repeat', () => {
    const ignoredHiddenEditableDefaultPreventedEscape = getThreadShortcutLegendKeyboardRenderState({
      isVisible: false,
      key: 'Escape',
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      defaultPrevented: true,
      repeat: false,
      isEditableTarget: true,
    })

    expect(ignoredHiddenEditableDefaultPreventedEscape.handled).toBe(false)
    expect(ignoredHiddenEditableDefaultPreventedEscape.nextVisibility).toBe(false)
    expect(ignoredHiddenEditableDefaultPreventedEscape.statusHint).toBeNull()
    expect(ignoredHiddenEditableDefaultPreventedEscape.statusAriaLabel ?? null).toBeNull()

    const ignoredHiddenEditableRepeatEscape = getThreadShortcutLegendKeyboardRenderState({
      isVisible: false,
      key: 'Escape',
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      defaultPrevented: false,
      repeat: true,
      isEditableTarget: true,
    })

    expect(ignoredHiddenEditableRepeatEscape.handled).toBe(false)
    expect(ignoredHiddenEditableRepeatEscape.nextVisibility).toBe(false)
    expect(ignoredHiddenEditableRepeatEscape.statusHint).toBeNull()
    expect(ignoredHiddenEditableRepeatEscape.statusAriaLabel ?? null).toBeNull()
  })

  it('keeps hidden Esc alias as no-op render-state when target is editable', () => {
    const ignoredHiddenEditableEscAlias = getThreadShortcutLegendKeyboardRenderState({
      isVisible: false,
      key: 'Esc',
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      defaultPrevented: false,
      repeat: false,
      isEditableTarget: true,
    })

    expect(ignoredHiddenEditableEscAlias.handled).toBe(false)
    expect(ignoredHiddenEditableEscAlias.nextVisibility).toBe(false)
    expect(ignoredHiddenEditableEscAlias.statusHint).toBeNull()
    expect(ignoredHiddenEditableEscAlias.statusAriaLabel ?? null).toBeNull()
  })

  it('keeps hidden Esc alias as no-op render-state when target is editable and event is defaultPrevented or repeat', () => {
    const ignoredHiddenEditableDefaultPreventedEscAlias = getThreadShortcutLegendKeyboardRenderState({
      isVisible: false,
      key: 'Esc',
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      defaultPrevented: true,
      repeat: false,
      isEditableTarget: true,
    })

    expect(ignoredHiddenEditableDefaultPreventedEscAlias.handled).toBe(false)
    expect(ignoredHiddenEditableDefaultPreventedEscAlias.nextVisibility).toBe(false)
    expect(ignoredHiddenEditableDefaultPreventedEscAlias.statusHint).toBeNull()
    expect(ignoredHiddenEditableDefaultPreventedEscAlias.statusAriaLabel ?? null).toBeNull()

    const ignoredHiddenEditableRepeatEscAlias = getThreadShortcutLegendKeyboardRenderState({
      isVisible: false,
      key: 'Esc',
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      defaultPrevented: false,
      repeat: true,
      isEditableTarget: true,
    })

    expect(ignoredHiddenEditableRepeatEscAlias.handled).toBe(false)
    expect(ignoredHiddenEditableRepeatEscAlias.nextVisibility).toBe(false)
    expect(ignoredHiddenEditableRepeatEscAlias.statusHint).toBeNull()
    expect(ignoredHiddenEditableRepeatEscAlias.statusAriaLabel ?? null).toBeNull()
  })

  it('keeps shown Escape as no-op render-state when target is editable and event is defaultPrevented or repeat', () => {
    const ignoredShownEditableDefaultPreventedEscape = getThreadShortcutLegendKeyboardRenderState({
      isVisible: true,
      key: 'Escape',
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      defaultPrevented: true,
      repeat: false,
      isEditableTarget: true,
    })

    expect(ignoredShownEditableDefaultPreventedEscape.handled).toBe(false)
    expect(ignoredShownEditableDefaultPreventedEscape.nextVisibility).toBe(true)
    expect(ignoredShownEditableDefaultPreventedEscape.statusHint).toBeNull()
    expect(ignoredShownEditableDefaultPreventedEscape.statusAriaLabel ?? null).toBeNull()

    const ignoredShownEditableRepeatEscape = getThreadShortcutLegendKeyboardRenderState({
      isVisible: true,
      key: 'Escape',
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      defaultPrevented: false,
      repeat: true,
      isEditableTarget: true,
    })

    expect(ignoredShownEditableRepeatEscape.handled).toBe(false)
    expect(ignoredShownEditableRepeatEscape.nextVisibility).toBe(true)
    expect(ignoredShownEditableRepeatEscape.statusHint).toBeNull()
    expect(ignoredShownEditableRepeatEscape.statusAriaLabel ?? null).toBeNull()
  })

  it('keeps shown Escape/Esc with modifier keys as no-op render-state outcomes with nullish aria', () => {
    assertShownLegendModifierNoOpRenderState('Escape')
    assertShownLegendModifierNoOpRenderState('Esc')
  })

  it('keeps shown Esc alias as no-op render-state when target is editable and event is defaultPrevented or repeat', () => {
    const ignoredShownEditableDefaultPreventedEscAlias = getThreadShortcutLegendKeyboardRenderState({
      isVisible: true,
      key: 'Esc',
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      defaultPrevented: true,
      repeat: false,
      isEditableTarget: true,
    })

    expect(ignoredShownEditableDefaultPreventedEscAlias.handled).toBe(false)
    expect(ignoredShownEditableDefaultPreventedEscAlias.nextVisibility).toBe(true)
    expect(ignoredShownEditableDefaultPreventedEscAlias.statusHint).toBeNull()
    expect(ignoredShownEditableDefaultPreventedEscAlias.statusAriaLabel ?? null).toBeNull()

    const ignoredShownEditableRepeatEscAlias = getThreadShortcutLegendKeyboardRenderState({
      isVisible: true,
      key: 'Esc',
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      defaultPrevented: false,
      repeat: true,
      isEditableTarget: true,
    })

    expect(ignoredShownEditableRepeatEscAlias.handled).toBe(false)
    expect(ignoredShownEditableRepeatEscAlias.nextVisibility).toBe(true)
    expect(ignoredShownEditableRepeatEscAlias.statusHint).toBeNull()
    expect(ignoredShownEditableRepeatEscAlias.statusAriaLabel ?? null).toBeNull()
  })

  it('keeps shown Escape and Esc alias as no-op render-state when event is defaultPrevented or repeat', () => {
    const ignoredShownDefaultPreventedEscape = getThreadShortcutLegendKeyboardRenderState({
      isVisible: true,
      key: 'Escape',
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      defaultPrevented: true,
      repeat: false,
      isEditableTarget: false,
    })
    expect(ignoredShownDefaultPreventedEscape.handled).toBe(false)
    expect(ignoredShownDefaultPreventedEscape.nextVisibility).toBe(true)
    expect(ignoredShownDefaultPreventedEscape.statusHint).toBeNull()
    expect(ignoredShownDefaultPreventedEscape.statusAriaLabel ?? null).toBeNull()

    const ignoredShownRepeatEscape = getThreadShortcutLegendKeyboardRenderState({
      isVisible: true,
      key: 'Escape',
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      defaultPrevented: false,
      repeat: true,
      isEditableTarget: false,
    })
    expect(ignoredShownRepeatEscape.handled).toBe(false)
    expect(ignoredShownRepeatEscape.nextVisibility).toBe(true)
    expect(ignoredShownRepeatEscape.statusHint).toBeNull()
    expect(ignoredShownRepeatEscape.statusAriaLabel ?? null).toBeNull()

    const ignoredShownDefaultPreventedEscAlias = getThreadShortcutLegendKeyboardRenderState({
      isVisible: true,
      key: 'Esc',
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      defaultPrevented: true,
      repeat: false,
      isEditableTarget: false,
    })
    expect(ignoredShownDefaultPreventedEscAlias.handled).toBe(false)
    expect(ignoredShownDefaultPreventedEscAlias.nextVisibility).toBe(true)
    expect(ignoredShownDefaultPreventedEscAlias.statusHint).toBeNull()
    expect(ignoredShownDefaultPreventedEscAlias.statusAriaLabel ?? null).toBeNull()

    const ignoredShownRepeatEscAlias = getThreadShortcutLegendKeyboardRenderState({
      isVisible: true,
      key: 'Esc',
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      defaultPrevented: false,
      repeat: true,
      isEditableTarget: false,
    })
    expect(ignoredShownRepeatEscAlias.handled).toBe(false)
    expect(ignoredShownRepeatEscAlias.nextVisibility).toBe(true)
    expect(ignoredShownRepeatEscAlias.statusHint).toBeNull()
    expect(ignoredShownRepeatEscAlias.statusAriaLabel ?? null).toBeNull()
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


})
