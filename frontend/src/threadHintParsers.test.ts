import { describe, expect, it } from 'vitest'

import {
  buildShortcutChipCopy,
  getBoundaryDirectionBadge,
  getBoundaryDirectionChipPresentation,
  getBoundaryDirectionFromHint,
  getBoundaryDirectionLabel,
  getBoundaryDirectionTooltip,
  getHintShortcutSource,
  getShortcutChipPresentationFromHint,
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
      expect(getHintShortcutSource('Already at last visible thread (Shift+End confirmed).')).toBe(
        'Shift+End',
      )
      expect(getHintShortcutSource('Already at first visible thread (Shift+Home confirmed).')).toBe(
        'Shift+Home',
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
      expect(getHintShortcutSource('Jumped to first visible thread (shift+pgup confirmed).')).toBe(
        'Shift+PageUp',
      )
      expect(getHintShortcutSource('Jumped to first visible thread (Shift+Pg-Up confirmed).')).toBe(
        'Shift+PageUp',
      )
      expect(getHintShortcutSource('Jumped to first visible thread (Shift+Page-Up confirmed).')).toBe(
        'Shift+PageUp',
      )
      expect(getHintShortcutSource('Jumped to last visible thread (Shift+PgDn confirmed).')).toBe(
        'Shift+PageDown',
      )
      expect(getHintShortcutSource('Jumped to last visible thread (Shift+Pg-Dn confirmed).')).toBe(
        'Shift+PageDown',
      )
      expect(getHintShortcutSource('Jumped to last visible thread (shift+pgdn confirmed).')).toBe(
        'Shift+PageDown',
      )
      expect(getHintShortcutSource('Jumped to first visible thread (PgUp confirmed).')).toBe(
        'PageUp',
      )
      expect(getHintShortcutSource('Jumped to first visible thread (Pg-Up confirmed).')).toBe(
        'PageUp',
      )
      expect(getHintShortcutSource('Jumped to first visible thread (Page-Up confirmed).')).toBe(
        'PageUp',
      )
      expect(getHintShortcutSource('Jumped to first visible thread (pgup confirmed).')).toBe(
        'PageUp',
      )
      expect(getHintShortcutSource('Jumped to last visible thread (PgDn confirmed).')).toBe(
        'PageDown',
      )
      expect(getHintShortcutSource('Jumped to last visible thread (Pg-Dn confirmed).')).toBe(
        'PageDown',
      )
      expect(getHintShortcutSource('Jumped to last visible thread (Page-Down confirmed).')).toBe(
        'PageDown',
      )
      expect(getHintShortcutSource('Jumped to last visible thread (pgdn confirmed).')).toBe(
        'PageDown',
      )
      expect(getHintShortcutSource('Jumped to first visible thread (ctrl+pgup confirmed).')).toBe(
        'Ctrl+PageUp',
      )
      expect(getHintShortcutSource('Jumped to first visible thread (⌃+PgUp confirmed).')).toBe(
        'Ctrl+PageUp',
      )
      expect(getHintShortcutSource('Jumped to first visible thread (⌃PgUp confirmed).')).toBe(
        'Ctrl+PageUp',
      )
      expect(getHintShortcutSource('Jumped to last visible thread (control+pgdn confirmed).')).toBe(
        'Control+PageDown',
      )
      expect(getHintShortcutSource('Jumped to last visible thread (⇧+PgDn confirmed).')).toBe(
        'Shift+PageDown',
      )
      expect(getHintShortcutSource('Jumped to last visible thread (⇧PgDn confirmed).')).toBe(
        'Shift+PageDown',
      )
      expect(getHintShortcutSource('Jumped to first visible thread (⌥+PgUp confirmed).')).toBe(
        'Option+PageUp',
      )
      expect(getHintShortcutSource('Jumped to first visible thread (⌥PgUp confirmed).')).toBe(
        'Option+PageUp',
      )
      expect(getHintShortcutSource('Jumped to first visible thread (opt+pgup confirmed).')).toBe(
        'Option+PageUp',
      )
      expect(getHintShortcutSource('Jumped to last visible thread (⌘+PgDn confirmed).')).toBe(
        'Cmd+PageDown',
      )
      expect(getHintShortcutSource('Jumped to last visible thread (⌘PgDn confirmed).')).toBe(
        'Cmd+PageDown',
      )
      expect(getHintShortcutSource('Jumped to last visible thread (cmd+pgdn confirmed).')).toBe(
        'Cmd+PageDown',
      )
      expect(getHintShortcutSource('Jumped to last visible thread (Cmd+Page-Down confirmed).')).toBe(
        'Cmd+PageDown',
      )
      expect(getHintShortcutSource('Jumped to first visible thread (⌘⇧PgUp confirmed).')).toBe(
        'Cmd+Shift+PageUp',
      )
      expect(getHintShortcutSource('Jumped to last visible thread (⌥⇧PgDn confirmed).')).toBe(
        'Option+Shift+PageDown',
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

    it('builds deterministic chip presentation payload for direction cues', () => {
      expect(getBoundaryDirectionChipPresentation('first')).toEqual({
        badge: '↖ first',
        title: 'Boundary direction: toward first visible thread',
        ariaLabel: 'Boundary direction cue: toward first visible thread',
      })
      expect(getBoundaryDirectionChipPresentation('last')).toEqual({
        badge: '↘ last',
        title: 'Boundary direction: toward last visible thread',
        ariaLabel: 'Boundary direction cue: toward last visible thread',
      })
    })
  })

  describe('getThreadShortcutBadge', () => {
    it('maps common boundary/root shortcuts to compact badges', () => {
      expect(getThreadShortcutBadge('Shift+PageUp')).toBe('⇧PgUp')
      expect(getThreadShortcutBadge('Shift+PageDown')).toBe('⇧PgDn')
      expect(getThreadShortcutBadge('Shift+Home')).toBe('⇧Home')
      expect(getThreadShortcutBadge('Shift+End')).toBe('⇧End')
      expect(getThreadShortcutBadge('Shift+G')).toBe('⇧G')
      expect(getThreadShortcutBadge('Shift+R')).toBe('⇧R')
      expect(getThreadShortcutBadge('Shift+U')).toBe('⇧U')
      expect(getThreadShortcutBadge('Shift+Enter')).toBe('⇧↵')
      expect(getThreadShortcutBadge('Ctrl+PageUp')).toBe('Ctrl+PgUp')
      expect(getThreadShortcutBadge('Control+PageDown')).toBe('Control+PgDn')
      expect(getThreadShortcutBadge('Option+PageUp')).toBe('Option+PgUp')
      expect(getThreadShortcutBadge('Option+Shift+PageDown')).toBe('Option+⇧PgDn')
      expect(getThreadShortcutBadge('Cmd+PageDown')).toBe('Cmd+PgDn')
      expect(getThreadShortcutBadge('Cmd+Shift+PageUp')).toBe('Cmd+⇧PgUp')
      expect(getThreadShortcutBadge('Command+PageUp')).toBe('Command+PgUp')
      expect(getThreadShortcutBadge('Command+Shift+PageDown')).toBe('Command+⇧PgDn')
      expect(getThreadShortcutBadge('Meta+PageDown')).toBe('Meta+PgDn')
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
      expect(getThreadShortcutTooltip('Shift+Home')).toBe('Shift + Home')
      expect(getThreadShortcutTooltip('Shift+End')).toBe('Shift + End')
      expect(getThreadShortcutTooltip('Shift+R')).toBe('Shift + R')
      expect(getThreadShortcutTooltip('Shift+U')).toBe('Shift + U')
      expect(getThreadShortcutTooltip('Shift+Enter')).toBe('Shift + Enter')
      expect(getThreadShortcutTooltip('Ctrl+PageUp')).toBe('Ctrl + PageUp')
      expect(getThreadShortcutTooltip('Control+PageDown')).toBe('Control + PageDown')
      expect(getThreadShortcutTooltip('Option+PageUp')).toBe('Option + PageUp')
      expect(getThreadShortcutTooltip('Option+Shift+PageDown')).toBe('Option + Shift + PageDown')
      expect(getThreadShortcutTooltip('Cmd+PageDown')).toBe('Cmd + PageDown')
      expect(getThreadShortcutTooltip('Cmd+Shift+PageUp')).toBe('Cmd + Shift + PageUp')
      expect(getThreadShortcutTooltip('Command+PageUp')).toBe('Command + PageUp')
      expect(getThreadShortcutTooltip('Command+Shift+PageDown')).toBe('Command + Shift + PageDown')
      expect(getThreadShortcutTooltip('Meta+PageDown')).toBe('Meta + PageDown')
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

  describe('buildShortcutChipCopy', () => {
    it('builds deterministic title/aria text across shortcut intents', () => {
      expect(buildShortcutChipCopy('Ctrl+PgUp', 'Ctrl + PageUp', 'boundary jump')).toEqual({
        title: 'Ctrl + PageUp boundary jump',
        ariaLabel: 'Shortcut badge Ctrl+PgUp: Ctrl + PageUp (boundary jump).',
      })
      expect(buildShortcutChipCopy('Control+PgDn', 'Control + PageDown', 'boundary jump')).toEqual({
        title: 'Control + PageDown boundary jump',
        ariaLabel: 'Shortcut badge Control+PgDn: Control + PageDown (boundary jump).',
      })
      expect(buildShortcutChipCopy('⇧R', 'Shift + R', 'root jump')).toEqual({
        title: 'Shift + R root jump',
        ariaLabel: 'Shortcut badge ⇧R: Shift + R (root jump).',
      })
      expect(buildShortcutChipCopy('⇧U', 'Shift + U', 'filter jump')).toEqual({
        title: 'Shift + U filter jump',
        ariaLabel: 'Shortcut badge ⇧U: Shift + U (filter jump).',
      })
    })
  })

  describe('getShortcutChipPresentationFromHint', () => {
    it('builds root/filter chip presentation end-to-end from hint copy', () => {
      expect(
        getShortcutChipPresentationFromHint(
          'Jumped to root thread (Shift+R confirmed) · Root · 1/9.',
          'root jump',
        ),
      ).toEqual({
        source: 'Shift+R',
        badge: '⇧R',
        tooltip: 'Shift + R',
        copy: {
          title: 'Shift + R root jump',
          ariaLabel: 'Shortcut badge ⇧R: Shift + R (root jump).',
        },
      })

      expect(
        getShortcutChipPresentationFromHint(
          'Jumped to first visible filtered thread (Shift+U confirmed).',
          'filter jump',
        ),
      ).toEqual({
        source: 'Shift+U',
        badge: '⇧U',
        tooltip: 'Shift + U',
        copy: {
          title: 'Shift + U filter jump',
          ariaLabel: 'Shortcut badge ⇧U: Shift + U (filter jump).',
        },
      })
    })

    it('returns null when hint does not resolve to a known badge', () => {
      expect(getShortcutChipPresentationFromHint('Jumped to first visible thread.', 'boundary jump')).toBeNull()
      expect(
        getShortcutChipPresentationFromHint(
          'Jumped to first visible thread (Shift+Unknown confirmed).',
          'boundary jump',
        ),
      ).toBeNull()
    })
  })
})
