import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  getShortcutChipPropsFromHint,
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

  it('returns null when hint has no known shortcut', () => {
    expect(getShortcutChipPropsFromHint('Jumped to root thread (Mouse click).', 'root jump', 'thread-jump')).toBeNull()
  })
})
