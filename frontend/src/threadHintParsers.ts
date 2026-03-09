export type BoundaryDirection = 'first' | 'last'
export type ShortcutChipIntent = 'root jump' | 'boundary jump' | 'filter jump' | 'thread copy'
export type ThreadFilterResetSource = 'input' | 'button' | 'shortcut'
export type UnreadJumpStep = 1 | -1

export function isThreadShortcutLegendToggleKey(key: string, shiftKey: boolean): boolean {
  if (key === '?') {
    return true
  }

  if (!shiftKey) {
    return false
  }

  return key === '/' || key === 'Slash'
}

export function getThreadShortcutLegendToggleControlCopy(): string {
  return '? / Shift+/'
}

export function isThreadShortcutLegendDismissKey(key: string): boolean {
  return key === 'Escape' || key === 'Esc'
}

export function getThreadShortcutLegendDismissControlCopy(): string {
  return 'Esc'
}

export function getThreadShortcutLegendButtonAriaKeyshortcuts(showThreadShortcutLegend: boolean): string {
  return showThreadShortcutLegend ? 'Question Shift+Slash Escape Esc' : 'Question Shift+Slash'
}

export function getThreadShortcutLegendRegionAriaKeyshortcuts(): string {
  return 'J K ArrowUp ArrowDown Home End PageUp PageDown Shift+G Shift+End Shift+PageDown U N P Shift+U Z Shift+Home Shift+R Question Shift+Slash Slash C Y Escape Esc'
}

export function getThreadShortcutLegendToggleStatusHint(showThreadShortcutLegend: boolean): string {
  return showThreadShortcutLegend
    ? `Thread shortcut legend shown (${getThreadShortcutLegendToggleControlCopy()}).`
    : `Thread shortcut legend hidden (${getThreadShortcutLegendDismissControlCopy()}).`
}

export function getThreadFilterResetHint(source: ThreadFilterResetSource): string {
  if (source === 'input') {
    return 'Reset thread view filters from filter input focus (Shift+Esc).'
  }

  if (source === 'button') {
    return 'Reset thread view filters from toolbar button (Shift+Esc).'
  }

  return 'Reset thread view filters from global shortcut (Shift+Esc).'
}

export function getBoundaryDirectionLabel(direction: BoundaryDirection): string {
  return direction === 'first' ? 'first visible thread' : 'last visible thread'
}

export function getBoundaryDirectionBadge(direction: BoundaryDirection): string {
  return direction === 'first' ? '↖ first' : '↘ last'
}

export function getBoundaryDirectionStatusCue(direction: BoundaryDirection): string {
  return `direction ${getBoundaryDirectionBadge(direction)}`
}

export function getUnreadJumpWrapStatusCue(
  step: UnreadJumpStep,
  currentIndex: number,
  nextIndex: number,
): string | null {
  if (currentIndex < 0) {
    return null
  }

  if (step > 0 && nextIndex < currentIndex) {
    return 'wrapped last→first'
  }

  if (step < 0 && nextIndex > currentIndex) {
    return 'wrapped first→last'
  }

  return null
}

export function getUnreadJumpWrapStatusCueAriaLabel(wrapCue: string | null): string | null {
  if (wrapCue === 'wrapped last→first') {
    return 'Unread wrap cue: wrapped from last unread thread to first unread thread.'
  }

  if (wrapCue === 'wrapped first→last') {
    return 'Unread wrap cue: wrapped from first unread thread to last unread thread.'
  }

  return null
}

export function getUnreadClearUndoStatusHint(clearedCount: number): string {
  return `Restored unread markers (Z) · ${Math.max(0, Math.trunc(clearedCount))} thread(s).`
}

