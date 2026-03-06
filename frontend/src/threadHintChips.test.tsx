import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { getShortcutChipPropsFromHint, renderShortcutChipPresentation } from './threadHintChips'

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

  it('returns null when hint has no known shortcut', () => {
    expect(getShortcutChipPropsFromHint('Jumped to root thread (Mouse click).', 'root jump', 'thread-jump')).toBeNull()
  })
})
