import { describe, expect, it } from 'bun:test'
import { transformContent } from '../index.js'
import { describeForEachParser, html, jsonAttrValue, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import {
  readTwitterHeight,
  twitterAmpEmbedResolver,
  twitterBlockquoteEmbedResolver,
  twitterIframeEmbedResolver,
  twitterResolveEmbed,
  twitterSubstackEmbedResolver,
} from './twitter.js'

const statusId = '123456789012345'
const playerUrl = `https://platform.twitter.com/embed/Tweet.html?id=${statusId}`
const statusUrl = `https://x.com/user/status/${statusId}`

// Every `data-embed-*` field the placeholder carries, for the shapes that only resolve once the
// pipeline has repaired them and so cannot be asserted on the resolver alone.
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

describeForEachParser('twitterBlockquoteEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, twitterBlockquoteEmbedResolver)

  describe('happy paths', () => {
    it('should build the whole placeholder from the canonical blockquote', async () => {
      const value = html`
        <blockquote
          class="twitter-tweet"
          data-dnt="true"
        >
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

      expect(await extract(value)).toEqual(expected)
    })

    it('should keep the byline as written when it is not the dialog shape', async () => {
      const value = html`
        <blockquote class="twitter-tweet">
          <p lang="en" dir="ltr">Tweet text here.</p>
          <p>
            Posted by somebody
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
        author: 'Posted by somebody',
        date: 'May 12, 2020',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should join every paragraph of a long tweet into the description', async () => {
      const value = html`
        <blockquote class="twitter-tweet">
          <p lang="en" dir="ltr">First paragraph of a long tweet.</p>
          <p lang="en" dir="ltr">Second paragraph of the same tweet.</p>
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
        description: 'First paragraph of a long tweet.\nSecond paragraph of the same tweet.',
        author: 'Display Name',
        date: 'May 12, 2020',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should return undefined when nothing names a status', async () => {
      const value = '<blockquote class="twitter-tweet"><p>Just some text.</p></blockquote>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for a status url on a lookalike host', async () => {
      const value = html`
        <blockquote class="twitter-tweet">
          <p>Text.</p>
          <a href="https://twitter.com.evil.test/user/status/${statusId}">Date</a>
        </blockquote>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for an id that is not numeric', async () => {
      const value = html`
        <blockquote
          class="twitter-tweet"
          data-twitter-tweet-id="../evil"
        >
          <p>Text.</p>
        </blockquote>
      `

      expect(await extract(value)).toBeUndefined()
    })

    // A block copied between platforms carries several generations of the attribute, and only
    // the later one is intact, so each is validated rather than the first present one winning.
    it('should read a later id attribute when an earlier one is malformed', async () => {
      const value = html`
        <blockquote
          class="twitter-tweet"
          data-twitter-tweet-id="../evil"
          data-tweet-id="${statusId}"
        >
          <p>Text.</p>
        </blockquote>
      `
      const expected: EmbedResolverResult = {
        provider: 'twitter',
        id: statusId,
        src: `https://platform.twitter.com/embed/Tweet.html?id=${statusId}`,
        description: 'Text.',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  // One block per shape the corpus survey found, so a shape nobody handles is visible here as
  // a missing block. Variants #1, #3 and #4 arrive in a form the resolver cannot read on its
  // own and are asserted after the pipeline instead, in the last group of this file.
  describe('survey variants', () => {
    describe('Variant #2: orphan blockquote with no loader anywhere', () => {
      // A quarter of the sampled files have no script at all: feed renderers strip it, one
      // shared script often covers several embeds, and some publishers paste the quote alone.
      it('should carry every field across without a script', async () => {
        const value = html`
          <blockquote class="twitter-tweet">
            <p dir="ltr" lang="en">Tweet text here.</p>
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

        expect(await extract(value)).toEqual(expected)
      })
    })

    describe('Variant #9: post-rendered div holding the player it already built', () => {
      // The script replaced the text with the frame before the page was stored, so the id is
      // all that survives and there is no byline left to read.
      it('should carry the id and the player, and claim no text it does not have', async () => {
        const value = html`
          <div
            class="twitter-tweet twitter-tweet-rendered"
            data-tweet-id="123456789012345"
          >
            <iframe src="https://platform.twitter.com/embed/Tweet.html?id=123456789012345"></iframe>
          </div>
        `
        const expected: EmbedResolverResult = {
          provider: 'twitter',
          id: statusId,
          src: playerUrl,
        }

        expect(await extract(value)).toEqual(expected)
      })
    })

    describe('Variant #10: skeleton blockquote naming the tweet in an attribute', () => {
      // The class arrives compounded here, which is why it is matched as a token.
      it('should carry the id and the status url, with no text to take', async () => {
        const value = html`
          <blockquote
            class="rm-embed twitter-tweet"
            data-twitter-tweet-id="123456789012345"
          >
            <a href="https://twitter.com/user/status/123456789012345"></a>
          </blockquote>
        `
        const expected: EmbedResolverResult = {
          provider: 'twitter',
          id: statusId,
          src: playerUrl,
          url: statusUrl,
        }

        expect(await extract(value)).toEqual(expected)
      })
    })

    describe('Variant #10a: skeleton blockquote keeping the byline punctuation only', () => {
      // The skeleton fills in neither half of the byline, so what survives is the dash and an
      // empty handle. Carrying that through would state it as the author.
      it('should state no author for a byline naming nobody', async () => {
        const value = html`
          <blockquote class="twitter-tweet">
            <p></p>
            <p>&mdash;  (@) <a href="https://twitter.com/user/status/123456789012345">May 1, 2024</a>
            </p>
          </blockquote>
        `
        const expected: EmbedResolverResult = {
          provider: 'twitter',
          id: statusId,
          src: playerUrl,
          url: statusUrl,
          date: 'May 1, 2024',
        }

        expect(await extract(value)).toEqual(expected)
      })
    })

    describe('Variant #17: the read-more wrapper that borrows the class, a false friend', () => {
      // It carries the class but names no tweet. Resolving it would replace a real link with a
      // placeholder pointing at nothing.
      it('should be left alone', async () => {
        const value = html`
          <div class="twitter-tweet">
            <a href="https://finance.yahoo.com/news/story.html">Read more</a>
          </div>
        `

        expect(await extract(value)).toBeUndefined()
      })
    })

    describe('Variant #18: centre-aligned blockquote', () => {
      it('should carry every field across', async () => {
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
        const expected: EmbedResolverResult = {
          provider: 'twitter',
          id: statusId,
          src: playerUrl,
          url: statusUrl,
          description: 'Tweet text here.',
          author: 'Display Name',
          date: 'May 12, 2020',
        }

        expect(await extract(value)).toEqual(expected)
      })
    })

    describe('Variant #19: blockquote wrapped in a paragraph, which is illegal but real', () => {
      it('should carry every field across despite the split paragraph', async () => {
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
        const expected: EmbedResolverResult = {
          provider: 'twitter',
          id: statusId,
          src: playerUrl,
          url: statusUrl,
          description: 'Tweet text here.',
          author: 'Display Name',
          date: 'May 12, 2020',
        }

        expect(await extract(value)).toEqual(expected)
      })
    })
  })

  // The class the embed dialog writes on a video tweet. The inner markup is the ordinary
  // blockquote: text paragraph, byline, dated status anchor.
  describe('the twitter-video class of a video tweet', () => {
    it('should carry every field across', async () => {
      const value = html`
        <blockquote
          class="twitter-video"
          data-lang="de"
        >
          <p lang="en" dir="ltr">Tweet text with a video. <a href="https://t.co/mjQaqccCMe">pic.twitter.com/mjQaqccCMe</a>
          </p>
          <p>
            — niner (@itsniner)
            <a href="https://twitter.com/itsniner/status/698590349225287682">13. Februar 2016</a>
          </p>
        </blockquote>
      `
      const expected: EmbedResolverResult = {
        provider: 'twitter',
        id: '698590349225287682',
        src: 'https://platform.twitter.com/embed/Tweet.html?id=698590349225287682',
        url: 'https://x.com/itsniner/status/698590349225287682',
        description: 'Tweet text with a video. pic.twitter.com/mjQaqccCMe',
        author: 'niner',
        date: '13. Februar 2016',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should leave the class on anything but a blockquote alone', async () => {
      const value = html`
        <div class="twitter-video">
          <a href="https://twitter.com/itsniner/status/698590349225287682">13. Februar 2016</a>
        </div>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })

  describe('the eras of the status url', () => {
    it('should read the x.com era', async () => {
      const value = html`
        <blockquote class="twitter-tweet">
          <p lang="en" dir="ltr">Tweet text here.</p>
          <p>
            &mdash; Display Name (@user)
            <a href="https://x.com/user/status/123456789012345">May 12, 2020</a>
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

      expect(await extract(value)).toEqual(expected)
    })

    it('should read the mobile.twitter.com era and canonicalise the url', async () => {
      const value = html`
        <blockquote class="twitter-tweet">
          <p lang="en" dir="ltr">Tweet text here.</p>
          <p>
            &mdash; Display Name (@user)
            <a href="https://mobile.twitter.com/user/status/123456789012345">May 12, 2020</a>
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

      expect(await extract(value)).toEqual(expected)
    })
  })

  // The proxy front-ends put the same tweet under their own host, so the same post can arrive
  // twice over in one corpus. Each resolves to the id and the x.com url the direct form gives, so
  // one tweet stays one placeholder and one enrichment key whichever host carried it.
  describe('the proxy front-ends that republish a tweet', () => {
    describe('nitter.net, the instance the corpus carries most', () => {
      // The `#m` fragment is what the instance appends for its mobile layout.
      it('should carry every field across and point at the post itself', async () => {
        const value = html`
          <blockquote class="twitter-tweet">
            <p lang="en" dir="ltr">Tweet text here.</p>
            <p>
              &mdash; Display Name (@user)
              <a href="https://nitter.net/user/status/123456789012345#m">May 12, 2020</a>
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

        expect(await extract(value)).toEqual(expected)
      })
    })

    describe('a self-hosted nitter instance no host list can name', () => {
      it('should resolve on the name in the leading label', async () => {
        const value = html`
          <blockquote class="twitter-tweet">
            <p>Tweet text here.</p>
            <p>
              <a href="https://nitter.d420.de/user/status/123456789012345">May 12, 2020</a>
            </p>
          </blockquote>
        `
        const expected: EmbedResolverResult = {
          provider: 'twitter',
          id: statusId,
          src: playerUrl,
          url: statusUrl,
          description: 'Tweet text here.',
          date: 'May 12, 2020',
        }

        expect(await extract(value)).toEqual(expected)
      })
    })

    describe('xcancel.com, an instance under a name of its own', () => {
      it('should resolve on the named host', async () => {
        const value = html`
          <blockquote class="twitter-tweet">
            <p>Tweet text here.</p>
            <p>
              <a href="https://xcancel.com/user/status/123456789012345">May 12, 2020</a>
            </p>
          </blockquote>
        `
        const expected: EmbedResolverResult = {
          provider: 'twitter',
          id: statusId,
          src: playerUrl,
          url: statusUrl,
          description: 'Tweet text here.',
          date: 'May 12, 2020',
        }

        expect(await extract(value)).toEqual(expected)
      })
    })

    describe('fxtwitter.com, which sends a browser to x.com itself', () => {
      it('should resolve to the destination it redirects to', async () => {
        const value = html`
          <blockquote class="twitter-tweet">
            <p>Tweet text here.</p>
            <p>
              <a href="https://fxtwitter.com/user/status/123456789012345">May 12, 2020</a>
            </p>
          </blockquote>
        `
        const expected: EmbedResolverResult = {
          provider: 'twitter',
          id: statusId,
          src: playerUrl,
          url: statusUrl,
          description: 'Tweet text here.',
          date: 'May 12, 2020',
        }

        expect(await extract(value)).toEqual(expected)
      })
    })

    describe('vxtwitter.com, which serves a page of its own', () => {
      it('should resolve to the post rather than the mirror', async () => {
        const value = html`
          <blockquote class="twitter-tweet">
            <p>Tweet text here.</p>
            <p>
              <a href="https://vxtwitter.com/user/status/123456789012345">May 12, 2020</a>
            </p>
          </blockquote>
        `
        const expected: EmbedResolverResult = {
          provider: 'twitter',
          id: statusId,
          src: playerUrl,
          url: statusUrl,
          description: 'Tweet text here.',
          date: 'May 12, 2020',
        }

        expect(await extract(value)).toEqual(expected)
      })
    })

    describe('the rewriter aliases, one service under several names', () => {
      it('should resolve a fixupx.com status', async () => {
        const value = html`
          <blockquote class="twitter-tweet">
            <p>Tweet text here.</p>
            <p>
              <a href="https://fixupx.com/user/status/123456789012345">May 12, 2020</a>
            </p>
          </blockquote>
        `
        const expected: EmbedResolverResult = {
          provider: 'twitter',
          id: statusId,
          src: playerUrl,
          url: statusUrl,
          description: 'Tweet text here.',
          date: 'May 12, 2020',
        }

        expect(await extract(value)).toEqual(expected)
      })

      it('should resolve a fixvx.com status', async () => {
        const value = html`
          <blockquote class="twitter-tweet">
            <p>Tweet text here.</p>
            <p>
              <a href="https://fixvx.com/user/status/123456789012345">May 12, 2020</a>
            </p>
          </blockquote>
        `
        const expected: EmbedResolverResult = {
          provider: 'twitter',
          id: statusId,
          src: playerUrl,
          url: statusUrl,
          description: 'Tweet text here.',
          date: 'May 12, 2020',
        }

        expect(await extract(value)).toEqual(expected)
      })

      it('should resolve a twittpr.com status', async () => {
        const value = html`
          <blockquote class="twitter-tweet">
            <p>Tweet text here.</p>
            <p>
              <a href="https://twittpr.com/user/status/123456789012345">May 12, 2020</a>
            </p>
          </blockquote>
        `
        const expected: EmbedResolverResult = {
          provider: 'twitter',
          id: statusId,
          src: playerUrl,
          url: statusUrl,
          description: 'Tweet text here.',
          date: 'May 12, 2020',
        }

        expect(await extract(value)).toEqual(expected)
      })
    })

    describe('what a proxy host on its own does not make a tweet', () => {
      it('should leave a proxy profile url alone', async () => {
        const value = html`
          <blockquote class="twitter-tweet">
            <p>Tweet text here.</p>
            <p>
              <a href="https://nitter.net/user">user</a>
            </p>
          </blockquote>
        `

        expect(await extract(value)).toBeUndefined()
      })

      it('should leave the image path an instance serves alone', async () => {
        const value = html`
          <blockquote class="twitter-tweet">
            <p>Tweet text here.</p>
            <p>
              <a href="https://nitter.net/pic/media%2FABC.jpg">Photo</a>
            </p>
          </blockquote>
        `

        expect(await extract(value)).toBeUndefined()
      })

      it('should leave a host that merely contains the word alone', async () => {
        const value = html`
          <blockquote class="twitter-tweet">
            <p>Tweet text here.</p>
            <p>
              <a href="https://theordinaryknitter.net/user/status/123456789012345">May 12, 2020</a>
            </p>
          </blockquote>
        `

        expect(await extract(value)).toBeUndefined()
      })
    })
  })

  // The profile widgets carry a twitter class of their own and a status link is ordinary prose,
  // so none of them is claimed. Resolving one would swallow the link or the sentence around it.
  describe('shapes that are not an embed', () => {
    it('should leave a timeline widget alone', async () => {
      const value = html`
        <a
          class="twitter-timeline"
          href="https://twitter.com/user"
        >
          Tweets by user
        </a>
        <script
          async
          src="https://platform.twitter.com/widgets.js"
        ></script>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should leave a follow button alone', async () => {
      const value = html`
        <a
          href="https://twitter.com/user"
          class="twitter-follow-button"
        >
          Follow @user
        </a>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should leave a status link written into prose alone', async () => {
      const value = html`
        <p>See <a href="https://twitter.com/user/status/123456789012345">this tweet</a> for more.</p>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })
})

// Found by probing the pipeline (2026-08-12), not by the survey's 200-file sample, so its
// prevalence is unmeasured. It is an empty element, and before it resolved it was dropped as an
// empty tag.
describeForEachParser('twitterAmpEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, twitterAmpEmbedResolver)

  it('should carry the id, the player and the size the component states', async () => {
    const value = html`
      <amp-twitter
        width="375"
        height="472"
        layout="responsive"
        data-tweetid="123456789012345"
      ></amp-twitter>
    `
    const expected: EmbedResolverResult = {
      provider: 'twitter',
      id: statusId,
      src: playerUrl,
      width: 375,
      height: 472,
    }

    expect(await extract(value)).toEqual(expected)
  })
})

describeForEachParser('twitterSubstackEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, twitterSubstackEmbedResolver)

  // Substack stores the payload in a double-quoted attribute with the inner quotes
  // entity-encoded, which is what survives a parse and serialise roundtrip. Tests pass the
  // attrs with Substack's own key names so the wire keys stay visible at the call site.
  const makeSubstackTweet = (attrs: Record<string, unknown> | string): string => {
    return html`
      <div
        class="twitter-embed"
        data-attrs="${jsonAttrValue(attrs)}"
        data-component-name="Twitter2ToDOM"
      ></div>
    `
  }

  describe('happy paths', () => {
    it('should build the whole placeholder from a live payload', async () => {
      const value = makeSubstackTweet({
        url: 'https://twitter.com/notdetails/status/961570492162494464',
        full_text:
          'Hey, I\'m open-sourcing the framework I put together to help me choose between job offers. I hope this helps someone 🤗 <a class="tweet-url" href="https://docs.google.com/spreadsheets/d/1huExwmi7fWgXpci8uM7-kVZx-UHNzYp1ORVscQWuin4/edit?usp=sharing">docs.google.com/spreadsheets/d…</a> ',
        username: 'notdetails',
        name: 'Joel Califa',
        profile_image_url: '',
        date: 'Thu Feb 08 12:00:45 +0000 2018',
        photos: [
          {
            img_url: 'https://pbs.substack.com/media/DVgu7f1WsAAkNMr.jpg',
            link_url: 'https://t.co/kJDxilkm4E',
            alt_text: null,
          },
        ],
        quoted_tweet: {},
        reply_count: 0,
        retweet_count: 179,
        like_count: 968,
      })
      const expected: EmbedResolverResult = {
        provider: 'twitter',
        id: '961570492162494464',
        src: 'https://platform.twitter.com/embed/Tweet.html?id=961570492162494464',
        url: 'https://x.com/notdetails/status/961570492162494464',
        description:
          "Hey, I'm open-sourcing the framework I put together to help me choose between job offers. I hope this helps someone 🤗 docs.google.com/spreadsheets/d…",
        author: 'Joel Califa',
        date: 'Thu Feb 08 12:00:45 +0000 2018',
        thumbnail: 'https://pbs.substack.com/media/DVgu7f1WsAAkNMr.jpg',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should resolve the div by component name alone when the class is stripped', async () => {
      const attrs = jsonAttrValue({
        url: 'https://twitter.com/user/status/123456789012345',
        full_text: 'Tweet text here.',
        username: 'user',
        name: 'Display Name',
      })
      const value = html`
        <div
          data-attrs="${attrs}"
          data-component-name="Twitter2ToDOM"
        ></div>
      `
      const expected: EmbedResolverResult = {
        provider: 'twitter',
        id: statusId,
        src: playerUrl,
        url: statusUrl,
        description: 'Tweet text here.',
        author: 'Display Name',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should read the payload the same when the div carries children', async () => {
      const attrs = jsonAttrValue({
        url: 'https://twitter.com/user/status/123456789012345',
        full_text: 'Tweet text here.',
        username: 'user',
        name: 'Display Name',
      })
      const value = html`
        <div
          class="twitter-embed"
          data-attrs="${attrs}"
          data-component-name="Twitter2ToDOM"
        >
          <p>Tweet text here.</p>
        </div>
      `
      const expected: EmbedResolverResult = {
        provider: 'twitter',
        id: statusId,
        src: playerUrl,
        url: statusUrl,
        description: 'Tweet text here.',
        author: 'Display Name',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should fall back to the handle when no display name is present', async () => {
      const value = makeSubstackTweet({
        url: 'https://twitter.com/user/status/123456789012345',
        full_text: 'Tweet text here.',
        username: 'user',
        name: '',
      })
      const expected: EmbedResolverResult = {
        provider: 'twitter',
        id: statusId,
        src: playerUrl,
        url: statusUrl,
        description: 'Tweet text here.',
        author: 'user',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should carry the avatar when the payload names one', async () => {
      const value = makeSubstackTweet({
        url: 'https://twitter.com/user/status/123456789012345',
        full_text: 'Tweet text here.',
        username: 'user',
        name: 'Display Name',
        profile_image_url: 'https://pbs.substack.com/media/profile.jpg',
      })
      const expected: EmbedResolverResult = {
        provider: 'twitter',
        id: statusId,
        src: playerUrl,
        url: statusUrl,
        description: 'Tweet text here.',
        author: 'Display Name',
        avatar: 'https://pbs.substack.com/media/profile.jpg',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should resolve a payload that carries no text, and claim no description', async () => {
      const value = makeSubstackTweet({
        url: 'https://twitter.com/user/status/123456789012345',
        username: 'user',
        name: 'Display Name',
      })
      const expected: EmbedResolverResult = {
        provider: 'twitter',
        id: statusId,
        src: playerUrl,
        url: statusUrl,
        author: 'Display Name',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('the photos the payload mirrors', () => {
    it('should claim no thumbnail when the payload carries no photos', async () => {
      const value = makeSubstackTweet({
        url: 'https://twitter.com/user/status/123456789012345',
        full_text: 'Tweet text here.',
        username: 'user',
        name: 'Display Name',
        photos: [],
      })
      const expected: EmbedResolverResult = {
        provider: 'twitter',
        id: statusId,
        src: playerUrl,
        url: statusUrl,
        description: 'Tweet text here.',
        author: 'Display Name',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should leave a photo url carrying a query for enrichment', async () => {
      const value = makeSubstackTweet({
        url: 'https://twitter.com/user/status/123456789012345',
        full_text: 'Tweet text here.',
        username: 'user',
        name: 'Display Name',
        photos: [{ img_url: 'https://pbs.twimg.com/media/DVgu7f1WsAAkNMr?format=jpg&name=large' }],
      })
      const expected: EmbedResolverResult = {
        provider: 'twitter',
        id: statusId,
        src: playerUrl,
        url: statusUrl,
        description: 'Tweet text here.',
        author: 'Display Name',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('the quoted tweet the payload nests', () => {
    it('should resolve the outer tweet and read nothing from the quoted one', async () => {
      const value = makeSubstackTweet({
        url: 'https://twitter.com/contactvvr/status/1598464456019021824?s=21&t=m04JJ6S9U_GO3CbafNotrQ',
        full_text: 'The outer tweet text.',
        username: 'contactvvr',
        name: 'Display Name',
        quoted_tweet: {
          url: 'https://twitter.com/other/status/961570492162494464',
          full_text: 'The quoted tweet text.',
          username: 'other',
          name: 'Other Name',
        },
      })
      const expected: EmbedResolverResult = {
        provider: 'twitter',
        id: '1598464456019021824',
        src: 'https://platform.twitter.com/embed/Tweet.html?id=1598464456019021824',
        url: 'https://x.com/contactvvr/status/1598464456019021824',
        description: 'The outer tweet text.',
        author: 'Display Name',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should return undefined when data-attrs is malformed json', async () => {
      const value = makeSubstackTweet('{not json')

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when data-attrs is absent', async () => {
      const value = '<div data-component-name="Twitter2ToDOM"></div>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when the payload url is not a tweet', async () => {
      const value = makeSubstackTweet({
        url: 'https://example.com/user/status/123456789012345',
        full_text: 'Not a tweet.',
      })

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for a payload url on a lookalike host', async () => {
      const value = makeSubstackTweet({
        url: `https://twitter.com.evil.test/user/status/${statusId}`,
        full_text: 'Tweet text here.',
      })

      expect(await extract(value)).toBeUndefined()
    })
  })
})

describe('twitterResolveEmbed', () => {
  it('should resolve a player url', () => {
    const expected: EmbedResolverResult = {
      provider: 'twitter',
      id: statusId,
      src: playerUrl,
    }

    expect(twitterResolveEmbed(playerUrl)).toEqual(expected)
  })

  it('should resolve the newer player path onto the same placeholder', () => {
    const value = `https://platform.twitter.com/embed/index.html?dnt=true&embedId=twitter-widget-0&frame=false&id=${statusId}&lang=en&theme=light&width=550px`
    const expected: EmbedResolverResult = {
      provider: 'twitter',
      id: statusId,
      src: playerUrl,
    }

    expect(twitterResolveEmbed(value)).toEqual(expected)
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

describeForEachParser('twitterIframeEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, twitterIframeEmbedResolver)

  it('should name its provider and its tweet from a bare player frame', async () => {
    const value = html`
      <iframe src="https://platform.twitter.com/embed/Tweet.html?id=123456789012345"></iframe>
    `
    const expected: EmbedResolverResult = {
      provider: 'twitter',
      id: statusId,
      src: playerUrl,
    }

    expect(await extract(value)).toEqual(expected)
  })

  it('should return undefined for the player path on a lookalike host', async () => {
    const value = html`
      <iframe src="https://platform.twitter.com.evil.test/embed/Tweet.html?id=123456789012345"></iframe>
    `

    expect(await extract(value)).toBeUndefined()
  })

  // Twitter's own internal paths, which name a status and no handle. Both video frames and the
  // card frame are dead, answering a stub or a 404, so the id in them is worth more than
  // the url they point at. `i` stands in for the handle, which Twitter itself redirects.
  describe('the internal paths that carry a status and no handle', () => {
    it.each([
      'https://twitter.com/i/videos/tweet/123456789012345',
      'https://twitter.com/i/videos/123456789012345',
      'https://twitter.com/i/cards/tfw/v1/123456789012345',
      'https://x.com/i/web/status/123456789012345',
      'https://x.com/statuses/123456789012345',
    ])('should mint the player from %s', async (url) => {
      const value = html`<iframe src="${url}"></iframe>`
      const expected: EmbedResolverResult = {
        provider: 'twitter',
        id: statusId,
        src: playerUrl,
        url: `https://x.com/i/status/${statusId}`,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  // The url a wrapper writes when it stores what the author pasted rather than the player, which
  // is every Twitter figure note.com ships. The page refuses framing, so unclaimed it becomes a
  // placeholder pointing at nothing a reader can load.
  describe('the status page a wrapper frames instead of the player', () => {
    it('should mint the player from a framed status page', async () => {
      const value = html`<iframe src="${statusUrl}"></iframe>`
      const expected: EmbedResolverResult = {
        provider: 'twitter',
        id: statusId,
        src: playerUrl,
        url: statusUrl,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should mint the same player from the twitter.com spelling', async () => {
      const value = html`<iframe src="https://twitter.com/user/status/${statusId}"></iframe>`
      const expected: EmbedResolverResult = {
        provider: 'twitter',
        id: statusId,
        src: playerUrl,
        url: statusUrl,
      }

      expect(await extract(value)).toEqual(expected)
    })

    // The id is the enrichment key, so a page carrier and a player carrier naming one tweet have
    // to agree on it. Both results are stated whole: the only difference is the url, which the
    // page states a handle for and the player does not.
    it('should give a page carrier the id its player carrier states', async () => {
      const playerValue = html`<iframe src="${playerUrl}"></iframe>`
      const pageValue = html`<iframe src="${statusUrl}"></iframe>`
      const expectedPlayer: EmbedResolverResult = {
        provider: 'twitter',
        id: statusId,
        src: playerUrl,
      }
      const expectedPage: EmbedResolverResult = {
        provider: 'twitter',
        id: statusId,
        src: playerUrl,
        url: statusUrl,
      }

      expect(await extract(playerValue)).toEqual(expectedPlayer)
      expect(await extract(pageValue)).toEqual(expectedPage)
    })
  })

  // The host is Twitter's and the resolver now reads more than the player path, so every shape
  // that is not a status has to be refused by name rather than by the host gate.
  describe('shapes on the host that are not a tweet', () => {
    it('should return undefined for a bare profile', async () => {
      const value = html`<iframe src="https://x.com/user"></iframe>`

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for a search page', async () => {
      const value = html`<iframe src="https://x.com/search?q=feeds"></iframe>`

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for a hashtag page', async () => {
      const value = html`<iframe src="https://x.com/hashtag/feeds"></iframe>`

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for the site root', async () => {
      const value = html`<iframe src="https://x.com/"></iframe>`

      expect(await extract(value)).toBeUndefined()
    })
  })
})

// The three survey shapes whose markup the resolver cannot read as published: the byline is a
// bare text node until the pipeline wraps it into a paragraph, and the Atom payload is markup
// only after the entities are decoded. Both are what earlier transforms hand over, so the
// assertion belongs at the end of the pipeline rather than on the resolver.
describeForEachParser('twitter shapes the pipeline repairs first', (parseHtml) => {
  const convert = (value: string): Promise<string> => {
    return transformContent(value, { parseHtmlFn: parseHtml, baseUrl: 'https://example.com/post' })
  }

  const placeholder = async (value: string): Promise<Record<string, string>> => {
    return readPlaceholder(await convert(value), parseHtml)
  }

  describe('Variant #1: canonical blockquote with the widgets.js loader', () => {
    const value = html`
      <blockquote
        class="twitter-tweet"
        data-dnt="true"
      >
        <p lang="en" dir="ltr">Tweet text here.</p>
        &mdash; Display Name (@user)
        <a href="https://twitter.com/user/status/123456789012345?ref_src=twsrc%5Etfw">
          May 12, 2020
        </a>
      </blockquote>
      <script
        async
        src="https://platform.twitter.com/widgets.js"
        charset="utf-8"
      ></script>
    `

    it('should carry every field across once the byline is a paragraph', async () => {
      const expected: Record<string, string> = {
        provider: 'twitter',
        id: statusId,
        src: playerUrl,
        url: statusUrl,
        description: 'Tweet text here.',
        author: 'Display Name',
        date: 'May 12, 2020',
      }

      expect(await placeholder(value)).toEqual(expected)
    })

    it('should leave no loader behind', async () => {
      expect(await convert(value)).not.toContain('widgets.js')
    })
  })

  describe('Variant #3: entity-encoded blockquote from an Atom payload', () => {
    it('should carry every field across once decoded', async () => {
      const value =
        '&lt;blockquote class=&quot;twitter-tweet&quot;&gt;&lt;p lang=&quot;en&quot; dir=&quot;ltr&quot;&gt;Tweet text here.&lt;/p&gt;&amp;mdash; Display Name (@user) &lt;a href=&quot;https://twitter.com/user/status/123456789012345&quot;&gt;May 12, 2020&lt;/a&gt;&lt;/blockquote&gt;'
      const expected: Record<string, string> = {
        provider: 'twitter',
        id: statusId,
        src: playerUrl,
        url: statusUrl,
        description: 'Tweet text here.',
        author: 'Display Name',
        date: 'May 12, 2020',
      }

      expect(await placeholder(value)).toEqual(expected)
    })
  })

  describe('Variant #4: WordPress Gutenberg figure wrapper', () => {
    // The Jetpack, Ghost, Substack, RebelMouse, Octopress and per-theme wrappers are the same
    // shape with another class, so the selector keys on the blockquote and they cost nothing.
    it('should carry every field across through the wrapper', async () => {
      const value = html`
        <figure class="wp-block-embed is-type-rich is-provider-twitter wp-block-embed-twitter">
          <div class="wp-block-embed__wrapper">
            <blockquote
              class="twitter-tweet"
              data-width="550"
              data-dnt="true"
            >
              <p lang="en" dir="ltr">Tweet text here.</p>
              &mdash; Display Name (@user)
              <a href="https://twitter.com/user/status/123456789012345?ref_src=twsrc%5Etfw">
                May 12, 2020
              </a>
            </blockquote>
            <script
              async
              src="https://platform.twitter.com/widgets.js"
            ></script>
          </div>
        </figure>
      `
      const expected: Record<string, string> = {
        provider: 'twitter',
        id: statusId,
        src: playerUrl,
        url: statusUrl,
        description: 'Tweet text here.',
        author: 'Display Name',
        date: 'May 12, 2020',
      }

      expect(await placeholder(value)).toEqual(expected)
    })
  })
})

describe('readTwitterHeight', () => {
  it('should read the height out of a resize call', () => {
    const value = {
      'twttr.embed': {
        jsonrpc: '2.0',
        method: 'twttr.private.resize',
        id: 'embed-0',
        params: [{ width: 550, height: 321, data: { tweet_id: '2095839790608363813' } }],
      },
    }

    expect(readTwitterHeight(value)).toBe(321)
  })

  it('should read nothing out of the other calls', () => {
    const value = {
      'twttr.embed': {
        jsonrpc: '2.0',
        method: 'twttr.private.rendered',
        id: 'embed-0',
        params: [{ data: { tweet_id: '2095839790608363813' } }],
      },
    }

    expect(readTwitterHeight(value)).toBeUndefined()
  })
})
