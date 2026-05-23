import { describe, expect, it } from 'bun:test'
import { applyDomTransforms } from '../../common.js'
import { parseHtml } from '../../parsers/linkedom.js'
import { baseContext } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { mergeConsecutiveOneLinerPres } from './mergeConsecutiveOneLinerPres.js'
import { replacePreLineBreaks } from './replacePreLineBreaks.js'

describe('mergeConsecutiveOneLinerPres', () => {
  const transform = (html: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(html), [mergeConsecutiveOneLinerPres(context)])
  }

  it('should merge consecutive single-line pre blocks', async () => {
    const value = '<pre>line 1</pre><pre>line 2</pre><pre>line 3</pre>'
    const result = await transform(value)

    expect(result).toContain('<pre>line 1\nline 2\nline 3</pre>')
  })

  it('should strip trailing br tags from merged lines', async () => {
    const value = '<pre>line 1<br></pre><pre>line 2<br/></pre><pre>line 3</pre>'
    const result = await transform(value)

    expect(result).toContain('<pre>line 1\nline 2\nline 3</pre>')
  })

  it('should ignore whitespace-only text nodes between pres', async () => {
    const value = '<pre>line 1</pre> \n <pre>line 2</pre>'
    const result = await transform(value)

    expect(result).toContain('<pre>line 1\nline 2</pre>')
  })

  it('should not merge if any pre is multi-line', async () => {
    const value = '<pre>line 1\nline 2</pre><pre>line 3</pre>'
    const result = await transform(value)

    expect(result).toContain('<pre>line 1\nline 2</pre>')
    expect(result).toContain('<pre>line 3</pre>')
  })

  it('should not merge if any pre has multi-line content after trimming', async () => {
    const value = '<pre>line 1\nline 2\n</pre><pre>line 3</pre>'
    const result = await transform(value)

    expect(result).toContain('<pre>line 1\nline 2\n</pre>')
    expect(result).toContain('<pre>line 3</pre>')
  })

  it('should not treat mid-content br as multi-line', async () => {
    const value = '<pre>line 1<br>line 2</pre><pre>line 3</pre>'
    const result = await transform(value)

    expect(result).toContain('<pre>line 1<br>line 2\nline 3</pre>')
  })

  it('should leave br for replacePreLineBreaks to clean up', async () => {
    const value = '<pre>line 1<br>line 2</pre><pre>line 3</pre>'
    const transforms = [mergeConsecutiveOneLinerPres, replacePreLineBreaks].map((fn) => {
      return fn(baseContext)
    })
    const result = await applyDomTransforms(parseHtml(value), transforms)

    expect(result).toContain('<pre>line 1\nline 2\nline 3</pre>')
  })

  it('should not merge a single pre block', async () => {
    const value = '<pre>only one</pre>'
    const result = await transform(value)

    expect(result).toContain('<pre>only one</pre>')
  })

  it('should not merge pres separated by non-whitespace content', async () => {
    const value = '<pre>first</pre><p>separator</p><pre>second</pre>'
    const result = await transform(value)

    expect(result).toContain('<pre>first</pre>')
    expect(result).toContain('<pre>second</pre>')
  })

  it('should handle Medium-style code blocks', async () => {
    const value =
      "<pre>- name: Upgrade packages<br></pre><pre>  yum:</pre><pre>    name: '*'</pre><pre>    state: latest</pre>"
    const result = await transform(value)

    expect(result).toContain(
      "<pre>- name: Upgrade packages\n  yum:\n    name: '*'\n    state: latest</pre>",
    )
  })

  it('should merge multiple separate runs independently', async () => {
    const value = '<pre>a</pre><pre>b</pre><p>gap</p><pre>c</pre><pre>d</pre>'
    const result = await transform(value)

    expect(result).toContain('<pre>a\nb</pre>')
    expect(result).toContain('<pre>c\nd</pre>')
  })

  it('should preserve surrounding content', async () => {
    const value = '<p>before</p><pre>a</pre><pre>b</pre><p>after</p>'
    const result = await transform(value)

    expect(result).toContain('<p>before</p>')
    expect(result).toContain('<pre>a\nb</pre>')
    expect(result).toContain('<p>after</p>')
  })

  it('should strip surrounding newlines but preserve spaces', async () => {
    const value = '<pre>\nline 1\n</pre><pre>\n  line 2\n</pre>'
    const result = await transform(value)

    expect(result).toContain('<pre>line 1\n  line 2</pre>')
  })
})
