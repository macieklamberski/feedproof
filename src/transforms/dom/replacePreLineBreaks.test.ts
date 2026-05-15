import { describe, expect, it } from 'bun:test'
import { transformHtml } from '../../common.js'
import {
  defaultEmbedResolvers,
  defaultLazySrcAttributes,
  defaultResolveUrlFn,
  defaultTrackingHosts,
  defaultTrackingPathSegments,
  defaultUrlUnwrappers,
} from '../../defaults.js'
import type { TransformContext } from '../../types.js'
import { replacePreLineBreaks } from './replacePreLineBreaks.js'

const context: TransformContext = {
  embedResolvers: defaultEmbedResolvers,
  lazySrcAttributes: defaultLazySrcAttributes,
  trackingHosts: defaultTrackingHosts,
  trackingPathSegments: defaultTrackingPathSegments,
  urlUnwrappers: defaultUrlUnwrappers,
  resolveUrlFn: defaultResolveUrlFn,
}

describe('replacePreLineBreaks', () => {
  const transform = (html: string) => {
    return transformHtml(html, replacePreLineBreaks(context))
  }

  it('should replace br with newline inside pre', async () => {
    const result = await transform('<pre>line 1<br>line 2</pre>')

    expect(result).toContain('<pre>line 1\nline 2</pre>')
  })

  it('should replace self-closing br', async () => {
    const result = await transform('<pre>line 1<br/>line 2</pre>')

    expect(result).toContain('<pre>line 1\nline 2</pre>')
  })

  it('should replace br with space before slash', async () => {
    const result = await transform('<pre>line 1<br />line 2</pre>')

    expect(result).toContain('<pre>line 1\nline 2</pre>')
  })

  it('should replace multiple br tags', async () => {
    const result = await transform('<pre>a<br>b<br>c</pre>')

    expect(result).toContain('<pre>a\nb\nc</pre>')
  })

  it('should target code inside pre', async () => {
    const result = await transform('<pre><code>a<br>b</code></pre>')

    expect(result).toContain('<code>a\nb</code>')
  })

  it('should not affect br outside pre', async () => {
    const result = await transform('<p>line 1<br>line 2</p>')

    expect(result).toContain('<br>')
  })
})
