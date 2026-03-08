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
  const input = {
    isVisible: true,
    key,
    shiftKey,
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    defaultPrevented: false,
    repeat: false,
    isEditableTarget,
  } satisfies Parameters<typeof getThreadShortcutLegendKeyboardDispatchOutcome>[0]

  assertLegendNoOpDispatchAndRenderStateForInput(input, true)

  const shownNoOpPresentation = getThreadShortcutLegendPresentation(true)
  expect(shownNoOpPresentation.ariaExpanded).toBe(true)
}

type LegendNoOpAssertionMode = 'dispatch' | 'render'


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

const assertHiddenEditableLegendNoOpByMode = (
  key: 'Escape' | 'Esc',
  defaultPrevented: boolean,
  repeat: boolean,
  mode: LegendNoOpAssertionMode,
) => {
  const input = {
    isVisible: false,
    key,
    shiftKey: false,
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    defaultPrevented,
    repeat,
    isEditableTarget: true,
  } satisfies Parameters<typeof getThreadShortcutLegendKeyboardDispatchOutcome>[0]

  if (mode === 'render') {
    assertLegendNoOpRenderStateForInput(input, false)
    return
  }

  assertLegendNoOpDispatchForInput(input, false)
}

const assertHiddenEditableLegendEventGateNoOpByMode = (
  key: 'Escape' | 'Esc',
  mode: LegendEventGateAssertionMode,
) => {
  assertLegendEventGateNoOpForInputBase(
    {
      isVisible: false,
      key,
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      isEditableTarget: true,
    },
    false,
    mode,
  )
}

const assertShownEditableLegendEventGateNoOpByShiftAndMode = (
  key: 'Escape' | 'Esc',
  shiftKey: boolean,
  mode: LegendEventGateAssertionMode,
) => {
  assertLegendEventGateNoOpForInputBase(
    {
      isVisible: true,
      key,
      shiftKey,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      isEditableTarget: true,
    },
    true,
    mode,
  )
}

const assertHiddenLegendModifierNoOpByMode = (
  key: 'Escape' | 'Esc',
  mode: LegendNoOpAssertionMode,
) => {
  legendModifierCases.forEach(({ metaKey, ctrlKey, altKey }) => {
    const input = {
      isVisible: false,
      key,
      shiftKey: false,
      metaKey,
      ctrlKey,
      altKey,
      defaultPrevented: false,
      repeat: false,
      isEditableTarget: false,
    } satisfies Parameters<typeof getThreadShortcutLegendKeyboardDispatchOutcome>[0]

    if (mode === 'render') {
      assertLegendNoOpRenderStateForInput(input, false)
      return
    }

    assertLegendNoOpDispatchForInput(input, false)
  })
}

type LegendEventGateAssertionMode = 'dispatch' | 'dispatch+render'

const assertLegendEventGateNoOpByVisibilityAndMode = (
  key: 'Escape' | 'Esc',
  isVisible: boolean,
  mode: LegendEventGateAssertionMode,
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
    mode,
  )
}

const assertShownLegendModifierNoOpByShiftAndEditable = (
  key: 'Escape' | 'Esc',
  shiftKey: boolean,
  isEditableTarget: boolean,
  mode: LegendNoOpAssertionMode,
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

    if (mode === 'render') {
      assertLegendNoOpRenderStateForInput(input, true)
      return
    }

    assertLegendNoOpDispatchForInput(input, true)
  })

  const shownNoOpPresentation = getThreadShortcutLegendPresentation(true)
  expect(shownNoOpPresentation.ariaExpanded).toBe(true)
}

const assertLegendEventGateNoOpForInputBase = (
  inputBase: Omit<Parameters<typeof getThreadShortcutLegendKeyboardDispatchOutcome>[0], 'defaultPrevented' | 'repeat'>,
  nextVisibility: boolean,
  mode: LegendEventGateAssertionMode,
) => {
  legendEventGateCases.forEach(({ defaultPrevented, repeat }) => {
    const input = {
      ...inputBase,
      defaultPrevented,
      repeat,
    } satisfies Parameters<typeof getThreadShortcutLegendKeyboardDispatchOutcome>[0]

    if (mode === 'dispatch+render') {
      assertLegendNoOpDispatchAndRenderStateForInput(input, nextVisibility)
      return
    }

    assertLegendNoOpDispatchForInput(input, nextVisibility)
  })
}


