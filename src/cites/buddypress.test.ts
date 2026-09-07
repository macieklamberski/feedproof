import { describe, expect, it } from 'bun:test'
import { transformContent } from '../index.js'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { CiteResolverResult } from '../types.js'
import { buddypressCiteResolver } from './buddypress.js'

describeForEachParser('buddypressCiteResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, buddypressCiteResolver)

  describe('happy paths', () => {
    it('should extract every field from a complete preview', async () => {
      const value = html`
        <div class="activity-link-preview-container">
          <p class="activity-link-preview-title"><a href="https://example.com/event/meetup" target="_blank" rel="nofollow ugc">Virtual community meetup in August</a></p>
          <div class="activity-link-preview-image"><a href="https://example.com/event/meetup" target="_blank" rel="nofollow ugc"><img loading="lazy" src="https://example.com/uploads/meetup.png" /></a></div>
          <div class="activity-link-preview-excerpt">
            <p>We look forward to the next community meetup on the 12th! [&hellip;]</p>
          </div>
        </div>
      `
      const expected: CiteResolverResult = {
        provider: 'buddypress',
        url: 'https://example.com/event/meetup',
        title: 'Virtual community meetup in August',
        description: 'We look forward to the next community meetup on the 12th! […]',
        thumbnail: 'https://example.com/uploads/meetup.png',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should leave the optional fields undefined when only the title link is present', async () => {
      const value = html`
        <div class="activity-link-preview-container">
          <p class="activity-link-preview-title"><a href="https://example.com/event/meetup">Virtual community meetup</a></p>
        </div>
      `
      const expected: CiteResolverResult = {
        provider: 'buddypress',
        url: 'https://example.com/event/meetup',
        title: 'Virtual community meetup',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should return undefined when no link is present', async () => {
      const value = html`
        <div class="activity-link-preview-container">
          <p class="activity-link-preview-title">Virtual community meetup</p>
        </div>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when there is no title', async () => {
      const value = html`
        <div class="activity-link-preview-container">
          <div class="activity-link-preview-image"><a href="https://example.com/event/meetup"><img src="https://example.com/uploads/meetup.png" /></a></div>
        </div>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })
})

// The preview sits between the update's text and the like button, so the pipeline is what
// shows it becoming one placeholder while the text around it survives.
describeForEachParser('buddypress preview through the pipeline', (parseHtml) => {
  it('should convert the preview into a cite placeholder', async () => {
    const value = html`
      <p>Save the date for the next meetup.</p>
      <div class="activity-link-preview-container">
        <p class="activity-link-preview-title"><a href="https://example.com/event/meetup" target="_blank" rel="nofollow ugc">Virtual community meetup in August</a></p>
        <div class="activity-link-preview-image"><a href="https://example.com/event/meetup" target="_blank" rel="nofollow ugc"><img loading="lazy" src="https://example.com/uploads/meetup.png" /></a></div>
        <div class="activity-link-preview-excerpt">
          <p>We look forward to the next community meetup on the 12th!</p>
        </div>
      </div>
    `
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com/post',
    })
    const expected = html`
      <p>Save the date for the next meetup.</p>
      <div
        data-cite-provider="buddypress"
        data-cite-description="We look forward to the next community meetup on the 12th!"
        data-cite-url="https://example.com/event/meetup"
        data-cite-title="Virtual community meetup in August"
        data-cite-thumbnail="https://example.com/uploads/meetup.png"
      ></div>
    `

    expect(result).toEqualHtml(expected)
  })
})
