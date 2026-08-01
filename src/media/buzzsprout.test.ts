import { describe, expect, it } from 'bun:test'
import { describeForEachParser } from '../tests.js'
import type { MediaResolverResult } from '../types.js'
import { buzzsproutMediaResolver } from './buzzsprout.js'

describeForEachParser('buzzsproutMediaResolver', (parseHtml) => {
  const extract = (value: string): MediaResolverResult | undefined => {
    const element = parseHtml(value).querySelector(buzzsproutMediaResolver.selector)

    return element ? (buzzsproutMediaResolver.extract(element) as MediaResolverResult) : undefined
  }

  describe('happy paths', () => {
    it('should build the mp3 url from the plain script form', () => {
      const value =
        '<script src="https://www.buzzsprout.com/231452/19565923.js?container_id=buzzsprout-player-19565923&player=small"></script>'
      const expected: MediaResolverResult = {
        tag: 'audio',
        src: 'https://www.buzzsprout.com/231452/19565923.mp3',
      }

      expect(extract(value)).toEqual(expected)
    })

    it('should build the mp3 url from the episodes-slug form', () => {
      const value =
        '<script charset="utf-8" src="https://www.buzzsprout.com/42610/episodes/19141080-dreampod-150-mike-tucker.js?container_id=buzzsprout-player-19141080"></script>'

      expect(extract(value)?.src).toBe('https://www.buzzsprout.com/42610/19141080.mp3')
    })
  })

  describe('edge cases', () => {
    // The show-level embed carries no episode id, so there is nothing to resolve it to.
    it('should return undefined for the show-level script', () => {
      const value = '<script src="https://www.buzzsprout.com/231452.js?player=large"></script>'

      expect(extract(value)).toBeUndefined()
    })

    it('should return undefined for a lookalike host', () => {
      const value = '<script src="https://buzzsprout.com.evil.test/231452/19565923.js"></script>'

      expect(extract(value)).toBeUndefined()
    })

    it('should return undefined for a non-numeric episode segment', () => {
      const value = '<script src="https://www.buzzsprout.com/231452/about.js"></script>'

      expect(extract(value)).toBeUndefined()
    })
  })
})
