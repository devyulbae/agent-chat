import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { renderShortcutChipPresentation } from './threadHintChips'

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
