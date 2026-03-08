import { describe, expect, it } from 'vitest'

import {
  getThreadShortcutLegendKeyboardDispatchOutcome,
  getThreadShortcutLegendKeyboardRenderState,
  getThreadShortcutLegendKeyboardTransition,
  getThreadShortcutLegendPresentation,
  getThreadShortcutLegendRegionPresentation,
} from './main'
import { getShortcutChipPropsFromHint, getStatusAriaLabelWithShortcutChip } from './threadHintChips'


const assertLegendNoOpDispatchOutcome = (
  outcome: ReturnType<typeof getThreadShortcutLegendKeyboardDispatchOutcome>,
  nextVisibility: boolean,
) => {
  expect(outcome).toEqual({
    handled: false,
    nextVisibility,
    statusHint: null,
  })
}

const assertLegendNoOpRenderStateOutcome = (
  outcome: ReturnType<typeof getThreadShortcutLegendKeyboardRenderState>,
  nextVisibility: boolean,
) => {
  expect(outcome.handled).toBe(false)
  expect(outcome.nextVisibility).toBe(nextVisibility)
  expect(outcome.statusHint).toBeNull()
  expect(outcome.statusAriaLabel ?? null).toBeNull()
}

const assertLegendNoOpDispatchForInput = (
  input: Parameters<typeof getThreadShortcutLegendKeyboardDispatchOutcome>[0],
  nextVisibility: boolean,
) => {
  const outcome = getThreadShortcutLegendKeyboardDispatchOutcome(input)
  assertLegendNoOpDispatchOutcome(outcome, nextVisibility)
}

const assertLegendNoOpRenderStateForInput = (
  input: Parameters<typeof getThreadShortcutLegendKeyboardRenderState>[0],
  nextVisibility: boolean,
) => {
  const outcome = getThreadShortcutLegendKeyboardRenderState(input)
  assertLegendNoOpRenderStateOutcome(outcome, nextVisibility)
}

const assertLegendNoOpDispatchAndRenderStateForInput = (
  input: Parameters<typeof getThreadShortcutLegendKeyboardDispatchOutcome>[0],
  nextVisibility: boolean,
) => {
  assertLegendNoOpDispatchForInput(input, nextVisibility)
  assertLegendNoOpRenderStateForInput(input, nextVisibility)
}

const assertLegendNoOpDispatchPresentationParityForInput = (
  input: Parameters<typeof getThreadShortcutLegendKeyboardDispatchOutcome>[0],
  nextVisibility: boolean,
) => {
  assertLegendNoOpDispatchForInput(input, nextVisibility)
  const presentation = getThreadShortcutLegendPresentation(nextVisibility)
  expect(presentation.ariaExpanded).toBe(nextVisibility)
}

const assertLegendNoOpRenderStatePresentationParityForInput = (
  input: Parameters<typeof getThreadShortcutLegendKeyboardRenderState>[0],
  nextVisibility: boolean,
) => {
  const renderState = getThreadShortcutLegendKeyboardRenderState(input)
  assertLegendNoOpRenderStateOutcome(renderState, nextVisibility)
  const presentation = getThreadShortcutLegendPresentation(renderState.nextVisibility)
  expect(presentation.ariaExpanded).toBe(renderState.nextVisibility)
}

