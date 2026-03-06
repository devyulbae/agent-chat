import { describe, expect, it } from 'vitest'

import {
  buildShortcutChipCopy,
  getBoundaryDirectionBadge,
  getBoundaryDirectionChipPresentation,
  getBoundaryDirectionChipPresentationFromHint,
  getBoundaryDirectionFromHint,
  getBoundaryDirectionLabel,
  getBoundaryJumpStatusAriaLabel,
  getBoundaryDirectionTooltip,
  getHintShortcutSource,
  getShortcutChipPresentationFromHint,
  getShortcutChipPresentationFromSource,
  getThreadShortcutBadge,
  getThreadShortcutTooltip,
  normalizeAriaLabelText,
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
      expect(getHintShortcutSource('Jumped to next unread thread (N) · t-9 · 1/3.')).toBe('N')
      expect(getHintShortcutSource('Jumped to previous unread thread (P) · t-4 · 3/3.')).toBe('P')
      expect(getHintShortcutSource('Copied thread (Y) · root.')).toBe('Y')
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
      expect(getHintShortcutSource('Jumped to first visible thread (ShiftPgUp confirmed).')).toBe(
        'Shift+PageUp',
      )
      expect(getHintShortcutSource('Jumped to first visible thread (shift+pgup confirmed).')).toBe(
        'Shift+PageUp',
      )
      expect(getHintShortcutSource('Jumped to first visible thread (Shift+Pg-Up confirmed).')).toBe(
        'Shift+PageUp',
      )
      expect(getHintShortcutSource('Jumped to first visible thread (Shift+Pg. Up confirmed).')).toBe(
        'Shift+PageUp',
      )
      expect(getHintShortcutSource('Jumped to first visible thread (Shift+Page-Up confirmed).')).toBe(
        'Shift+PageUp',
      )
      expect(getHintShortcutSource('Jumped to last visible thread (Shift+PgDn confirmed).')).toBe(
        'Shift+PageDown',
      )
      expect(getHintShortcutSource('Jumped to last visible thread (ShiftPgDn confirmed).')).toBe(
        'Shift+PageDown',
      )
      expect(getHintShortcutSource('Jumped to last visible thread (Shift+Pg-Dn confirmed).')).toBe(
        'Shift+PageDown',
      )
      expect(getHintShortcutSource('Jumped to last visible thread (Shift+Pg. Dn confirmed).')).toBe(
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
      expect(getHintShortcutSource('Jumped to first visible thread (Pg. Up confirmed).')).toBe(
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
      expect(getHintShortcutSource('Jumped to last visible thread (Pg. Dn confirmed).')).toBe(
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
      expect(getHintShortcutSource('Jumped to first visible thread (CmdShiftPgUp confirmed).')).toBe(
        'Cmd+Shift+PageUp',
      )
      expect(getHintShortcutSource('Jumped to first visible thread (CmdShiftHome confirmed).')).toBe(
        'Cmd+Shift+Home',
      )
      expect(getHintShortcutSource('Jumped to first visible thread (⌘⇧Home confirmed).')).toBe(
        'Cmd+Shift+Home',
      )
      expect(getHintShortcutSource('Jumped to first visible thread (MetaShiftPgUp confirmed).')).toBe(
        'Meta+Shift+PageUp',
      )
      expect(getHintShortcutSource('Jumped to last visible thread (MetaShiftPgDn confirmed).')).toBe(
        'Meta+Shift+PageDown',
      )
      expect(getHintShortcutSource('Jumped to last visible thread (⌥⇧PgDn confirmed).')).toBe(
        'Option+Shift+PageDown',
      )
      expect(getHintShortcutSource('Jumped to last visible thread (OptionShiftPgDn confirmed).')).toBe(
        'Option+Shift+PageDown',
      )
      expect(getHintShortcutSource('Jumped to last visible thread (OptionShiftEnd confirmed).')).toBe(
        'Option+Shift+End',
      )
      expect(getHintShortcutSource('Jumped to last visible thread (⌥⇧End confirmed).')).toBe(
        'Option+Shift+End',
      )
      expect(getHintShortcutSource('Recovered to first visible thread (Shift+↑ confirmed).')).toBe(
        'Shift+ArrowUp',
      )
      expect(getHintShortcutSource('Recovered to first visible thread (Shift+Up Arrow confirmed).')).toBe(
        'Shift+ArrowUp',
      )
      expect(getHintShortcutSource('Recovered to first visible thread (Shift Up Arrow confirmed).')).toBe(
        'Shift+ArrowUp',
      )
      expect(getHintShortcutSource('Recovered to first visible thread (Shift+Up-Arrow confirmed).')).toBe(
        'Shift+ArrowUp',
      )
      expect(getHintShortcutSource('Recovered to first visible thread (Cmd Shift Up Arrow confirmed).')).toBe(
        'Cmd+Shift+ArrowUp',
      )
      expect(getHintShortcutSource('Recovered to last visible thread (⇧+↓ confirmed).')).toBe(
        'Shift+ArrowDown',
      )
      expect(getHintShortcutSource('Recovered to last visible thread (Shift+Down Arrow confirmed).')).toBe(
        'Shift+ArrowDown',
      )
      expect(getHintShortcutSource('Recovered to last visible thread (Shift Down Arrow confirmed).')).toBe(
        'Shift+ArrowDown',
      )
      expect(getHintShortcutSource('Recovered to last visible thread (Shift+Down-Arrow confirmed).')).toBe(
        'Shift+ArrowDown',
      )
      expect(getHintShortcutSource('Recovered to last visible thread (Option Shift Down Arrow confirmed).')).toBe(
        'Option+Shift+ArrowDown',
      )
      expect(getHintShortcutSource('Recovered to first visible thread (⌘+Up Arrow confirmed).')).toBe(
        'Cmd+ArrowUp',
      )
      expect(getHintShortcutSource('Recovered to first visible thread (CmdUpArrow confirmed).')).toBe(
        'Cmd+ArrowUp',
      )
      expect(getHintShortcutSource('Recovered to first visible thread (CmdHome confirmed).')).toBe(
        'Cmd+Home',
      )
      expect(getHintShortcutSource('Recovered to last visible thread (CmdEnd confirmed).')).toBe(
        'Cmd+End',
      )
      expect(getHintShortcutSource('Recovered to first visible thread (CtrlArrowUp confirmed).')).toBe(
        'Ctrl+ArrowUp',
      )
      expect(getHintShortcutSource('Recovered to first visible thread (CtrlShiftHome confirmed).')).toBe(
        'Ctrl+Shift+Home',
      )
      expect(getHintShortcutSource('Recovered to last visible thread (Option+Down Arrow confirmed).')).toBe(
        'Option+ArrowDown',
      )
      expect(getHintShortcutSource('Recovered to last visible thread (OptDownArrow confirmed).')).toBe(
        'Option+ArrowDown',
      )
      expect(getHintShortcutSource('Moved to previous visible thread (Ctrl+Left Arrow confirmed).')).toBe(
        'Ctrl+ArrowLeft',
      )
      expect(getHintShortcutSource('Moved to next visible thread (CmdRightArrow confirmed).')).toBe(
        'Cmd+ArrowRight',
      )
      expect(getHintShortcutSource('Moved to previous visible thread (←).')).toBe('ArrowLeft')
      expect(getHintShortcutSource('Moved to next visible thread (→).')).toBe('ArrowRight')
      expect(getHintShortcutSource('Moved to next visible thread (↓).')).toBe('ArrowDown')
      expect(getHintShortcutSource('Moved to next visible thread (Arrow Up).')).toBe('ArrowUp')
      expect(getHintShortcutSource('Moved to previous visible thread (Arrow-Down).')).toBe('ArrowDown')
      expect(getHintShortcutSource('Recovered to first visible thread (↵).')).toBe('Enter')
      expect(getHintShortcutSource('Recovered to first visible thread (↩).')).toBe('Enter')
      expect(getHintShortcutSource('Recovered to first visible thread (⌤).')).toBe('Enter')
      expect(getHintShortcutSource('Recovered to first visible thread (Return).')).toBe('Enter')
      expect(getHintShortcutSource('Recovered to first visible thread (Return key).')).toBe('Enter')
      expect(getHintShortcutSource('Recovered to first visible thread (Enter key).')).toBe('Enter')
      expect(getHintShortcutSource('Recovered to first visible thread (Return-key).')).toBe('Enter')
      expect(getHintShortcutSource('Recovered to first visible thread (Enter-key).')).toBe('Enter')
      expect(getHintShortcutSource('Recovered to first visible thread (Return/Enter).')).toBe('Enter')
      expect(getHintShortcutSource('Recovered to first visible thread (Return / Enter).')).toBe('Enter')
      expect(getHintShortcutSource('Recovered to first visible thread (Shift+Return confirmed).')).toBe(
        'Shift+Enter',
      )
      expect(getHintShortcutSource('Recovered to first visible thread (Shift+⌤ confirmed).')).toBe(
        'Shift+Enter',
      )
      expect(getHintShortcutSource('Recovered to first visible thread (Shift+↩ confirmed).')).toBe(
        'Shift+Enter',
      )
      expect(getHintShortcutSource('Recovered to first visible thread (Cmd+↩ confirmed).')).toBe(
        'Cmd+Enter',
      )
      expect(getHintShortcutSource('Recovered to first visible thread (CmdEnter confirmed).')).toBe(
        'Cmd+Enter',
      )
      expect(getHintShortcutSource('Recovered to first visible thread (Shift+Return-key confirmed).')).toBe(
        'Shift+Enter',
      )
      expect(getHintShortcutSource('Recovered to first visible thread (Shift Return confirmed).')).toBe(
        'Shift+Enter',
      )
      expect(getHintShortcutSource('Recovered to first visible thread (Shift Return Key confirmed).')).toBe(
        'Shift+Enter',
      )
      expect(getHintShortcutSource('Recovered to first visible thread (Shift Return/Enter confirmed).')).toBe(
        'Shift+Enter',
      )
      expect(getHintShortcutSource('Focused filter input (/) · type to filter.')).toBe('Slash')
      expect(getHintShortcutSource('Cleared filter (Esc).')).toBe('Escape')
      expect(getHintShortcutSource('Reset view (Shift+Esc).')).toBe('Shift+Escape')
      expect(getHintShortcutSource('Focused filter input (forward-slash).')).toBe('Slash')
      expect(getHintShortcutSource('Focused filter input (fwd-slash).')).toBe('Slash')
      expect(getHintShortcutSource('Focused filter input (fwd slash).')).toBe('Slash')
      expect(getHintShortcutSource('Focused filter input (fwdslash).')).toBe('Slash')
      expect(getHintShortcutSource('Recovered to first visible thread (Shift+PageUp.).')).toBe(
        'Shift+PageUp',
      )
      expect(getHintShortcutSource('Recovered to last visible thread (Shift+PageDown,).')).toBe(
        'Shift+PageDown',
      )
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

    it('derives direction chip presentation directly from boundary hint copy', () => {
      expect(
        getBoundaryDirectionChipPresentationFromHint(
          'Recovered to first visible thread (Shift+PageUp) · Root · 1/9.',
        ),
      ).toEqual({
        badge: '↖ first',
        title: 'Boundary direction: toward first visible thread',
        ariaLabel: 'Boundary direction cue: toward first visible thread',
      })
      expect(
        getBoundaryDirectionChipPresentationFromHint(
          'Recovered to last visible thread (Shift+PageDown) · t-9 · 9/9.',
        ),
      ).toEqual({
        badge: '↘ last',
        title: 'Boundary direction: toward last visible thread',
        ariaLabel: 'Boundary direction cue: toward last visible thread',
      })
      expect(getBoundaryDirectionChipPresentationFromHint('Jumped to root thread (Shift+R).')).toBeNull()
      expect(getBoundaryDirectionChipPresentationFromHint(null)).toBeNull()
    })
  })

  describe('getBoundaryJumpStatusAriaLabel', () => {
    it('appends direction cue aria wording for boundary hints', () => {
      expect(
        getBoundaryJumpStatusAriaLabel('Recovered to first visible thread (Shift+PageUp) · Root · 1/9.'),
      ).toBe(
        'Recovered to first visible thread (Shift+PageUp) · Root · 1/9. Boundary direction cue: toward first visible thread.',
      )
      expect(
        getBoundaryJumpStatusAriaLabel('Recovered to last visible thread (Shift+PageDown) · t-9 · 9/9.'),
      ).toBe(
        'Recovered to last visible thread (Shift+PageDown) · t-9 · 9/9. Boundary direction cue: toward last visible thread.',
      )
    })

    it('returns hint-only label for non-boundary copy and undefined for empty hints', () => {
      expect(getBoundaryJumpStatusAriaLabel('Jumped to next unread thread (U) · Root · 1/3.')).toBe(
        'Jumped to next unread thread (U) · Root · 1/3.',
      )
      expect(getBoundaryJumpStatusAriaLabel(null)).toBeUndefined()
    })
  })

  describe('getThreadShortcutBadge', () => {
    it('maps common boundary/root shortcuts to compact badges', () => {
      expect(getThreadShortcutBadge('Shift+PageUp')).toBe('⇧PgUp')
      expect(getThreadShortcutBadge('Shift+PageDown')).toBe('⇧PgDn')
      expect(getThreadShortcutBadge('Shift+ArrowUp')).toBe('⇧↑')
      expect(getThreadShortcutBadge('Shift+ArrowDown')).toBe('⇧↓')
      expect(getThreadShortcutBadge('Shift+ArrowLeft')).toBe('⇧←')
      expect(getThreadShortcutBadge('Shift+ArrowRight')).toBe('⇧→')
      expect(getThreadShortcutBadge('Shift+Home')).toBe('⇧Home')
      expect(getThreadShortcutBadge('Shift+End')).toBe('⇧End')
      expect(getThreadShortcutBadge('Shift+G')).toBe('⇧G')
      expect(getThreadShortcutBadge('Shift+R')).toBe('⇧R')
      expect(getThreadShortcutBadge('Shift+U')).toBe('⇧U')
      expect(getThreadShortcutBadge('Shift+Enter')).toBe('⇧↵')
      expect(getThreadShortcutBadge('Shift+Escape')).toBe('⇧Esc')
      expect(getThreadShortcutBadge('Ctrl+PageUp')).toBe('Ctrl+PgUp')
      expect(getThreadShortcutBadge('Ctrl+ArrowUp')).toBe('Ctrl+↑')
      expect(getThreadShortcutBadge('Ctrl+ArrowLeft')).toBe('Ctrl+←')
      expect(getThreadShortcutBadge('Ctrl+Home')).toBe('Ctrl+Home')
      expect(getThreadShortcutBadge('Ctrl+Shift+End')).toBe('Ctrl+⇧End')
      expect(getThreadShortcutBadge('Control+PageDown')).toBe('Control+PgDn')
      expect(getThreadShortcutBadge('Control+ArrowDown')).toBe('Control+↓')
      expect(getThreadShortcutBadge('Control+ArrowRight')).toBe('Control+→')
      expect(getThreadShortcutBadge('Option+PageUp')).toBe('Option+PgUp')
      expect(getThreadShortcutBadge('Option+ArrowDown')).toBe('Option+↓')
      expect(getThreadShortcutBadge('Option+ArrowLeft')).toBe('Option+←')
      expect(getThreadShortcutBadge('Option+Home')).toBe('Option+Home')
      expect(getThreadShortcutBadge('Option+Shift+PageDown')).toBe('Option+⇧PgDn')
      expect(getThreadShortcutBadge('Option+Shift+Home')).toBe('Option+⇧Home')
      expect(getThreadShortcutBadge('Cmd+PageDown')).toBe('Cmd+PgDn')
      expect(getThreadShortcutBadge('Cmd+ArrowUp')).toBe('Cmd+↑')
      expect(getThreadShortcutBadge('Cmd+ArrowRight')).toBe('Cmd+→')
      expect(getThreadShortcutBadge('Cmd+End')).toBe('Cmd+End')
      expect(getThreadShortcutBadge('Cmd+Shift+PageUp')).toBe('Cmd+⇧PgUp')
      expect(getThreadShortcutBadge('Cmd+Shift+Home')).toBe('Cmd+⇧Home')
      expect(getThreadShortcutBadge('Command+PageUp')).toBe('Command+PgUp')
      expect(getThreadShortcutBadge('Command+ArrowDown')).toBe('Command+↓')
      expect(getThreadShortcutBadge('Command+ArrowLeft')).toBe('Command+←')
      expect(getThreadShortcutBadge('Command+Shift+PageDown')).toBe('Command+⇧PgDn')
      expect(getThreadShortcutBadge('Meta+PageDown')).toBe('Meta+PgDn')
      expect(getThreadShortcutBadge('Meta+ArrowUp')).toBe('Meta+↑')
      expect(getThreadShortcutBadge('Meta+ArrowLeft')).toBe('Meta+←')
      expect(getThreadShortcutBadge('Meta+Home')).toBe('Meta+Home')
      expect(getThreadShortcutBadge('Meta+Shift+PageUp')).toBe('Meta+⇧PgUp')
      expect(getThreadShortcutBadge('Meta+Shift+PageDown')).toBe('Meta+⇧PgDn')
      expect(getThreadShortcutBadge('Meta+Shift+End')).toBe('Meta+⇧End')
      expect(getThreadShortcutBadge('Home')).toBe('Home')
      expect(getThreadShortcutBadge('End')).toBe('End')
      expect(getThreadShortcutBadge('PageUp')).toBe('PgUp')
      expect(getThreadShortcutBadge('PageDown')).toBe('PgDn')
      expect(getThreadShortcutBadge('ArrowUp')).toBe('↑')
      expect(getThreadShortcutBadge('ArrowDown')).toBe('↓')
      expect(getThreadShortcutBadge('ArrowLeft')).toBe('←')
      expect(getThreadShortcutBadge('ArrowRight')).toBe('→')
      expect(getThreadShortcutBadge('Enter')).toBe('↵')
      expect(getThreadShortcutBadge('Escape')).toBe('Esc')
      expect(getThreadShortcutBadge('Slash')).toBe('/')
      expect(getThreadShortcutBadge('G')).toBe('G')
      expect(getThreadShortcutBadge('N')).toBe('N')
      expect(getThreadShortcutBadge('P')).toBe('P')
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
      expect(getThreadShortcutTooltip('Shift+ArrowUp')).toBe('Shift + Arrow Up')
      expect(getThreadShortcutTooltip('Shift+ArrowDown')).toBe('Shift + Arrow Down')
      expect(getThreadShortcutTooltip('Shift+ArrowLeft')).toBe('Shift + Arrow Left')
      expect(getThreadShortcutTooltip('Shift+ArrowRight')).toBe('Shift + Arrow Right')
      expect(getThreadShortcutTooltip('Shift+Home')).toBe('Shift + Home')
      expect(getThreadShortcutTooltip('Shift+End')).toBe('Shift + End')
      expect(getThreadShortcutTooltip('Shift+R')).toBe('Shift + R')
      expect(getThreadShortcutTooltip('Shift+U')).toBe('Shift + U')
      expect(getThreadShortcutTooltip('Shift+Enter')).toBe('Shift + Enter')
      expect(getThreadShortcutTooltip('Shift+Escape')).toBe('Shift + Escape')
      expect(getThreadShortcutTooltip('Ctrl+PageUp')).toBe('Ctrl + PageUp')
      expect(getThreadShortcutTooltip('Ctrl+ArrowUp')).toBe('Ctrl + Arrow Up')
      expect(getThreadShortcutTooltip('Ctrl+ArrowLeft')).toBe('Ctrl + Arrow Left')
      expect(getThreadShortcutTooltip('Ctrl+Home')).toBe('Ctrl + Home')
      expect(getThreadShortcutTooltip('Ctrl+Shift+End')).toBe('Ctrl + Shift + End')
      expect(getThreadShortcutTooltip('Control+PageDown')).toBe('Control + PageDown')
      expect(getThreadShortcutTooltip('Control+ArrowDown')).toBe('Control + Arrow Down')
      expect(getThreadShortcutTooltip('Control+ArrowRight')).toBe('Control + Arrow Right')
      expect(getThreadShortcutTooltip('Option+PageUp')).toBe('Option + PageUp')
      expect(getThreadShortcutTooltip('Option+ArrowDown')).toBe('Option + Arrow Down')
      expect(getThreadShortcutTooltip('Option+ArrowLeft')).toBe('Option + Arrow Left')
      expect(getThreadShortcutTooltip('Option+Home')).toBe('Option + Home')
      expect(getThreadShortcutTooltip('Option+Shift+PageDown')).toBe('Option + Shift + PageDown')
      expect(getThreadShortcutTooltip('Option+Shift+Home')).toBe('Option + Shift + Home')
      expect(getThreadShortcutTooltip('Cmd+PageDown')).toBe('Cmd + PageDown')
      expect(getThreadShortcutTooltip('Cmd+ArrowUp')).toBe('Cmd + Arrow Up')
      expect(getThreadShortcutTooltip('Cmd+ArrowRight')).toBe('Cmd + Arrow Right')
      expect(getThreadShortcutTooltip('Cmd+End')).toBe('Cmd + End')
      expect(getThreadShortcutTooltip('Cmd+Shift+PageUp')).toBe('Cmd + Shift + PageUp')
      expect(getThreadShortcutTooltip('Cmd+Shift+Home')).toBe('Cmd + Shift + Home')
      expect(getThreadShortcutTooltip('Command+PageUp')).toBe('Command + PageUp')
      expect(getThreadShortcutTooltip('Command+ArrowDown')).toBe('Command + Arrow Down')
      expect(getThreadShortcutTooltip('Command+ArrowLeft')).toBe('Command + Arrow Left')
      expect(getThreadShortcutTooltip('Command+Shift+PageDown')).toBe('Command + Shift + PageDown')
      expect(getThreadShortcutTooltip('Meta+PageDown')).toBe('Meta + PageDown')
      expect(getThreadShortcutTooltip('Meta+ArrowUp')).toBe('Meta + Arrow Up')
      expect(getThreadShortcutTooltip('Meta+ArrowLeft')).toBe('Meta + Arrow Left')
      expect(getThreadShortcutTooltip('Meta+Home')).toBe('Meta + Home')
      expect(getThreadShortcutTooltip('Meta+Shift+PageUp')).toBe('Meta + Shift + PageUp')
      expect(getThreadShortcutTooltip('Meta+Shift+PageDown')).toBe('Meta + Shift + PageDown')
      expect(getThreadShortcutTooltip('Meta+Shift+End')).toBe('Meta + Shift + End')
      expect(getThreadShortcutTooltip('PageDown')).toBe('PageDown')
      expect(getThreadShortcutTooltip('ArrowUp')).toBe('Arrow Up')
      expect(getThreadShortcutTooltip('ArrowLeft')).toBe('Arrow Left')
      expect(getThreadShortcutTooltip('ArrowRight')).toBe('Arrow Right')
      expect(getThreadShortcutTooltip('Enter')).toBe('Enter')
      expect(getThreadShortcutTooltip('Escape')).toBe('Escape')
      expect(getThreadShortcutTooltip('Slash')).toBe('Slash')
      expect(getThreadShortcutTooltip('G')).toBe('G')
      expect(getThreadShortcutTooltip('N')).toBe('N')
      expect(getThreadShortcutTooltip('P')).toBe('P')
      expect(getThreadShortcutTooltip('R')).toBe('R')
    })

    it('returns null for unknown or empty shortcut source', () => {
      expect(getThreadShortcutTooltip('Shift+Unknown')).toBeNull()
      expect(getThreadShortcutTooltip(null)).toBeNull()
    })
  })

  describe('normalizeAriaLabelText', () => {
    it('trims and collapses internal whitespace for aria-label canonicalization', () => {
      expect(normalizeAriaLabelText('  Shortcut  badge   ⇧PgUp:   Shift + PageUp (boundary jump).  ')).toBe(
        'Shortcut badge ⇧PgUp: Shift + PageUp (boundary jump).',
      )
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

  describe('getShortcutChipPresentationFromSource', () => {
    it('builds chip presentation directly from normalized shortcut source', () => {
      expect(getShortcutChipPresentationFromSource('J', 'boundary jump')).toEqual({
        source: 'J',
        badge: 'J',
        tooltip: 'J',
        copy: {
          title: 'J boundary jump',
          ariaLabel: 'Shortcut badge J: J (boundary jump).',
        },
      })
    })

    it('returns null when source has no known badge mapping', () => {
      expect(getShortcutChipPresentationFromSource('Mouse click', 'boundary jump')).toBeNull()
      expect(getShortcutChipPresentationFromSource(null, 'boundary jump')).toBeNull()
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
