import { describe, expect, it } from 'bun:test'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { mergeConsecutiveOneLinerPres } from './mergeConsecutiveOneLinerPres.js'
import { replacePreLineBreaks } from './replacePreLineBreaks.js'

describeForEachParser('mergeConsecutiveOneLinerPres', (parseHtml) => {
  const transform = (value: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(value), [mergeConsecutiveOneLinerPres(context)])
  }

  it('should merge consecutive single-line pre blocks', async () => {
    const value = html`
      <pre>line 1</pre>
      <pre>line 2</pre>
      <pre>line 3</pre>
    `
    const expected = '<pre>line 1\nline 2\nline 3</pre>'

    expect(await transform(value)).toBe(expected)
  })

  it('should merge pre>code lines into one block, keeping a single code', async () => {
    const value = html`
      <pre><code>line 1</code></pre>
      <pre><code>line 2</code></pre>
    `
    const expected = '<pre><code>line 1\nline 2</code></pre>'

    expect(await transform(value)).toBe(expected)
  })

  it('should keep inline markup inside a merged code line', async () => {
    const value = html`
      <pre><code>a <b>x</b></code></pre>
      <pre><code>b</code></pre>
    `
    const expected = '<pre><code>a <b>x</b>\nb</code></pre>'

    expect(await transform(value)).toBe(expected)
  })

  it('should strip trailing br tags from merged lines', async () => {
    const value = html`
      <pre>line 1<br></pre>
      <pre>line 2<br/></pre>
      <pre>line 3</pre>
    `
    const expected = '<pre>line 1\nline 2\nline 3</pre>'

    expect(await transform(value)).toBe(expected)
  })

  it('should ignore whitespace-only text nodes between pres', async () => {
    const value = '<pre>line 1</pre> \n <pre>line 2</pre>'
    const expected = '<pre>line 1\nline 2</pre> \n '

    expect(await transform(value)).toBe(expected)
  })

  it('should not merge if any pre is multi-line', async () => {
    const value = '<pre>line 1\nline 2</pre><pre>line 3</pre>'

    expect(await transform(value)).toBe(value)
  })

  it('should not merge if any pre has multi-line content after trimming', async () => {
    const value = '<pre>line 1\nline 2\n</pre><pre>line 3</pre>'

    expect(await transform(value)).toBe(value)
  })

  it('should not treat mid-content br as multi-line', async () => {
    const value = html`
      <pre>line 1<br>line 2</pre>
      <pre>line 3</pre>
    `
    const expected = '<pre>line 1<br>line 2\nline 3</pre>'

    expect(await transform(value)).toBe(expected)
  })

  it('should leave br for replacePreLineBreaks to clean up', async () => {
    const value = html`
      <pre>line 1<br>line 2</pre>
      <pre>line 3</pre>
    `
    const transforms = [mergeConsecutiveOneLinerPres, replacePreLineBreaks].map((fn) => {
      return fn(baseContext)
    })
    const expected = '<pre>line 1\nline 2\nline 3</pre>'

    expect(await applyDomTransforms(parseHtml(value), transforms)).toBe(expected)
  })

  it('should not merge a single pre block', async () => {
    const value = '<pre>only one</pre>'

    expect(await transform(value)).toBe(value)
  })

  it('should not merge pres separated by non-whitespace content', async () => {
    const value = html`
      <pre>first</pre>
      <p>separator</p>
      <pre>second</pre>
    `

    expect(await transform(value)).toBe(value)
  })

  it('should not merge pres separated by a comment node', async () => {
    const value = html`
      <pre>first</pre>
      <!-- note -->
      <pre>second</pre>
    `

    expect(await transform(value)).toBe(value)
  })

  it('should handle Medium-style code blocks', async () => {
    const value = html`
      <pre>- name: Upgrade packages<br></pre>
      <pre>  yum:</pre>
      <pre>    name: '*'</pre>
      <pre>    state: latest</pre>
    `
    const expected = "<pre>- name: Upgrade packages\n  yum:\n    name: '*'\n    state: latest</pre>"

    expect(await transform(value)).toBe(expected)
  })

  it('should merge multiple separate runs independently', async () => {
    const value = html`
      <pre>a</pre>
      <pre>b</pre>
      <p>gap</p>
      <pre>c</pre>
      <pre>d</pre>
    `
    const expected = '<pre>a\nb</pre><p>gap</p><pre>c\nd</pre>'

    expect(await transform(value)).toBe(expected)
  })

  it('should preserve surrounding content', async () => {
    const value = html`
      <p>before</p>
      <pre>a</pre>
      <pre>b</pre>
      <p>after</p>
    `
    const expected = '<p>before</p><pre>a\nb</pre><p>after</p>'

    expect(await transform(value)).toBe(expected)
  })

  it('should strip surrounding newlines but preserve spaces', async () => {
    const value = '<pre>\nline 1\n</pre><pre>\n  line 2\n</pre>'
    const expected = '<pre>line 1\n  line 2</pre>'

    expect(await transform(value)).toBe(expected)
  })

  describe('preservedPreClasses', () => {
    it('should skip a run where a pre has wp-block-verse', async () => {
      const value = html`
        <pre class="wp-block-verse">stanza 1</pre>
        <pre class="wp-block-verse">stanza 2</pre>
      `

      expect(await transform(value)).toBe(value)
    })

    it('should skip a run where a pre has wp-block-preformatted', async () => {
      const value = html`
        <pre class="wp-block-preformatted">Intro ____9</pre>
        <pre class="wp-block-preformatted">Chapter 1 ____23</pre>
      `

      expect(await transform(value)).toBe(value)
    })

    it('should skip when the preserved class is one of several tokens', async () => {
      const value = html`
        <pre class="wp-block-verse has-text-align-center">line 1</pre>
        <pre class="wp-block-verse has-text-align-center">line 2</pre>
      `

      expect(await transform(value)).toBe(value)
    })

    it('should skip when only one pre in the run carries the preserved class', async () => {
      const value = html`
        <pre>line 1</pre>
        <pre class="wp-block-verse">line 2</pre>
        <pre>line 3</pre>
      `

      expect(await transform(value)).toBe(value)
    })

    it('should still merge wp-block-code (not in the preserve list)', async () => {
      const value = html`
        <pre class="wp-block-code">SHOW GRANTS</pre>
        <pre class="wp-block-code">FOR user_or_role</pre>
      `
      const expected = '<pre class="wp-block-code">SHOW GRANTS\nFOR user_or_role</pre>'

      expect(await transform(value)).toBe(expected)
    })

    it('should still merge when neither pre carries any class', async () => {
      const value = html`
        <pre>line 1</pre>
        <pre>line 2</pre>
      `
      const expected = '<pre>line 1\nline 2</pre>'

      expect(await transform(value)).toBe(expected)
    })
  })

  it('should be idempotent', async () => {
    const value = html`
      <pre>line 1</pre>
      <pre>line 2</pre>
      <pre>line 3</pre>
    `
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toBe(once)
  })
})
