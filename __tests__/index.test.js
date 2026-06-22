/**
 * Unit tests for the action's entrypoint, src/index.js
 */

import { jest } from '@jest/globals'

// Mock the action's entrypoint
jest.unstable_mockModule('../src/main.js', () => ({
  run: jest.fn()
}))

describe('index', () => {
  it('calls run when imported', async () => {
    const { run } = await import('../src/main.js')
    await import('../src/index.js')

    expect(run).toHaveBeenCalled()
  })
})
