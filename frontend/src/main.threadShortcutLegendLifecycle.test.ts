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

const assertShownLegendNoOpAriaExpanded = () => {
  const shownNoOpPresentation = getThreadShortcutLegendPresentation(true)
  expect(shownNoOpPresentation.ariaExpanded).toBe(true)
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

  assertShownLegendNoOpAriaExpanded()
}

const assertShownLegendNoOpByShiftAndEditableAcrossEscapeKeys = (
  shiftKey: boolean,
  isEditableTarget: boolean,
) => {
  forEachLegendEscapeKey((key) => {
    assertShownLegendNoOpByShiftAndEditable(key, shiftKey, isEditableTarget)
  })
}

type LegendNoOpAssertionMode = 'dispatch' | 'render'

const legendNoOpAssertionModes = ['dispatch', 'render'] as const

const forEachLegendNoOpAssertionMode = (
  assertion: (mode: (typeof legendNoOpAssertionModes)[number]) => void,
) => {
  legendNoOpAssertionModes.forEach(assertion)
}

const assertLegendNoOpByModeForInput = (
  input: Parameters<typeof getThreadShortcutLegendKeyboardDispatchOutcome>[0],
  nextVisibility: boolean,
  mode: LegendNoOpAssertionMode,
) => {
  if (mode === 'render') {
    assertLegendNoOpRenderStateForInput(input, nextVisibility)
    return
  }

  assertLegendNoOpDispatchForInput(input, nextVisibility)
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

const legendEscapeKeys = ['Escape', 'Esc'] as const

const forEachLegendEscapeKey = (assertion: (key: (typeof legendEscapeKeys)[number]) => void) => {
  legendEscapeKeys.forEach(assertion)
}

const assertHiddenEditableLegendNoOpAcrossEscapeKeysByMode = (mode: LegendNoOpAssertionMode) => {
  forEachLegendEscapeKey((key) => {
    const input = {
      isVisible: false,
      key,
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      defaultPrevented: false,
      repeat: false,
      isEditableTarget: true,
    } satisfies Parameters<typeof getThreadShortcutLegendKeyboardDispatchOutcome>[0]

    assertLegendNoOpByModeForInput(input, false, mode)
  })
}

const assertEditableLegendEventGateNoOpAcrossEscapeKeysByVisibilityShiftAndMode = (
  isVisible: boolean,
  shiftKey: boolean,
  mode: LegendEventGateAssertionMode,
) => {
  forEachLegendEscapeKey((key) => {
    assertLegendEventGateNoOpForInputBase(
      {
        isVisible,
        key,
        shiftKey,
        metaKey: false,
        ctrlKey: false,
        altKey: false,
        isEditableTarget: true,
      },
      isVisible,
      mode,
    )
  })
}

const assertHiddenLegendModifierNoOpAcrossEscapeKeysByMode = (mode: LegendNoOpAssertionMode) => {
  forEachLegendEscapeKey((key) => {
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

      assertLegendNoOpByModeForInput(input, false, mode)
    })
  })
}

type LegendEventGateAssertionMode = 'dispatch' | 'dispatch+render'

const assertLegendEventGateNoOpAcrossEscapeKeysByVisibilityAndMode = (
  isVisible: boolean,
  mode: LegendEventGateAssertionMode,
) => {
  forEachLegendEscapeKey((key) => {
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
  })
}

const assertShownLegendModifierNoOpAcrossEscapeKeysByShiftEditableAndMode = (
  shiftKey: boolean,
  isEditableTarget: boolean,
  mode: LegendNoOpAssertionMode,
) => {
  forEachLegendEscapeKey((key) => {
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

      assertLegendNoOpByModeForInput(input, true, mode)
    })

    assertShownLegendNoOpAriaExpanded()
  })
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


const assertLegendModifierEventGateNoOpByVisibilityShiftEditableAndMode = (
  key: 'Escape' | 'Esc',
  isVisible: boolean,
  shiftKey: boolean,
  isEditableTarget: boolean,
  mode: LegendNoOpAssertionMode,
) => {
  legendModifierCases.forEach(({ metaKey, ctrlKey, altKey }) => {
    legendEventGateCases.forEach(({ defaultPrevented, repeat }) => {
      const input = {
        isVisible,
        key,
        shiftKey,
        metaKey,
        ctrlKey,
        altKey,
        defaultPrevented,
        repeat,
        isEditableTarget,
      } satisfies Parameters<typeof getThreadShortcutLegendKeyboardDispatchOutcome>[0]

      assertLegendNoOpByModeForInput(input, isVisible, mode)
    })
  })

  if (isVisible) {
    assertShownLegendNoOpAriaExpanded()
  }
}