export function getUnreadNavigationHintAriaLabel(
  baseAriaLabel: string | undefined,
  wrapCue: string | null,
): string | undefined {
  if (!baseAriaLabel) {
    return baseAriaLabel
  }

  const wrapCueAriaLabel = getUnreadJumpWrapStatusCueAriaLabel(wrapCue)
  if (!wrapCueAriaLabel) {
    return baseAriaLabel
  }

  const normalizedBaseAriaLabel = baseAriaLabel.toLowerCase()
  if (
    (wrapCue && normalizedBaseAriaLabel.includes(wrapCue.toLowerCase())) ||
    normalizedBaseAriaLabel.includes(wrapCueAriaLabel.toLowerCase())
  ) {
    return baseAriaLabel
  }

  return `${baseAriaLabel} ${wrapCueAriaLabel}`
}

export function isUnreadNavigationShortcutSource(shortcutSource: string | null): boolean {
  return shortcutSource === 'U' || shortcutSource === 'N' || shortcutSource === 'P'
}

export function getUnreadNavigationWrapCueForAria(
  wrapCue: string | null,
  boundaryJumpHint: string | null,
  boundaryJumpSourceShortcut: string | null,
  boundaryJumpAriaLabel?: string,
): string | null {
  if (!isUnreadNavigationShortcutSource(boundaryJumpSourceShortcut)) {
    return wrapCue
  }

  const wrapCueAriaLabel = getUnreadJumpWrapStatusCueAriaLabel(wrapCue)
  const normalizedBoundaryJumpAriaLabel = boundaryJumpAriaLabel?.toLowerCase() ?? ''

  const boundaryStatusAlreadyNarratesWrapCue =
    Boolean(boundaryJumpHint) ||
    (Boolean(wrapCue) && normalizedBoundaryJumpAriaLabel.includes(wrapCue.toLowerCase())) ||
    (Boolean(wrapCueAriaLabel) && normalizedBoundaryJumpAriaLabel.includes(wrapCueAriaLabel.toLowerCase()))

  return boundaryStatusAlreadyNarratesWrapCue ? null : wrapCue
}

