import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  getShortcutChipPropsFromHint,
  getShortcutChipPropsFromSource,
  getStatusAriaLabelWithShortcutChip,
  getStatusAriaLabelWithShortcutChips,
  renderShortcutChipPresentation,
} from './threadHintChips'

describe('renderShortcutChipPresentation', () => {
  it('returns null when parser presentation payload is null', () => {
    expect(renderShortcutChipPresentation(null)).toBeNull()
  })

  it('renders badge/title/aria-label from shared presentation payload', () => {
    const chip = renderShortcutChipPresentation({
      badge: '⇧PgUp',
      title: 'Shift + PageUp boundary jump',
      ariaLabel: 'Shortcut badge ⇧PgUp: Shift + PageUp (boundary jump).',
      context: 'thread-jump',
    })

    const html = renderToStaticMarkup(<>{chip}</>)
    expect(html).toContain('⇧PgUp')
    expect(html).toContain('title="Shift + PageUp boundary jump"')
    expect(html).toContain('aria-label="Shortcut badge ⇧PgUp: Shift + PageUp (boundary jump)."')
    expect(html).toContain('border:1px solid #97b6f4')
  })
})

describe('getStatusAriaLabelWithShortcutChip', () => {
  it('returns undefined when hint is empty', () => {
    expect(getStatusAriaLabelWithShortcutChip(null, null)).toBeUndefined()
  })

  it('returns plain hint when chip presentation is missing', () => {
    expect(getStatusAriaLabelWithShortcutChip('Jumped to first visible thread (Mouse click).', null)).toBe(
      'Jumped to first visible thread (Mouse click).',
    )
  })

  it('appends chip aria-label when chip presentation exists', () => {
    expect(
      getStatusAriaLabelWithShortcutChip('Copied thread (Y) · root.', {
        badge: 'Y',
        title: 'Y thread copy',
        ariaLabel: 'Shortcut badge Y: Y (thread copy).',
        context: 'thread-jump',
      }),
    ).toBe('Copied thread (Y) · root. Shortcut badge Y: Y (thread copy).')
  })
})

