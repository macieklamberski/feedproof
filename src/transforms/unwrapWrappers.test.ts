import { describe, expect, it } from 'bun:test'
import type { TransformContext } from '../types.js'
import { unwrapWrappers } from './unwrapWrappers.js'

const context: TransformContext = {}

describe('unwrapWrappers', () => {
  const unwrap = unwrapWrappers(context)

  it('should unwrap a single bare div wrapper', () => {
    const result = unwrap('<div><p>Content</p></div>')

    expect(result).toContain('<p>Content</p>')
    expect(result).not.toContain('<div>')
  })

  it('should unwrap nested bare wrappers', () => {
    const result = unwrap('<div><article><p>Content</p></article></div>')

    expect(result).toContain('<p>Content</p>')
    expect(result).not.toContain('<div>')
    expect(result).not.toContain('<article>')
  })

  it('should unwrap section and main wrappers', () => {
    const result = unwrap('<section><main><p>Content</p></main></section>')

    expect(result).toContain('<p>Content</p>')
    expect(result).not.toContain('<section>')
    expect(result).not.toContain('<main>')
  })

  it('should unwrap wrapper with attributes', () => {
    const result = unwrap('<div class="content"><p>Content</p></div>')

    expect(result).toContain('<p>Content</p>')
    expect(result).not.toContain('<div')
  })

  it('should unwrap wrapper with multiple attributes', () => {
    const result = unwrap('<div class="page" id="readability-page-1"><p>Content</p></div>')

    expect(result).toContain('<p>Content</p>')
    expect(result).not.toContain('<div')
  })

  it('should preserve wrapper with siblings', () => {
    const result = unwrap('<div><p>First</p></div><div><p>Second</p></div>')

    expect(result).toContain('<div>')
  })

  it('should not unwrap non-wrapper tags', () => {
    const result = unwrap('<p>Content</p>')

    expect(result).toContain('<p>Content</p>')
  })

  it('should unwrap nested wrappers with attributes', () => {
    const result = unwrap('<div><div id="root"><p>Content</p></div></div>')

    expect(result).toContain('<p>Content</p>')
    expect(result).not.toContain('<div')
  })
})
