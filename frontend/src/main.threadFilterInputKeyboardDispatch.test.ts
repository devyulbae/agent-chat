import { describe, expect, it } from 'vitest'

import { getThreadFilterInputKeyboardDispatchOutcome } from './main'

describe('getThreadFilterInputKeyboardDispatchOutcome', () => {
  it('maps Shift+Home/PageUp and Shift+End/PageDown to first/last visible jumps', () => {
    expect(
      getThreadFilterInputKeyboardDispatchOutcome({
        key: 'Home',
        shiftKey: true,
        metaKey: false,
        ctrlKey: false,
        altKey: false,
        defaultPrevented: false,
        hasThreadFilter: true,
      })
    ).toEqual({
      handled: true,
      action: 'jumpFirstVisible',
    })

    expect(
      getThreadFilterInputKeyboardDispatchOutcome({
        key: 'PageUp',
        shiftKey: true,
        metaKey: false,
        ctrlKey: false,
        altKey: false,
        defaultPrevented: false,
        hasThreadFilter: true,
      })
    ).toEqual({
      handled: true,
      action: 'jumpFirstVisible',
    })

    expect(
      getThreadFilterInputKeyboardDispatchOutcome({
        key: 'End',
        shiftKey: true,
        metaKey: false,
        ctrlKey: false,
        altKey: false,
        defaultPrevented: false,
        hasThreadFilter: true,
      })
    ).toEqual({
      handled: true,
      action: 'jumpLastVisible',
    })

    expect(
      getThreadFilterInputKeyboardDispatchOutcome({
        key: 'PageDown',
        shiftKey: true,
        metaKey: false,
        ctrlKey: false,
        altKey: false,
        defaultPrevented: false,
        hasThreadFilter: true,
      })
    ).toEqual({
      handled: true,
      action: 'jumpLastVisible',
    })
  })

  it('preserves existing enter/escape behavior', () => {
    expect(
      getThreadFilterInputKeyboardDispatchOutcome({
        key: 'Enter',
        shiftKey: false,
        metaKey: false,
        ctrlKey: false,
        altKey: false,
        defaultPrevented: false,
        hasThreadFilter: false,
      })
    ).toEqual({
      handled: true,
      action: 'jumpFirstVisible',
    })

    expect(
      getThreadFilterInputKeyboardDispatchOutcome({
        key: 'Enter',
        shiftKey: true,
        metaKey: false,
        ctrlKey: false,
        altKey: false,
        defaultPrevented: false,
        hasThreadFilter: false,
      })
    ).toEqual({
      handled: true,
      action: 'jumpLastVisible',
    })

    expect(
      getThreadFilterInputKeyboardDispatchOutcome({
        key: 'Escape',
        shiftKey: false,
        metaKey: false,
        ctrlKey: false,
        altKey: false,
        defaultPrevented: false,
        hasThreadFilter: true,
      })
    ).toEqual({
      handled: true,
      action: 'clearFilter',
    })

    expect(
      getThreadFilterInputKeyboardDispatchOutcome({
        key: 'Escape',
        shiftKey: true,
        metaKey: false,
        ctrlKey: false,
        altKey: false,
        defaultPrevented: false,
        hasThreadFilter: false,
      })
    ).toEqual({
      handled: true,
      action: 'resetView',
    })
  })

  it('ignores default-prevented and modified shortcuts', () => {
    expect(
      getThreadFilterInputKeyboardDispatchOutcome({
        key: 'Enter',
        shiftKey: false,
        metaKey: true,
        ctrlKey: false,
        altKey: false,
        defaultPrevented: false,
        hasThreadFilter: true,
      })
    ).toEqual({
      handled: false,
      action: 'none',
    })

    expect(
      getThreadFilterInputKeyboardDispatchOutcome({
        key: 'Escape',
        shiftKey: false,
        metaKey: false,
        ctrlKey: false,
        altKey: false,
        defaultPrevented: true,
        hasThreadFilter: true,
      })
    ).toEqual({
      handled: false,
      action: 'none',
    })
  })
})
