import { describe, expect, it } from 'vitest'

import { getSelectedVisibleThreadPositionLabel } from './threadSelectionStatus'

describe('getSelectedVisibleThreadPositionLabel', () => {
  it('returns hidden/total when selected thread is hidden by filters', () => {
    expect(getSelectedVisibleThreadPositionLabel(true, -1, 4)).toBe('hidden/4')
  })

  it('returns 1-indexed position when selected thread is visible', () => {
    expect(getSelectedVisibleThreadPositionLabel(false, 2, 5)).toBe('3/5')
  })

  it('returns 0/total when no selection exists and nothing is hidden', () => {
    expect(getSelectedVisibleThreadPositionLabel(false, -1, 2)).toBe('0/2')
  })
})
