import { describe, expect, it } from 'bun:test'
import { baseContext, html } from '../../tests.js'
import { stripOversizedBase64Sources } from './stripOversizedBase64Sources.js'

describe('stripOversizedBase64Sources', () => {
  const transform = stripOversizedBase64Sources(baseContext)

  it('should strip base64 src exceeding the threshold', async () => {
    const largeData = 'A'.repeat(60 * 1024)
    const value = `<img src="data:image/png;base64,${largeData}">`

    expect(await transform(value)).toBe('<img src="">')
  })

  it('should preserve base64 src under the threshold', async () => {
    const value = '<img src="data:image/png;base64,iVBOR=">'

    expect(await transform(value)).toBe(value)
  })

  // The size check spans the whole attribute match, `src="` through the closing
  // quote: 28 chars of overhead around the payload. A 51172-char payload makes
  // the match exactly 50 KiB (51200), which the strict `<` comparison strips.
  it('should strip a source whose match is exactly at the threshold', async () => {
    const largeData = 'A'.repeat(51172)
    const value = `<img src="data:image/png;base64,${largeData}">`

    expect(await transform(value)).toBe('<img src="">')
  })

  it('should preserve a source one character under the threshold', async () => {
    const largeData = 'A'.repeat(51171)
    const value = `<img src="data:image/png;base64,${largeData}">`

    expect(await transform(value)).toBe(value)
  })

  it('should strip oversized base64 srcset', async () => {
    const largeData = 'A'.repeat(60 * 1024)
    const value = `<source srcset="data:image/webp;base64,${largeData}">`

    expect(await transform(value)).toBe('<source srcset="">')
  })

  it('should strip oversized base64 poster', async () => {
    const largeData = 'A'.repeat(60 * 1024)
    const value = `<video poster="data:image/jpeg;base64,${largeData}">`

    expect(await transform(value)).toBe('<video poster="">')
  })

  it('should strip only oversized sources when mixed with small ones', async () => {
    const largeData = 'A'.repeat(60 * 1024)
    const value = html`
      <img src="data:image/png;base64,small=">
      <img src="data:image/png;base64,${largeData}">
    `
    const result = await transform(value)

    expect(result).toContain('data:image/png;base64,small=')
    expect(result).not.toContain(largeData)
  })

  it('should not modify regular url src attributes', async () => {
    const value = '<img src="https://example.com/image.png">'

    expect(await transform(value)).toBe(value)
  })

  it('should not modify data uris without base64 encoding', async () => {
    const value = '<img src="data:image/svg+xml,%3Csvg%3E%3C/svg%3E">'

    expect(await transform(value)).toBe(value)
  })

  it('should return html unchanged when no base64 present', async () => {
    const value = '<p>Hello world</p>'

    expect(await transform(value)).toBe(value)
  })

  it('should handle single-quoted attributes', async () => {
    const largeData = 'A'.repeat(60 * 1024)
    const value = `<img src='data:image/png;base64,${largeData}'>`

    expect(await transform(value)).toBe("<img src=''>")
  })

  // The attribute regex is case-sensitive, so an uppercase SRC= slips through
  // untouched. Pinned so making it case-insensitive must update this test deliberately.
  it('should leave an oversized payload behind an uppercase SRC= untouched', async () => {
    const largeData = 'A'.repeat(60 * 1024)
    const value = `<img SRC="data:image/png;base64,${largeData}">`

    expect(await transform(value)).toBe(value)
  })

  it('should handle empty input', async () => {
    expect(await transform('')).toBe('')
  })

  it('should be idempotent', async () => {
    const largeData = 'A'.repeat(60 * 1024)
    const value = `<img src="data:image/png;base64,${largeData}">`
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toBe(once)
  })
})
