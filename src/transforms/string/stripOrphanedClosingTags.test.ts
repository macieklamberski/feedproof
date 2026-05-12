import { describe, expect, it } from 'bun:test'
import {
  defaultEmbedResolvers,
  defaultLazySrcAttributes,
  defaultResolveUrlFn,
  defaultTrackingHosts,
  defaultTrackingPathSegments,
  defaultUrlUnwrappers,
} from '../../defaults.js'
import type { TransformContext } from '../../types.js'
import { stripOrphanedClosingTags } from './stripOrphanedClosingTags.js'

const context: TransformContext = {
  embedResolvers: defaultEmbedResolvers,
  lazySrcAttributes: defaultLazySrcAttributes,
  trackingHosts: defaultTrackingHosts,
  trackingPathSegments: defaultTrackingPathSegments,
  urlUnwrappers: defaultUrlUnwrappers,
  resolveUrlFn: defaultResolveUrlFn,
}

describe('stripOrphanedClosingTags', () => {
  const strip = stripOrphanedClosingTags(context)

  it('should strip orphaned </p> with no matching open', () => {
    expect(strip('</p>text')).toBe('text')
  })

  it('should keep matched </p>', () => {
    expect(strip('<p>text</p>')).toBe('<p>text</p>')
  })

  it('should strip only the orphaned closer when extra </p> follows', () => {
    expect(strip('<p>text</p></p>')).toBe('<p>text</p>')
  })

  it('should strip orphaned </p> inside table structure', () => {
    const value = '<table><tr></p><td>cell</td></tr></table>'
    const expected = '<table><tr><td>cell</td></tr></table>'

    expect(strip(value)).toBe(expected)
  })

  it('should strip orphaned heading closers', () => {
    expect(strip('</h1>text')).toBe('text')
    expect(strip('</h3>text')).toBe('text')
  })

  it('should not touch non-tracked tags', () => {
    expect(strip('text</div>')).toBe('text</div>')
    expect(strip('</span>text')).toBe('</span>text')
  })

  it('should handle multiple orphaned closers', () => {
    expect(strip('</p></p><p>text</p>')).toBe('<p>text</p>')
  })

  it('should preserve properly nested content', () => {
    const value = '<div><p>one</p><p>two</p></div>'

    expect(strip(value)).toBe(value)
  })

  it('should handle empty string', () => {
    expect(strip('')).toBe('')
  })

  it('should handle plain text without any tags', () => {
    expect(strip('hello world')).toBe('hello world')
  })
})
