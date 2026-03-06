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

export type BoundaryDirectionChipPresentation = {
  badge: string
  title: string
  ariaLabel: string
}

export function getBoundaryDirectionChipPresentation(
  direction: BoundaryDirection,
): BoundaryDirectionChipPresentation {
  return {
    badge: getBoundaryDirectionBadge(direction),
    title: getBoundaryDirectionTooltip(direction),
    ariaLabel: `Boundary direction cue: toward ${getBoundaryDirectionLabel(direction)}`,
  }
}

export function getBoundaryJumpStatusAriaLabel(hint: string | null): string | undefined {
  if (!hint) {
    return undefined
  }

  const direction = getBoundaryDirectionFromHint(hint)
  if (!direction) {
    return hint
  }

  return `${hint} ${getBoundaryDirectionChipPresentation(direction).ariaLabel}.`
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
    .replace(/⌘/gu, 'cmd+')
    .replace(/⌥/gu, 'option+')
    .replace(/⌃/gu, 'ctrl+')
    .replace(/⇧/gu, 'shift+')
    .replace(/page[\s-]?up/gu, 'pageup')
    .replace(/page[\s-]?down/gu, 'pagedown')
    .replace(/pg[\s-]?up/gu, 'pgup')
    .replace(/pg[\s-]?down/gu, 'pgdn')
    .replace(/pg[\s-]?dn/gu, 'pgdn')
    .replace(/\++/g, '+')
    .replace(/^\+|\+$/g, '')

  const aliasMap: Record<string, string> = {
    pgup: 'PageUp',
    pgdn: 'PageDown',
    pageup: 'PageUp',
    pagedown: 'PageDown',
    '↑': 'ArrowUp',
    '↓': 'ArrowDown',
    '↵': 'Enter',
  }

  if (aliasMap[normalizedShortcut]) {
    return aliasMap[normalizedShortcut]
  }

  const comboMatch = normalizedShortcut.match(
    /^(?<modifiers>(?:[a-z]+\+)+)(?<key>pgup|pgdn|pageup|pagedown)$/i,
  )
  if (!comboMatch?.groups) {
    return shortcut
  }

  const keyAlias = comboMatch.groups.key.toLowerCase()
  const normalizedKey = keyAlias === 'pgup' || keyAlias === 'pageup' ? 'PageUp' : 'PageDown'
  const normalizedModifierAliasMap: Record<string, string> = {
    ctrl: 'Ctrl',
    control: 'Control',
    alt: 'Alt',
    option: 'Option',
    opt: 'Option',
    cmd: 'Cmd',
    command: 'Command',
    meta: 'Meta',
    shift: 'Shift',
  }
  const normalizedModifiers = comboMatch.groups.modifiers
    .split('+')
    .filter(Boolean)
    .map((modifier) =>
      normalizedModifierAliasMap[modifier] ?? modifier.charAt(0).toUpperCase() + modifier.slice(1),
    )

  return `${normalizedModifiers.join('+')}+${normalizedKey}`
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
    /^(?:(?:(?:shift|ctrl|control|alt|option|cmd|command|meta)\+)+[a-z0-9][\w-]*|home|end|pageup|pagedown|arrowup|arrowdown|enter|g|j|k|u|y|c|r)$/i.test(
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
    'option+pageup': 'Option+PgUp',
    'option+pagedown': 'Option+PgDn',
    'option+shift+pageup': 'Option+⇧PgUp',
    'option+shift+pagedown': 'Option+⇧PgDn',
    'cmd+pageup': 'Cmd+PgUp',
    'cmd+pagedown': 'Cmd+PgDn',
    'cmd+shift+pageup': 'Cmd+⇧PgUp',
    'cmd+shift+pagedown': 'Cmd+⇧PgDn',
    'command+pageup': 'Command+PgUp',
    'command+pagedown': 'Command+PgDn',
    'command+shift+pageup': 'Command+⇧PgUp',
    'command+shift+pagedown': 'Command+⇧PgDn',
    'meta+pageup': 'Meta+PgUp',
    'meta+pagedown': 'Meta+PgDn',
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
    'option+pageup': 'Option + PageUp',
    'option+pagedown': 'Option + PageDown',
    'option+shift+pageup': 'Option + Shift + PageUp',
    'option+shift+pagedown': 'Option + Shift + PageDown',
    'cmd+pageup': 'Cmd + PageUp',
    'cmd+pagedown': 'Cmd + PageDown',
    'cmd+shift+pageup': 'Cmd + Shift + PageUp',
    'cmd+shift+pagedown': 'Cmd + Shift + PageDown',
    'command+pageup': 'Command + PageUp',
    'command+pagedown': 'Command + PageDown',
    'command+shift+pageup': 'Command + Shift + PageUp',
    'command+shift+pagedown': 'Command + Shift + PageDown',
    'meta+pageup': 'Meta + PageUp',
    'meta+pagedown': 'Meta + PageDown',
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

export type ShortcutChipPresentation = {
  source: string
  badge: string
  tooltip: string
  copy: { title: string; ariaLabel: string }
}

export function getShortcutChipPresentationFromHint(
  hint: string | null,
  intent: ShortcutChipIntent,
): ShortcutChipPresentation | null {
  const source = getHintShortcutSource(hint)
  if (!source) {
    return null
  }

  const badge = getThreadShortcutBadge(source)
  if (!badge) {
    return null
  }

  const tooltip = getThreadShortcutTooltip(source) ?? source
  return {
    source,
    badge,
    tooltip,
    copy: buildShortcutChipCopy(badge, tooltip, intent),
  }
}
