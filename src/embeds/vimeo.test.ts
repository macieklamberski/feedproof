import { describe, expect, it } from 'bun:test'
import { describeForEachParser } from '../tests.js'
import { extractVimeoId, vimeoEmbedResolver, vimeoResolveEmbed } from './vimeo.js'

describe('extractVimeoId', () => {
  it('should extract id from a vimeo.com url', () => {
    expect(extractVimeoId('https://vimeo.com/76979871')).toBe('76979871')
  })

  it('should extract id from a player embed url', () => {
    expect(extractVimeoId('https://player.vimeo.com/video/76979871')).toBe('76979871')
  })

  it('should extract id from a channel url', () => {
    expect(extractVimeoId('https://vimeo.com/channels/staffpicks/76979871')).toBe('76979871')
  })

  it('should return undefined when there is no numeric id', () => {
    expect(extractVimeoId('https://vimeo.com/user/profile')).toBeUndefined()
  })
})

describe('vimeoResolveEmbed', () => {
  it('should build the embed without a thumbnail', () => {
    const result = vimeoResolveEmbed('https://vimeo.com/76979871')
    const expected = {
      provider: 'vimeo',
      id: '76979871',
      src: 'https://player.vimeo.com/video/76979871',
      url: 'https://vimeo.com/76979871',
    }

    expect(result).toEqual(expected)
    expect(result?.thumbnail).toBeUndefined()
  })

  it('should preserve an unlisted hash', () => {
    const result = vimeoResolveEmbed('https://player.vimeo.com/video/76979871?h=abc123')

    expect(result?.src).toBe('https://player.vimeo.com/video/76979871?h=abc123')
  })

  it('should preserve the start offset', () => {
    const result = vimeoResolveEmbed('https://player.vimeo.com/video/76979871?t=30s')

    expect(result?.src).toBe('https://player.vimeo.com/video/76979871?t=30s')
  })

  it('should drop tracking parameters', () => {
    const result = vimeoResolveEmbed('https://player.vimeo.com/video/76979871?utm_source=feed')

    expect(result?.src).toBe('https://player.vimeo.com/video/76979871')
  })
})

describeForEachParser('vimeoEmbedResolver', (parseHtml) => {
  const resolve = (value: string) => {
    const element = parseHtml(value).querySelector(vimeoEmbedResolver.selector) ?? undefined
    return element ? vimeoEmbedResolver.extract(element) : undefined
  }

  it('should resolve a vimeo iframe', async () => {
    const result = await resolve('<iframe src="https://player.vimeo.com/video/76979871"></iframe>')

    expect(result?.provider).toBe('vimeo')
    expect(result?.id).toBe('76979871')
  })

  it('should ignore a non-vimeo iframe', async () => {
    const result = await resolve('<iframe src="https://example.com/video"></iframe>')

    expect(result).toBeUndefined()
  })
})
