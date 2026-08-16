import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import {
  imgurBlockquoteEmbedResolver,
  imgurIframeEmbedResolver,
  imgurResolveEmbed,
} from './imgur.js'

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

  it('should ignore an imgur url that names no post', () => {
    const value = 'https://imgur.com/'

    expect(imgurResolveEmbed(value)).toBeUndefined()
  })

  it('should ignore another host carrying the post path', () => {
    const value = 'https://imgur.com.evil.test/pVa2rXL/embed'

    expect(imgurResolveEmbed(value)).toBeUndefined()
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
