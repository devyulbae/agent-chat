export function isSelectedVisibleThreadHiddenByFilter(
  selectedVisibleThreadIndex: number,
  selectedThreadId: string | null,
  showRootThreadInList: boolean,
): boolean {
  return selectedVisibleThreadIndex < 0 && (selectedThreadId !== null || !showRootThreadInList)
}

export function getSelectedVisibleThreadPositionLabel(
  selectedVisibleThreadHiddenByFilter: boolean,
  selectedVisibleThreadIndex: number,
  visibleThreadCount: number,
): string {
  if (selectedVisibleThreadHiddenByFilter) {
    return `hidden/${visibleThreadCount}`
  }

  return `${selectedVisibleThreadIndex >= 0 ? selectedVisibleThreadIndex + 1 : 0}/${visibleThreadCount}`
}

export function getSelectedVisibleThreadInlineRecoveryHint(
  selectedVisibleThreadHiddenByFilter: boolean,
  selectedVisibleThreadPositionLabel: string,
): string | null {
  if (!selectedVisibleThreadHiddenByFilter) {
    return null
  }

  return `Hidden selection recovery (${selectedVisibleThreadPositionLabel}): J/K or ↑/↓ → ↖ first / ↘ last visible.`
}

export function getSelectedVisibleThreadShortcutRecoveryHint(
  selectedVisibleThreadHiddenByFilter: boolean,
  selectedVisibleThreadPositionLabel: string,
): string | null {
  if (!selectedVisibleThreadHiddenByFilter) {
    return null
  }

  return `Tip (${selectedVisibleThreadPositionLabel}): J/K/↑/↓ will also recover to ↖ first / ↘ last visible thread.`
}

export function getSelectedVisibleThreadButtonRecoveryHint(
  selectedVisibleThreadHiddenByFilter: boolean,
  selectedVisibleThreadPositionLabel: string,
): string | null {
  if (!selectedVisibleThreadHiddenByFilter) {
    return null
  }

  return `Selection hidden (${selectedVisibleThreadPositionLabel}) → use “Jump to first/last visible”.`
}
