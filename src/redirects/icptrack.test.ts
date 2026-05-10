import { describe, expect, it } from 'bun:test'
import { extractIcptrack } from './icptrack.js'

describe('extractIcptrack', () => {
  it('should extract target from destination param', () => {
    const url = new URL(
      'https://click.icptrack.com/icp/relay.php?r=1&msgid=2&destination=https%3A%2F%2Fexample.com%2Farticle',
    )

    expect(extractIcptrack(url)).toBe('https://example.com/article')
  })

  it('should return null for non-relay paths', () => {
    const url = new URL('https://click.icptrack.com/other?destination=https%3A%2F%2Fexample.com')

    expect(extractIcptrack(url)).toBeUndefined()
  })

  it('should return null when destination param is missing', () => {
    const url = new URL('https://click.icptrack.com/icp/relay.php?r=1&msgid=2')

    expect(extractIcptrack(url)).toBeUndefined()
  })

  it('should return null for non-ICPTrack hosts', () => {
    const url = new URL('https://example.com/icp/relay.php?destination=https%3A%2F%2Fother.com')

    expect(extractIcptrack(url)).toBeUndefined()
  })
})
