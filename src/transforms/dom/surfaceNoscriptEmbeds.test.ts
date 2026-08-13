import { expect, it } from 'bun:test'
import { transformContent } from '../../index.js'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { surfaceNoscriptEmbeds } from './surfaceNoscriptEmbeds.js'

describeForEachParser('surfaceNoscriptEmbeds', (parseHtml) => {
  const transform = (value: string) => {
    return applyDomTransforms(parseHtml(value), [surfaceNoscriptEmbeds(baseContext)])
  }

  it('should surface a video iframe trapped in a noscript', async () => {
    const value = html`<noscript><iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe></noscript>`
    const result = await transform(value)

    expect(result).toContain('<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ">')
    expect(result).not.toContain('<noscript')
  })

  it('should leave a Google Tag Manager noscript alone', async () => {
    const value = html`
      <noscript>
        <iframe src="https://www.googletagmanager.com/ns.html?id=GTM-XXXX" height="0" width="0">
        </iframe>
      </noscript>
    `
    const result = await transform(value)

    expect(result).toContain('<noscript')
    expect(result).toContain('googletagmanager.com')
  })

  it('should leave a noscript without an iframe alone', async () => {
    const value = html`<noscript><p>Enable JavaScript</p></noscript>`
    const result = await transform(value)

    expect(result).toContain('<noscript')
  })

  it('should surface a gist source trapped in a noscript beside the gist script', async () => {
    const value = html`
      <div>
        <script src="https://gist.github.com/octocat/6cad326836d38bd3a7ae.js"></script>
        <noscript><pre><code>print("hello")</code></pre></noscript>
      </div>
    `
    const result = await transform(value)

    expect(result).toContain('<pre><code>print("hello")</code></pre>')
    expect(result).not.toContain('<noscript')
  })

  it('should surface a gist source wrapped in a bare pre', async () => {
    const value = html`
      <script src="https://gist.github.com/octocat/6cad326836d38bd3a7ae.js"></script>
      <noscript><pre>print("hello")</pre></noscript>
    `
    const result = await transform(value)

    expect(result).toContain('<pre>print("hello")</pre>')
    expect(result).not.toContain('<noscript')
  })

  it('should leave a code-shaped noscript with no gist script beside it alone', async () => {
    const value = html`<noscript><pre><code>print("hello")</code></pre></noscript>`
    const result = await transform(value)

    expect(result).toContain('<noscript')
  })

  it('should leave a gist noscript carrying an enable-javascript notice alone', async () => {
    const value = html`
      <div>
        <script src="https://gist.github.com/octocat/6cad326836d38bd3a7ae.js"></script>
        <noscript>Enable JavaScript to view this gist.</noscript>
      </div>
    `
    const result = await transform(value)

    expect(result).toContain('<noscript')
  })

  it('should leave a gist noscript carrying a tracking pixel alone', async () => {
    const value = html`
      <div>
        <script src="https://gist.github.com/octocat/6cad326836d38bd3a7ae.js"></script>
        <noscript><img src="https://example.com/pixel.gif" width="1" height="1" /></noscript>
      </div>
    `
    const result = await transform(value)

    expect(result).toContain('<noscript')
    expect(result).toContain('pixel.gif')
  })

  it('should produce a youtube placeholder end to end', async () => {
    const value = html`<noscript><iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe></noscript>`
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com',
    })

    expect(result).toContain('data-embed-provider="youtube"')
    expect(result).not.toContain('<noscript')
  })

  it('should keep the gist source and the gist link end to end', async () => {
    const value = html`
      <div>
        <script src="https://gist.github.com/octocat/6cad326836d38bd3a7ae.js"></script>
        <noscript><pre><code>print("hello")</code></pre></noscript>
      </div>
    `
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com',
    })

    expect(result).toContain('print("hello")')
    expect(result).toContain('href="https://gist.github.com/octocat/6cad326836d38bd3a7ae"')
    expect(result).not.toContain('<noscript')
  })

  it('should be idempotent', async () => {
    const value = html`<noscript><iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe></noscript>`
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toBe(once)
  })

  it('should be idempotent for a gist source', async () => {
    const value = html`
      <div>
        <script src="https://gist.github.com/octocat/6cad326836d38bd3a7ae.js"></script>
        <noscript><pre><code>print("hello")</code></pre></noscript>
      </div>
    `
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toBe(once)
  })
})
