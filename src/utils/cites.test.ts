import { describe, expect, it } from 'bun:test'
import type { CiteResolverResult } from '../types.js'
import { buildCite } from './cites.js'

describe('buildCite', () => {
  describe('happy paths', () => {
    it('should trim every text field', () => {
      const value = {
        provider: 'stub',
        url: ' https://example.com/post ',
        title: '  Page title\n',
        description: ' Preview text ',
        author: ' Author name ',
        publisher: ' example.com ',
        icon: ' https://example.com/i.ico ',
        thumbnail: ' https://example.com/t.jpg ',
      }
      const expected: CiteResolverResult = {
        provider: 'stub',
        url: 'https://example.com/post',
        title: 'Page title',
        description: 'Preview text',
        author: 'Author name',
        publisher: 'example.com',
        icon: 'https://example.com/i.ico',
        thumbnail: 'https://example.com/t.jpg',
      }

      expect(buildCite(value)).toEqual(expected)
    })

    it('should keep non-text fields as they are', () => {
      const value = {
        provider: 'stub',
        url: 'https://example.com/post',
        title: 'Page title',
        kind: 'reply',
      } as const

      expect(buildCite(value)?.kind).toBe('reply')
    })
  })

  describe('edge cases', () => {
    it('should drop fields that are blank or nullish', () => {
      const value = {
        provider: 'stub',
        url: 'https://example.com/post',
        title: 'Page title',
        description: '   ',
        author: null,
        publisher: undefined,
      }
      const result = buildCite(value)

      expect(result?.description).toBeUndefined()
      expect(result?.author).toBeUndefined()
      expect(result?.publisher).toBeUndefined()
    })

    it('should accept a null url or title from a raw DOM read', () => {
      const value = { provider: 'stub', url: null, title: null }

      expect(buildCite(value)).toBeUndefined()
    })
  })

  describe('sad paths', () => {
    it('should return undefined when the url is missing', () => {
      const value = { provider: 'stub', title: 'Page title' }

      expect(buildCite(value)).toBeUndefined()
    })

    it('should return undefined when the title is missing', () => {
      const value = { provider: 'stub', url: 'https://example.com/post' }

      expect(buildCite(value)).toBeUndefined()
    })

    it('should return undefined when the url or the title is blank', () => {
      expect(buildCite({ provider: 'stub', url: '  ', title: 'Page title' })).toBeUndefined()
      expect(
        buildCite({ provider: 'stub', url: 'https://example.com', title: ' ' }),
      ).toBeUndefined()
    })
  })
})
