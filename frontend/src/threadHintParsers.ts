export type BoundaryDirection = 'first' | 'last'
export type ShortcutChipIntent = 'root jump' | 'boundary jump' | 'filter jump'

export function getBoundaryDirectionLabel(direction: BoundaryDirection): string {
  return direction === 'first' ? 'first visible thread' : 'last visible thread'
}

export function getBoundaryDirectionBadge(direction: BoundaryDirection): string {
  return direction === 'first' ? '↖ first' : '↘ last'
}

export function getBoundaryDirectionTooltip(direction: BoundaryDirection): string {
  return `Boundary direction: toward ${getBoundaryDirectionLabel(direction)}`
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

function normalizeShortcutAlias(shortcut: string): string {
  const normalizedShortcut = shortcut
    .toLowerCase()
    .replace(/^⇧\s*\+/u, 'shift+')
    .replace(/^⌃\s*\+/u, 'ctrl+')

  const aliasMap: Record<string, string> = {
    pgup: 'PageUp',
    pgdn: 'PageDown',
    '↑': 'ArrowUp',
    '↓': 'ArrowDown',
    '↵': 'Enter',
  }

  if (aliasMap[normalizedShortcut]) {
    return aliasMap[normalizedShortcut]
  }

  const comboMatch = normalizedShortcut.match(/^(?<modifier>[a-z]+)\+(?<key>pgup|pgdn)$/i)
  if (!comboMatch?.groups) {
    return shortcut
  }

  const modifier = comboMatch.groups.modifier
  const keyAlias = comboMatch.groups.key
  const normalizedKey = keyAlias === 'pgup' ? 'PageUp' : 'PageDown'
  const normalizedModifier = modifier.charAt(0).toUpperCase() + modifier.slice(1)
  return `${normalizedModifier}+${normalizedKey}`
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
    normalizeShortcutAlias(
      segment
        .replace(/^.*?:\s*/u, '')
        .replace(/\s+confirmed$/i, '')
        .replace(/\s*\+\s*/g, '+')
        .trim(),
    ),
  )

  const shortcutLikeSegment = normalizedSegments.find((segment) =>
    /^(?:(?:shift|ctrl|control|alt|option|cmd|command|meta)\+[a-z0-9][\w-]*|home|end|pageup|pagedown|arrowup|arrowdown|enter|g|j|k|u|y|c|r)$/i.test(
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
    'shift+u': '⇧U',
    'shift+enter': '⇧↵',
    'ctrl+pageup': 'Ctrl+PgUp',
    'ctrl+pagedown': 'Ctrl+PgDn',
    'control+pageup': 'Control+PgUp',
    'control+pagedown': 'Control+PgDn',
    home: 'Home',
    end: 'End',
    pageup: 'PgUp',
    pagedown: 'PgDn',
    arrowup: '↑',
    arrowdown: '↓',
    enter: '↵',
    g: 'G',
    j: 'J',
    k: 'K',
    u: 'U',
    y: 'Y',
    c: 'C',
    r: 'R',
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
    'shift+u': 'Shift + U',
    'shift+enter': 'Shift + Enter',
    'ctrl+pageup': 'Ctrl + PageUp',
    'ctrl+pagedown': 'Ctrl + PageDown',
    'control+pageup': 'Control + PageUp',
    'control+pagedown': 'Control + PageDown',
    home: 'Home',
    end: 'End',
    pageup: 'PageUp',
    pagedown: 'PageDown',
    arrowup: 'Arrow Up',
    arrowdown: 'Arrow Down',
    enter: 'Enter',
    g: 'G',
    j: 'J',
    k: 'K',
    u: 'U',
    y: 'Y',
    c: 'C',
    r: 'R',
  }

  return tooltipByShortcut[normalizedShortcut] ?? null
}

export function buildShortcutChipCopy(
  badge: string,
  shortcutText: string,
  intent: ShortcutChipIntent,
): { title: string; ariaLabel: string } {
  return {
    title: `${shortcutText} ${intent}`,
    ariaLabel: `Shortcut badge ${badge}: ${shortcutText} (${intent}).`,
  }
}
