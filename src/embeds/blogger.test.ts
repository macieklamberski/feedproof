import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { bloggerIframeEmbedResolver, bloggerResolveEmbed, extractBloggerToken } from './blogger.js'

const token = 'AD6v5dz1mv6dQ8n4YQ4bC1eGZs9v-x7pK2fQ'

describe('extractBloggerToken', () => {
  it('should read the token from a player url', () => {
    expect(extractBloggerToken(`https://www.blogger.com/video.g?token=${token}`)).toBe(token)
  })

  it('should read the token from the draft host', () => {
    expect(extractBloggerToken(`https://draft.blogger.com/video.g?token=${token}`)).toBe(token)
  })

  it('should return undefined for a blogger url that is not the player', () => {
    expect(
      extractBloggerToken(`https://www.blogger.com/share-post.g?token=${token}`),
    ).toBeUndefined()
  })

  it('should return undefined for a player url with no token', () => {
    expect(extractBloggerToken('https://www.blogger.com/video.g')).toBeUndefined()
  })

  it('should return undefined for a token outside the url-safe base64 alphabet', () => {
    expect(extractBloggerToken('https://www.blogger.com/video.g?token=../../etc')).toBeUndefined()
  })

  it('should return undefined for a url that cannot be parsed', () => {
    expect(extractBloggerToken('https://[')).toBeUndefined()
  })
})

describe('bloggerResolveEmbed', () => {
  describe('happy paths', () => {
    // Blogger publishes no watch page and no derivable poster, so provider and id are all there is.
    it('should carry the provider and the token as the id', () => {
      const expected: EmbedResolverResult = {
        provider: 'blogger',
        id: token,
        src: `https://www.blogger.com/video.g?token=${token}`,
      }

      expect(bloggerResolveEmbed(`https://www.blogger.com/video.g?token=${token}`)).toEqual(
        expected,
      )
    })

    it('should mint the canonical player url from the draft host', () => {
      expect(bloggerResolveEmbed(`https://draft.blogger.com/video.g?token=${token}`)).toMatchObject(
        {
          src: `https://www.blogger.com/video.g?token=${token}`,
        },
      )
    })
  })

  describe('sad paths', () => {
    it('should return undefined for a blogger url that is not the player', () => {
      expect(bloggerResolveEmbed('https://www.blogger.com/profile/12345')).toBeUndefined()
    })

    it('should return undefined for a url that cannot be parsed', () => {
      expect(bloggerResolveEmbed('https://[')).toBeUndefined()
    })
  })
})

describeForEachParser('bloggerIframeEmbedResolver', (parseHtml) => {
  const extract = (value: string): EmbedResolverResult | undefined => {
    const element = parseHtml(value).querySelector(bloggerIframeEmbedResolver.selector)

    return element
      ? (bloggerIframeEmbedResolver.extract(element) as EmbedResolverResult)
      : undefined
  }

  describe('happy paths', () => {
    it('should resolve the uploaded-video iframe', () => {
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

      expect(extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should return undefined for a host that only carries blogger.com in its path', () => {
      const value = html`
        <iframe class="b-hbp-video" src="https://evil.test/blogger.com/video.g?token=${token}"></iframe>
      `

      expect(extract(value)).toBeUndefined()
    })

    it('should return undefined for a blogger iframe that is not the player', () => {
      const value = html`<iframe src="https://www.blogger.com/blogger.g?blogID=123"></iframe>`

      expect(extract(value)).toBeUndefined()
    })
  })
})
