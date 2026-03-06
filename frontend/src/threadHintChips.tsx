import React from 'react'
import {
  getShortcutChipPresentationFromHint,
  type ShortcutChipIntent,
} from './threadHintParsers'

const THREAD_SHORTCUT_CHIP_BASE_STYLE: React.CSSProperties = {
  display: 'inline-block',
  marginRight: 6,
  padding: '0 4px',
  borderRadius: 6,
  fontSize: '0.75rem',
  letterSpacing: '0.02em',
}

const THREAD_SHORTCUT_CHIP_BORDER_BY_CONTEXT: Record<'thread-jump' | 'filter-jump', string> = {
  'thread-jump': '1px solid #97b6f4',
  'filter-jump': '1px solid #d0d7de',
}

export type ShortcutChipContext = 'thread-jump' | 'filter-jump'

export type ShortcutChipProps = {
  badge: string
  title: string
  ariaLabel: string
  context: ShortcutChipContext
}

export function getShortcutChipPropsFromHint(
  hint: string | null,
  intent: ShortcutChipIntent,
  context: ShortcutChipContext,
): ShortcutChipProps | null {
  const shortcutChipPresentation = getShortcutChipPresentationFromHint(hint, intent)
  if (!shortcutChipPresentation) {
    return null
  }

  return {
    badge: shortcutChipPresentation.badge,
    title: shortcutChipPresentation.copy.title,
    ariaLabel: shortcutChipPresentation.copy.ariaLabel,
    context,
  }
}

export function ShortcutChip({ badge, title, ariaLabel, context }: ShortcutChipProps): React.JSX.Element {
  return (
    <span
      title={title}
      aria-label={ariaLabel}
      style={{
        ...THREAD_SHORTCUT_CHIP_BASE_STYLE,
        border: THREAD_SHORTCUT_CHIP_BORDER_BY_CONTEXT[context],
      }}
    >
      {badge}
    </span>
  )
}

export function renderShortcutChipPresentation(
  presentation: ShortcutChipProps | null,
): React.JSX.Element | null {
  if (!presentation) {
    return null
  }

  return (
    <ShortcutChip
      badge={presentation.badge}
      title={presentation.title}
      ariaLabel={presentation.ariaLabel}
      context={presentation.context}
    />
  )
}

export function getStatusAriaLabelWithShortcutChips(
  hint: string | null,
  presentations: Array<ShortcutChipProps | null>,
): string | undefined {
  if (!hint) {
    return undefined
  }

  const chipAriaLabels = presentations
    .filter((presentation): presentation is ShortcutChipProps => Boolean(presentation))
    .map((presentation) => presentation.ariaLabel.trim().replace(/\s+/g, ' '))
    .filter((ariaLabel) => Boolean(ariaLabel))
    .filter((ariaLabel, index, labels) => labels.indexOf(ariaLabel) === index)

  if (!chipAriaLabels.length) {
    return hint
  }

  return `${hint} ${chipAriaLabels.join(' ')}`
}

export function getStatusAriaLabelWithShortcutChip(
  hint: string | null,
  presentation: ShortcutChipProps | null,
): string | undefined {
  return getStatusAriaLabelWithShortcutChips(hint, [presentation])
}