const assertShownShiftLegendModifierEventGateNoOp = (
  key: 'Escape' | 'Esc',
  isEditableTarget: boolean,
) => {
  shownShiftModifierEventGateDispatchNoOpCases.forEach((caseInput) => {
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

    assertLegendNoOpDispatchForInput(input, true)
  })

  shownShiftModifierEventGateRenderStateNoOpCases.forEach((caseInput) => {
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

    assertLegendNoOpRenderStateForInput(input, true)
  })

  const shownNoOpPresentation = getThreadShortcutLegendPresentation(true)
  expect(shownNoOpPresentation.ariaExpanded).toBe(true)
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
    assertHiddenLegendModifierNoOpByMode('Escape', 'dispatch')
  })

  it('keeps hidden Esc alias with modifier keys as no-op dispatch outcomes', () => {
    assertHiddenLegendModifierNoOpByMode('Esc', 'dispatch')
  })

  it('keeps hidden Esc alias as no-op dispatch when event is defaultPrevented or repeat', () => {
    assertLegendEventGateNoOpByVisibilityAndMode('Esc', false, 'dispatch')
  })

  it('keeps hidden Escape as no-op dispatch when event is defaultPrevented or repeat', () => {
    assertLegendEventGateNoOpByVisibilityAndMode('Escape', false, 'dispatch')
  })

  it('keeps hidden Escape as no-op dispatch when target is editable', () => {
    assertHiddenEditableLegendNoOpByMode('Escape', false, false, 'dispatch')
  })

  it('keeps hidden Escape as no-op dispatch/render-state when target is editable and event is defaultPrevented or repeat', () => {
    assertHiddenEditableLegendEventGateNoOpByMode('Escape', 'dispatch+render')
  })

  it('keeps hidden Esc alias as no-op dispatch when target is editable', () => {
    assertHiddenEditableLegendNoOpByMode('Esc', false, false, 'dispatch')
  })

  it('keeps hidden Esc alias as no-op dispatch/render-state when target is editable and event is defaultPrevented or repeat', () => {
    assertHiddenEditableLegendEventGateNoOpByMode('Esc', 'dispatch+render')
  })

  it('keeps shown Escape as no-op dispatch when target is editable and event is defaultPrevented or repeat', () => {
    assertShownEditableLegendEventGateNoOpByShiftAndMode('Escape', false, 'dispatch+render')
  })

  it('keeps shown Esc alias as no-op dispatch when target is editable and event is defaultPrevented or repeat', () => {
    assertShownEditableLegendEventGateNoOpByShiftAndMode('Esc', false, 'dispatch+render')
  })

  it('keeps shown Escape as no-op dispatch when event is defaultPrevented or repeat', () => {
    assertLegendEventGateNoOpByVisibilityAndMode('Escape', true, 'dispatch')
  })

  it('keeps shown Esc alias as no-op dispatch when event is defaultPrevented or repeat', () => {
    assertLegendEventGateNoOpByVisibilityAndMode('Esc', true, 'dispatch')
  })

  it('keeps shown Escape with shiftKey=true as no-op dispatch outcome with stable aria-expanded presentation parity', () => {
    assertShownLegendNoOpByShiftAndEditable('Escape', true, false)
  })

  it('keeps shown Esc alias with shiftKey=true as no-op dispatch outcome with stable aria-expanded presentation parity', () => {
    assertShownLegendNoOpByShiftAndEditable('Esc', true, false)
  })

  it('keeps shown Escape with shiftKey=true as no-op dispatch/render-state when target is editable', () => {
    assertShownLegendNoOpByShiftAndEditable('Escape', true, true)
  })

  it('keeps shown Esc alias with shiftKey=true as no-op dispatch/render-state when target is editable', () => {
    assertShownLegendNoOpByShiftAndEditable('Esc', true, true)
  })

  it('keeps shown Escape with shiftKey=true as no-op for editable target when event is defaultPrevented or repeat', () => {
    assertShownEditableLegendEventGateNoOpByShiftAndMode('Escape', true, 'dispatch+render')
  })

  it('keeps shown Esc alias with shiftKey=true as no-op for editable target when event is defaultPrevented or repeat', () => {
    assertShownEditableLegendEventGateNoOpByShiftAndMode('Esc', true, 'dispatch+render')
  })

  it('keeps shown Escape/Esc editable-target modifier-key paths as no-op dispatch outcomes', () => {
    assertShownLegendModifierNoOpByShiftAndEditable('Escape', false, true, 'dispatch')
    assertShownLegendModifierNoOpByShiftAndEditable('Escape', false, true, 'render')
    assertShownLegendModifierNoOpByShiftAndEditable('Esc', false, true, 'dispatch')
    assertShownLegendModifierNoOpByShiftAndEditable('Esc', false, true, 'render')
  })

  it('keeps legend visibility transition and live status chip aria synchronized on keyboard render-state path', () => {
    assertLegendRenderStateShowHideLifecycle('?', false, 'Escape')
  })

  it('keeps render-state aria/status parity on Shift+/ show then Esc alias hide lifecycle', () => {
    assertLegendRenderStateShowHideLifecycle('/', true, 'Esc')
  })

  it('keeps hidden Esc alias dismiss as a no-op render-state with no stale status aria emission', () => {
    assertLegendNoOpRenderStateForInput(
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
  })

  it('keeps hidden Escape with modifier keys as no-op render-state parity with dispatch guard rails', () => {
    assertHiddenLegendModifierNoOpByMode('Escape', 'render')
  })

  it('keeps hidden Esc alias with modifier keys as no-op render-state outcomes with nullish aria', () => {
    assertHiddenLegendModifierNoOpByMode('Esc', 'render')
  })

  it('keeps hidden Escape as no-op render-state when event is defaultPrevented or repeat', () => {
    assertLegendEventGateNoOpByVisibilityAndMode('Escape', false, 'dispatch+render')
  })

  it('keeps hidden Esc alias as no-op render-state when event is defaultPrevented or repeat', () => {
    assertLegendEventGateNoOpByVisibilityAndMode('Esc', false, 'dispatch+render')
  })

  it('keeps hidden Escape as no-op render-state when target is editable', () => {
    assertHiddenEditableLegendNoOpByMode('Escape', false, false, 'render')
  })

  it('keeps hidden Escape as no-op render-state when target is editable and event is defaultPrevented or repeat', () => {
    assertHiddenEditableLegendEventGateNoOpByMode('Escape', 'dispatch+render')
  })

  it('keeps hidden Esc alias as no-op render-state when target is editable', () => {
    assertHiddenEditableLegendNoOpByMode('Esc', false, false, 'render')
  })

  it('keeps hidden Esc alias as no-op render-state when target is editable and event is defaultPrevented or repeat', () => {
    assertHiddenEditableLegendEventGateNoOpByMode('Esc', 'dispatch+render')
  })

  it('keeps shown Escape as no-op render-state when target is editable and event is defaultPrevented or repeat', () => {
    assertLegendEventGateNoOpForInputBase({
      isVisible: true,
      key: 'Escape',
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      isEditableTarget: true,
    }, true, 'dispatch+render')
  })

  it('keeps shown Escape/Esc with modifier keys as no-op dispatch outcomes', () => {
    assertShownLegendModifierNoOpByShiftAndEditable('Escape', false, false, 'dispatch')
    assertShownLegendModifierNoOpByShiftAndEditable('Esc', false, false, 'dispatch')
  })

  it('keeps shown Escape/Esc with modifier keys as no-op render-state outcomes with nullish aria', () => {
    assertShownLegendModifierNoOpByShiftAndEditable('Escape', false, false, 'render')
    assertShownLegendModifierNoOpByShiftAndEditable('Esc', false, false, 'render')
  })

  it('keeps shown Esc alias as no-op render-state when target is editable and event is defaultPrevented or repeat', () => {
    assertLegendEventGateNoOpForInputBase({
      isVisible: true,
      key: 'Esc',
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      isEditableTarget: true,
    }, true, 'dispatch+render')
  })

  it('keeps shown Escape and Esc alias as no-op render-state when event is defaultPrevented or repeat', () => {
    assertLegendEventGateNoOpByVisibilityAndMode('Escape', true, 'dispatch+render')
    assertLegendEventGateNoOpByVisibilityAndMode('Esc', true, 'dispatch+render')
  })

  it('keeps shown Escape/Esc with shiftKey=true as no-op render-state parity with nullish aria and stable aria-expanded', () => {
    assertShownLegendNoOpByShiftAndEditable('Escape', true, false)
    assertShownLegendNoOpByShiftAndEditable('Esc', true, false)
  })

  it('keeps shown Escape/Esc editable-target modifier-key paths as no-op render-state outcomes', () => {
    assertShownLegendModifierNoOpByShiftAndEditable('Escape', false, true, 'dispatch')
    assertShownLegendModifierNoOpByShiftAndEditable('Escape', false, true, 'render')
    assertShownLegendModifierNoOpByShiftAndEditable('Esc', false, true, 'dispatch')
    assertShownLegendModifierNoOpByShiftAndEditable('Esc', false, true, 'render')
  })

  it('keeps shown Escape with shiftKey=true editable-target modifier-key paths as no-op dispatch/render-state outcomes', () => {
    assertShownLegendModifierNoOpByShiftAndEditable('Escape', true, true, 'dispatch')
    assertShownLegendModifierNoOpByShiftAndEditable('Escape', true, true, 'render')
  })
  it('keeps shown Esc alias with shiftKey=true editable-target modifier-key paths as no-op dispatch/render-state outcomes', () => {
    assertShownLegendModifierNoOpByShiftAndEditable('Esc', true, true, 'dispatch')
    assertShownLegendModifierNoOpByShiftAndEditable('Esc', true, true, 'render')
  })
  it('keeps shown Escape with shiftKey=true editable-target modifier+event-gate paths as no-op dispatch/render-state outcomes', () => {
    assertShownShiftLegendModifierEventGateNoOp('Escape', true)
  })

  it('keeps shown Esc alias with shiftKey=true editable-target modifier+event-gate paths as no-op dispatch/render-state outcomes', () => {
    assertShownShiftLegendModifierEventGateNoOp('Esc', true)
  })

  it('keeps shown Escape/Esc with shiftKey=true non-editable modifier+event-gate paths as no-op dispatch/render-state outcomes', () => {
    assertShownShiftLegendModifierEventGateNoOp('Escape', false)
    assertShownShiftLegendModifierEventGateNoOp('Esc', false)
  })

  it('keeps plain Slash (without Shift) as a no-op for hidden and shown legend states', () => {
    assertPlainSlashNoOp(false)
    assertPlainSlashNoOp(true)
  })
})
