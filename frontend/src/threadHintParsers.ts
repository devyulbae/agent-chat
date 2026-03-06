export type BoundaryDirection = 'first' | 'last'

export function getBoundaryDirectionLabel(direction: BoundaryDirection): string {
  return direction === 'first' ? 'first visible thread' : 'last visible thread'
}

export function getBoundaryDirectionBadge(direction: BoundaryDirection): string {
  return direction === 'first' ? '↖ first' : '↘ last'
}

export function getBoundaryDirectionFromHint(hint: string | null): BoundaryDirection | null {
  if (!hint) {
    return null
  }

  const normalizedHint = hint.toLowerCase()
  if (/\bfirst visible thread\b/.test(normalizedHint)) {
    return 'first'
  }
  if (/\blast visible thread\b/.test(normalizedHint)) {
    return 'last'
  }
  return null
}

export function getHintShortcutSource(hint: string | null): string | null {
  if (!hint) {
    return null
  }

  const parenthesizedSegments = [...hint.matchAll(/\(([^()]*)\)/g)]
    .map((match) => match[1]?.trim())
    .filter((segment): segment is string => Boolean(segment))

  if (parenthesizedSegments.length === 0) {
    return null
  }

  const shortcutLikeSegment =
    parenthesizedSegments.find((segment) => /(?:^|\s|:)\w+\+\w+/i.test(segment)) ??
    parenthesizedSegments[0]

  return shortcutLikeSegment.replace(/^.*?:\s*/u, '').replace(/\s+confirmed$/i, '').trim()
}
