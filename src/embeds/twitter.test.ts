import { describe, expect, it } from 'bun:test'
import { transformContent } from '../index.js'
import { describeForEachParser, html } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { twitterEmbedResolver, twitterResolveEmbed } from './twitter.js'

const statusId = '123456789012345'

describeForEachParser('twitterEmbedResolver', (parseHtml) => {
  const extract = (value: string): EmbedResolverResult | undefined => {
    const element = parseHtml(value).querySelector(twitterEmbedResolver.selector)

    return element ? (twitterEmbedResolver.extract(element) as EmbedResolverResult) : undefined
  }

  describe('happy paths', () => {
    it('should mint the player url and the canonical status url', () => {
      const value = html`
        <blockquote class="twitter-tweet">
          <p lang="en" dir="ltr">Tweet text here.</p>
          <p>
            — Display Name (@user)
            <a href="https://twitter.com/user/status/${statusId}">May 12, 2020</a>
          </p>
        </blockquote>
      `

      expect(extract(value)).toMatchObject({
        provider: 'twitter',
        id: statusId,
        src: `https://platform.twitter.com/embed/Tweet.html?id=${statusId}`,
        url: `https://x.com/user/status/${statusId}`,
      })
    })

    it('should carry the tweet text, the display name and the date', () => {
      const value = html`
        <blockquote class="twitter-tweet">
          <p lang="en" dir="ltr">Tweet text here.</p>
          <p>
            — Display Name (@user)
            <a href="https://twitter.com/user/status/${statusId}">May 12, 2020</a>
          </p>
        </blockquote>
      `

      expect(extract(value)).toMatchObject({
        description: 'Tweet text here.',
        author: 'Display Name',
        date: 'May 12, 2020',
      })
    })
  })

  describe('sad paths', () => {
    it('should return undefined when nothing names a status', () => {
      const value = '<blockquote class="twitter-tweet"><p>Just some text.</p></blockquote>'

      expect(extract(value)).toBeUndefined()
    })

    it('should return undefined for a status url on a lookalike host', () => {
      const value = html`
        <blockquote class="twitter-tweet">
          <p>Text.</p>
          <a href="https://twitter.com.evil.test/user/status/${statusId}">Date</a>
        </blockquote>
      `

      expect(extract(value)).toBeUndefined()
    })

    it('should return undefined for an id that is not numeric', () => {
      const value = html`
        <blockquote class="twitter-tweet" data-twitter-tweet-id="../evil">
          <p>Text.</p>
        </blockquote>
      `

      expect(extract(value)).toBeUndefined()
    })
  })
})

describe('twitterResolveEmbed', () => {
  it('should resolve a player url', () => {
    const value = `https://platform.twitter.com/embed/Tweet.html?id=${statusId}`

    expect(twitterResolveEmbed(value)).toMatchObject({
      provider: 'twitter',
      id: statusId,
    })
  })

  it('should return undefined for another path on the player host', () => {
    expect(twitterResolveEmbed('https://platform.twitter.com/widgets.js')).toBeUndefined()
  })

  it('should return undefined for a player url with no id', () => {
    expect(twitterResolveEmbed('https://platform.twitter.com/embed/Tweet.html')).toBeUndefined()
  })

  it('should return undefined for an invalid url', () => {
    expect(twitterResolveEmbed('not a url')).toBeUndefined()
  })
})

