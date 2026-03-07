import { describe, expect, it, vi } from 'vitest'

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

  it('drops Z undo-clear helper copy after undo snapshot expiry boundary', () => {
    const unreadCount = 2

    const beforeExpiryAria = getUnreadNavigationHintAriaLabel(
      `Unread threads: ${unreadCount} • U/N next • P previous • ⇧U clear • Z undo clear`,
      null,
    )
    const afterExpiryAria = getUnreadNavigationHintAriaLabel(
      `Unread threads: ${unreadCount} • U/N next • P previous • ⇧U clear`,
      null,
    )

    expect(beforeExpiryAria).toContain('Z undo clear')
    expect(afterExpiryAria).not.toContain('Z undo clear')
    expect(afterExpiryAria).toContain('⇧U clear')
  })

  it('transitions helper copy on 10s undo-snapshot timeout tick', () => {
    vi.useFakeTimers()

    const unreadCount = 2
    let hasUndoSnapshot = true

    const getUnreadNavigationHelperAria = () =>
      getUnreadNavigationHintAriaLabel(
        hasUndoSnapshot
          ? `Unread threads: ${unreadCount} • U/N next • P previous • ⇧U clear • Z undo clear`
          : `Unread threads: ${unreadCount} • U/N next • P previous • ⇧U clear`,
        null,
      )

    const timeoutId = setTimeout(() => {
      hasUndoSnapshot = false
    }, 10_000)

    expect(getUnreadNavigationHelperAria()).toContain('Z undo clear')

    vi.advanceTimersByTime(10_000)

    expect(getUnreadNavigationHelperAria()).not.toContain('Z undo clear')
    expect(getUnreadNavigationHelperAria()).toContain('⇧U clear')

    clearTimeout(timeoutId)
    vi.useRealTimers()
  })

  it('ignores Z undo after snapshot expiry without emitting restored live status', () => {
    vi.useFakeTimers()

    const unreadBeforeClear = ['t-1', 't-3']
    let unreadAfterClear: string[] = []
    let hasUndoSnapshot = true
    let boundaryJumpStatusHint: string | null = null

    const timeoutId = setTimeout(() => {
      hasUndoSnapshot = false
    }, 10_000)

    vi.advanceTimersByTime(10_000)

    const attemptUndoAfterExpiry = () => {
      if (!hasUndoSnapshot) {
        return
      }

      unreadAfterClear = [...unreadBeforeClear]
      boundaryJumpStatusHint = getUnreadClearUndoStatusHint(unreadAfterClear.length)
    }

    attemptUndoAfterExpiry()

    const boundaryJumpStatusAriaLabel = getUnreadBoundaryJumpStatusAriaLabel(
      boundaryJumpStatusHint,
      'Z',
      null,
    )
    const unreadNavigationHintAriaLabel = getUnreadNavigationHintAriaLabel(
      'Unread threads: 0 • U/N next • P previous • ⇧U clear',
      null,
    )

    expect(unreadAfterClear).toEqual([])
    expect(boundaryJumpStatusAriaLabel).toBeNull()
    expect(unreadNavigationHintAriaLabel).not.toContain('Z undo clear')

    clearTimeout(timeoutId)
    vi.useRealTimers()
  })
})
