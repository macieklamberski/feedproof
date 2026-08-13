import { expect, it } from 'bun:test'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { rebuildEmbedlyEmbeds } from './rebuildEmbedlyEmbeds.js'

describeForEachParser('rebuildEmbedlyEmbeds', (parseHtml) => {
  const transform = (value: string) => {
    return applyDomTransforms(parseHtml(value), [rebuildEmbedlyEmbeds(baseContext)])
  }

  it('should unwrap an Embedly media iframe to the inner src and carry the poster', async () => {
    const value = html`
      <iframe
        src="https://cdn.embedly.com/widgets/media.html?src=https%3A%2F%2Fwww.youtube.com%2Fembed%2FdQw4w9WgXcQ&image=https%3A%2F%2Fi.ytimg.com%2Fvi%2FdQw4w9WgXcQ%2Fhqdefault.jpg&url=https%3A%2F%2Fyoutu.be%2FdQw4w9WgXcQ&schema=youtube"
        width="640"
        height="360"
      ></iframe>
    `
    const result = await transform(value)

    expect(result).toContain('src="https://www.youtube.com/embed/dQw4w9WgXcQ"')
    expect(result).toContain('data-thumbnail="https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"')
    expect(result).not.toContain('cdn.embedly.com')
  })

  it('should unwrap an Embedly-wrapped Datawrapper chart', async () => {
    const value = html`<iframe src="https://cdn.embedly.com/widgets/media.html?src=https%3A%2F%2Fdatawrapper.dwcdn.net%2FAbCdE%2F4%2F&image=https%3A%2F%2Fdatawrapper.dwcdn.net%2FAbCdE%2Fplain-s.png&schema=dwcdn"></iframe>`
    const result = await transform(value)

    expect(result).toContain('src="https://datawrapper.dwcdn.net/AbCdE/4/"')
    expect(result).not.toContain('cdn.embedly.com')
  })

  it('should handle a protocol-relative embedly src', async () => {
    const value = html`<iframe src="//cdn.embedly.com/widgets/media.html?src=https%3A%2F%2Fvimeo.com%2F76979871"></iframe>`
    const result = await transform(value)

    expect(result).toContain('src="https://vimeo.com/76979871"')
  })

  it('should omit data-thumbnail when there is no image param', async () => {
    const value = html`<iframe src="https://cdn.embedly.com/widgets/media.html?src=https%3A%2F%2Fexample.com%2Fembed"></iframe>`
    const result = await transform(value)

    expect(result).toContain('src="https://example.com/embed"')
    expect(result).not.toContain('data-thumbnail')
  })

  it('should leave an embedly iframe with no src param untouched', async () => {
    const value = html`<iframe src="https://cdn.embedly.com/widgets/media.html?url=https%3A%2F%2Fexample.com"></iframe>`
    const result = await transform(value)

    expect(result).toContain('cdn.embedly.com')
  })

  it('should leave a non-embedly iframe untouched', async () => {
    const value = html`<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>`

    expect(await transform(value)).toContain('youtube.com/embed/dQw4w9WgXcQ')
  })

  it('should be idempotent', async () => {
    const value = html`<iframe src="https://cdn.embedly.com/widgets/media.html?src=https%3A%2F%2Fexample.com%2Fembed&image=https%3A%2F%2Fexample.com%2Fp.jpg"></iframe>`
    const once = await transform(value)
    const twice = await applyDomTransforms(parseHtml(once), [rebuildEmbedlyEmbeds(baseContext)])

    expect(twice).toBe(once)
  })
})
