import { expect, it } from 'bun:test'
import { transformContent } from '../index.js'
import { describeForEachParser, html } from '../tests.js'

describeForEachParser('YouTube', (parseHtml) => {
  // The widest spread. youtubeIframeEmbedResolver and youtubeAmpEmbedResolver claim the
  // carriers and amp-youtube elements (youtubeHosts includes youtube.googleapis.com, the
  // Flash-era host Blogger feeds still ship). Each plugin facade has its own rebuild:
  // rebuildLazyYtEmbeds, rebuildLyteEmbeds, rebuildRocketYoutubePreviews,
  // rebuildLiteVideoEmbeds, rebuildEmbedPlusEmbeds, rebuildElementorVideoEmbeds and
  // rebuildLazyLoadForVideos. surfaceParkedMarkup recovers iframes parked percent-encoded
  // in data-content, extractVideoId strips the stray bbcode quote Steam news leaks into
  // embed srcs, and defaultNonContentSelectors drops the Steam poster gif shown before
  // its script swaps the real iframe in.

  // The carrier names its host but no scheme, and no baseUrl is stated, so the placeholder
  // depends on the pipeline giving it one before the resolver reads the host.
  it('should resolve a protocol-relative carrier with no baseUrl stated', async () => {
    const value = '<iframe src="//www.youtube.com/embed/dQw4w9WgXcQ"></iframe>'
    const expected = html`
      <div
        data-embed-provider="youtube"
        data-embed-id="dQw4w9WgXcQ"
        data-embed-src="https://www.youtube.com/embed/dQw4w9WgXcQ"
        data-embed-url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        data-embed-thumbnail="https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
        data-embed-ratio="16/9"
      ></div>
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })

  it('should use built-in YouTube embed resolver', async () => {
    const value = html`
      <iframe
        src="https://www.youtube.com/embed/dQw4w9WgXcB"
        width="560"
        height="315"
      >
      </iframe>
    `
    const expected = html`
      <div
        data-embed-provider="youtube"
        data-embed-id="dQw4w9WgXcB"
        data-embed-src="https://www.youtube.com/embed/dQw4w9WgXcB"
        data-embed-url="https://www.youtube.com/watch?v=dQw4w9WgXcB"
        data-embed-thumbnail="https://i.ytimg.com/vi/dQw4w9WgXcB/hqdefault.jpg"
        data-embed-ratio="16/9"
      ></div>
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })

  it('should resolve a YouTube playlist embed to a posterless youtube placeholder', async () => {
    const value = '<iframe src="https://www.youtube.com/embed/videoseries?list=PLabc123"></iframe>'
    // `videoseries` is a playlist, not a video: keep the working src, give a canonical playlist
    // url, and no thumbnail (a playlist has no id-derivable poster). The list id stays as the
    // enrichment key.
    const expected = html`
      <div
        data-embed-provider="youtube"
        data-embed-id="PLabc123"
        data-embed-src="https://www.youtube.com/embed/videoseries?list=PLabc123"
        data-embed-url="https://www.youtube.com/playlist?list=PLabc123"
        data-embed-ratio="16/9"
      ></div>
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })

  it('should resolve a YouTube channel live embed to a posterless youtube placeholder', async () => {
    const value = html`
      <iframe src="https://www.youtube.com/embed/live_stream?channel=UCabc123"></iframe>
    `
    // `live_stream` is a channel live embed, not a video: the `channel` param is preserved
    // (resolving it as a video would drop it and leave a dead `embed/live_stream`), the url
    // points at the channel, and there is no thumbnail. The channel id is the enrichment key.
    const expected = html`
      <div
        data-embed-provider="youtube"
        data-embed-id="UCabc123"
        data-embed-src="https://www.youtube.com/embed/live_stream?channel=UCabc123"
        data-embed-url="https://www.youtube.com/channel/UCabc123"
        data-embed-ratio="16/9"
      ></div>
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })

  // The Flash playlist player is dead, so `<embed>` arrives as a generic placeholder holding a
  // url that plays nothing. The whole point of the repair is that the swf never comes back.
  it('should repair a Flash playlist embed into a modern playlist placeholder', async () => {
    const value = html`
      <object width="480" height="385">
        <param name="movie" value="http://www.youtube.com/p/7BE4DDAC0A0D31AF?hl=es_ES&fs=1" />
        <embed
          src="http://www.youtube.com/p/7BE4DDAC0A0D31AF?hl=es_ES&fs=1"
          type="application/x-shockwave-flash"
          width="480"
          height="385"
        />
      </object>
    `
    const expected = html`
      <div
        data-embed-provider="youtube"
        data-embed-id="PL7BE4DDAC0A0D31AF"
        data-embed-src="https://www.youtube.com/embed/videoseries?list=PL7BE4DDAC0A0D31AF"
        data-embed-url="https://www.youtube.com/playlist?list=PL7BE4DDAC0A0D31AF"
        data-embed-ratio="16/9"
      ></div>
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })

  // ARVE's lazyload button holds no image of its own, so the widget is dropped as empty markup
  // before this: the video is gone from the item entirely, not merely posterless.
  it('should recover a video from an ARVE play button', async () => {
    const value = html`
      <div class="arve">
        <button
          class="arve-play-btn arve-play-btn--youtube"
          data-iframe="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0"
        ></button>
      </div>
    `
    const expected = html`
      <div
        data-embed-provider="youtube"
        data-embed-id="dQw4w9WgXcQ"
        data-embed-src="https://www.youtube.com/embed/dQw4w9WgXcQ"
        data-embed-url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        data-embed-thumbnail="https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
        data-embed-ratio="16/9"
      ></div>
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })

  // The bare `/embed/?listType=playlist` spelling used to fall through to the generic iframe
  // handling, which kept the declared 500px height; the resolver's 16/9 ratio must win instead.
  it('should resolve a bare listType playlist embed instead of the generic fallback', async () => {
    const value = html`
      <iframe
        src="https://www.youtube.com/embed/?listType=playlist&list=UUabc123"
        height="500"
      ></iframe>
    `
    const expected = html`
      <div
        data-embed-provider="youtube"
        data-embed-id="UUabc123"
        data-embed-src="https://www.youtube.com/embed/videoseries?list=UUabc123"
        data-embed-url="https://www.youtube.com/playlist?list=UUabc123"
        data-embed-ratio="16/9"
      ></div>
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })

  it('should collapse a Steam news YouTube facade into a clean embed placeholder', async () => {
    const value = html`
      <p>Watch the trailer:</p>
      <div class="sharedFilePreviewYouTubeVideo">
        <img
          class="sharedFilePreviewYouTubeVideo"
          src="https://steamcommunity.com/public/shared/images/responsive/youtube_16x9_placeholder.gif"
        />
        <iframe
          src="https://www.youtube-nocookie.com/embed/QMIjaUgLLJg?fs=1&modestbranding=1&rel=0"
          allowFullScreen="1"
          frameBorder="0"
        ></iframe>
      </div>
    `
    const expected = html`
      <p>Watch the trailer:</p>
      <div
        data-embed-provider="youtube"
        data-embed-id="QMIjaUgLLJg"
        data-embed-src="https://www.youtube.com/embed/QMIjaUgLLJg"
        data-embed-url="https://www.youtube.com/watch?v=QMIjaUgLLJg"
        data-embed-thumbnail="https://i.ytimg.com/vi/QMIjaUgLLJg/hqdefault.jpg"
        data-embed-ratio="16/9"
      ></div>
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })
})