describe('getStatusAriaLabelWithShortcutChips', () => {
  it('appends all chip aria-labels in order for multi-chip statuses', () => {
    expect(
      getStatusAriaLabelWithShortcutChips('Recovered to first visible thread (Shift+PageUp) · Root · 1/9.', [
        {
          badge: '⇧PgUp',
          title: 'Shift + PageUp boundary jump',
          ariaLabel: 'Shortcut badge ⇧PgUp: Shift + PageUp (boundary jump).',
          context: 'thread-jump',
        },
        {
          badge: '↖ first',
          title: 'Boundary direction: toward first visible thread',
          ariaLabel: 'Boundary direction cue: toward first visible thread',
          context: 'thread-jump',
        },
      ]),
    ).toBe(
      'Recovered to first visible thread (Shift+PageUp) · Root · 1/9. Shortcut badge ⇧PgUp: Shift + PageUp (boundary jump). Boundary direction cue: toward first visible thread',
    )
  })

  it('deduplicates repeated chip aria-labels while preserving first-seen order', () => {
    expect(
      getStatusAriaLabelWithShortcutChips('Recovered to first visible thread (Shift+PageUp) · Root · 1/9.', [
        {
          badge: '⇧PgUp',
          title: 'Shift + PageUp boundary jump',
          ariaLabel: 'Shortcut badge ⇧PgUp: Shift + PageUp (boundary jump).',
          context: 'thread-jump',
        },
        {
          badge: '⇧PgUp duplicate',
          title: 'Duplicate Shift + PageUp boundary jump',
          ariaLabel: 'Shortcut badge ⇧PgUp: Shift + PageUp (boundary jump).',
          context: 'thread-jump',
        },
        {
          badge: '↖ first',
          title: 'Boundary direction: toward first visible thread',
          ariaLabel: 'Boundary direction cue: toward first visible thread',
          context: 'thread-jump',
        },
      ]),
    ).toBe(
      'Recovered to first visible thread (Shift+PageUp) · Root · 1/9. Shortcut badge ⇧PgUp: Shift + PageUp (boundary jump). Boundary direction cue: toward first visible thread',
    )
  })

  it('normalizes whitespace before deduplicating aria-labels', () => {
    expect(
      getStatusAriaLabelWithShortcutChips('Recovered to first visible thread (Shift+PageUp) · Root · 1/9.', [
        {
          badge: '⇧PgUp',
          title: 'Shift + PageUp boundary jump',
          ariaLabel: 'Shortcut badge ⇧PgUp: Shift + PageUp (boundary jump).',
          context: 'thread-jump',
        },
        {
          badge: '⇧PgUp duplicate',
          title: 'Duplicate Shift + PageUp boundary jump',
          ariaLabel: '  Shortcut badge ⇧PgUp:   Shift + PageUp (boundary jump).  ',
          context: 'thread-jump',
        },
      ]),
    ).toBe('Recovered to first visible thread (Shift+PageUp) · Root · 1/9. Shortcut badge ⇧PgUp: Shift + PageUp (boundary jump).')
  })

  it('deduplicates aria-labels case-insensitively while preserving first-seen casing', () => {
    expect(
      getStatusAriaLabelWithShortcutChips('Recovered to first visible thread (Shift+PageUp) · Root · 1/9.', [
        {
          badge: '⇧PgUp',
          title: 'Shift + PageUp boundary jump',
          ariaLabel: 'Shortcut badge ⇧PgUp: Shift + PageUp (boundary jump).',
          context: 'thread-jump',
        },
        {
          badge: '⇧PgUp duplicate',
          title: 'Lowercase duplicate',
          ariaLabel: 'shortcut badge ⇧pgup: shift + pageup (boundary jump).',
          context: 'thread-jump',
        },
      ]),
    ).toBe('Recovered to first visible thread (Shift+PageUp) · Root · 1/9. Shortcut badge ⇧PgUp: Shift + PageUp (boundary jump).')
  })

  it('keeps hidden-selection recovery aria labels deterministic with boundary direction cues', () => {
    expect(
      getStatusAriaLabelWithShortcutChips('Tip: J/K/↑/↓ will also recover to ↖ first / ↘ last visible thread.', [
        {
          badge: 'J',
          title: 'J boundary jump',
          ariaLabel: 'Shortcut badge J: J (boundary jump).',
          context: 'thread-jump',
        },
        {
          badge: 'K',
          title: 'K boundary jump',
          ariaLabel: 'Shortcut badge K: K (boundary jump).',
          context: 'thread-jump',
        },
        {
          badge: '↑',
          title: 'Arrow Up boundary jump',
          ariaLabel: 'Shortcut badge ↑: Arrow Up (boundary jump).',
          context: 'thread-jump',
        },
        {
          badge: '↓',
          title: 'Arrow Down boundary jump',
          ariaLabel: 'Shortcut badge ↓: Arrow Down (boundary jump).',
          context: 'thread-jump',
        },
        {
          badge: '↖ first',
          title: 'Boundary direction: toward first visible thread',
          ariaLabel: 'Boundary direction cue: toward first visible thread',
          context: 'thread-jump',
        },
        {
          badge: '↘ last',
          title: 'Boundary direction: toward last visible thread',
          ariaLabel: 'Boundary direction cue: toward last visible thread',
          context: 'thread-jump',
        },
      ]),
    ).toBe(
      'Tip: J/K/↑/↓ will also recover to ↖ first / ↘ last visible thread. Shortcut badge J: J (boundary jump). Shortcut badge K: K (boundary jump). Shortcut badge ↑: Arrow Up (boundary jump). Shortcut badge ↓: Arrow Down (boundary jump). Boundary direction cue: toward first visible thread Boundary direction cue: toward last visible thread',
    )
  })
})

