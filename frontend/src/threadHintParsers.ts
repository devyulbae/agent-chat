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
  if (hint.includes(' first visible thread')) {
    return 'first'
  }
  if (hint.includes(' last visible thread')) {
    return 'last'
  }
  return null
}

export function getHintShortcutSource(hint: string | null): string | null {
  if (!hint) {
    return null
  }
  return hint.match(/\(([^)]+)\)/)?.[1]?.trim() ?? null
}
