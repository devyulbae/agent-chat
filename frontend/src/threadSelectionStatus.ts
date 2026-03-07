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
