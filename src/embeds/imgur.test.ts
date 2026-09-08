import { describe, expect, it } from 'bun:test'
import { transformContent } from '../index.js'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import {
  imgurBlockquoteEmbedResolver,
  imgurIframeEmbedResolver,
  imgurResolveEmbed,
  readImgurHeight,
} from './imgur.js'

// Imgur's own routes, none of which names a post to mint from.
const sitePaths = [
  'https://imgur.com/upload',
  'https://imgur.com/about',
  'https://imgur.com/signin',
  'https://imgur.com/memegen',
  'https://imgur.com/search?q=cats',
  'https://imgur.com/new',
  'https://imgur.com/tos',
  'https://imgur.com/privacy',
  'https://imgur.com/user/someone',
  'https://imgur.com/r/funny/abc12345',
  'https://imgur.com/t/cats/abc12345',
  'https://imgur.com/rules',
  'https://imgur.com/contact',
  'https://imgur.com/login',
  'https://imgur.com/trending',
  'https://imgur.com/download/abc12345',
]

describeForEachParser('imgurBlockquoteEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, imgurBlockquoteEmbedResolver)

  describe('a single post', () => {
    it('should derive the player and the poster from the id', async () => {
      const value = html`
        <blockquote
          class="imgur-embed-pub"
          lang="en"
          data-id="pVa2rXL"
        >
          <a href="//imgur.com/pVa2rXL">View post on imgur.com</a>
        </blockquote>
        <script
          async
          src="//s.imgur.com/min/embed.js"
          charset="utf-8"
        ></script>
      `
      const expected: EmbedResolverResult = {
        provider: 'imgur',
        id: 'pVa2rXL',
        src: 'https://imgur.com/pVa2rXL/embed',
        url: 'https://imgur.com/pVa2rXL',
        thumbnail: 'https://i.imgur.com/pVa2rXLm.jpg',
        title: 'View post on imgur.com',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should carry whatever the anchor states, including the dialog label', async () => {
      const value = html`
        <blockquote
          class="imgur-embed-pub"
          lang="en"
          data-id="pVa2rXL"
          data-context="false"
        >
          <a href="//imgur.com/pVa2rXL">A cat wearing a tiny hat</a>
        </blockquote>
      `
      const expected: EmbedResolverResult = {
        provider: 'imgur',
        id: 'pVa2rXL',
        src: 'https://imgur.com/pVa2rXL/embed',
        url: 'https://imgur.com/pVa2rXL',
        thumbnail: 'https://i.imgur.com/pVa2rXLm.jpg',
        title: 'A cat wearing a tiny hat',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should state no title when the anchor holds none', async () => {
      const value = html`
        <blockquote
          class="imgur-embed-pub"
          lang="en"
          data-id="pVa2rXL"
        >
          <a href="//imgur.com/pVa2rXL"></a>
        </blockquote>
      `
      const expected: EmbedResolverResult = {
        provider: 'imgur',
        id: 'pVa2rXL',
        src: 'https://imgur.com/pVa2rXL/embed',
        url: 'https://imgur.com/pVa2rXL',
        thumbnail: 'https://i.imgur.com/pVa2rXLm.jpg',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('an album', () => {
    it('should keep the prefix that addresses it and state no poster', async () => {
      const value = html`
        <blockquote
          class="imgur-embed-pub"
          lang="en"
          data-id="a/16lVn5E"
          data-context="false"
        >
          <a href="//imgur.com/a/16lVn5E">Album title</a>
        </blockquote>
        <script
          async
          src="//s.imgur.com/min/embed.js"
          charset="utf-8"
        ></script>
      `
      const expected: EmbedResolverResult = {
        provider: 'imgur',
        id: 'a/16lVn5E',
        src: 'https://imgur.com/a/16lVn5E/embed',
        url: 'https://imgur.com/a/16lVn5E',
        title: 'Album title',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should return undefined for an id outside the url-safe alphabet', async () => {
      const value = html`
        <blockquote
          class="imgur-embed-pub"
          data-id="../evil"
        ></blockquote>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for an empty id', async () => {
      const value = html`
        <blockquote
          class="imgur-embed-pub"
          data-id=""
        ></blockquote>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should not match a blockquote without the embed class', async () => {
      const value = '<blockquote data-id="pVa2rXL"></blockquote>'

      expect(await extract(value)).toBeUndefined()
    })
  })
})

describe('imgurResolveEmbed', () => {
  it('should resolve the frame the script builds', () => {
    const value = 'https://imgur.com/pVa2rXL/embed?pub=true&w=540'
    const expected: EmbedResolverResult = {
      provider: 'imgur',
      id: 'pVa2rXL',
      src: 'https://imgur.com/pVa2rXL/embed',
      url: 'https://imgur.com/pVa2rXL',
      thumbnail: 'https://i.imgur.com/pVa2rXLm.jpg',
    }

    expect(imgurResolveEmbed(value)).toEqual(expected)
  })

  it('should resolve an album frame', () => {
    const value = 'https://imgur.com/a/16lVn5E/embed'
    const expected: EmbedResolverResult = {
      provider: 'imgur',
      id: 'a/16lVn5E',
      src: 'https://imgur.com/a/16lVn5E/embed',
      url: 'https://imgur.com/a/16lVn5E',
    }

    expect(imgurResolveEmbed(value)).toEqual(expected)
  })

  it('should treat the gallery path as an album', () => {
    const value = 'https://imgur.com/gallery/CajzWlF'
    const expected: EmbedResolverResult = {
      provider: 'imgur',
      id: 'a/CajzWlF',
      src: 'https://imgur.com/a/CajzWlF/embed',
      url: 'https://imgur.com/a/CajzWlF',
    }

    expect(imgurResolveEmbed(value)).toEqual(expected)
  })

  it('should resolve an album page url, which the prefix already names as one', () => {
    const value = 'https://imgur.com/a/16lVn5E'
    const expected: EmbedResolverResult = {
      provider: 'imgur',
      id: 'a/16lVn5E',
      src: 'https://imgur.com/a/16lVn5E/embed',
      url: 'https://imgur.com/a/16lVn5E',
    }

    expect(imgurResolveEmbed(value)).toEqual(expected)
  })

  // A publisher pastes the post page as often as the frame, and both name the same post.
  it('should read the post page url', () => {
    const value = 'https://imgur.com/pVa2rXL'
    const expected: EmbedResolverResult = {
      provider: 'imgur',
      id: 'pVa2rXL',
      src: 'https://imgur.com/pVa2rXL/embed',
      url: 'https://imgur.com/pVa2rXL',
      thumbnail: 'https://i.imgur.com/pVa2rXLm.jpg',
    }

    expect(imgurResolveEmbed(value)).toEqual(expected)
  })

  // A word that reads like a site page is not one: `imgur.com/memes` is a post somebody uploaded.
  // The site list is the routes the platform answered for and nothing wider.
  it('should read a post page url whose id is an ordinary word', () => {
    const value = 'https://imgur.com/memes'
    const expected: EmbedResolverResult = {
      provider: 'imgur',
      id: 'memes',
      src: 'https://imgur.com/memes/embed',
      url: 'https://imgur.com/memes',
      thumbnail: 'https://i.imgur.com/memesm.jpg',
    }

    expect(imgurResolveEmbed(value)).toEqual(expected)
  })

  it('should ignore an imgur url that names no post', () => {
    const value = 'https://imgur.com/'

    expect(imgurResolveEmbed(value)).toBeUndefined()
  })

  describe('shapes that name no post', () => {
    it.each(sitePaths)('should ignore the site path %s', (value) => {
      expect(imgurResolveEmbed(value)).toBeUndefined()
    })

    it('should ignore a gallery listing, which sits where an album id would', () => {
      const value = 'https://imgur.com/gallery/hot'

      expect(imgurResolveEmbed(value)).toBeUndefined()
    })
  })

  it('should ignore another host carrying the post path', () => {
    const value = 'https://imgur.com.evil.test/pVa2rXL/embed'

    expect(imgurResolveEmbed(value)).toBeUndefined()
  })

  describe('the hosts a post page answers on', () => {
    it('should read the mobile spelling of the post page', () => {
      const value = 'https://m.imgur.com/pVa2rXL'
      const expected: EmbedResolverResult = {
        provider: 'imgur',
        id: 'pVa2rXL',
        src: 'https://imgur.com/pVa2rXL/embed',
        url: 'https://imgur.com/pVa2rXL',
        thumbnail: 'https://i.imgur.com/pVa2rXLm.jpg',
      }

      expect(imgurResolveEmbed(value)).toEqual(expected)
    })

    it('should read the www spelling of the post page', () => {
      const value = 'https://www.imgur.com/pVa2rXL'
      const expected: EmbedResolverResult = {
        provider: 'imgur',
        id: 'pVa2rXL',
        src: 'https://imgur.com/pVa2rXL/embed',
        url: 'https://imgur.com/pVa2rXL',
        thumbnail: 'https://i.imgur.com/pVa2rXLm.jpg',
      }

      expect(imgurResolveEmbed(value)).toEqual(expected)
    })

    it.each([
      'https://i.imgur.com/pVa2rXL',
      'https://i.imgur.com/pVa2rXL.mp4',
      'https://s.imgur.com/min/embed.js',
      'https://i.stack.imgur.com/pVa2rXL.png',
    ])('should ignore %s, which names a file rather than a post', (value) => {
      expect(imgurResolveEmbed(value)).toBeUndefined()
    })
  })
})

describeForEachParser('imgurIframeEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, imgurIframeEmbedResolver)

  it('should resolve a stored frame back to the post', async () => {
    const value = html`
      <iframe
        src="https://imgur.com/pVa2rXL/embed?pub=true&amp;ref=https%3A%2F%2Fexample.com&amp;w=540"
        class="imgur-embed-iframe-pub"
        scrolling="no"
        width="540"
        height="500"
      ></iframe>
    `
    const expected: EmbedResolverResult = {
      provider: 'imgur',
      id: 'pVa2rXL',
      src: 'https://imgur.com/pVa2rXL/embed',
      url: 'https://imgur.com/pVa2rXL',
      thumbnail: 'https://i.imgur.com/pVa2rXLm.jpg',
      width: 540,
      height: 500,
    }

    expect(await extract(value)).toEqual(expected)
  })

  it('should ignore an iframe on another host', async () => {
    const value = '<iframe src="https://evil.test/pVa2rXL/embed"></iframe>'

    expect(await extract(value)).toBeUndefined()
  })
})

// The enclosure probe offers every attachment to every url resolver, so only a pipeline test
// reaches the path where claiming a media url would cost a reader the file.
describeForEachParser('imgur through the pipeline', (parseHtml) => {
  const convert = (value: string, enclosures?: Array<{ url: string; type: string }>) => {
    return transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com/post',
      enclosures,
    })
  }

  it('should claim a post page offered as an enclosure', async () => {
    const enclosures = [{ url: 'https://imgur.com/pVa2rXL', type: 'text/html' }]

    const expected = html`
      <div
        data-enclosure=""
        data-embed-thumbnail="https://i.imgur.com/pVa2rXLm.jpg"
        data-embed-url="https://imgur.com/pVa2rXL"
        data-embed-id="pVa2rXL"
        data-embed-provider="imgur"
        data-embed-src="https://imgur.com/pVa2rXL/embed"
      ></div>
      <p>Body</p>
    `

    expect(await convert('<p>Body</p>', enclosures)).toEqualHtml(expected)
  })

  it('should leave an extensionless media enclosure playable', async () => {
    const enclosures = [{ url: 'https://i.imgur.com/pVa2rXL', type: 'video/mp4' }]

    const expected = html`
      <video data-enclosure="" controls src="https://i.imgur.com/pVa2rXL"></video>
      <p>Body</p>
    `

    expect(await convert('<p>Body</p>', enclosures)).toEqualHtml(expected)
  })
})

describe('readImgurHeight', () => {
  // What a post posts on load, at 640 wide, as the JSON string the embed document builds.
  it('should read the height out of a resize message', () => {
    const value = JSON.stringify({
      message: 'resize_imgur',
      href: 'https://imgur.com/pVa2rXL/embed',
      height: 595,
      width: 640,
      context: true,
    })

    expect(readImgurHeight(value)).toBe(595)
  })

  it('should read nothing from another message or an unrendered post', () => {
    const unrendered = JSON.stringify({ message: 'resize_imgur', height: 0 })
    const other = JSON.stringify({ message: 'imgur_loaded', height: 595 })

    expect(readImgurHeight(unrendered)).toBeUndefined()
    expect(readImgurHeight(other)).toBeUndefined()
  })

  it('should read nothing from a payload that is not a JSON string', () => {
    expect(readImgurHeight({ message: 'resize_imgur', height: 595 })).toBeUndefined()
    expect(readImgurHeight('resize_imgur')).toBeUndefined()
  })
})
