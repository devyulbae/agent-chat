import { describe, expect, it } from 'vitest'

import {
  getSelectedVisibleThreadPositionLabel,
  isSelectedVisibleThreadHiddenByFilter,
} from './threadSelectionStatus'

describe('isSelectedVisibleThreadHiddenByFilter', () => {
  it('returns true when a selected child thread is filtered out', () => {
    expect(isSelectedVisibleThreadHiddenByFilter(-1, 'thread-123', true)).toBe(true)
  })

  it('returns true when root is selected but hidden from list', () => {
    expect(isSelectedVisibleThreadHiddenByFilter(-1, null, false)).toBe(true)
  })

  it('returns true when selected thread is hidden and no threads are visible', () => {
    expect(isSelectedVisibleThreadHiddenByFilter(-1, 'thread-123', false)).toBe(true)
  })

  it('returns false when selected thread is currently visible', () => {
    expect(isSelectedVisibleThreadHiddenByFilter(0, 'thread-123', true)).toBe(false)
  })
})

describe('getSelectedVisibleThreadPositionLabel', () => {
  it('returns hidden/total when selected thread is hidden by filters', () => {
    expect(getSelectedVisibleThreadPositionLabel(true, -1, 4)).toBe('hidden/4')
  })

  it('keeps hidden label explicit when selected thread is hidden and list is empty', () => {
    expect(getSelectedVisibleThreadPositionLabel(true, -1, 0)).toBe('hidden/0')
  })

  it('returns 1-indexed position when selected thread is visible', () => {
    expect(getSelectedVisibleThreadPositionLabel(false, 2, 5)).toBe('3/5')
  })

  it('returns 0/total when no selection exists and nothing is hidden', () => {
    expect(getSelectedVisibleThreadPositionLabel(false, -1, 2)).toBe('0/2')
  })
})
