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

  const normalizedSegments = parenthesizedSegments.map((segment) =>
    segment
      .replace(/^.*?:\s*/u, '')
      .replace(/\s+confirmed$/i, '')
      .replace(/\s*\+\s*/g, '+')
      .trim(),
  )

  const shortcutLikeSegment = normalizedSegments.find((segment) =>
    /^(?:(?:shift|ctrl|control|alt|option|cmd|command|meta)\+[a-z0-9][\w-]*|home|end|pageup|pagedown|arrowup|arrowdown|g|j|k|u|y|c)$/i.test(
      segment,
    ),
  )

  return shortcutLikeSegment ?? null
}

export function getThreadShortcutBadge(shortcut: string | null): string | null {
  if (!shortcut) {
    return null
  }

  const normalizedShortcut = shortcut.toLowerCase()
  const badgeByShortcut: Record<string, string> = {
    'shift+home': '⇧Home',
    'shift+end': '⇧End',
    'shift+pageup': '⇧PgUp',
    'shift+pagedown': '⇧PgDn',
    'shift+g': '⇧G',
    'shift+r': '⇧R',
    home: 'Home',
    end: 'End',
    pageup: 'PgUp',
    pagedown: 'PgDn',
    arrowup: '↑',
    arrowdown: '↓',
    g: 'G',
    j: 'J',
    k: 'K',
    u: 'U',
    y: 'Y',
    c: 'C',
  }

  return badgeByShortcut[normalizedShortcut] ?? null
}

export function getThreadShortcutTooltip(shortcut: string | null): string | null {
  if (!shortcut) {
    return null
  }

  const normalizedShortcut = shortcut.toLowerCase()
  const tooltipByShortcut: Record<string, string> = {
    'shift+home': 'Shift + Home',
    'shift+end': 'Shift + End',
    'shift+pageup': 'Shift + PageUp',
    'shift+pagedown': 'Shift + PageDown',
    'shift+g': 'Shift + G',
    'shift+r': 'Shift + R',
    home: 'Home',
    end: 'End',
    pageup: 'PageUp',
    pagedown: 'PageDown',
    arrowup: 'Arrow Up',
    arrowdown: 'Arrow Down',
    g: 'G',
    j: 'J',
    k: 'K',
    u: 'U',
    y: 'Y',
    c: 'C',
  }

  return tooltipByShortcut[normalizedShortcut] ?? null
}