export function getUnreadBoundaryJumpStatusAriaLabel(
  baseAriaLabel: string | undefined,
  shortcutSource: string | null,
  wrapCue: string | null,
): string | undefined {
  if (!baseAriaLabel) {
    return baseAriaLabel
  }

  if (!isUnreadNavigationShortcutSource(shortcutSource)) {
    return baseAriaLabel
  }

  return getUnreadNavigationHintAriaLabel(baseAriaLabel, wrapCue)
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

export function getBoundaryDirectionChipPresentationFromHint(
  hint: string | null,
): BoundaryDirectionChipPresentation | null {
  const direction = getBoundaryDirectionFromHint(hint)
  if (!direction) {
    return null
  }
  return getBoundaryDirectionChipPresentation(direction)
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
    .replace(/^\s*\[([^\]]+)\]\s*$/u, '$1')
    .replace(/[\[\]]/gu, '')
    .replace(/^\s*(?:key|shortcut)\b\s*[:=\-]?\s*/u, '')
    .replace(/⌘/gu, 'cmd+')
    .replace(/⌥/gu, 'option+')
    .replace(/⌃/gu, 'ctrl+')
    .replace(/⇧/gu, 'shift+')
    .replace(/[↩⏎⌤⌅]/gu, 'enter')
    .replace(/page[\s-]?up/gu, 'pageup')
    .replace(/page[\s-]?down/gu, 'pagedown')
    .replace(/pg\.?[\s-]?up/gu, 'pgup')
    .replace(/pg\.?[\s-]?down/gu, 'pgdn')
    .replace(/pg\.?[\s-]?dn/gu, 'pgdn')
    .replace(/arrow[\s-]?up/gu, 'arrowup')
    .replace(/up[\s-]?arrow/gu, 'arrowup')
    .replace(/arrow[\s-]?down/gu, 'arrowdown')
    .replace(/down[\s-]?arrow/gu, 'arrowdown')
    .replace(/arrow[\s-]?left/gu, 'arrowleft')
    .replace(/left[\s-]?arrow/gu, 'arrowleft')
    .replace(/arrow[\s-]?right/gu, 'arrowright')
    .replace(/right[\s-]?arrow/gu, 'arrowright')
    .replace(
      /\b(?:return|enter)(?:[\s-]+(?:symbol|key))?\s*\/\s*(?:return|enter)(?:[\s-]+(?:symbol|key))?\b/gu,
      'enter',
    )
    .replace(/\b(?:num\s*pad|numpad)[\s-]*(?:enter|return)\b/gu, 'enter')
    .replace(/\bnumpad(?:enter|return)\b/gu, 'enter')
    .replace(/\b(return|enter)[\s-]+symbol\b/gu, '$1')
    .replace(/\b(return|enter)[\s-]+key\b/gu, '$1')
    .replace(/\breturn\b/gu, 'enter')
    .replace(/\besc(?:ape)?[\s-]+key\b/gu, 'escape')
    .replace(/\besc(?:ape)?\b/gu, 'escape')
    .replace(/escape\s*\/\s*escape/gu, 'escape')
    .replace(/\?\s*\/\s*shift\s*\+\s*\//gu, 'slash')
    .replace(/shift\s*\+\s*\//gu, 'shift+slash')
    .replace(/forward[\s-]?slash/gu, 'slash')
    .replace(/slash(?:[\s-]+key)?\s*\/\s*shift\+slash/gu, 'slash')
    .replace(/\bfwd[\s-]?slash\b/gu, 'slash')
    .replace(/\bslash[\s-]+key\b/gu, 'slash')
    .replace(/\?/gu, 'slash')
    .replace(/\++/g, '+')
    .replace(/^\+|\+$/g, '')

  const aliasMap: Record<string, string> = {
    pgup: 'PageUp',
    pgdn: 'PageDown',
    pageup: 'PageUp',
    pagedown: 'PageDown',
    arrowup: 'ArrowUp',
    arrowdown: 'ArrowDown',
    arrowleft: 'ArrowLeft',
    arrowright: 'ArrowRight',
    '↑': 'ArrowUp',
    '↓': 'ArrowDown',
    '←': 'ArrowLeft',
    '→': 'ArrowRight',
    enter: 'Enter',
    escape: 'Escape',
    esc: 'Escape',
    slash: 'Slash',
    '/': 'Slash',
    g: 'G',
    j: 'J',
    k: 'K',
    u: 'U',
    n: 'N',
    p: 'P',
    y: 'Y',
    z: 'Z',
    c: 'C',
    r: 'R',
    '↵': 'Enter',
    '⌤': 'Enter',
    '⌅': 'Enter',
    '⏎': 'Enter',
  }

  if (aliasMap[normalizedShortcut]) {
    return aliasMap[normalizedShortcut]
  }

  const spaceSeparatedComboMatch = normalizedShortcut.match(
    /^(?<modifiers>(?:(?:shift|ctrl|control|alt|option|opt|cmd|command|meta)\s+)+)(?<key>pgup|pgdn|pageup|pagedown|arrowup|arrowdown|arrowleft|arrowright|home|end|enter|escape|esc|slash)$/i,
  )
  if (spaceSeparatedComboMatch?.groups) {
    const spaceSeparatedKeyAlias = spaceSeparatedComboMatch.groups.key.toLowerCase()
    const spaceSeparatedKeyAliasMap: Record<string, string> = {
      pgup: 'PageUp',
      pageup: 'PageUp',
      pgdn: 'PageDown',
      pagedown: 'PageDown',
      arrowup: 'ArrowUp',
      arrowdown: 'ArrowDown',
      arrowleft: 'ArrowLeft',
      arrowright: 'ArrowRight',
      home: 'Home',
      end: 'End',
      enter: 'Enter',
      escape: 'Escape',
      esc: 'Escape',
      slash: 'Slash',
    }
    const spaceSeparatedModifierAliasMap: Record<string, string> = {
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

    const spaceSeparatedKey = spaceSeparatedKeyAliasMap[spaceSeparatedKeyAlias]
    const spaceSeparatedModifiers = spaceSeparatedComboMatch.groups.modifiers
      .trim()
      .split(/\s+/)
      .map((modifier) => spaceSeparatedModifierAliasMap[modifier.toLowerCase()])
      .filter((modifier): modifier is string => Boolean(modifier))

    if (spaceSeparatedKey && spaceSeparatedModifiers.length > 0) {
      return `${spaceSeparatedModifiers.join('+')}+${spaceSeparatedKey}`
    }
  }

  const compactNavKeyAliasMap: Record<string, string> = {
    pgup: 'PageUp',
    pageup: 'PageUp',
    pgdn: 'PageDown',
    pagedown: 'PageDown',
    arrowup: 'ArrowUp',
    arrowdown: 'ArrowDown',
    arrowleft: 'ArrowLeft',
    arrowright: 'ArrowRight',
    home: 'Home',
    end: 'End',
    enter: 'Enter',
    escape: 'Escape',
    esc: 'Escape',
    slash: 'Slash',
  }
  const compactModifierAliasMap: Record<string, string> = {
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
  const compactModifierTokens = Object.keys(compactModifierAliasMap).sort(
    (left, right) => right.length - left.length,
  )

  const compactComboMatch = normalizedShortcut.match(
    /^(?<modifier>shift|ctrl|control|alt|option|opt|cmd|command|meta)(?<key>pgup|pgdn|pageup|pagedown|arrowup|arrowdown|arrowleft|arrowright|home|end|enter|escape|esc|slash)$/i,
  )
  if (compactComboMatch?.groups) {
    const compactKey = compactNavKeyAliasMap[compactComboMatch.groups.key.toLowerCase()]
    const compactModifier = compactModifierAliasMap[compactComboMatch.groups.modifier.toLowerCase()]
    if (compactKey && compactModifier) {
      return `${compactModifier}+${compactKey}`
    }
  }

  const compactMultiModifierMatch = normalizedShortcut.match(
    /^(?<modifiers>(?:shift|ctrl|control|alt|option|opt|cmd|command|meta){2,})(?<key>pgup|pgdn|pageup|pagedown|arrowup|arrowdown|arrowleft|arrowright|home|end|enter|escape|esc|slash)$/i,
  )
  if (compactMultiModifierMatch?.groups) {
    const compactKey = compactNavKeyAliasMap[compactMultiModifierMatch.groups.key.toLowerCase()]
    const compactModifiers: string[] = []
    let remainingModifiers = compactMultiModifierMatch.groups.modifiers.toLowerCase()

    while (remainingModifiers.length > 0) {
      const matchedModifier = compactModifierTokens.find((token) => remainingModifiers.startsWith(token))
      if (!matchedModifier) {
        compactModifiers.length = 0
        break
      }
      compactModifiers.push(compactModifierAliasMap[matchedModifier])
      remainingModifiers = remainingModifiers.slice(matchedModifier.length)
    }

    if (compactKey && compactModifiers.length > 1) {
      return `${compactModifiers.join('+')}+${compactKey}`
    }
  }

  const comboMatch = normalizedShortcut.match(
    /^(?<modifiers>(?:[a-z]+\+)+)(?<key>pgup|pgdn|pageup|pagedown|arrowup|arrowdown|arrowleft|arrowright|↑|↓|←|→|home|end|enter|escape|esc|slash|\/|↵|⌤|⌅|⏎)$/i,
  )
  if (!comboMatch?.groups) {
    return shortcut
  }

  const keyAlias = comboMatch.groups.key.toLowerCase()
  const normalizedKeyAliasMap: Record<string, string> = {
    pgup: 'PageUp',
    pageup: 'PageUp',
    pgdn: 'PageDown',
    pagedown: 'PageDown',
    arrowup: 'ArrowUp',
    '↑': 'ArrowUp',
    arrowdown: 'ArrowDown',
    '↓': 'ArrowDown',
    arrowleft: 'ArrowLeft',
    '←': 'ArrowLeft',
    arrowright: 'ArrowRight',
    '→': 'ArrowRight',
    home: 'Home',
    end: 'End',
    enter: 'Enter',
    escape: 'Escape',
    esc: 'Escape',
    slash: 'Slash',
    '↵': 'Enter',
    '⌤': 'Enter',
    '⌅': 'Enter',
    '⏎': 'Enter',
  }
  const normalizedKey = normalizedKeyAliasMap[keyAlias]
  if (!normalizedKey) {
    return shortcut
  }
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
        .replace(/[\s.,;:!]+$/u, '')
        .replace(/\s*\+\s*/g, '+')
        .trim(),
    ),
  )

  const shortcutLikeSegment = normalizedSegments.find((segment) =>
    /^(?:(?:(?:shift|ctrl|control|alt|option|cmd|command|meta)\+)+[a-z0-9][\w-]*|home|end|pageup|pagedown|arrowup|arrowdown|arrowleft|arrowright|enter|escape|slash|g|j|k|u|n|p|y|z|c|r)$/i.test(
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
    'shift+arrowup': '⇧↑',
    'shift+arrowdown': '⇧↓',
    'shift+arrowleft': '⇧←',
    'shift+arrowright': '⇧→',
    'shift+g': '⇧G',
    'shift+r': '⇧R',
    'shift+u': '⇧U',
    'shift+enter': '⇧↵',
    'shift+escape': '⇧Esc',
    'shift+slash': '⇧/',
    'ctrl+pageup': 'Ctrl+PgUp',
    'ctrl+pagedown': 'Ctrl+PgDn',
    'ctrl+arrowup': 'Ctrl+↑',
    'ctrl+arrowdown': 'Ctrl+↓',
    'ctrl+arrowleft': 'Ctrl+←',
    'ctrl+arrowright': 'Ctrl+→',
    'ctrl+home': 'Ctrl+Home',
    'ctrl+end': 'Ctrl+End',
    'ctrl+shift+home': 'Ctrl+⇧Home',
    'ctrl+shift+end': 'Ctrl+⇧End',
    'control+pageup': 'Control+PgUp',
    'control+pagedown': 'Control+PgDn',
    'control+arrowup': 'Control+↑',
    'control+arrowdown': 'Control+↓',
    'control+arrowleft': 'Control+←',
    'control+arrowright': 'Control+→',
    'control+home': 'Control+Home',
    'control+end': 'Control+End',
    'control+shift+home': 'Control+⇧Home',
    'control+shift+end': 'Control+⇧End',
    'option+pageup': 'Option+PgUp',
    'option+pagedown': 'Option+PgDn',
    'option+arrowup': 'Option+↑',
    'option+arrowdown': 'Option+↓',
    'option+arrowleft': 'Option+←',
    'option+arrowright': 'Option+→',
    'option+home': 'Option+Home',
    'option+end': 'Option+End',
    'option+shift+pageup': 'Option+⇧PgUp',
    'option+shift+pagedown': 'Option+⇧PgDn',
    'option+shift+home': 'Option+⇧Home',
    'option+shift+end': 'Option+⇧End',
    'cmd+pageup': 'Cmd+PgUp',
    'cmd+pagedown': 'Cmd+PgDn',
    'cmd+arrowup': 'Cmd+↑',
    'cmd+arrowdown': 'Cmd+↓',
    'cmd+arrowleft': 'Cmd+←',
    'cmd+arrowright': 'Cmd+→',
    'cmd+home': 'Cmd+Home',
    'cmd+end': 'Cmd+End',
    'cmd+shift+pageup': 'Cmd+⇧PgUp',
    'cmd+shift+pagedown': 'Cmd+⇧PgDn',
    'cmd+shift+home': 'Cmd+⇧Home',
    'cmd+shift+end': 'Cmd+⇧End',
    'command+pageup': 'Command+PgUp',
    'command+pagedown': 'Command+PgDn',
    'command+arrowup': 'Command+↑',
    'command+arrowdown': 'Command+↓',
    'command+arrowleft': 'Command+←',
    'command+arrowright': 'Command+→',
    'command+home': 'Command+Home',
    'command+end': 'Command+End',
    'command+shift+pageup': 'Command+⇧PgUp',
    'command+shift+pagedown': 'Command+⇧PgDn',
    'command+shift+home': 'Command+⇧Home',
    'command+shift+end': 'Command+⇧End',
    'meta+pageup': 'Meta+PgUp',
    'meta+pagedown': 'Meta+PgDn',
    'meta+arrowup': 'Meta+↑',
    'meta+arrowdown': 'Meta+↓',
    'meta+arrowleft': 'Meta+←',
    'meta+arrowright': 'Meta+→',
    'meta+home': 'Meta+Home',
    'meta+end': 'Meta+End',
    'meta+shift+pageup': 'Meta+⇧PgUp',
    'meta+shift+pagedown': 'Meta+⇧PgDn',
    'meta+shift+home': 'Meta+⇧Home',
    'meta+shift+end': 'Meta+⇧End',
    home: 'Home',
    end: 'End',
    pageup: 'PgUp',
    pagedown: 'PgDn',
    arrowup: '↑',
    arrowdown: '↓',
    arrowleft: '←',
    arrowright: '→',
    enter: '↵',
    numpadenter: '↵',
    escape: 'Esc',
    slash: '/',
    g: 'G',
    j: 'J',
    k: 'K',
    u: 'U',
    n: 'N',
    p: 'P',
    y: 'Y',
    z: 'Z',
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
    'shift+arrowup': 'Shift + Arrow Up',
    'shift+arrowdown': 'Shift + Arrow Down',
    'shift+arrowleft': 'Shift + Arrow Left',
    'shift+arrowright': 'Shift + Arrow Right',
    'shift+g': 'Shift + G',
    'shift+r': 'Shift + R',
    'shift+u': 'Shift + U',
    'shift+enter': 'Shift + Enter',
    'shift+escape': 'Shift + Escape',
    'shift+slash': 'Shift + Slash',
    'ctrl+pageup': 'Ctrl + PageUp',
    'ctrl+pagedown': 'Ctrl + PageDown',
    'ctrl+arrowup': 'Ctrl + Arrow Up',
    'ctrl+arrowdown': 'Ctrl + Arrow Down',
    'ctrl+arrowleft': 'Ctrl + Arrow Left',
    'ctrl+arrowright': 'Ctrl + Arrow Right',
    'ctrl+home': 'Ctrl + Home',
    'ctrl+end': 'Ctrl + End',
    'ctrl+shift+home': 'Ctrl + Shift + Home',
    'ctrl+shift+end': 'Ctrl + Shift + End',
    'control+pageup': 'Control + PageUp',
    'control+pagedown': 'Control + PageDown',
    'control+arrowup': 'Control + Arrow Up',
    'control+arrowdown': 'Control + Arrow Down',
    'control+arrowleft': 'Control + Arrow Left',
    'control+arrowright': 'Control + Arrow Right',
    'control+home': 'Control + Home',
    'control+end': 'Control + End',
    'control+shift+home': 'Control + Shift + Home',
    'control+shift+end': 'Control + Shift + End',
    'option+pageup': 'Option + PageUp',
    'option+pagedown': 'Option + PageDown',
    'option+arrowup': 'Option + Arrow Up',
    'option+arrowdown': 'Option + Arrow Down',
    'option+arrowleft': 'Option + Arrow Left',
    'option+arrowright': 'Option + Arrow Right',
    'option+home': 'Option + Home',
    'option+end': 'Option + End',
    'option+shift+pageup': 'Option + Shift + PageUp',
    'option+shift+pagedown': 'Option + Shift + PageDown',
    'option+shift+home': 'Option + Shift + Home',
    'option+shift+end': 'Option + Shift + End',
    'cmd+pageup': 'Cmd + PageUp',
    'cmd+pagedown': 'Cmd + PageDown',
    'cmd+arrowup': 'Cmd + Arrow Up',
    'cmd+arrowdown': 'Cmd + Arrow Down',
    'cmd+arrowleft': 'Cmd + Arrow Left',
    'cmd+arrowright': 'Cmd + Arrow Right',
    'cmd+home': 'Cmd + Home',
    'cmd+end': 'Cmd + End',
    'cmd+shift+pageup': 'Cmd + Shift + PageUp',
    'cmd+shift+pagedown': 'Cmd + Shift + PageDown',
    'cmd+shift+home': 'Cmd + Shift + Home',
    'cmd+shift+end': 'Cmd + Shift + End',
    'command+pageup': 'Command + PageUp',
    'command+pagedown': 'Command + PageDown',
    'command+arrowup': 'Command + Arrow Up',
    'command+arrowdown': 'Command + Arrow Down',
    'command+arrowleft': 'Command + Arrow Left',
    'command+arrowright': 'Command + Arrow Right',
    'command+home': 'Command + Home',
    'command+end': 'Command + End',
    'command+shift+pageup': 'Command + Shift + PageUp',
    'command+shift+pagedown': 'Command + Shift + PageDown',
    'command+shift+home': 'Command + Shift + Home',
    'command+shift+end': 'Command + Shift + End',
    'meta+pageup': 'Meta + PageUp',
    'meta+pagedown': 'Meta + PageDown',
    'meta+arrowup': 'Meta + Arrow Up',
    'meta+arrowdown': 'Meta + Arrow Down',
    'meta+arrowleft': 'Meta + Arrow Left',
    'meta+arrowright': 'Meta + Arrow Right',
    'meta+home': 'Meta + Home',
    'meta+end': 'Meta + End',
    'meta+shift+pageup': 'Meta + Shift + PageUp',
    'meta+shift+pagedown': 'Meta + Shift + PageDown',
    'meta+shift+home': 'Meta + Shift + Home',
    'meta+shift+end': 'Meta + Shift + End',
    home: 'Home',
    end: 'End',
    pageup: 'PageUp',
    pagedown: 'PageDown',
    arrowup: 'Arrow Up',
    arrowdown: 'Arrow Down',
    arrowleft: 'Arrow Left',
    arrowright: 'Arrow Right',
    enter: 'Enter',
    numpadenter: 'Numpad Enter',
    escape: 'Escape',
    slash: 'Slash',
    g: 'G',
    j: 'J',
    k: 'K',
    u: 'U',
    n: 'N',
    p: 'P',
    y: 'Y',
    z: 'Z',
    c: 'C',
    r: 'R',
  }

  return tooltipByShortcut[normalizedShortcut] ?? null
}

export function normalizeAriaLabelText(text: string): string {
  return text.trim().replace(/\s+/g, ' ')
}

export function buildShortcutChipCopy(
  badge: string,
  shortcutText: string,
  intent: ShortcutChipIntent,
): { title: string; ariaLabel: string } {
  return {
    title: `${shortcutText} ${intent}`,
    ariaLabel: normalizeAriaLabelText(`Shortcut badge ${badge}: ${shortcutText} (${intent}).`),
  }
}

export type ShortcutChipPresentation = {
  source: string
  badge: string
  tooltip: string
  copy: { title: string; ariaLabel: string }
}

export function getShortcutChipPresentationFromSource(
  source: string | null,
  intent: ShortcutChipIntent,
): ShortcutChipPresentation | null {
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

export function getShortcutChipPresentationFromHint(
  hint: string | null,
  intent: ShortcutChipIntent,
): ShortcutChipPresentation | null {
  return getShortcutChipPresentationFromSource(getHintShortcutSource(hint), intent)
}
