import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import {
  imgurBlockquoteEmbedResolver,
  imgurIframeEmbedResolver,
  imgurResolveEmbed,
} from './imgur.js'

describeForEachParser('imgurBlockquoteEmbedResolver', (parseHtml) => {
  const extract = (value: string): EmbedResolverResult | undefined => {
    const element = parseHtml(value).querySelector(imgurBlockquoteEmbedResolver.selector)

    return element
      ? (imgurBlockquoteEmbedResolver.extract(element) as EmbedResolverResult)
      : undefined
  }

  describe('a single post', () => {
    it('should derive the player and the poster from the id', () => {
      const value = html`
        <blockquote class="imgur-embed-pub" lang="en" data-id="pVa2rXL">
          <a href="//imgur.com/pVa2rXL">View post on imgur.com</a>
        </blockquote>
        <script async src="//s.imgur.com/min/embed.js" charset="utf-8"></script>
      `
      const expected: EmbedResolverResult = {
        provider: 'imgur',
        id: 'pVa2rXL',
        src: 'https://imgur.com/pVa2rXL/embed',
        url: 'https://imgur.com/pVa2rXL',
        thumbnail: 'https://i.imgur.com/pVa2rXLm.jpg',
        title: 'View post on imgur.com',
      }

      expect(extract(value)).toEqual(expected)
    })

    it('should carry whatever the anchor states, including the dialog label', () => {
      const value = html`
        <blockquote class="imgur-embed-pub" lang="en" data-id="pVa2rXL" data-context="false">
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

      expect(extract(value)).toEqual(expected)
    })

    it('should state no title when the anchor holds none', () => {
      const value = html`
        <blockquote class="imgur-embed-pub" lang="en" data-id="pVa2rXL">
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

      expect(extract(value)).toEqual(expected)
    })
  })

  describe('an album', () => {
    it('should keep the prefix that addresses it and state no poster', () => {
      const value = html`
        <blockquote class="imgur-embed-pub" lang="en" data-id="a/16lVn5E" data-context="false">
          <a href="//imgur.com/a/16lVn5E">Album title</a>
        </blockquote>
        <script async src="//s.imgur.com/min/embed.js" charset="utf-8"></script>
      `
      const expected: EmbedResolverResult = {
        provider: 'imgur',
        id: 'a/16lVn5E',
        src: 'https://imgur.com/a/16lVn5E/embed',
        url: 'https://imgur.com/a/16lVn5E',
        title: 'Album title',
      }

      expect(extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should return undefined for an id outside the url-safe alphabet', () => {
      const value = html`
        <blockquote class="imgur-embed-pub" data-id="../evil"></blockquote>
      `

      expect(extract(value)).toBeUndefined()
    })

    it('should return undefined for an empty id', () => {
      const value = html`<blockquote class="imgur-embed-pub" data-id=""></blockquote>`

      expect(extract(value)).toBeUndefined()
    })

    it('should not match a blockquote without the embed class', () => {
      const value = html`<blockquote data-id="pVa2rXL"></blockquote>`

      expect(extract(value)).toBeUndefined()
    })
  })
})

describe('imgurResolveEmbed', () => {
  it('should resolve the frame the script builds', () => {
    expect(imgurResolveEmbed('https://imgur.com/pVa2rXL/embed?pub=true&w=540')).toEqual({
      provider: 'imgur',
      id: 'pVa2rXL',
      src: 'https://imgur.com/pVa2rXL/embed',
      url: 'https://imgur.com/pVa2rXL',
      thumbnail: 'https://i.imgur.com/pVa2rXLm.jpg',
    })
  })

  it('should resolve an album frame', () => {
    expect(imgurResolveEmbed('https://imgur.com/a/16lVn5E/embed')).toEqual({
      provider: 'imgur',
      id: 'a/16lVn5E',
      src: 'https://imgur.com/a/16lVn5E/embed',
      url: 'https://imgur.com/a/16lVn5E',
    })
  })

  it('should treat the gallery path as an album', () => {
    expect(imgurResolveEmbed('https://imgur.com/gallery/CajzWlF')).toMatchObject({
      id: 'a/CajzWlF',
    })
  })

  it('should ignore an imgur url that names no post', () => {
    expect(imgurResolveEmbed('https://imgur.com/')).toBeUndefined()
  })

  it('should ignore another host carrying the post path', () => {
    expect(imgurResolveEmbed('https://imgur.com.evil.test/pVa2rXL/embed')).toBeUndefined()
  })
})

describeForEachParser('imgurIframeEmbedResolver', (parseHtml) => {
  const extract = (value: string): EmbedResolverResult | undefined => {
    const element = parseHtml(value).querySelector(imgurIframeEmbedResolver.selector)

    return element ? (imgurIframeEmbedResolver.extract(element) as EmbedResolverResult) : undefined
  }

  it('should resolve a stored frame back to the post', () => {
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
    }

    expect(extract(value)).toEqual(expected)
  })

  it('should ignore an iframe on another host', () => {
    const value = html`<iframe src="https://evil.test/pVa2rXL/embed"></iframe>`

    expect(extract(value)).toBeUndefined()
  })
})
