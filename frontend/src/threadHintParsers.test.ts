import { describe, expect, it } from 'vitest'

import {
  getBoundaryDirectionBadge,
  getBoundaryDirectionFromHint,
  getBoundaryDirectionLabel,
  getHintShortcutSource,
} from './threadHintParsers'

describe('threadHintParsers', () => {
  describe('getBoundaryDirectionFromHint', () => {
    it('detects first boundary direction with punctuation/case variance', () => {
      expect(getBoundaryDirectionFromHint('Recovered to FIRST visible thread (Shift+PageUp).')).toBe(
        'first',
      )
    })

    it('detects last boundary direction with surrounding words', () => {
      expect(getBoundaryDirectionFromHint('Already at last visible thread (Shift+PageDown) confirmed.')).toBe(
        'last',
      )
    })

    it('returns null for non-boundary hints', () => {
      expect(getBoundaryDirectionFromHint('Jumped to root thread (Shift+R).')).toBeNull()
      expect(getBoundaryDirectionFromHint(null)).toBeNull()
    })
  })

  describe('getHintShortcutSource', () => {
    it('extracts first parenthesized shortcut token', () => {
      expect(getHintShortcutSource('Jumped to first visible thread (Shift+PageUp).')).toBe(
        'Shift+PageUp',
      )
    })

    it('normalizes no-op "confirmed" suffix to keep shortcut badges stable', () => {
      expect(getHintShortcutSource('Already at root thread (Shift+R confirmed) · Root.')).toBe(
        'Shift+R',
      )
      expect(getHintShortcutSource('Already at first visible thread (Shift+PageUp confirmed).')).toBe(
        'Shift+PageUp',
      )
      expect(getHintShortcutSource('Already at first visible thread (Shift + PageUp confirmed).')).toBe(
        'Shift+PageUp',
      )
    })

    it('handles nested and multiple parenthesized hint segments robustly', () => {
      expect(
        getHintShortcutSource(
          'Recovered to first visible thread (boundary jump details) (Shift+PageUp confirmed).',
        ),
      ).toBe('Shift+PageUp')
      expect(
        getHintShortcutSource('Jumped to root thread (source: Shift+R confirmed) · Root.'),
      ).toBe('Shift+R')
      expect(
        getHintShortcutSource('Jumped to root thread (source (Shift+Home confirmed)) · Root.'),
      ).toBe('Shift+Home')
    })

    it('returns null when shortcut source does not exist', () => {
      expect(getHintShortcutSource('Jumped to first visible thread.')).toBeNull()
      expect(getHintShortcutSource('Jumped to first visible thread (C++ parser note).')).toBeNull()
      expect(getHintShortcutSource('Jumped to root thread (source: token+audit marker).')).toBeNull()
      expect(getHintShortcutSource(null)).toBeNull()
    })
  })

  describe('direction helpers', () => {
    it('returns compact badge and label for first/last directions', () => {
      expect(getBoundaryDirectionBadge('first')).toBe('↖ first')
      expect(getBoundaryDirectionBadge('last')).toBe('↘ last')
      expect(getBoundaryDirectionLabel('first')).toBe('first visible thread')
      expect(getBoundaryDirectionLabel('last')).toBe('last visible thread')
    })
  })
})