describe('getShortcutChipPropsFromSource', () => {
  it('maps explicit shortcut source to chip props with context', () => {
    expect(getShortcutChipPropsFromSource('K', 'boundary jump', 'thread-jump')).toEqual({
      badge: 'K',
      title: 'K boundary jump',
      ariaLabel: 'Shortcut badge K: K (boundary jump).',
      context: 'thread-jump',
    })
    expect(getShortcutChipPropsFromSource('ArrowUp', 'boundary jump', 'thread-jump')).toEqual({
      badge: '↑',
      title: 'Arrow Up boundary jump',
      ariaLabel: 'Shortcut badge ↑: Arrow Up (boundary jump).',
      context: 'thread-jump',
    })
    expect(getShortcutChipPropsFromSource('ArrowDown', 'filter jump', 'filter-jump')).toEqual({
      badge: '↓',
      title: 'Arrow Down filter jump',
      ariaLabel: 'Shortcut badge ↓: Arrow Down (filter jump).',
      context: 'filter-jump',
    })
    expect(getShortcutChipPropsFromSource('PageUp', 'boundary jump', 'thread-jump')).toEqual({
      badge: 'PgUp',
      title: 'PageUp boundary jump',
      ariaLabel: 'Shortcut badge PgUp: PageUp (boundary jump).',
      context: 'thread-jump',
    })
    expect(getShortcutChipPropsFromSource('PageDown', 'boundary jump', 'thread-jump')).toEqual({
      badge: 'PgDn',
      title: 'PageDown boundary jump',
      ariaLabel: 'Shortcut badge PgDn: PageDown (boundary jump).',
      context: 'thread-jump',
    })
    expect(getShortcutChipPropsFromSource('Slash', 'filter jump', 'filter-jump')).toEqual({
      badge: '/',
      title: 'Slash filter jump',
      ariaLabel: 'Shortcut badge /: Slash (filter jump).',
      context: 'filter-jump',
    })
    expect(getShortcutChipPropsFromSource('Escape', 'filter jump', 'filter-jump')).toEqual({
      badge: 'Esc',
      title: 'Escape filter jump',
      ariaLabel: 'Shortcut badge Esc: Escape (filter jump).',
      context: 'filter-jump',
    })
    expect(getShortcutChipPropsFromSource('Shift+Escape', 'filter jump', 'filter-jump')).toEqual({
      badge: '⇧Esc',
      title: 'Shift + Escape filter jump',
      ariaLabel: 'Shortcut badge ⇧Esc: Shift + Escape (filter jump).',
      context: 'filter-jump',
    })
    expect(getShortcutChipPropsFromSource('Shift+U', 'boundary jump', 'thread-jump')).toEqual({
      badge: '⇧U',
      title: 'Shift + U boundary jump',
      ariaLabel: 'Shortcut badge ⇧U: Shift + U (boundary jump).',
      context: 'thread-jump',
    })
    expect(getShortcutChipPropsFromSource('U', 'boundary jump', 'thread-jump')).toEqual({
      badge: 'U',
      title: 'U boundary jump',
      ariaLabel: 'Shortcut badge U: U (boundary jump).',
      context: 'thread-jump',
    })
    expect(getShortcutChipPropsFromSource('N', 'boundary jump', 'thread-jump')).toEqual({
      badge: 'N',
      title: 'N boundary jump',
      ariaLabel: 'Shortcut badge N: N (boundary jump).',
      context: 'thread-jump',
    })
  })

  it('returns null for unknown shortcut source', () => {
    expect(getShortcutChipPropsFromSource('Mouse click', 'boundary jump', 'thread-jump')).toBeNull()
  })
})