const assertLegendRenderStateShowHideLifecycle = (
  showKey: '?' | '/',
  showShiftKey: boolean,
  hideKey: 'Escape' | 'Esc',
) => {
  const shownRenderState = getThreadShortcutLegendKeyboardRenderState({
    isVisible: false,
    key: showKey,
    shiftKey: showShiftKey,
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
    key: hideKey,
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
}

const assertShownLegendNoOpByShiftAndEditable = (
  key: 'Escape' | 'Esc',
  shiftKey: boolean,
  isEditableTarget: boolean,
) => {
  const shownNoOpDispatch = getThreadShortcutLegendKeyboardDispatchOutcome({
    isVisible: true,
    key,
    shiftKey,
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    defaultPrevented: false,
    repeat: false,
    isEditableTarget,
  })
  assertLegendNoOpDispatchOutcome(shownNoOpDispatch, true)

  const shownNoOpRenderState = getThreadShortcutLegendKeyboardRenderState({
    isVisible: true,
    key,
    shiftKey,
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    defaultPrevented: false,
    repeat: false,
    isEditableTarget,
  })
  assertLegendNoOpRenderStateOutcome(shownNoOpRenderState, true)

  const shownNoOpPresentation = getThreadShortcutLegendPresentation(shownNoOpRenderState.nextVisibility)
  expect(shownNoOpPresentation.ariaExpanded).toBe(shownNoOpRenderState.nextVisibility)
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
  assertLegendNoOpDispatchOutcome(shownEditableNoOpDispatch, true)
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
  assertLegendNoOpRenderStateOutcome(shownEditableNoOpRenderState, true)

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

type ShownShiftModifierEventGateNoOpCase = {
  metaKey: boolean
  ctrlKey: boolean
  altKey: boolean
  defaultPrevented: boolean
  repeat: boolean
}

const shownShiftModifierEventGateDispatchNoOpCases = [
  { metaKey: true, ctrlKey: false, altKey: false, defaultPrevented: true, repeat: false },
  { metaKey: false, ctrlKey: true, altKey: false, defaultPrevented: false, repeat: true },
] as const satisfies readonly ShownShiftModifierEventGateNoOpCase[]

const shownShiftModifierEventGateRenderStateNoOpCases = [
  { metaKey: false, ctrlKey: false, altKey: true, defaultPrevented: true, repeat: false },
  { metaKey: true, ctrlKey: false, altKey: false, defaultPrevented: false, repeat: true },
] as const satisfies readonly ShownShiftModifierEventGateNoOpCase[]

const assertShownEditableLegendEventGateNoOpByShift = (
  key: 'Escape' | 'Esc',
  shiftKey: boolean,
) => {
  legendEventGateCases.forEach(({ defaultPrevented, repeat }) => {
    assertShownEditableLegendNoOpDispatch(key, shiftKey, defaultPrevented, repeat)
    assertShownEditableLegendNoOpRenderState(key, shiftKey, defaultPrevented, repeat)
  })
}

const assertShownEditableNonShiftLegendEventGateNoOp = (key: 'Escape' | 'Esc') => {
  assertShownEditableLegendEventGateNoOpByShift(key, false)
}

const assertShownEditableShiftLegendNoOp = (key: 'Escape' | 'Esc') => {
  assertShownLegendNoOpByShiftAndEditable(key, true, true)
}

const assertShownEditableShiftLegendEventGateNoOp = (key: 'Escape' | 'Esc') => {
  assertShownEditableLegendEventGateNoOpByShift(key, true)
}

const assertHiddenEditableLegendNoOpDispatch = (
  key: 'Escape' | 'Esc',
  defaultPrevented = false,
  repeat = false,
) => {
  assertLegendNoOpDispatchForInput(
    {
      isVisible: false,
      key,
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      defaultPrevented,
      repeat,
      isEditableTarget: true,
    },
    false,
  )
}

const assertHiddenEditableLegendNoOpRenderState = (
  key: 'Escape' | 'Esc',
  defaultPrevented: boolean,
  repeat: boolean,
) => {
  assertLegendNoOpRenderStateForInput(
    {
      isVisible: false,
      key,
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      defaultPrevented,
      repeat,
      isEditableTarget: true,
    },
    false,
  )
}

const assertHiddenEditableLegendEventGateNoOpRenderState = (key: 'Escape' | 'Esc') => {
  legendEventGateCases.forEach(({ defaultPrevented, repeat }) => {
    assertHiddenEditableLegendNoOpRenderState(key, defaultPrevented, repeat)
  })
}

const assertHiddenEditableLegendEventGateNoOp = (key: 'Escape' | 'Esc') => {
  legendEventGateCases.forEach(({ defaultPrevented, repeat }) => {
    assertHiddenEditableLegendNoOpDispatch(key, defaultPrevented, repeat)
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
  assertLegendNoOpDispatchOutcome(hiddenNoOpDispatch, false)
}

const assertHiddenLegendNoOpRenderState = (key: 'Escape' | 'Esc') => {
  assertLegendNoOpRenderStateForInput(
    {
      isVisible: false,
      key,
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      defaultPrevented: false,
      repeat: false,
      isEditableTarget: false,
    },
    false,
  )
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
    assertLegendNoOpRenderStateOutcome(ignoredHiddenRenderState, false)
  })
}

const assertLegendEventGateNoOpByVisibilityAndMode = (
  key: 'Escape' | 'Esc',
  isVisible: boolean,
  includeRenderState: boolean,
) => {
  assertLegendEventGateNoOpForInputBase(
    {
      isVisible,
      key,
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      isEditableTarget: false,
    },
    isVisible,
    includeRenderState,
  )
}

const assertHiddenLegendEventGateNoOp = (
  key: 'Escape' | 'Esc',
  includeRenderState: boolean,
) => {
  assertLegendEventGateNoOpByVisibilityAndMode(key, false, includeRenderState)
}

const assertShownLegendModifierNoOpByShiftAndEditable = (
  key: 'Escape' | 'Esc',
  shiftKey: boolean,
  isEditableTarget: boolean,
  includeRenderState: boolean,
) => {
  legendModifierCases.forEach(({ metaKey, ctrlKey, altKey }) => {
    const input = {
      isVisible: true,
      key,
      shiftKey,
      metaKey,
      ctrlKey,
      altKey,
      defaultPrevented: false,
      repeat: false,
      isEditableTarget,
    } satisfies Parameters<typeof getThreadShortcutLegendKeyboardDispatchOutcome>[0]

    if (includeRenderState) {
      assertLegendNoOpRenderStateForInput(input, true)
      return
    }

    assertLegendNoOpDispatchForInput(input, true)
  })

  const shownNoOpPresentation = getThreadShortcutLegendPresentation(true)
  expect(shownNoOpPresentation.ariaExpanded).toBe(true)
}

const assertShownLegendModifierNoOpDispatch = (key: 'Escape' | 'Esc') => {
  assertShownLegendModifierNoOpByShiftAndEditable(key, false, false, false)
}

const assertShownLegendModifierNoOpRenderState = (key: 'Escape' | 'Esc') => {
  assertShownLegendModifierNoOpByShiftAndEditable(key, false, false, true)
}

const assertShownLegendEventGateNoOpDispatch = (key: 'Escape' | 'Esc') => {
  assertLegendEventGateNoOpByVisibilityAndMode(key, true, false)
}

const assertShownLegendEventGateNoOpRenderState = (key: 'Escape' | 'Esc') => {
  assertLegendEventGateNoOpByVisibilityAndMode(key, true, true)
}

const assertLegendEventGateNoOpForInputBase = (
  inputBase: Omit<Parameters<typeof getThreadShortcutLegendKeyboardDispatchOutcome>[0], 'defaultPrevented' | 'repeat'>,
  nextVisibility: boolean,
  includeRenderState: boolean,
) => {
  legendEventGateCases.forEach(({ defaultPrevented, repeat }) => {
    const input = {
      ...inputBase,
      defaultPrevented,
      repeat,
    } satisfies Parameters<typeof getThreadShortcutLegendKeyboardDispatchOutcome>[0]

    if (includeRenderState) {
      assertLegendNoOpDispatchAndRenderStateForInput(input, nextVisibility)
      return
    }

    assertLegendNoOpDispatchForInput(input, nextVisibility)
  })
}

const assertShownEditableLegendModifierNoOpByShift = (
  key: 'Escape' | 'Esc',
  shiftKey: boolean,
) => {
  assertShownLegendModifierNoOpByShiftAndEditable(key, shiftKey, true, false)
  assertShownLegendModifierNoOpByShiftAndEditable(key, shiftKey, true, true)
}

const assertShownEditableLegendModifierNoOp = (key: 'Escape' | 'Esc') => {
  assertShownEditableLegendModifierNoOpByShift(key, false)
}

const assertShownEditableShiftLegendModifierNoOp = (key: 'Escape' | 'Esc') => {
  assertShownEditableLegendModifierNoOpByShift(key, true)
}

const assertShownShiftLegendModifierEventGateNoOpCase = (
  key: 'Escape' | 'Esc',
  isEditableTarget: boolean,
  caseInput: ShownShiftModifierEventGateNoOpCase,
  includeRenderState: boolean,
) => {
  const { metaKey, ctrlKey, altKey, defaultPrevented, repeat } = caseInput
  const input = {
    isVisible: true,
    key,
    shiftKey: true,
    metaKey,
    ctrlKey,
    altKey,
    defaultPrevented,
    repeat,
    isEditableTarget,
  } satisfies Parameters<typeof getThreadShortcutLegendKeyboardDispatchOutcome>[0]

  if (includeRenderState) {
    assertLegendNoOpRenderStateForInput(input, true)
    return
  }

  assertLegendNoOpDispatchForInput(input, true)
}

const assertShownShiftLegendModifierEventGateNoOp = (
  key: 'Escape' | 'Esc',
  isEditableTarget: boolean,
) => {
  shownShiftModifierEventGateDispatchNoOpCases.forEach((caseInput) => {
    assertShownShiftLegendModifierEventGateNoOpCase(key, isEditableTarget, caseInput, false)
  })

  shownShiftModifierEventGateRenderStateNoOpCases.forEach((caseInput) => {
    assertShownShiftLegendModifierEventGateNoOpCase(key, isEditableTarget, caseInput, true)
  })

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
  const plainSlashNoOpInput = {
    isVisible,
    key: '/',
    shiftKey: false,
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    defaultPrevented: false,
    repeat: false,
    isEditableTarget: false,
  } satisfies Parameters<typeof getThreadShortcutLegendKeyboardDispatchOutcome>[0]

  assertLegendNoOpDispatchAndRenderStateForInput(plainSlashNoOpInput, isVisible)

  const noOpPresentation = getThreadShortcutLegendPresentation(isVisible)
  expect(noOpPresentation.ariaExpanded).toBe(isVisible)
}

describe('thread shortcut legend lifecycle presentation (main integration)', () => {
  it('keeps status hint and aria-keyshortcuts synchronized across hidden → shown → hidden transitions', () => {
    const hiddenBeforeToggle = getThreadShortcutLegendPresentation(false)
    expect(hiddenBeforeToggle.ariaExpanded).toBe(false)
    expect(hiddenBeforeToggle.buttonAriaKeyshortcuts).toBe('Question Shift+Slash')
    expect(hiddenBeforeToggle.regionAriaKeyshortcuts).toBe(
      'J K ArrowUp ArrowDown Home End PageUp PageDown Shift+G Shift+End Shift+PageDown U N P Shift+U Z Shift+Home Shift+R Question Shift+Slash Slash C Y Escape Esc',
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
        'J K ArrowUp ArrowDown Home End PageUp PageDown Shift+G Shift+End Shift+PageDown U N P Shift+U Z Shift+Home Shift+R Question Shift+Slash Slash C Y Escape Esc',
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
    assertLegendNoOpDispatchOutcome(ignoredEditableDispatch, false)

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
    assertLegendNoOpDispatchOutcome(ignoredModifiedDispatch, true)
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
    assertLegendNoOpDispatchPresentationParityForInput(
      {
        isVisible: false,
        key: 'Esc',
        shiftKey: false,
        metaKey: false,
        ctrlKey: false,
        altKey: false,
        defaultPrevented: false,
        repeat: false,
        isEditableTarget: false,
      },
      false,
    )

    assertLegendNoOpDispatchPresentationParityForInput(
      {
        isVisible: true,
        key: 'Escape',
        shiftKey: true,
        metaKey: false,
        ctrlKey: false,
        altKey: false,
        defaultPrevented: false,
        repeat: false,
        isEditableTarget: false,
      },
      true,
    )
  })

  it('keeps no-op render-state nullish aria synchronized with aria-expanded for hidden Esc and shown Shift+Escape', () => {
    assertLegendNoOpRenderStatePresentationParityForInput(
      {
        isVisible: false,
        key: 'Esc',
        shiftKey: false,
        metaKey: false,
        ctrlKey: false,
        altKey: false,
        defaultPrevented: false,
        repeat: false,
        isEditableTarget: false,
      },
      false,
    )

    assertLegendNoOpRenderStatePresentationParityForInput(
      {
        isVisible: true,
        key: 'Escape',
        shiftKey: true,
        metaKey: false,
        ctrlKey: false,
        altKey: false,
        defaultPrevented: false,
        repeat: false,
        isEditableTarget: false,
      },
      true,
    )
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
    assertHiddenLegendEventGateNoOp('Esc', false)
  })

  it('keeps hidden Escape as no-op dispatch when event is defaultPrevented or repeat', () => {
    assertHiddenLegendEventGateNoOp('Escape', false)
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
    assertShownLegendNoOpByShiftAndEditable('Escape', true, false)
  })

  it('keeps shown Esc alias with shiftKey=true as no-op dispatch outcome with stable aria-expanded presentation parity', () => {
    assertShownLegendNoOpByShiftAndEditable('Esc', true, false)
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
    assertLegendRenderStateShowHideLifecycle('?', false, 'Escape')
  })

  it('keeps render-state aria/status parity on Shift+/ show then Esc alias hide lifecycle', () => {
    assertLegendRenderStateShowHideLifecycle('/', true, 'Esc')
  })

  it('keeps hidden Esc alias dismiss as a no-op render-state with no stale status aria emission', () => {
    assertHiddenLegendNoOpRenderState('Esc')
  })

  it('keeps hidden Escape with modifier keys as no-op render-state parity with dispatch guard rails', () => {
    assertHiddenLegendModifierNoOpRenderState('Escape')
  })

  it('keeps hidden Esc alias with modifier keys as no-op render-state outcomes with nullish aria', () => {
    assertHiddenLegendModifierNoOpRenderState('Esc')
  })

  it('keeps hidden Escape as no-op render-state when event is defaultPrevented or repeat', () => {
    assertHiddenLegendEventGateNoOp('Escape', true)
  })

  it('keeps hidden Esc alias as no-op render-state when event is defaultPrevented or repeat', () => {
    assertHiddenLegendEventGateNoOp('Esc', true)
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

  it('keeps shown Escape/Esc with modifier keys as no-op dispatch outcomes', () => {
    assertShownLegendModifierNoOpDispatch('Escape')
    assertShownLegendModifierNoOpDispatch('Esc')
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
    assertShownLegendNoOpByShiftAndEditable('Escape', true, false)
    assertShownLegendNoOpByShiftAndEditable('Esc', true, false)
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
