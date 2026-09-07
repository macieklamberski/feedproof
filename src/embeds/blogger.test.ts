import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { bloggerEmbedResolver, bloggerResolveEmbed, extractBloggerToken } from './blogger.js'

const token = 'AD6v5dz1mv6dQ8n4YQ4bC1eGZs9v-x7pK2fQ'

describe('extractBloggerToken', () => {
  it('should read the token from a player url', () => {
    const value = `https://www.blogger.com/video.g?token=${token}`

    expect(extractBloggerToken(value)).toBe(token)
  })

  it('should read the token from the draft host', () => {
    const value = `https://draft.blogger.com/video.g?token=${token}`

    expect(extractBloggerToken(value)).toBe(token)
  })

  it('should return undefined for a blogger url that is not the player', () => {
    const value = `https://www.blogger.com/share-post.g?token=${token}`

    expect(extractBloggerToken(value)).toBeUndefined()
  })

  it('should return undefined for a player url with no token', () => {
    const value = 'https://www.blogger.com/video.g'

    expect(extractBloggerToken(value)).toBeUndefined()
  })

  it('should return undefined for a token outside the url-safe base64 alphabet', () => {
    const value = 'https://www.blogger.com/video.g?token=../../etc'

    expect(extractBloggerToken(value)).toBeUndefined()
  })

  it('should return undefined for an empty token', () => {
    const value = 'https://www.blogger.com/video.g?token='

    expect(extractBloggerToken(value)).toBeUndefined()
  })

  it('should read a token shorter than the ones Blogger writes today', () => {
    const value = 'https://www.blogger.com/video.g?token=AD6v5dz1'

    expect(extractBloggerToken(value)).toBe('AD6v5dz1')
  })

  it('should return undefined for a url that cannot be parsed', () => {
    const value = 'https://['

    expect(extractBloggerToken(value)).toBeUndefined()
  })
})

describe('bloggerResolveEmbed', () => {
  describe('happy paths', () => {
    // Blogger publishes no watch page and no derivable poster, so provider and id are all there is.
    it('should carry the provider and the token as the id', () => {
      const value = `https://www.blogger.com/video.g?token=${token}`
      const expected: EmbedResolverResult = {
        provider: 'blogger',
        id: token,
        src: `https://www.blogger.com/video.g?token=${token}`,
      }

      expect(bloggerResolveEmbed(value)).toEqual(expected)
    })

    it('should mint the canonical player url from the draft host', () => {
      const value = `https://draft.blogger.com/video.g?token=${token}`
      const expected: EmbedResolverResult = {
        provider: 'blogger',
        id: token,
        src: `https://www.blogger.com/video.g?token=${token}`,
      }

      expect(bloggerResolveEmbed(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should return undefined for a blogger url that is not the player', () => {
      const value = 'https://www.blogger.com/profile/12345'

      expect(bloggerResolveEmbed(value)).toBeUndefined()
    })

    it('should return undefined for a url that cannot be parsed', () => {
      const value = 'https://['

      expect(bloggerResolveEmbed(value)).toBeUndefined()
    })
  })
})

describeForEachParser('bloggerEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, bloggerEmbedResolver)

  describe('happy paths', () => {
    it('should resolve the uploaded-video iframe', async () => {
      const value = html`
        <div class="separator">
          <iframe class="b-hbp-video b-uploaded" src="https://www.blogger.com/video.g?token=${token}" frameborder="0" allowfullscreen></iframe>
        </div>
      `
      const expected: EmbedResolverResult = {
        provider: 'blogger',
        id: token,
        src: `https://www.blogger.com/video.g?token=${token}`,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should return undefined for a host that only carries blogger.com in its path', async () => {
      const value = html`
        <iframe class="b-hbp-video" src="https://evil.test/blogger.com/video.g?token=${token}"></iframe>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for a blogger iframe that is not the player', async () => {
      const value = '<iframe src="https://www.blogger.com/blogger.g?blogID=123"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })
  })
})