const assertLegendModifierEventGateNoOpByVisibilityShiftEditableAcrossEscapeKeysAcrossModes = (
  isVisible: boolean,
  shiftKey: boolean,
  isEditableTarget: boolean,
) => {
  forEachLegendEscapeKey((key) => {
    assertLegendModifierEventGateNoOpByVisibilityShiftEditableAndMode(
      key,
      isVisible,
      shiftKey,
      isEditableTarget,
      'dispatch',
    )
    assertLegendModifierEventGateNoOpByVisibilityShiftEditableAndMode(
      key,
      isVisible,
      shiftKey,
      isEditableTarget,
      'render',
    )
  })
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

  it('keeps hidden Escape/Esc with modifier keys as no-op dispatch/render-state outcomes matching keyboard guard rails', () => {
    assertHiddenLegendModifierNoOpAcrossEscapeKeysByMode('dispatch')
    assertHiddenLegendModifierNoOpAcrossEscapeKeysByMode('render')
  })

  it('keeps hidden Escape/Esc as no-op dispatch when event is defaultPrevented or repeat', () => {
    assertLegendEventGateNoOpAcrossEscapeKeysByVisibilityAndMode(false, 'dispatch')
  })

  it('keeps hidden Escape/Esc as no-op dispatch when target is editable', () => {
    assertHiddenEditableLegendNoOpAcrossEscapeKeysByMode('dispatch')
  })

  it('keeps hidden Escape/Esc as no-op dispatch/render-state when target is editable and event is defaultPrevented or repeat', () => {
    assertEditableLegendEventGateNoOpAcrossEscapeKeysByVisibilityShiftAndMode(
      false,
      false,
      'dispatch+render',
    )
  })

  it('keeps shown Escape/Esc as no-op dispatch/render-state when target is editable and event is defaultPrevented or repeat', () => {
    assertEditableLegendEventGateNoOpAcrossEscapeKeysByVisibilityShiftAndMode(
      true,
      false,
      'dispatch+render',
    )
  })

  it('keeps shown Escape/Esc as no-op dispatch when event is defaultPrevented or repeat', () => {
    assertLegendEventGateNoOpAcrossEscapeKeysByVisibilityAndMode(true, 'dispatch')
  })

  it('keeps shown Escape/Esc with shiftKey=true as no-op dispatch outcome with stable aria-expanded presentation parity', () => {
    assertShownLegendNoOpByShiftAndEditableAcrossEscapeKeys(true, false)
  })

  it('keeps shown Escape/Esc with shiftKey=true as no-op dispatch/render-state when target is editable', () => {
    assertShownLegendNoOpByShiftAndEditableAcrossEscapeKeys(true, true)
  })

  it('keeps shown Escape/Esc with shiftKey=true as no-op for editable target when event is defaultPrevented or repeat', () => {
    assertEditableLegendEventGateNoOpAcrossEscapeKeysByVisibilityShiftAndMode(
      true,
      true,
      'dispatch+render',
    )
  })

  it('keeps shown Escape/Esc modifier-key paths as no-op dispatch/render-state outcomes across editable + shift states', () => {
    ;([
      { shiftKey: false, isEditableTarget: false },
      { shiftKey: false, isEditableTarget: true },
      { shiftKey: true, isEditableTarget: true },
    ] as const).forEach(({ shiftKey, isEditableTarget }) => {
      forEachLegendNoOpAssertionMode((mode) => {
        assertShownLegendModifierNoOpAcrossEscapeKeysByShiftEditableAndMode(
          shiftKey,
          isEditableTarget,
          mode,
        )
      })
    })
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

  it('keeps hidden Escape/Esc as no-op render-state when event is defaultPrevented or repeat', () => {
    assertLegendEventGateNoOpAcrossEscapeKeysByVisibilityAndMode(false, 'dispatch+render')
  })

  it('keeps hidden Escape/Esc as no-op render-state when target is editable', () => {
    assertHiddenEditableLegendNoOpAcrossEscapeKeysByMode('render')
  })

  it('keeps shown Escape/Esc as no-op render-state when event is defaultPrevented or repeat', () => {
    assertLegendEventGateNoOpAcrossEscapeKeysByVisibilityAndMode(true, 'dispatch+render')
  })

  it('keeps shown Escape/Esc with shiftKey=true as no-op render-state parity with nullish aria and stable aria-expanded', () => {
    assertShownLegendNoOpByShiftAndEditableAcrossEscapeKeys(true, false)
  })

  it('keeps shown Escape/Esc with shiftKey=true editable-target modifier+event-gate paths as no-op dispatch/render-state outcomes', () => {
    assertLegendModifierEventGateNoOpByVisibilityShiftEditableAcrossEscapeKeysAcrossModes(
      true,
      true,
      true,
    )
  })

  it('keeps shown Escape/Esc with shiftKey=true non-editable modifier+event-gate paths as no-op dispatch/render-state outcomes', () => {
    assertLegendModifierEventGateNoOpByVisibilityShiftEditableAcrossEscapeKeysAcrossModes(
      true,
      true,
      false,
    )
  })

  it('keeps plain Slash (without Shift) as a no-op for hidden and shown legend states', () => {
    assertPlainSlashNoOp(false)
    assertPlainSlashNoOp(true)
  })
})
