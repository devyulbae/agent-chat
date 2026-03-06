import { describe, expect, it } from 'vitest'

import {
  getUnreadBoundaryJumpStatusAriaLabel,
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
})
