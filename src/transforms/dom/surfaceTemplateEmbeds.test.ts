import { expect, it } from 'bun:test'
import { transformContent } from '../../index.js'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { surfaceTemplateEmbeds } from './surfaceTemplateEmbeds.js'

const hoistedInPlaceRegex = /before<\/p>.*<iframe.*<p>after/s

describeForEachParser('surfaceTemplateEmbeds', (parseHtml) => {
  const transform = (value: string) => {
    return applyDomTransforms(parseHtml(value), [surfaceTemplateEmbeds(baseContext)])
  }

  it('should surface an iframe trapped in a template', async () => {
    const value = html`<p>thumb</p><template><iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe></template>`
    const result = await transform(value)

    expect(result).toContain('<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ">')
    expect(result).not.toContain('<template')
  })

  it('should surface a data-embed-src placeholder trapped in a template', async () => {
    const value = html`<template><div data-embed-src="https://www.youtube.com/embed/dQw4w9WgXcQ"></div></template>`
    const result = await transform(value)

    expect(result).toContain('data-embed-src="https://www.youtube.com/embed/dQw4w9WgXcQ"')
    expect(result).not.toContain('<template')
  })

  it('should leave a template with no embed alone', async () => {
    const value = html`<template><p>placeholder text</p></template>`
    const result = await transform(value)

    expect(result).toContain('<template')
  })

  it('should hoist the content in place of the template', async () => {
    const value = html`<p>before</p><template><iframe src="https://www.youtube.com/embed/x"></iframe></template><p>after</p>`
    const result = await transform(value)

    expect(result).toMatch(hoistedInPlaceRegex)
  })

  it('should collapse the hd-bcve shape into one connected player', async () => {
    const value = html`<figure class="hd-bcve-wrapper is--youtube" data-id="yEB6Q3wTKcw"><img class="hd-bcve-thumbnail" src="https://img.youtube.com/vi/yEB6Q3wTKcw/maxresdefault.jpg"></figure><template id="hd-bcve-embed-html-yEB6Q3wTKcw"><figure class="wp-block-embed"><div class="wp-block-embed__wrapper"><iframe src="https://www.youtube.com/embed/yEB6Q3wTKcw?feature=oembed"></iframe></div></figure></template>`
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://moby.com',
      heuristics: true,
    })

    expect(result).not.toContain('<img')
    expect(result).not.toContain('<template')
    expect(result).toContain('data-embed-provider="youtube"')
    expect(result).toContain('data-embed-thumbnail')
  })
})
