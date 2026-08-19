import { expect, it } from 'bun:test'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { stripDuplicateRules } from './stripDuplicateRules.js'

describeForEachParser('stripDuplicateRules', (parseHtml) => {
  const transform = (value: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(value), [stripDuplicateRules(context)])
  }

  it('should collapse two adjacent rules into one', async () => {
    const value = '<p>First</p><hr><hr><p>Second</p>'
    const expected = '<p>First</p><hr><p>Second</p>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should collapse a longer run into one', async () => {
    const value = '<p>First</p><hr><hr><hr><hr><p>Second</p>'
    const expected = '<p>First</p><hr><p>Second</p>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should collapse rules separated by whitespace', async () => {
    const value = html`
      <p>First</p>
      <hr>
      <hr>
      <p>Second</p>
    `
    const expected = html`
      <p>First</p>
      <hr>
      <p>Second</p>
    `

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should collapse rules separated by a comment', async () => {
    const value = '<hr><!-- divider --><hr>'
    const expected = '<hr><!-- divider -->'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should keep the first rule with its attributes', async () => {
    const value = '<hr class="first"><hr class="second">'
    const expected = '<hr class="first">'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should keep rules separated by content', async () => {
    const value = '<hr><p>Between</p><hr>'

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should keep rules separated by a break', async () => {
    const value = '<hr><br><hr>'

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should keep rules that are not siblings', async () => {
    const value = '<div><hr></div><div><hr></div>'

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should keep a lone rule', async () => {
    const value = '<p>First</p><hr><p>Second</p>'

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should collapse runs inside a nested container', async () => {
    const value = '<blockquote><hr><hr></blockquote>'
    const expected = '<blockquote><hr></blockquote>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should be idempotent', async () => {
    const value = '<p>First</p><hr><hr><hr><p>Second</p>'
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toEqualHtml(once)
  })
})
