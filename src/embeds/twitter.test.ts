import { describe, expect, it } from 'bun:test'
import { transformContent } from '../index.js'
import { describeForEachParser, html } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { twitterEmbedResolver, twitterResolveEmbed } from './twitter.js'

const statusId = '123456789012345'
const playerUrl = `https://platform.twitter.com/embed/Tweet.html?id=${statusId}`
const statusUrl = `https://x.com/user/status/${statusId}`

// Every `data-embed-*` field the placeholder carries, so a variant can assert the whole set
// rather than the one field it happens to care about.
const readPlaceholder = (
  result: string,
  parseHtml: (value: string) => Document,
): Record<string, string> => {
  const element = parseHtml(result).querySelector('[data-embed-src]')
  const fields: Record<string, string> = {}

  for (const name of element?.getAttributeNames() ?? []) {
    const value = element?.getAttribute(name)

    if (name.startsWith('data-embed-') && value) {
      fields[name.replace('data-embed-', '')] = value
    }
  }

  return fields
}

describeForEachParser('twitterEmbedResolver', (parseHtml) => {
  const extract = (value: string): EmbedResolverResult | undefined => {
    const element = parseHtml(value).querySelector(twitterEmbedResolver.selector)

    return element ? (twitterEmbedResolver.extract(element) as EmbedResolverResult) : undefined
  }

  describe('happy paths', () => {
    it('should build the whole placeholder from the canonical blockquote', () => {
      const value = html`
        <blockquote class="twitter-tweet" data-dnt="true">
          <p lang="en" dir="ltr">Tweet text here.</p>
          <p>
            &mdash; Display Name (@user)
            <a href="https://twitter.com/user/status/123456789012345">May 12, 2020</a>
          </p>
        </blockquote>
      `
      const expected: EmbedResolverResult = {
        provider: 'twitter',
        id: statusId,
        src: playerUrl,
        url: statusUrl,
        description: 'Tweet text here.',
        author: 'Display Name',
        date: 'May 12, 2020',
      }

      expect(extract(value)).toEqual(expected)
    })

    it('should keep the byline as written when it is not the dialog shape', () => {
      const value = html`
        <blockquote class="twitter-tweet">
          <p lang="en" dir="ltr">Tweet text here.</p>
          <p>
            Posted by somebody
            <a href="https://twitter.com/user/status/123456789012345">May 12, 2020</a>
          </p>
        </blockquote>
      `

      expect(extract(value)).toMatchObject({
        author: 'Posted by somebody',
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
    expect(twitterResolveEmbed(playerUrl)).toEqual({
      provider: 'twitter',
      id: statusId,
      src: playerUrl,
      url: undefined,
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
// a missing block. Each asserts the whole placeholder, since the point is that every shape
// maps to the same fields and not merely that it is recognised.
describeForEachParser('twitter variants', (parseHtml) => {
  const placeholder = async (value: string): Promise<Record<string, string>> => {
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com/post',
    })

    return readPlaceholder(result, parseHtml)
  }

  const fullTweet = {
    provider: 'twitter',
    id: statusId,
    src: playerUrl,
    url: statusUrl,
    description: 'Tweet text here.',
    author: 'Display Name',
    date: 'May 12, 2020',
  }

  describe('Variant #1: canonical blockquote with the widgets.js loader', () => {
    const value = html`
      <blockquote class="twitter-tweet" data-dnt="true">
        <p lang="en" dir="ltr">Tweet text here.</p>
        &mdash; Display Name (@user)
        <a href="https://twitter.com/user/status/123456789012345?ref_src=twsrc%5Etfw">
          May 12, 2020
        </a>
      </blockquote>
      <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>
    `

    it('should carry every field across', async () => {
      expect(await placeholder(value)).toEqual(fullTweet)
    })

    it('should leave no loader behind', async () => {
      const result = await transformContent(value, {
        parseHtmlFn: parseHtml,
        baseUrl: 'https://example.com/post',
      })

      expect(result).not.toContain('widgets.js')
    })
  })

  describe('Variant #2: orphan blockquote with no loader anywhere', () => {
    // A quarter of the sampled files have no script at all: feed renderers strip it, one
    // shared script often covers several embeds, and some publishers paste the quote alone.
    const value = html`
      <blockquote class="twitter-tweet">
        <p dir="ltr" lang="en">Tweet text here.</p>
        <p>
          &mdash; Display Name (@user)
          <a href="https://twitter.com/user/status/123456789012345">May 12, 2020</a>
        </p>
      </blockquote>
    `

    it('should carry every field across without a script', async () => {
      expect(await placeholder(value)).toEqual(fullTweet)
    })
  })

  describe('Variant #3: entity-encoded blockquote from an Atom payload', () => {
    // Decoded upstream, so by the time the widget pass runs this is the canonical shape.
    const value =
      '&lt;blockquote class=&quot;twitter-tweet&quot;&gt;&lt;p lang=&quot;en&quot; dir=&quot;ltr&quot;&gt;Tweet text here.&lt;/p&gt;&amp;mdash; Display Name (@user) &lt;a href=&quot;https://twitter.com/user/status/123456789012345&quot;&gt;May 12, 2020&lt;/a&gt;&lt;/blockquote&gt;'

    it('should carry every field across once decoded', async () => {
      expect(await placeholder(value)).toEqual(fullTweet)
    })
  })

  describe('Variant #4: WordPress Gutenberg figure wrapper', () => {
    // The Jetpack, Ghost, Substack, RebelMouse, Octopress and per-theme wrappers are the same
    // shape with another class, so the selector keys on the blockquote and they cost nothing.
    const value = html`
      <figure class="wp-block-embed is-type-rich is-provider-twitter wp-block-embed-twitter">
        <div class="wp-block-embed__wrapper">
          <blockquote class="twitter-tweet" data-width="550" data-dnt="true">
            <p lang="en" dir="ltr">Tweet text here.</p>
            &mdash; Display Name (@user)
            <a href="https://twitter.com/user/status/123456789012345?ref_src=twsrc%5Etfw">
              May 12, 2020
            </a>
          </blockquote>
          <script async src="https://platform.twitter.com/widgets.js"></script>
        </div>
      </figure>
    `

    it('should carry every field across through the wrapper', async () => {
      expect(await placeholder(value)).toEqual(fullTweet)
    })
  })

  describe('Variant #9: post-rendered div holding the player it already built', () => {
    // The script replaced the text with the frame before the page was stored, so the id is
    // all that survives and there is no byline left to read.
    const value = html`
      <div class="twitter-tweet twitter-tweet-rendered" data-tweet-id="123456789012345">
        <iframe
          src="https://platform.twitter.com/embed/Tweet.html?id=123456789012345"
        ></iframe>
      </div>
    `

    it('should carry the id and the player, and claim no text it does not have', async () => {
      expect(await placeholder(value)).toEqual({
        provider: 'twitter',
        id: statusId,
        src: playerUrl,
      })
    })
  })

  describe('Variant #10: skeleton blockquote naming the tweet in an attribute', () => {
    // The class arrives compounded here, which is why it is matched as a token.
    const value = html`
      <blockquote class="rm-embed twitter-tweet" data-twitter-tweet-id="123456789012345">
        <a href="https://twitter.com/user/status/123456789012345"></a>
      </blockquote>
    `

    it('should carry the id and the status url, with no text to take', async () => {
      expect(await placeholder(value)).toEqual({
        provider: 'twitter',
        id: statusId,
        src: playerUrl,
        url: statusUrl,
      })
    })
  })

  describe('Variant #18: centre-aligned blockquote', () => {
    const value = html`
      <center>
        <blockquote class="twitter-tweet">
          <p lang="en" dir="ltr">Tweet text here.</p>
          <p>
            &mdash; Display Name (@user)
            <a href="https://twitter.com/user/status/123456789012345">May 12, 2020</a>
          </p>
        </blockquote>
      </center>
    `

    it('should carry every field across', async () => {
      expect(await placeholder(value)).toEqual(fullTweet)
    })
  })

  describe('Variant #19: blockquote wrapped in a paragraph, which is illegal but real', () => {
    const value = html`
      <p>
        <blockquote class="twitter-tweet">
          <p lang="en" dir="ltr">Tweet text here.</p>
          <p>
            &mdash; Display Name (@user)
            <a href="https://twitter.com/user/status/123456789012345">May 12, 2020</a>
          </p>
        </blockquote>
      </p>
    `

    it('should carry every field across despite the split paragraph', async () => {
      expect(await placeholder(value)).toEqual(fullTweet)
    })
  })

  describe('the x.com era of the status url', () => {
    const value = html`
      <blockquote class="twitter-tweet">
        <p lang="en" dir="ltr">Tweet text here.</p>
        <p>
          &mdash; Display Name (@user)
          <a href="https://x.com/user/status/123456789012345">May 12, 2020</a>
        </p>
      </blockquote>
    `

    it('should carry every field across', async () => {
      expect(await placeholder(value)).toEqual(fullTweet)
    })
  })

  describe('the mobile.twitter.com era of the status url', () => {
    const value = html`
      <blockquote class="twitter-tweet">
        <p lang="en" dir="ltr">Tweet text here.</p>
        <p>
          &mdash; Display Name (@user)
          <a href="https://mobile.twitter.com/user/status/123456789012345">May 12, 2020</a>
        </p>
      </blockquote>
    `

    it('should carry every field across and canonicalise the url', async () => {
      expect(await placeholder(value)).toEqual(fullTweet)
    })
  })

  describe('a bare player iframe with no blockquote around it', () => {
    const value = html`
      <iframe src="https://platform.twitter.com/embed/Tweet.html?id=123456789012345"></iframe>
    `

    it('should name its provider and its tweet', async () => {
      expect(await placeholder(value)).toEqual({
        provider: 'twitter',
        id: statusId,
        src: playerUrl,
      })
    })
  })

  describe('Variant #17: the read-more wrapper that borrows the class, a false friend', () => {
    // It carries the class but names no tweet. Resolving it would replace a real link with a
    // placeholder pointing at nothing.
    const value = html`
      <div class="twitter-tweet">
        <a href="https://finance.yahoo.com/news/story.html">Read more</a>
      </div>
    `

    it('should be left alone', async () => {
      const result = await transformContent(value, {
        parseHtmlFn: parseHtml,
        baseUrl: 'https://example.com/post',
      })

      expect(result).not.toContain('data-embed-provider')
      expect(result).toContain('Read more')
    })
  })
})

// Shapes the survey's 200-file sample did not contain, found by probing the pipeline
// (2026-08-12). Kept apart because their prevalence is unmeasured.
describeForEachParser('twitter shapes outside the sampled variants', (parseHtml) => {
  const convert = (value: string) => {
    return transformContent(value, { parseHtmlFn: parseHtml, baseUrl: 'https://example.com/post' })
  }

  const placeholder = async (value: string): Promise<Record<string, string>> => {
    return readPlaceholder(await convert(value), parseHtml)
  }

  describe('the AMP component, which the survey sample did not contain', () => {
    // It is an empty element, so before it resolved it was dropped as an empty tag.
    const value = html`
      <amp-twitter
        width="375"
        height="472"
        layout="responsive"
        data-tweetid="123456789012345"
      ></amp-twitter>
    `

    it('should carry the id and the player', async () => {
      expect(await placeholder(value)).toEqual({
        provider: 'twitter',
        id: statusId,
        src: playerUrl,
        width: '375',
        height: '472',
      })
    })
  })

  describe('the profile timeline and follow button, which are chrome', () => {
    it('should leave a timeline widget as its link', async () => {
      const value = html`
        <a class="twitter-timeline" href="https://twitter.com/user">Tweets by user</a>
        <script async src="https://platform.twitter.com/widgets.js"></script>
      `
      const result = await transformContent(value, {
        parseHtmlFn: parseHtml,
        baseUrl: 'https://example.com/post',
      })

      expect(result).not.toContain('data-embed-provider')
      expect(result).toContain('Tweets by user')
    })

    it('should leave a follow button as its link', async () => {
      const value = html`
        <a href="https://twitter.com/user" class="twitter-follow-button">Follow @user</a>
      `
      const result = await transformContent(value, {
        parseHtmlFn: parseHtml,
        baseUrl: 'https://example.com/post',
      })

      expect(result).not.toContain('data-embed-provider')
      expect(result).toContain('Follow @user')
    })
  })

  describe('a status link written into prose', () => {
    // A link is not an embed. Resolving one would swallow the sentence around it.
    const value = html`
      <p>See <a href="https://twitter.com/user/status/123456789012345">this tweet</a> for more.</p>
    `

    it('should stay a link', async () => {
      const result = await transformContent(value, {
        parseHtmlFn: parseHtml,
        baseUrl: 'https://example.com/post',
      })

      expect(result).not.toContain('data-embed-provider')
      expect(result).toContain('for more.')
    })
  })
})
