import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html } from '../tests.js'
import { applyDomTransforms, applyStringTransforms } from './transforms.js'

describeForEachParser('applyDomTransforms', (parseHtml) => {
  it('should return body innerHTML when given no transforms', async () => {
    const document = parseHtml('<p>Hello</p>')

    expect(await applyDomTransforms(document, [])).toBe('<p>Hello</p>')
  })

  it('should run each transform against the document in order', async () => {
    const document = parseHtml('<p>Hello</p>')
    const transforms = [
      (doc: Document) => {
        doc.querySelector('p')?.setAttribute('data-step', '1')
      },
      (doc: Document) => {
        doc.querySelector('p')?.setAttribute('data-step', '2')
      },
    ]

    expect(await applyDomTransforms(document, transforms)).toBe('<p data-step="2">Hello</p>')
  })

  it('should support async transforms', async () => {
    const document = parseHtml('<p>Hello</p>')
    const transforms = [
      async (doc: Document) => {
        await Promise.resolve()
        doc.querySelector('p')?.setAttribute('data-async', 'yes')
      },
    ]

    expect(await applyDomTransforms(document, transforms)).toBe('<p data-async="yes">Hello</p>')
  })

  it.todo('should propagate an error thrown by a transform', () => {
    // A transform that throws should reject the applyDomTransforms promise and
    // prevent later transforms in the array from running.
  })
})

describe('applyStringTransforms', () => {
  it('should return the input unchanged when given no transforms', async () => {
    expect(await applyStringTransforms('<p>Hello</p>', [])).toBe('<p>Hello</p>')
  })

  it('should pipe the output of each transform into the next in order', async () => {
    const transforms = [
      (html: string) => `${html}<p>first</p>`,
      async (html: string) => `${html}<p>second</p>`,
    ]
    const expected = html`
      <p>Hello</p>
      <p>first</p>
      <p>second</p>
    `

    expect(await applyStringTransforms('<p>Hello</p>', transforms)).toBe(expected)
  })
})
