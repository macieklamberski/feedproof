import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import {
  redditIframeEmbedResolver,
  redditRenderHint,
  redditResolveEmbed,
  redditWidgetEmbedResolver,
} from './reddit.js'

describeForEachParser('redditWidgetEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, redditWidgetEmbedResolver)

  describe('Variant #1: the current dialog blockquote, reddit-embed-bq', () => {
    it('should read the post, its author and its subreddit off the three links', async () => {
      const value = html`
        <blockquote
          class="reddit-embed-bq"
          style="height:500px"
        >
          <a href="https://www.reddit.com/r/Birdwatching/comments/1x9y8z7/heron_at_dawn/">Birdwatching Rising Poster</a><br>
          by
          <a href="https://www.reddit.com/user/sample_reader/">u/sample_reader</a> in
          <a href="https://www.reddit.com/r/Birdwatching/">Birdwatching</a>
        </blockquote>
        <script
          async
          src="https://embed.reddit.com/widgets.js"
          charset="UTF-8"
        ></script>
      `
      const expected: EmbedResolverResult = {
        provider: 'reddit',
        id: 'r/Birdwatching/comments/1x9y8z7',
        src: 'https://embed.reddit.com/r/Birdwatching/comments/1x9y8z7/',
        url: 'https://www.reddit.com/r/Birdwatching/comments/1x9y8z7/',
        publisher: 'r/Birdwatching',
        title: 'Birdwatching Rising Poster',
        author: 'u/sample_reader',
        height: 500,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should take the height the dialog states as an attribute', async () => {
      const value = html`
        <blockquote
          class="reddit-embed-bq"
          data-embed-height="740"
        >
          <a href="https://www.reddit.com/r/pics/comments/dq4m1v/my_garden/">My dog</a>
        </blockquote>
      `
      const expected: EmbedResolverResult = {
        provider: 'reddit',
        id: 'r/pics/comments/dq4m1v',
        src: 'https://embed.reddit.com/r/pics/comments/dq4m1v/',
        url: 'https://www.reddit.com/r/pics/comments/dq4m1v/',
        publisher: 'r/pics',
        title: 'My dog',
        height: 740,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should embed the comment a comment widget quotes, titled by its discussion', async () => {
      const value = html`
        <blockquote class="reddit-embed-bq">
          <a href="https://www.reddit.com/r/Birdwatching/comments/1x9y8z7/comment/wq8t4nz/">Comment</a>
          <br>
          by
          <a href="https://www.reddit.com/user/sample_reader/">u/sample_reader</a> from discussion
          <a href="https://www.reddit.com/r/Birdwatching/comments/1x9y8z7/heron_at_dawn/">Birdwatching Rising Poster</a>
          <br>
          in
          <a href="https://www.reddit.com/r/Birdwatching/">Birdwatching</a>
        </blockquote>
      `
      const expected: EmbedResolverResult = {
        provider: 'reddit',
        id: 'r/Birdwatching/comments/1x9y8z7/comment/wq8t4nz',
        src: 'https://embed.reddit.com/r/Birdwatching/comments/1x9y8z7/comment/wq8t4nz/',
        url: 'https://www.reddit.com/r/Birdwatching/comments/1x9y8z7/comment/wq8t4nz/',
        publisher: 'r/Birdwatching',
        title: 'Birdwatching Rising Poster',
        author: 'u/sample_reader',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should state no title when the dialog leaves the discussion link empty', async () => {
      const value = html`
        <blockquote class="reddit-embed-bq">
          <a href="https://www.reddit.com/r/Birdwatching/comments/1x9y8z7/comment/wq8t4nz/">Comment</a>
          <br>
          by
          <a href="https://www.reddit.com/user/sample_reader/">u/sample_reader</a> from discussion
          <a href="https://www.reddit.com/r/Birdwatching/comments/1x9y8z7/heron_at_dawn/"></a>
          <br>
          in
          <a href="https://www.reddit.com/r/Birdwatching/">Birdwatching</a>
        </blockquote>
      `
      const expected: EmbedResolverResult = {
        provider: 'reddit',
        id: 'r/Birdwatching/comments/1x9y8z7/comment/wq8t4nz',
        src: 'https://embed.reddit.com/r/Birdwatching/comments/1x9y8z7/comment/wq8t4nz/',
        url: 'https://www.reddit.com/r/Birdwatching/comments/1x9y8z7/comment/wq8t4nz/',
        publisher: 'r/Birdwatching',
        author: 'u/sample_reader',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should keep the account a profile post is published under', async () => {
      const value = html`
        <blockquote
          class="reddit-embed-bq"
          style="height:500px"
        >
          <a href="https://www.reddit.com/user/photo_poster/comments/hj7k2p/a_long_exposure_test/">Everything in balance</a>
          <br>
          by
          <a href="https://www.reddit.com/user/photo_poster/">u/photo_poster</a> in
          <a href="https://www.reddit.com/user/photo_poster/">u_photo_poster</a>
        </blockquote>
      `
      const expected: EmbedResolverResult = {
        provider: 'reddit',
        id: 'user/photo_poster/comments/hj7k2p',
        src: 'https://embed.reddit.com/user/photo_poster/comments/hj7k2p/',
        url: 'https://www.reddit.com/user/photo_poster/comments/hj7k2p/',
        publisher: 'u/photo_poster',
        title: 'Everything in balance',
        author: 'u/photo_poster',
        height: 500,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should read a permalink written without the title slug', async () => {
      const value = html`
        <blockquote class="reddit-embed-bq">
          <a href="https://old.reddit.com/r/pics/comments/dq4m1v/">My dog</a>
        </blockquote>
      `
      const expected: EmbedResolverResult = {
        provider: 'reddit',
        id: 'r/pics/comments/dq4m1v',
        src: 'https://embed.reddit.com/r/pics/comments/dq4m1v/',
        url: 'https://www.reddit.com/r/pics/comments/dq4m1v/',
        publisher: 'r/pics',
        title: 'My dog',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('Variant #2: the previous generation blockquote, reddit-card', () => {
    it('should read the post the card links first', async () => {
      const value = html`
        <blockquote
          class="reddit-card"
          data-card-created="1580000000"
        >
          <a href="https://www.reddit.com/r/pics/comments/dq4m1v/my_garden/">My dog</a> from
          <a href="http://www.reddit.com/r/pics">r/pics</a>
        </blockquote>
        <script
          async
          src="//embed.redditmedia.com/widgets/platform.js"
          charset="UTF-8"
        ></script>
      `
      const expected: EmbedResolverResult = {
        provider: 'reddit',
        id: 'r/pics/comments/dq4m1v',
        src: 'https://embed.reddit.com/r/pics/comments/dq4m1v/',
        url: 'https://www.reddit.com/r/pics/comments/dq4m1v/',
        publisher: 'r/pics',
        title: 'My dog',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should not read the card generation stamp as the post date', async () => {
      const value = html`
        <blockquote
          class="reddit-card"
          data-card-created="1580000000"
          data-card-theme="dark"
        >
          <a href="https://www.reddit.com/r/pics/comments/dq4m1v/my_garden/"></a>
        </blockquote>
      `
      const expected: EmbedResolverResult = {
        provider: 'reddit',
        id: 'r/pics/comments/dq4m1v',
        src: 'https://embed.reddit.com/r/pics/comments/dq4m1v/',
        url: 'https://www.reddit.com/r/pics/comments/dq4m1v/',
        publisher: 'r/pics',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('Variant #5: the comment embed div, reddit-embed', () => {
    it('should read the comment the div links', async () => {
      const value = html`
        <div
          class="reddit-embed"
          data-embed-media="www.redditmedia.com"
          data-embed-parent="false"
          data-embed-live="false"
          data-embed-created="2019-02-05T12:00:00.000Z"
        >
          <a href="https://www.reddit.com/r/AskSample/comments/mn5r3t/what_is_this/dxyz123/">comment</a>
        </div>
      `
      const expected: EmbedResolverResult = {
        provider: 'reddit',
        id: 'r/AskSample/comments/mn5r3t/comment/dxyz123',
        src: 'https://embed.reddit.com/r/AskSample/comments/mn5r3t/comment/dxyz123/',
        url: 'https://www.reddit.com/r/AskSample/comments/mn5r3t/comment/dxyz123/',
        publisher: 'r/AskSample',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('a widget naming a subreddit and nothing in it', () => {
    it('should embed the subreddit the loader would', async () => {
      const value = html`
        <blockquote class="reddit-card">
          <a href="https://www.reddit.com/r/Birdwatching/">r/Birdwatching</a>
        </blockquote>
      `
      const expected: EmbedResolverResult = {
        provider: 'reddit',
        id: 'r/Birdwatching',
        src: 'https://embed.reddit.com/r/Birdwatching/',
        url: 'https://www.reddit.com/r/Birdwatching/',
        publisher: 'r/Birdwatching',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should return undefined for a widget naming only an account', async () => {
      const value = html`
        <blockquote class="reddit-embed-bq">
          <a href="https://www.reddit.com/user/photo_poster/">u/photo_poster</a>
        </blockquote>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for a widget holding a share link', async () => {
      const value = html`
        <blockquote class="reddit-card">
          <a href="https://www.reddit.com/submit?url=https%3A%2F%2Fexample.com%2Fpost">Share</a>
        </blockquote>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for a widget holding no reddit link', async () => {
      const value = html`
        <blockquote class="reddit-embed-bq">
          <a href="https://example.com/post">A post</a>
        </blockquote>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for a post id outside the base36 alphabet', async () => {
      const value = html`
        <blockquote class="reddit-embed-bq">
          <a href="https://www.reddit.com/r/pics/comments/..%2Fevil/my_garden/">My dog</a>
        </blockquote>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for another host carrying the permalink path', async () => {
      const value = html`
        <blockquote class="reddit-embed-bq">
          <a href="https://reddit.com.evil.test/r/pics/comments/dq4m1v/my_garden/">My dog</a>
        </blockquote>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should not claim the Embedly card the same loader upgrades', async () => {
      const value = html`
        <blockquote class="embedly-card">
          <a href="https://www.reddit.com/r/pics/comments/dq4m1v/my_garden/">My dog</a>
        </blockquote>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })
})

describe('redditResolveEmbed', () => {
  it('should resolve the frame the modern loader builds', () => {
    const value = 'https://embed.reddit.com/r/Birdwatching/comments/1x9y8z7/heron_at_dawn/'
    const expected: EmbedResolverResult = {
      provider: 'reddit',
      id: 'r/Birdwatching/comments/1x9y8z7',
      src: 'https://embed.reddit.com/r/Birdwatching/comments/1x9y8z7/',
      url: 'https://www.reddit.com/r/Birdwatching/comments/1x9y8z7/',
      publisher: 'r/Birdwatching',
    }

    expect(redditResolveEmbed(value)).toEqual(expected)
  })

  it('should drop the query naming the embedding page', () => {
    const value =
      'https://www.redditmedia.com/r/Birdwatching/comments/1x9y8z7/?ref_source=embed&ref=share&embed=true'
    const expected: EmbedResolverResult = {
      provider: 'reddit',
      id: 'r/Birdwatching/comments/1x9y8z7',
      src: 'https://embed.reddit.com/r/Birdwatching/comments/1x9y8z7/',
      url: 'https://www.reddit.com/r/Birdwatching/comments/1x9y8z7/',
      publisher: 'r/Birdwatching',
    }

    expect(redditResolveEmbed(value)).toEqual(expected)
  })

  it('should ignore a reddit url that names no post', () => {
    const value = 'https://www.reddit.com/'

    expect(redditResolveEmbed(value)).toBeUndefined()
  })

  it('should ignore a subreddit page that is not a discussion', () => {
    const value = 'https://www.reddit.com/r/pics/wiki/index/'

    expect(redditResolveEmbed(value)).toBeUndefined()
  })

  it('should ignore a discussion path with no post id', () => {
    const value = 'https://www.reddit.com/r/pics/comments/'

    expect(redditResolveEmbed(value)).toBeUndefined()
  })

  it('should ignore a comment id outside the base36 alphabet', () => {
    const value = 'https://www.reddit.com/r/pics/comments/dq4m1v/my_garden/..%2Fevil/'

    expect(redditResolveEmbed(value)).toBeUndefined()
  })

  it('should ignore the media host serving a post its attachments', () => {
    const value = 'https://g.redditmedia.com/f1cqmjhrnoshoediji58x/poster.jpg'

    expect(redditResolveEmbed(value)).toBeUndefined()
  })

  it('should ignore another host carrying the permalink path', () => {
    const value = 'https://embed.reddit.com.evil.test/r/pics/comments/dq4m1v/my_garden/'

    expect(redditResolveEmbed(value)).toBeUndefined()
  })
})

describeForEachParser('redditIframeEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, redditIframeEmbedResolver)

  describe('Variant #3: the legacy player frame on redditmedia.com', () => {
    it('should resolve a stored frame back to the post', async () => {
      const value = html`
        <iframe
          id="reddit-embed"
          src="https://www.redditmedia.com/r/Birdwatching/comments/1x9y8z7/heron_at_dawn/?ref_source=embed&amp;ref=share&amp;embed=true"
          sandbox="allow-scripts allow-same-origin allow-popups"
          height="500"
          width="640"
          scrolling="no"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'reddit',
        id: 'r/Birdwatching/comments/1x9y8z7',
        src: 'https://embed.reddit.com/r/Birdwatching/comments/1x9y8z7/',
        url: 'https://www.reddit.com/r/Birdwatching/comments/1x9y8z7/',
        publisher: 'r/Birdwatching',
        width: 640,
        height: 500,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('Variant #4: the modern player frame on embed.reddit.com', () => {
    it('should resolve a stored comment frame back to the comment', async () => {
      const value = html`
        <iframe
          src="https://embed.reddit.com/r/Birdwatching/comments/1x9y8z7/comment/wq8t4nz/?embed=true"
          height="316"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'reddit',
        id: 'r/Birdwatching/comments/1x9y8z7/comment/wq8t4nz',
        src: 'https://embed.reddit.com/r/Birdwatching/comments/1x9y8z7/comment/wq8t4nz/',
        url: 'https://www.reddit.com/r/Birdwatching/comments/1x9y8z7/comment/wq8t4nz/',
        publisher: 'r/Birdwatching',
        height: 316,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  it('should ignore an iframe on another host', async () => {
    const value = '<iframe src="https://evil.test/r/pics/comments/dq4m1v/my_garden/"></iframe>'

    expect(await extract(value)).toBeUndefined()
  })
})

describe('redditRenderHint', () => {
  it('should read the height out of a resize', () => {
    expect(redditRenderHint.readHeight?.({ type: 'resize.embed', data: 480 })).toBe(480)
  })

  // The first resize arrives before the post is in.
  it('should read nothing out of the empty first resize', () => {
    expect(redditRenderHint.readHeight?.({ type: 'resize.embed', data: 0 })).toBeUndefined()
  })
})
