import { describe, expect, it } from 'vitest'

import {
  getBoundaryDirectionBadge,
  getBoundaryDirectionFromHint,
  getBoundaryDirectionLabel,
  getBoundaryDirectionTooltip,
  getHintShortcutSource,
  getThreadShortcutBadge,
  getThreadShortcutTooltip,
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
      expect(getHintShortcutSource('Jumped to first visible thread (Home).')).toBe('Home')
      expect(getHintShortcutSource('Jumped to first visible thread (G).')).toBe('G')
      expect(getHintShortcutSource('Recovered to first visible thread (Enter) · Root · 1/9.')).toBe(
        'Enter',
      )
      expect(getHintShortcutSource('Jumped to root thread (R) · Root · 1/9.')).toBe('R')
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

    it('normalizes compact aliases and symbolic shortcuts', () => {
      expect(getHintShortcutSource('Jumped to first visible thread (Shift+PgUp confirmed).')).toBe(
        'Shift+PageUp',
      )
      expect(getHintShortcutSource('Moved to next visible thread (↓).')).toBe('ArrowDown')
      expect(getHintShortcutSource('Recovered to first visible thread (↵).')).toBe('Enter')
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
      expect(getBoundaryDirectionTooltip('first')).toBe('Boundary direction: toward first visible thread')
      expect(getBoundaryDirectionTooltip('last')).toBe('Boundary direction: toward last visible thread')
    })
  })

  describe('getThreadShortcutBadge', () => {
    it('maps common boundary/root shortcuts to compact badges', () => {
      expect(getThreadShortcutBadge('Shift+PageUp')).toBe('⇧PgUp')
      expect(getThreadShortcutBadge('Shift+PageDown')).toBe('⇧PgDn')
      expect(getThreadShortcutBadge('Shift+G')).toBe('⇧G')
      expect(getThreadShortcutBadge('Shift+R')).toBe('⇧R')
      expect(getThreadShortcutBadge('Shift+Enter')).toBe('⇧↵')
      expect(getThreadShortcutBadge('Home')).toBe('Home')
      expect(getThreadShortcutBadge('End')).toBe('End')
      expect(getThreadShortcutBadge('PageUp')).toBe('PgUp')
      expect(getThreadShortcutBadge('PageDown')).toBe('PgDn')
      expect(getThreadShortcutBadge('ArrowUp')).toBe('↑')
      expect(getThreadShortcutBadge('ArrowDown')).toBe('↓')
      expect(getThreadShortcutBadge('Enter')).toBe('↵')
      expect(getThreadShortcutBadge('G')).toBe('G')
      expect(getThreadShortcutBadge('R')).toBe('R')
    })

    it('returns null for unknown or empty shortcut source', () => {
      expect(getThreadShortcutBadge('Shift+Unknown')).toBeNull()
      expect(getThreadShortcutBadge(null)).toBeNull()
    })
  })

  describe('getThreadShortcutTooltip', () => {
    it('maps shortcuts to human-readable tooltip labels', () => {
      expect(getThreadShortcutTooltip('Shift+PageUp')).toBe('Shift + PageUp')
      expect(getThreadShortcutTooltip('Shift+R')).toBe('Shift + R')
      expect(getThreadShortcutTooltip('Shift+Enter')).toBe('Shift + Enter')
      expect(getThreadShortcutTooltip('PageDown')).toBe('PageDown')
      expect(getThreadShortcutTooltip('ArrowUp')).toBe('Arrow Up')
      expect(getThreadShortcutTooltip('Enter')).toBe('Enter')
      expect(getThreadShortcutTooltip('G')).toBe('G')
      expect(getThreadShortcutTooltip('R')).toBe('R')
    })

    it('returns null for unknown or empty shortcut source', () => {
      expect(getThreadShortcutTooltip('Shift+Unknown')).toBeNull()
      expect(getThreadShortcutTooltip(null)).toBeNull()
    })
  })
})
