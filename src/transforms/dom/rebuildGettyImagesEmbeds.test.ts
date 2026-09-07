import { describe, expect, it } from 'bun:test'
import { transformContent } from '../../index.js'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { rebuildGettyImagesEmbeds } from './rebuildGettyImagesEmbeds.js'

describeForEachParser('rebuildGettyImagesEmbeds', (parseHtml) => {
  const transform = (value: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(value), [rebuildGettyImagesEmbeds(context)])
  }

  describe('happy paths', () => {
    it('should replace the anchor with the player the config describes', async () => {
      const value = html`
        <a
          id="iPo3qjCKSVJU-bRwLBwNoQ"
          class="gie-single"
          href="http://www.gettyimages.com/detail/491183014"
        >Embed from Getty Images</a>
        <script>gie.widgets.load({id:'iPo3qjCKSVJU-bRwLBwNoQ',sig:'OOM9B40x=',w:'594px',h:'395px',items:'491183014',caption: true ,tld:'com',is360: false })</script>
      `
      const expected =
        '<iframe src="https://embed.gettyimages.com/embed/491183014?et=iPo3qjCKSVJU-bRwLBwNoQ&amp;tld=com&amp;sig=OOM9B40x%3D&amp;caption=true" width="594" height="395"></iframe>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should replace the script in place when no anchor carries the token', async () => {
      const value = `<script>gie.widgets.load({id:'abc',sig:'def=',w:'480px',h:'320px',items:'123456789'})</script>`
      const expected =
        '<iframe src="https://embed.gettyimages.com/embed/123456789?et=abc&amp;tld=com&amp;sig=def%3D&amp;caption=false" width="480" height="320"></iframe>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    // Getty writes the same token into the config and onto the anchor, which is the only thing
    // pairing them once a post carries more than one photo.
    it('should pair each config with its own anchor by token', async () => {
      const value = html`
        <a id="tokenA" class="gie-single" href="http://www.gettyimages.com/detail/111111111">One</a>
        <a id="tokenB" class="gie-single" href="http://www.gettyimages.com/detail/222222222">Two</a>
        <script>gie.widgets.load({id:'tokenB',sig:'sigB=',w:'300px',h:'200px',items:'222222222'})</script>
      `
      const expected = html`
        <a id="tokenA" class="gie-single" href="http://www.gettyimages.com/detail/111111111">One</a>
        <iframe
          src="https://embed.gettyimages.com/embed/222222222?et=tokenB&amp;tld=com&amp;sig=sigB%3D&amp;caption=false"
          width="300"
          height="200"
        ></iframe>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })
  })

  describe('sad paths', () => {
    it('should leave the loader script alone, which names the host but holds no config', async () => {
      const value =
        '<script async charset="utf-8" src="//embed-cdn.gettyimages.com/widgets.js"></script>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should leave a config with no signature alone rather than mint a url that 400s', async () => {
      const value = `<script>gie.widgets.load({id:'abc',w:'594px',h:'395px',items:'491183014'})</script>`

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should leave an unrelated script alone', async () => {
      const value = '<script>console.log("not getty")</script>'

      expect(await transform(value)).toEqualHtml(value)
    })
  })

  describe('edge cases', () => {
    it('should be idempotent', async () => {
      const value = html`
        <a id="iPo3qjCKSVJU-bRwLBwNoQ" class="gie-single" href="http://www.gettyimages.com/detail/491183014">Embed from Getty Images</a>
        <script>gie.widgets.load({id:'iPo3qjCKSVJU-bRwLBwNoQ',sig:'OOM9B40x=',w:'594px',h:'395px',items:'491183014'})</script>
      `
      const once = await transform(value)
      const twice = await transform(once)

      expect(twice).toBe(once)
    })
  })
})

// The whole point of the transform is what the reader ends up with, and only the pipeline shows
// that: the facade renders as a bare link today, and the resolver cannot see it until this
// transform has turned it into a carrier.
describeForEachParser('the getty facade the pipeline used to leave as a link', (parseHtml) => {
  const convert = (value: string) => {
    return transformContent(value, { parseHtmlFn: parseHtml, baseUrl: 'https://example.com/post' })
  }

  it('should turn the link into a placeholder naming the photo', async () => {
    const value = html`
      <p>Before</p>
      <a id="iPo3qjCKSVJU-bRwLBwNoQ" class="gie-single" href="http://www.gettyimages.com/detail/491183014">Embed from Getty Images</a>
      <script>gie.widgets.load({id:'iPo3qjCKSVJU-bRwLBwNoQ',sig:'OOM9B40x=',w:'594px',h:'395px',items:'491183014',caption: true ,tld:'com',is360: false })</script>
      <script async charset="utf-8" src="//embed-cdn.gettyimages.com/widgets.js"></script>
      <p>After</p>
    `
    const result = await convert(value)

    expect(result).toContain('data-embed-provider="gettyimages"')
    expect(result).toContain('data-embed-id="491183014"')
    expect(result).toContain('data-embed-width="594"')
    expect(result).toContain('data-embed-height="395"')
    expect(result).not.toContain('Embed from Getty Images')
  })
})
