import { describe, expect, it } from 'bun:test'
import { extractIdealoPartner } from './idealoPartner.js'

describe('extractIdealoPartner', () => {
  it('should extract target from trg param', () => {
    const url = new URL(
      'https://www.idealo-partner.com/?trg=https%3A%2F%2Fexample.com%2Foffer',
    )

    expect(extractIdealoPartner(url)).toBe('https://example.com/offer')
  })

  it('should return null when trg param is missing', () => {
    const url = new URL('https://www.idealo-partner.com/?other=value')

    expect(extractIdealoPartner(url)).toBeUndefined()
  })

  it('should return null for non-idealo-partner hosts', () => {
    const url = new URL('https://example.com/?trg=https%3A%2F%2Fother.com')

    expect(extractIdealoPartner(url)).toBeUndefined()
  })
})
