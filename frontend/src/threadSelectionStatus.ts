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