describe('getShortcutChipPropsFromHint', () => {
  it('maps thread jump hints to chip props with thread-jump context', () => {
    expect(
      getShortcutChipPropsFromHint('Jumped to root thread (Shift+R) · Root · 1/8.', 'root jump', 'thread-jump'),
    ).toEqual({
      badge: '⇧R',
      title: 'Shift + R root jump',
      ariaLabel: 'Shortcut badge ⇧R: Shift + R (root jump).',
      context: 'thread-jump',
    })
  })

  it('maps unread next alias hints (U/N) to boundary-jump chip props', () => {
    expect(
      getShortcutChipPropsFromHint('Jumped to next unread thread (U) · t-9 · 1/3.', 'boundary jump', 'thread-jump'),
    ).toEqual({
      badge: 'U',
      title: 'U boundary jump',
      ariaLabel: 'Shortcut badge U: U (boundary jump).',
      context: 'thread-jump',
    })
    expect(
      getShortcutChipPropsFromHint('Jumped to next unread thread (N) · t-9 · 1/3.', 'boundary jump', 'thread-jump'),
    ).toEqual({
      badge: 'N',
      title: 'N boundary jump',
      ariaLabel: 'Shortcut badge N: N (boundary jump).',
      context: 'thread-jump',
    })
  })

  it('normalizes lowercase unread-next alias hints (u/n) to canonical chip mappings', () => {
    expect(
      getShortcutChipPropsFromHint('Jumped to next unread thread (u) · t-9 · 1/3.', 'boundary jump', 'thread-jump'),
    ).toEqual({
      badge: 'U',
      title: 'U boundary jump',
      ariaLabel: 'Shortcut badge U: U (boundary jump).',
      context: 'thread-jump',
    })
    expect(
      getShortcutChipPropsFromHint('Jumped to next unread thread (n) · t-9 · 1/3.', 'boundary jump', 'thread-jump'),
    ).toEqual({
      badge: 'N',
      title: 'N boundary jump',
      ariaLabel: 'Shortcut badge N: N (boundary jump).',
      context: 'thread-jump',
    })
  })

  it('keeps unread-next alias semantics aligned while allowing badge/token differences', () => {
    const chipU = getShortcutChipPropsFromHint(
      'Jumped to next unread thread (U) · t-9 · 1/3.',
      'boundary jump',
      'thread-jump',
    )
    const chipN = getShortcutChipPropsFromHint(
      'Jumped to next unread thread (N) · t-9 · 1/3.',
      'boundary jump',
      'thread-jump',
    )

    expect(chipU?.context).toBe('thread-jump')
    expect(chipN?.context).toBe('thread-jump')

    expect(chipU?.title.replace('U', 'X')).toBe(chipN?.title.replace('N', 'X'))
    expect(chipU?.ariaLabel.replace(/badge U: U/, 'badge X: X')).toBe(
      chipN?.ariaLabel.replace(/badge N: N/, 'badge X: X'),
    )
  })

  it('composes unread-next status-row aria + chip rendering from hint text aliases (U/N)', () => {
    const unreadNextHintU = 'Jumped to next unread thread (U) · t-9 · 1/3.'
    const unreadNextHintN = 'Jumped to next unread thread (N) · t-9 · 1/3.'

    const chipU = getShortcutChipPropsFromHint(unreadNextHintU, 'boundary jump', 'thread-jump')
    const chipN = getShortcutChipPropsFromHint(unreadNextHintN, 'boundary jump', 'thread-jump')

    expect(getStatusAriaLabelWithShortcutChip(unreadNextHintU, chipU)).toBe(
      'Jumped to next unread thread (U) · t-9 · 1/3. Shortcut badge U: U (boundary jump).',
    )
    expect(getStatusAriaLabelWithShortcutChip(unreadNextHintN, chipN)).toBe(
      'Jumped to next unread thread (N) · t-9 · 1/3. Shortcut badge N: N (boundary jump).',
    )

    expect(renderToStaticMarkup(<>{renderShortcutChipPresentation(chipU)}</>)).toContain('>U<')
    expect(renderToStaticMarkup(<>{renderShortcutChipPresentation(chipN)}</>)).toContain('>N<')
  })

  it('composes unread-next status-row aria + chip rendering from lowercase hint aliases (u/n)', () => {
    const unreadNextHintU = 'Jumped to next unread thread (u) · t-9 · 1/3.'
    const unreadNextHintN = 'Jumped to next unread thread (n) · t-9 · 1/3.'

    const chipU = getShortcutChipPropsFromHint(unreadNextHintU, 'boundary jump', 'thread-jump')
    const chipN = getShortcutChipPropsFromHint(unreadNextHintN, 'boundary jump', 'thread-jump')

    expect(getStatusAriaLabelWithShortcutChip(unreadNextHintU, chipU)).toBe(
      'Jumped to next unread thread (u) · t-9 · 1/3. Shortcut badge U: U (boundary jump).',
    )
    expect(getStatusAriaLabelWithShortcutChip(unreadNextHintN, chipN)).toBe(
      'Jumped to next unread thread (n) · t-9 · 1/3. Shortcut badge N: N (boundary jump).',
    )

    expect(renderToStaticMarkup(<>{renderShortcutChipPresentation(chipU)}</>)).toContain('>U<')
    expect(renderToStaticMarkup(<>{renderShortcutChipPresentation(chipN)}</>)).toContain('>N<')
  })

  it('maps filter jump hints to chip props with filter-jump context', () => {
    expect(
      getShortcutChipPropsFromHint(
        'Recovered to first visible thread (Shift+Enter confirmed) · abc · 1/3.',
        'filter jump',
        'filter-jump',
      ),
    ).toEqual({
      badge: '⇧↵',
      title: 'Shift + Enter filter jump',
      ariaLabel: 'Shortcut badge ⇧↵: Shift + Enter (filter jump).',
      context: 'filter-jump',
    })
  })

  it('maps thread copy hints to chip props with thread-jump context', () => {
    expect(getShortcutChipPropsFromHint('Copied thread (Y) · root.', 'thread copy', 'thread-jump')).toEqual({
      badge: 'Y',
      title: 'Y thread copy',
      ariaLabel: 'Shortcut badge Y: Y (thread copy).',
      context: 'thread-jump',
    })
  })

  it('maps shortcut legend click-toggle status hints to chip props', () => {
    expect(
      getShortcutChipPropsFromHint('Thread shortcut legend shown (? / Shift+/).', 'filter jump', 'thread-jump'),
    ).toEqual({
      badge: '/',
      title: 'Slash filter jump',
      ariaLabel: 'Shortcut badge /: Slash (filter jump).',
      context: 'thread-jump',
    })
    expect(
      getShortcutChipPropsFromHint('Thread shortcut legend hidden (Esc).', 'filter jump', 'thread-jump'),
    ).toEqual({
      badge: 'Esc',
      title: 'Escape filter jump',
      ariaLabel: 'Shortcut badge Esc: Escape (filter jump).',
      context: 'thread-jump',
    })
  })

  it('returns null when hint has no known shortcut', () => {
    expect(getShortcutChipPropsFromHint('Jumped to root thread (Mouse click).', 'root jump', 'thread-jump')).toBeNull()
  })

  it('returns null for thread copy hints triggered by button click copy source', () => {
    expect(getShortcutChipPropsFromHint('Copied thread (button) · root.', 'thread copy', 'thread-jump')).toBeNull()
  })
})
