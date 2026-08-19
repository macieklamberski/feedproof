import { describe, expect, it } from 'bun:test'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { surfaceParkedMarkup } from './surfaceParkedMarkup.js'

describeForEachParser('surfaceParkedMarkup', (parseHtml) => {
  const transform = (value: string) => {
    return applyDomTransforms(parseHtml(value), [surfaceParkedMarkup(baseContext)])
  }

  // Each payload below is the publisher's own bytes: the markup is percent-encoded and its
  // attribute values are entity-encoded underneath, so both layers have to come off for the
  // recovered element to state the URL it originally did.
  describe('recovered markup', () => {
    it('should recover a player iframe with its size and player parameters', async () => {
      const value = html`
        <div
          class="load-later load-later-vendor-wwwyoutubecom"
          data-url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
          data-content="%3Ciframe%20class%3D%22youtube-player%22%20width%3D%22640%22%20height%3D%22360%22%20src%3D%22https%3A%2F%2Fwww.youtube.com%2Fembed%2FdQw4w9WgXcQ%3Fversion%3D3%26amp%3Brel%3D1%26amp%3Bwmode%3Dtransparent%22%20allowfullscreen%3D%22true%22%20title%3D%22Embedded%20video%22%3E%3C%2Fiframe%3E"
        ></div>
      `
      const expected = html`
        <iframe
          class="youtube-player"
          width="640"
          height="360"
          src="https://www.youtube.com/embed/dQw4w9WgXcQ?version=3&amp;rel=1&amp;wmode=transparent"
          allowfullscreen="true"
          title="Embedded video"
        ></iframe>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should recover a post quote with its text, author and date', async () => {
      const value = html`
        <div
          class="load-later load-later-vendor-twittercom"
          data-url="https://twitter.com/person/status/123"
          data-content="%3Cblockquote%20class%3D%22twitter-tweet%22%20data-width%3D%22500%22%3E%3Cp%20lang%3D%22en%22%20dir%3D%22ltr%22%3EThe%20tweet%20text.%3C%2Fp%3E%26mdash%3B%20A%20Person%20(%40person)%20%3Ca%20href%3D%22https%3A%2F%2Fx.com%2Fperson%2Fstatus%2F123%3Fref_src%3Dtwsrc%255Etfw%22%3EAugust%2010%2C%202026%3C%2Fa%3E%3C%2Fblockquote%3E%3Cscript%20async%20src%3D%22https%3A%2F%2Fplatform.x.com%2Fwidgets.js%22%20charset%3D%22utf-8%22%3E%3C%2Fscript%3E"
        ></div>
      `
      const expected = html`
        <blockquote
          class="twitter-tweet"
          data-width="500"
        >
          <p lang="en" dir="ltr">The tweet text.</p>&mdash; A Person (@person)
          <a href="https://x.com/person/status/123?ref_src=twsrc%5Etfw">August 10, 2026</a>
        </blockquote>
        <script
          async
          src="https://platform.x.com/widgets.js"
          charset="utf-8"
        ></script>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should recover a quote that names its post in a cite attribute', async () => {
      const value = html`
        <div
          class="load-later load-later-vendor-wwwtiktokcom"
          data-url="https://www.tiktok.com/@person/video/456?lang=en"
          data-content="%3Cblockquote%20class%3D%22tiktok-embed%22%20cite%3D%22https%3A%2F%2Fwww.tiktok.com%2F%40person%2Fvideo%2F456%22%20data-video-id%3D%22456%22%20data-embed-from%3D%22oembed%22%3E%3Csection%3E%3Cp%3EThe%20caption.%3C%2Fp%3E%3C%2Fsection%3E%3C%2Fblockquote%3E"
        ></div>
      `
      const expected = html`
        <blockquote
          class="tiktok-embed"
          cite="https://www.tiktok.com/@person/video/456"
          data-video-id="456"
          data-embed-from="oembed"
        >
          <section>
            <p>The caption.</p>
          </section>
        </blockquote>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should recover a quote that names its post in a data attribute', async () => {
      const value = html`
        <div
          class="load-later load-later-vendor-wwwinstagramcom"
          data-url="https://www.instagram.com/p/ABC123/?hl=en"
          data-content="%3Cblockquote%20class%3D%22instagram-media%22%20data-instgrm-captioned%20data-instgrm-permalink%3D%22https%3A%2F%2Fwww.instagram.com%2Fp%2FABC123%2F%3Futm_source%3Dig_embed%26amp%3Butm_campaign%3Dloading%22%20data-instgrm-version%3D%2214%22%3E%3Cp%3EView%20this%20post%20on%20Instagram%3C%2Fp%3E%3C%2Fblockquote%3E"
        ></div>
      `
      const expected = html`
        <blockquote
          class="instagram-media"
          data-instgrm-captioned=""
          data-instgrm-permalink="https://www.instagram.com/p/ABC123/?utm_source=ig_embed&amp;utm_campaign=loading"
          data-instgrm-version="14"
        >
          <p>View this post on Instagram</p>
        </blockquote>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should keep the markup around a container that holds one', async () => {
      const value = html`
        <p>Before</p>
        <div
          class="load-later load-later-vendor-wwwtiktokcom"
          data-url="https://www.tiktok.com/@person/video/456"
          data-content="%3Cblockquote%20class%3D%22tiktok-embed%22%20cite%3D%22https%3A%2F%2Fwww.tiktok.com%2F%40person%2Fvideo%2F456%22%3E%3Cp%3EThe%20caption.%3C%2Fp%3E%3C%2Fblockquote%3E"
        ></div>
        <p>After</p>
      `
      const expected = html`
        <p>Before</p>
        <blockquote
          class="tiktok-embed"
          cite="https://www.tiktok.com/@person/video/456"
        >
          <p>The caption.</p>
        </blockquote>
        <p>After</p>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })
  })

  describe('container url as the last resort', () => {
    it('should append the container url when the recovered markup states none', async () => {
      const value = html`
        <div
          class="load-later load-later-vendor-wwwinstagramcom"
          data-url="https://www.instagram.com/p/ABC123/"
          data-content="%3Cblockquote%20class%3D%22instagram-media%22%20data-instgrm-version%3D%2214%22%3E%3Cdiv%20style%3D%22padding%3A16px%3B%22%3E%3C%2Fdiv%3E%3C%2Fblockquote%3E"
        ></div>
      `
      const expected = html`
        <blockquote
          class="instagram-media"
          data-instgrm-version="14"
        >
          <div style="padding:16px;"></div>
        </blockquote>
        <a href="https://www.instagram.com/p/ABC123/">https://www.instagram.com/p/ABC123/</a>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should leave the recovered markup alone when it states a url of its own', async () => {
      const value = html`
        <div
          class="load-later load-later-vendor-wwwinstagramcom"
          data-url="https://www.instagram.com/p/ABC123/"
          data-content="%3Cblockquote%20class%3D%22instagram-media%22%20data-instgrm-permalink%3D%22https%3A%2F%2Fwww.instagram.com%2Fp%2FABC123%2F%22%3E%3C%2Fblockquote%3E"
        ></div>
      `
      const expected = html`
        <blockquote
          class="instagram-media"
          data-instgrm-permalink="https://www.instagram.com/p/ABC123/"
        ></blockquote>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should recover the markup without a link when the container states no url', async () => {
      const value = html`
        <div
          class="load-later"
          data-content="%3Cblockquote%20class%3D%22instagram-media%22%3E%3C%2Fblockquote%3E"
        ></div>
      `
      const expected = '<blockquote class="instagram-media"></blockquote>'

      expect(await transform(value)).toEqualHtml(expected)
    })
  })

  describe('containers left alone', () => {
    it('should leave a container that holds neither markup nor a url', async () => {
      const value = '<div class="load-later"></div>'
      const expected = '<div class="load-later"></div>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should leave a container that holds only a url', async () => {
      const value = html`
        <div
          class="load-later load-later-vendor-twittercom"
          data-url="https://twitter.com/person/status/123"
        ></div>
      `
      const expected = html`
        <div
          class="load-later load-later-vendor-twittercom"
          data-url="https://twitter.com/person/status/123"
        ></div>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should leave a container whose payload is malformed', async () => {
      const value = html`
        <div
          class="load-later load-later-vendor-twittercom"
          data-url="https://twitter.com/person/status/123"
          data-content="%3Cblockquote%ZZ%3E"
        ></div>
      `
      const expected = html`
        <div
          class="load-later load-later-vendor-twittercom"
          data-url="https://twitter.com/person/status/123"
          data-content="%3Cblockquote%ZZ%3E"
        ></div>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should leave a container whose payload decodes to nothing', async () => {
      const value = html`
        <div
          class="load-later load-later-vendor-twittercom"
          data-url="https://twitter.com/person/status/123"
          data-content=""
        ></div>
      `
      const expected = html`
        <div
          class="load-later load-later-vendor-twittercom"
          data-url="https://twitter.com/person/status/123"
          data-content=""
        ></div>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should leave a div that holds a payload without the class', async () => {
      const value = html`
        <div
          class="embed-wrapper"
          data-url="https://twitter.com/person/status/123"
          data-content="%3Cblockquote%20class%3D%22twitter-tweet%22%3E%3C%2Fblockquote%3E"
        ></div>
      `
      const expected = html`
        <div
          class="embed-wrapper"
          data-url="https://twitter.com/person/status/123"
          data-content="%3Cblockquote%20class%3D%22twitter-tweet%22%3E%3C%2Fblockquote%3E"
        ></div>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })
  })

  it('should be idempotent', async () => {
    const value = html`
      <div
        class="load-later load-later-vendor-wwwyoutubecom"
        data-url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        data-content="%3Ciframe%20class%3D%22youtube-player%22%20width%3D%22640%22%20height%3D%22360%22%20src%3D%22https%3A%2F%2Fwww.youtube.com%2Fembed%2FdQw4w9WgXcQ%3Fversion%3D3%26amp%3Brel%3D1%22%3E%3C%2Fiframe%3E"
      ></div>
    `
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toEqualHtml(once)
  })
})
