import { describe, expect, it } from 'vitest'

import {
  getUnreadBoundaryJumpStatusAriaLabel,
  getUnreadClearUndoStatusHint,
  getUnreadNavigationHintAriaLabel,
  getUnreadNavigationWrapCueForAria,
} from './threadHintParsers'

describe('unread wrap live-region interaction', () => {
  it('keeps wrap narration on boundary jump aria while suppressing duplicate unread-nav narration (N forward wrap)', () => {
    const wrapCue = 'wrapped last→first'

    const boundaryJumpStatusAriaLabel = getUnreadBoundaryJumpStatusAriaLabel(
      'Jumped to next unread thread (N) · t-9 · 1/3.',
      'N',
      wrapCue,
    )

    const unreadNavigationWrapCue = getUnreadNavigationWrapCueForAria(
      wrapCue,
      'Jumped to next unread thread (N) · t-9 · 1/3.',
      'N',
      boundaryJumpStatusAriaLabel,
    )

    const unreadNavigationHintAriaLabel = getUnreadNavigationHintAriaLabel(
      'Unread threads: 3 • U/N next • P previous.',
      unreadNavigationWrapCue,
    )

    expect(boundaryJumpStatusAriaLabel).toContain(
      'Unread wrap cue: wrapped from last unread thread to first unread thread.',
    )
    expect(unreadNavigationHintAriaLabel).toBe('Unread threads: 3 • U/N next • P previous.')

    const liveRegionAriaLabels = [boundaryJumpStatusAriaLabel, unreadNavigationHintAriaLabel].filter(
      (label): label is string => Boolean(label),
    )
    const labelsWithWrapNarration = liveRegionAriaLabels.filter((label) =>
      label.includes('Unread wrap cue:'),
    )

    expect(labelsWithWrapNarration).toHaveLength(1)
  })

  it('keeps wrap narration on boundary jump aria while suppressing duplicate unread-nav narration (U forward wrap)', () => {
    const wrapCue = 'wrapped last→first'

    const boundaryJumpStatusAriaLabel = getUnreadBoundaryJumpStatusAriaLabel(
      'Jumped to next unread thread (U) · t-9 · 1/3.',
      'U',
      wrapCue,
    )

    const unreadNavigationWrapCue = getUnreadNavigationWrapCueForAria(
      wrapCue,
      'Jumped to next unread thread (U) · t-9 · 1/3.',
      'U',
      boundaryJumpStatusAriaLabel,
    )

    const unreadNavigationHintAriaLabel = getUnreadNavigationHintAriaLabel(
      'Unread threads: 3 • U/N next • P previous.',
      unreadNavigationWrapCue,
    )

    expect(boundaryJumpStatusAriaLabel).toContain(
      'Unread wrap cue: wrapped from last unread thread to first unread thread.',
    )
    expect(unreadNavigationHintAriaLabel).toBe('Unread threads: 3 • U/N next • P previous.')

    const liveRegionAriaLabels = [boundaryJumpStatusAriaLabel, unreadNavigationHintAriaLabel].filter(
      (label): label is string => Boolean(label),
    )
    const labelsWithWrapNarration = liveRegionAriaLabels.filter((label) =>
      label.includes('Unread wrap cue:'),
    )

    expect(labelsWithWrapNarration).toHaveLength(1)
  })

  it('keeps wrap narration on boundary jump aria while suppressing duplicate unread-nav narration (P backward wrap)', () => {
    const wrapCue = 'wrapped first→last'

    const boundaryJumpStatusAriaLabel = getUnreadBoundaryJumpStatusAriaLabel(
      'Jumped to previous unread thread (P) · t-3 · 3/3.',
      'P',
      wrapCue,
    )

    const unreadNavigationWrapCue = getUnreadNavigationWrapCueForAria(
      wrapCue,
      'Jumped to previous unread thread (P) · t-3 · 3/3.',
      'P',
      boundaryJumpStatusAriaLabel,
    )

    const unreadNavigationHintAriaLabel = getUnreadNavigationHintAriaLabel(
      'Unread threads: 3 • U/N next • P previous.',
      unreadNavigationWrapCue,
    )

    expect(boundaryJumpStatusAriaLabel).toContain(
      'Unread wrap cue: wrapped from first unread thread to last unread thread.',
    )
    expect(unreadNavigationHintAriaLabel).toBe('Unread threads: 3 • U/N next • P previous.')

    const liveRegionAriaLabels = [boundaryJumpStatusAriaLabel, unreadNavigationHintAriaLabel].filter(
      (label): label is string => Boolean(label),
    )
    const labelsWithWrapNarration = liveRegionAriaLabels.filter((label) =>
      label.includes('Unread wrap cue:'),
    )

    expect(labelsWithWrapNarration).toHaveLength(1)
  })

  it('announces unread-marker restore via Z shortcut while unread helper keeps undo affordance text', () => {
    const boundaryJumpStatusHint = getUnreadClearUndoStatusHint(3)
    const boundaryJumpStatusAriaLabel = getUnreadBoundaryJumpStatusAriaLabel(
      boundaryJumpStatusHint,
      'Z',
      null,
    )
    const unreadNavigationHintAriaLabel = getUnreadNavigationHintAriaLabel(
      'Unread threads: 3 • U/N next • P previous • ⇧U clear • Z undo clear',
      null,
    )

    expect(boundaryJumpStatusAriaLabel).toBe('Restored unread markers (Z) · 3 thread(s).')
    expect(unreadNavigationHintAriaLabel).toContain('Z undo clear')
  })

  it('restores unread list-state after clear+undo and emits restored live status with Z', () => {
    const unreadBeforeClear = ['t-1', 't-3', null]
    const unreadAfterClear: Array<string | null> = []

    expect(unreadAfterClear).toHaveLength(0)

    const restoredUnread = [...unreadBeforeClear]
    const restoredStatusHint = getUnreadClearUndoStatusHint(restoredUnread.length)
    const restoredStatusAria = getUnreadBoundaryJumpStatusAriaLabel(restoredStatusHint, 'Z', null)
    const restoredUnreadNavigationAria = getUnreadNavigationHintAriaLabel(
      `Unread threads: ${restoredUnread.length} • U/N next • P previous • ⇧U clear • Z undo clear`,
      null,
    )

    expect(restoredUnread).toEqual(['t-1', 't-3', null])
    expect(restoredStatusAria).toBe('Restored unread markers (Z) · 3 thread(s).')
    expect(restoredUnreadNavigationAria).toContain('Unread threads: 3')
    expect(restoredUnreadNavigationAria).toContain('Z undo clear')
  })
})