// One block per shape the corpus survey found, so a shape nobody handles is visible here as
// a missing block.
describeForEachParser('twitter variants', (parseHtml) => {
  const convert = (value: string) => {
    return transformContent(value, { parseHtmlFn: parseHtml, baseUrl: 'https://example.com/post' })
  }

  const tweet = html`
    <p lang="en" dir="ltr">Tweet text here.</p>
    — Display Name (@user)
    <a href="https://twitter.com/user/status/${statusId}?ref_src=twsrc%5Etfw">May 12, 2020</a>
  `

  describe('canonical blockquote with the widgets.js loader', () => {
    const value = html`
      <blockquote class="twitter-tweet" data-dnt="true">${tweet}</blockquote>
      <script async src="https://platform.twitter.com/widgets.js"></script>
    `

    it('should resolve and leave no loader behind', async () => {
      const result = await convert(value)

      expect(result).toContain(`data-embed-id="${statusId}"`)
      expect(result).not.toContain('widgets.js')
    })
  })

  describe('orphan blockquote with no loader anywhere', () => {
    const value = html`<blockquote class="twitter-tweet">${tweet}</blockquote>`

    // A quarter of the sampled files have no script at all, so it is never required for a
    // match: feed renderers strip it, and one shared script often covers several embeds.
    it('should resolve without a script', async () => {
      expect(await convert(value)).toContain(`data-embed-id="${statusId}"`)
    })
  })

  describe('entity-encoded blockquote from an Atom payload', () => {
    const value =
      '&lt;blockquote class=&quot;twitter-tweet&quot;&gt;&lt;p lang=&quot;en&quot;&gt;Tweet text here.&lt;/p&gt;&amp;mdash; Display Name (@user) &lt;a href=&quot;https://twitter.com/user/status/123456789012345&quot;&gt;May 12, 2020&lt;/a&gt;&lt;/blockquote&gt;'

    // Decoded upstream, so by the time the widget pass runs this is the canonical shape.
    it('should resolve once the entities are decoded', async () => {
      expect(await convert(value)).toContain(`data-embed-id="${statusId}"`)
    })
  })

  describe('WordPress Gutenberg figure wrapper', () => {
    const value = html`
      <figure class="wp-block-embed is-provider-twitter wp-block-embed-twitter">
        <div class="wp-block-embed__wrapper">
          <blockquote class="twitter-tweet" data-width="550">${tweet}</blockquote>
        </div>
      </figure>
    `

    // The Jetpack, Ghost, Substack, RebelMouse, Octopress and per-theme wrappers are the same
    // shape with another class, so the selector keys on the blockquote and they cost nothing.
    it('should resolve through the wrapper unchanged', async () => {
      expect(await convert(value)).toContain(`data-embed-id="${statusId}"`)
    })
  })

  describe('post-rendered div holding the player it already built', () => {
    const value = html`
      <div class="twitter-tweet twitter-tweet-rendered" data-tweet-id="${statusId}">
        <iframe src="https://platform.twitter.com/embed/Tweet.html?id=${statusId}"></iframe>
      </div>
    `

    // The text is gone, replaced by the frame, so only the id survives to be read.
    it('should resolve from the attribute rather than the missing text', async () => {
      const result = await convert(value)

      expect(result).toContain(`data-embed-id="${statusId}"`)
      expect(result).not.toContain('data-embed-description')
    })
  })

  describe('skeleton blockquote naming the tweet in an attribute', () => {
    const value = html`
      <blockquote class="rm-embed twitter-tweet" data-twitter-tweet-id="${statusId}">
        <a href="https://twitter.com/user/status/${statusId}"></a>
      </blockquote>
    `

    // The class arrives compounded here, which is why it is matched as a token.
    it('should resolve a compound class', async () => {
      expect(await convert(value)).toContain(`data-embed-id="${statusId}"`)
    })
  })

  describe('blockquote wrapped in a paragraph, which is illegal but real', () => {
    const value = `<p><blockquote class="twitter-tweet">${tweet}</blockquote></p>`

    it('should resolve despite the parser splitting the paragraph', async () => {
      expect(await convert(value)).toContain(`data-embed-id="${statusId}"`)
    })
  })

  describe('the x.com and mobile.twitter.com eras of the status url', () => {
    it('should resolve an x.com status', async () => {
      const value = html`
        <blockquote class="twitter-tweet">
          <p lang="en">Newer.</p>
          <a href="https://x.com/user/status/${statusId}">Jan 1, 2026</a>
        </blockquote>
      `

      expect(await convert(value)).toContain(
        `data-embed-url="https://x.com/user/status/${statusId}"`,
      )
    })

    it('should resolve a mobile.twitter.com status', async () => {
      const value = html`
        <blockquote class="twitter-tweet">
          <p lang="en">Mobile.</p>
          <a href="https://mobile.twitter.com/user/status/${statusId}">Jan 1, 2026</a>
        </blockquote>
      `

      expect(await convert(value)).toContain(
        `data-embed-url="https://x.com/user/status/${statusId}"`,
      )
    })
  })

  describe('a bare player iframe with no blockquote around it', () => {
    const value = `<iframe src="https://platform.twitter.com/embed/Tweet.html?id=${statusId}"></iframe>`

    it('should still name its provider', async () => {
      const result = await convert(value)

      expect(result).toContain('data-embed-provider="twitter"')
      expect(result).toContain(`data-embed-id="${statusId}"`)
    })
  })

  describe('the read-more wrapper that borrows the class, a false friend', () => {
    const value = html`
      <div class="twitter-tweet">
        <a href="https://finance.yahoo.com/news/story.html">Read more</a>
      </div>
    `

    // It carries the class but names no tweet. Resolving it would replace a real link with a
    // placeholder pointing at nothing.
    it('should be left alone', async () => {
      const result = await convert(value)

      expect(result).not.toContain('data-embed-provider')
      expect(result).toContain('Read more')
    })
  })
})
