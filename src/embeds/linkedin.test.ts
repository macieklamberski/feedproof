import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { linkedinEmbedResolver } from './linkedin.js'

describeForEachParser('linkedinEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, linkedinEmbedResolver)

  describe('happy paths', () => {
    it('should resolve the share snippet and take the size the publisher stated', async () => {
      const value = html`
        <iframe
          src="https://www.linkedin.com/embed/feed/update/urn:li:share:6626097641602281472"
          height="570"
          width="504"
          frameborder="0"
          allowfullscreen=""
          title="Embedded post"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'linkedin',
        id: 'urn:li:share:6626097641602281472',
        src: 'https://www.linkedin.com/embed/feed/update/urn:li:share:6626097641602281472',
        url: 'https://www.linkedin.com/feed/update/urn:li:share:6626097641602281472',
        width: 504,
        height: 570,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should keep the layout flag on src and drop it from the canonical url', async () => {
      const value = html`
        <iframe
          src="https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:7464944835901325312?compact=1"
          height="399"
          width="504"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'linkedin',
        id: 'urn:li:ugcPost:7464944835901325312',
        src: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:7464944835901325312?compact=1',
        url: 'https://www.linkedin.com/feed/update/urn:li:ugcPost:7464944835901325312',
        width: 504,
        height: 399,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should resolve an activity urn carrying the collapsed flag', async () => {
      const value =
        '<iframe src="https://www.linkedin.com/embed/feed/update/urn:li:activity:7493943835853750272?collapsed=1"></iframe>'
      const expected: EmbedResolverResult = {
        provider: 'linkedin',
        id: 'urn:li:activity:7493943835853750272',
        src: 'https://www.linkedin.com/embed/feed/update/urn:li:activity:7493943835853750272?collapsed=1',
        url: 'https://www.linkedin.com/feed/update/urn:li:activity:7493943835853750272',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should ignore a profile page', async () => {
      const value = '<iframe src="https://www.linkedin.com/in/gokhangerdan"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore the article embed, which carries no urn', async () => {
      const value =
        '<iframe src="https://www.linkedin.com/embeds/publishingEmbed.html?articleId=787445654"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })

    // Only the update path resolves. Without this, any four-segment linkedin path ending in a
    // urn would mint a `/feed/update/` url for something that is not a post.
    it('should ignore a urn sitting under a different embed action', async () => {
      const value =
        '<iframe src="https://www.linkedin.com/embed/feed/comment/urn:li:comment:6626097641602281472"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore a urn of the wrong shape', async () => {
      const value =
        '<iframe src="https://www.linkedin.com/embed/feed/update/urn:li:share:not-a-number"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore a foreign host carrying the same path', async () => {
      const value =
        '<iframe src="https://evil.test/www.linkedin.com/embed/feed/update/urn:li:share:6626097641602281472"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })
  })

  // The height is a property of the post, not of the player: at the single width 504 the corpus
  // holds 302 distinct heights between 264 and 2098. The resolver therefore states none, and a
  // carrier that states none too has to come back sizeless rather than with a default nobody
  // measured. Pins the decision recorded in _corpus/linkedin.md.
  describe('the size the resolver refuses to invent', () => {
    it('should return no size when the carrier states none', async () => {
      const value =
        '<iframe src="https://www.linkedin.com/embed/feed/update/urn:li:share:6626097641602281472"></iframe>'
      const expected: EmbedResolverResult = {
        provider: 'linkedin',
        id: 'urn:li:share:6626097641602281472',
        src: 'https://www.linkedin.com/embed/feed/update/urn:li:share:6626097641602281472',
        url: 'https://www.linkedin.com/feed/update/urn:li:share:6626097641602281472',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should not read the boilerplate title as a title', async () => {
      const value = html`
        <iframe
          src="https://www.linkedin.com/embed/feed/update/urn:li:share:6626097641602281472"
          title="Eingebetteter Beitrag"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'linkedin',
        id: 'urn:li:share:6626097641602281472',
        src: 'https://www.linkedin.com/embed/feed/update/urn:li:share:6626097641602281472',
        url: 'https://www.linkedin.com/feed/update/urn:li:share:6626097641602281472',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })
})
