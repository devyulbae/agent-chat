import { describe, expect, it } from 'vitest'

import {
  getSelectedVisibleThreadBoundaryRecoveryButtonTitle,
  getSelectedVisibleThreadButtonRecoveryHint,
  getSelectedVisibleThreadInlineRecoveryHint,
  getSelectedVisibleThreadPositionLabel,
  getSelectedVisibleThreadPositionTitle,
  getSelectedVisibleThreadShortcutRecoveryHint,
  isSelectedVisibleThreadHiddenByFilter,
} from './threadSelectionStatus'

describe('isSelectedVisibleThreadHiddenByFilter', () => {
  it('returns true when a selected child thread is filtered out', () => {
    expect(isSelectedVisibleThreadHiddenByFilter(-1, 'thread-123', true)).toBe(true)
  })

  it('returns true when root is selected but hidden from list', () => {
    expect(isSelectedVisibleThreadHiddenByFilter(-1, null, false)).toBe(true)
  })

  it('returns true when selected thread is hidden and no threads are visible', () => {
    expect(isSelectedVisibleThreadHiddenByFilter(-1, 'thread-123', false)).toBe(true)
  })

  it('returns false when selected thread is currently visible', () => {
    expect(isSelectedVisibleThreadHiddenByFilter(0, 'thread-123', true)).toBe(false)
  })
})

describe('getSelectedVisibleThreadPositionLabel', () => {
  it('returns hidden/total when selected thread is hidden by filters', () => {
    expect(getSelectedVisibleThreadPositionLabel(true, -1, 4)).toBe('hidden/4')
  })

  it('keeps hidden label explicit when selected thread is hidden and list is empty', () => {
    expect(getSelectedVisibleThreadPositionLabel(true, -1, 0)).toBe('hidden/0')
  })

  it('returns 1-indexed position when selected thread is visible', () => {
    expect(getSelectedVisibleThreadPositionLabel(false, 2, 5)).toBe('3/5')
  })

  it('returns 0/total when no selection exists and nothing is hidden', () => {
    expect(getSelectedVisibleThreadPositionLabel(false, -1, 2)).toBe('0/2')
  })
})

describe('getSelectedVisibleThreadPositionTitle', () => {
  it('returns hidden-selection recovery title when selection is filtered out', () => {
    expect(getSelectedVisibleThreadPositionTitle(true)).toBe(
      'Selection is hidden by current filters. Use "Jump to first/last visible" to recover to the visible list.',
    )
  })

  it('returns undefined when selection is visible', () => {
    expect(getSelectedVisibleThreadPositionTitle(false)).toBeUndefined()
  })
})

describe('getSelectedVisibleThreadBoundaryRecoveryButtonTitle', () => {
  it('reuses hidden-selection position title for first-boundary recovery button', () => {
    expect(getSelectedVisibleThreadBoundaryRecoveryButtonTitle(true, 'first')).toBe(
      'Selection is hidden by current filters. Use "Jump to first/last visible" to recover to the visible list. Jump to first visible result.',
    )
  })

  it('reuses hidden-selection position title for last-boundary recovery button', () => {
    expect(getSelectedVisibleThreadBoundaryRecoveryButtonTitle(true, 'last')).toBe(
      'Selection is hidden by current filters. Use "Jump to first/last visible" to recover to the visible list. Jump to last visible result.',
    )
  })

  it('keeps first/last button tooltip copy synchronized with hidden-selection position title text', () => {
    const positionTitle = getSelectedVisibleThreadPositionTitle(true)
    expect(positionTitle).toBeTruthy()

    const firstBoundaryTitle = getSelectedVisibleThreadBoundaryRecoveryButtonTitle(true, 'first')
    const lastBoundaryTitle = getSelectedVisibleThreadBoundaryRecoveryButtonTitle(true, 'last')

    expect(firstBoundaryTitle).toContain(positionTitle as string)
    expect(lastBoundaryTitle).toContain(positionTitle as string)
  })

  it('falls back to explicit hidden-filter copy when selection is visible', () => {
    expect(getSelectedVisibleThreadBoundaryRecoveryButtonTitle(false, 'first')).toBe(
      'Selected thread is hidden by filters. Jump to first visible result.',
    )
  })
})

describe('hidden-selection recovery hints', () => {
  it('includes hidden position token in inline recovery hint when list is empty', () => {
    expect(getSelectedVisibleThreadInlineRecoveryHint(true, 'hidden/0')).toContain('hidden/0')
  })

  it('renders exact hidden-selection inline recovery copy for empty visible-list state', () => {
    expect(getSelectedVisibleThreadInlineRecoveryHint(true, 'hidden/0')).toBe(
      'Hidden selection recovery (hidden/0): J/K or ↑/↓ → ↖ first / ↘ last visible.',
    )
  })

  it('includes hidden position token in shortcut recovery hint when list is empty', () => {
    expect(getSelectedVisibleThreadShortcutRecoveryHint(true, 'hidden/0')).toContain('hidden/0')
  })

  it('renders exact hidden-selection shortcut recovery copy for empty visible-list state', () => {
    expect(getSelectedVisibleThreadShortcutRecoveryHint(true, 'hidden/0')).toBe(
      'Tip (hidden/0): J/K/↑/↓ will also recover to ↖ first / ↘ last visible thread.',
    )
  })

  it('includes hidden position token in button recovery hint when list is empty', () => {
    expect(getSelectedVisibleThreadButtonRecoveryHint(true, 'hidden/0')).toContain('hidden/0')
  })

  it('renders exact hidden-selection button recovery copy for empty visible-list state', () => {
    expect(getSelectedVisibleThreadButtonRecoveryHint(true, 'hidden/0')).toBe(
      'Selection hidden (hidden/0) → use “Jump to first/last visible”.',
    )
  })

  it('returns null recovery hints when selection is visible', () => {
    expect(getSelectedVisibleThreadInlineRecoveryHint(false, '1/3')).toBeNull()
    expect(getSelectedVisibleThreadShortcutRecoveryHint(false, '1/3')).toBeNull()
    expect(getSelectedVisibleThreadButtonRecoveryHint(false, '1/3')).toBeNull()
  })

  it('surfaces hidden/0 across inline + shortcut + button recovery status rows in empty-list state', () => {
    const selectedVisibleThreadPositionLabel = getSelectedVisibleThreadPositionLabel(true, -1, 0)

    const recoveryStatusRows = [
      getSelectedVisibleThreadInlineRecoveryHint(true, selectedVisibleThreadPositionLabel),
      getSelectedVisibleThreadShortcutRecoveryHint(true, selectedVisibleThreadPositionLabel),
      getSelectedVisibleThreadButtonRecoveryHint(true, selectedVisibleThreadPositionLabel),
    ].filter((hint): hint is string => Boolean(hint))

    expect(recoveryStatusRows).toHaveLength(3)
    expect(recoveryStatusRows.every((hint) => hint.includes('hidden/0'))).toBe(true)
  })
})
