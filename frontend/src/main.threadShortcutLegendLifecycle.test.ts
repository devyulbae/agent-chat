import { describe, expect, it } from 'vitest'

import {
  getThreadShortcutLegendKeyboardDispatchOutcome,
  getThreadShortcutLegendKeyboardRenderState,
  getThreadShortcutLegendKeyboardTransition,
  getThreadShortcutLegendPresentation,
} from './main'
import { getShortcutChipPropsFromHint, getStatusAriaLabelWithShortcutChip } from './threadHintChips'

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

  it('treats Shift+/ as the same show toggle lifecycle as ? and keeps hidden Esc as no-op', () => {
    const shownAfterShiftSlash = getThreadShortcutLegendKeyboardTransition(false, '/', true)
    expect(shownAfterShiftSlash.nextVisibility).toBe(true)
    expect(shownAfterShiftSlash.statusHint).toBe('Thread shortcut legend shown (? / Shift+/).')

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
    expect(shownPresentation.buttonAriaKeyshortcuts).toBe('Escape')

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

  it('keeps hidden Escape with modifier keys as no-op dispatch outcomes matching keyboard guard rails', () => {
    const ignoredHiddenMetaEscapeDispatch = getThreadShortcutLegendKeyboardDispatchOutcome({
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
    expect(ignoredHiddenMetaEscapeDispatch).toEqual({
      handled: false,
      nextVisibility: false,
      statusHint: null,
    })

    const ignoredHiddenCtrlEscapeDispatch = getThreadShortcutLegendKeyboardDispatchOutcome({
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
    expect(ignoredHiddenCtrlEscapeDispatch).toEqual({
      handled: false,
      nextVisibility: false,
      statusHint: null,
    })

    const ignoredHiddenAltEscapeDispatch = getThreadShortcutLegendKeyboardDispatchOutcome({
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
    expect(ignoredHiddenAltEscapeDispatch).toEqual({
      handled: false,
      nextVisibility: false,
      statusHint: null,
    })
  })

  it('keeps hidden Esc alias with modifier keys as no-op dispatch outcomes', () => {
    const ignoredHiddenMetaEscAliasDispatch = getThreadShortcutLegendKeyboardDispatchOutcome({
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
    expect(ignoredHiddenMetaEscAliasDispatch).toEqual({
      handled: false,
      nextVisibility: false,
      statusHint: null,
    })

    const ignoredHiddenCtrlEscAliasDispatch = getThreadShortcutLegendKeyboardDispatchOutcome({
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
    expect(ignoredHiddenCtrlEscAliasDispatch).toEqual({
      handled: false,
      nextVisibility: false,
      statusHint: null,
    })

    const ignoredHiddenAltEscAliasDispatch = getThreadShortcutLegendKeyboardDispatchOutcome({
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
    expect(ignoredHiddenAltEscAliasDispatch).toEqual({
      handled: false,
      nextVisibility: false,
      statusHint: null,
    })
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
})
