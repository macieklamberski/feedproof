import { describe, expect, it } from 'bun:test'
import { applyDomTransforms } from '../../common.js'
import { baseContext, describeForEachParser } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { markTimestamps, parseTimestampSeconds } from './markTimestamps.js'

describe('parseTimestampSeconds', () => {
  it('should parse MM:SS into seconds', () => {
    expect(parseTimestampSeconds('00:00')).toBe(0)
    expect(parseTimestampSeconds('01:21')).toBe(81)
    expect(parseTimestampSeconds('14:00')).toBe(840)
  })

  it('should parse HH:MM:SS into seconds', () => {
    expect(parseTimestampSeconds('1:14:30')).toBe(4470)
    expect(parseTimestampSeconds('01:00:00')).toBe(3600)
  })

  it('should allow minutes above 59 in the MM:SS form', () => {
    expect(parseTimestampSeconds('90:00')).toBe(5400)
  })

  it('should parse parts with leading zeros as decimal', () => {
    expect(parseTimestampSeconds('08:09')).toBe(489)
  })

  it('should reject seconds out of range', () => {
    expect(parseTimestampSeconds('12:99')).toBeUndefined()
    expect(parseTimestampSeconds('1:14:99')).toBeUndefined()
  })

  it('should reject minutes out of range in the HH:MM:SS form', () => {
    expect(parseTimestampSeconds('1:99:30')).toBeUndefined()
  })

  it('should reject non-numeric parts', () => {
    expect(parseTimestampSeconds('ab:cd')).toBeUndefined()
    expect(parseTimestampSeconds('1:2x:30')).toBeUndefined()
  })

  it('should reject the wrong number of parts', () => {
    expect(parseTimestampSeconds('12')).toBeUndefined()
    expect(parseTimestampSeconds('1:2:3:4')).toBeUndefined()
  })

  it('should reject empty parts', () => {
    expect(parseTimestampSeconds('')).toBeUndefined()
    expect(parseTimestampSeconds(':30')).toBeUndefined()
    expect(parseTimestampSeconds('1:')).toBeUndefined()
    expect(parseTimestampSeconds('1::2')).toBeUndefined()
  })
})

describeForEachParser('markTimestamps', (parseHtml) => {
  const transform = (html: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(html), [markTimestamps(context)])
  }

  it('should wrap a line-leading MM:SS timestamp', async () => {
    const value = '<p>01:21 - Intro</p>'
    const result = await transform(value)

    expect(result).toContain('<span data-timestamp="81">01:21</span>')
    expect(result).toContain(' - Intro')
  })

  it('should wrap a line-leading HH:MM:SS timestamp', async () => {
    const value = '<p>1:14:30 - Deep dive</p>'
    const result = await transform(value)

    expect(result).toContain('<span data-timestamp="4470">1:14:30</span>')
  })

  it('should compute seconds from minutes and seconds', async () => {
    const value = '<p>14:00 - Chapter</p>'
    const result = await transform(value)

    expect(result).toContain('data-timestamp="840"')
  })

  it('should wrap timestamps on br-split lines', async () => {
    const value = '<p>00:00 - A<br>01:21 - B</p>'
    const result = await transform(value)

    expect(result.match(/data-timestamp/g)).toHaveLength(2)
    expect(result).toContain('data-timestamp="0"')
    expect(result).toContain('data-timestamp="81"')
  })

  it('should wrap timestamps on newline-split lines within one text node', async () => {
    const value = '<p>00:00 - A\n10:48 - B</p>'
    const result = await transform(value)

    expect(result.match(/data-timestamp/g)).toHaveLength(2)
    expect(result).toContain('data-timestamp="648"')
  })

  it('should match a timestamp after leading whitespace', async () => {
    const value = '<p>  00:00 - Intro</p>'
    const result = await transform(value)

    expect(result).toContain('data-timestamp="0"')
  })

  it('should wrap a line-ending MM:SS timestamp', async () => {
    const value = '<p>Intro – 0:00</p>'
    const result = await transform(value)

    expect(result).toContain('<span data-timestamp="0">0:00</span>')
    expect(result).toContain('Intro – ')
  })

  it('should wrap a line-ending HH:MM:SS timestamp', async () => {
    const value = '<p>Deep dive – 1:14:30</p>'
    const result = await transform(value)

    expect(result).toContain('<span data-timestamp="4470">1:14:30</span>')
  })

  it('should wrap line-ending timestamps on br-split lines', async () => {
    const value = '<p>Intro – 0:00<br>Outro – 2:48</p>'
    const result = await transform(value)

    expect(result.match(/data-timestamp/g)).toHaveLength(2)
    expect(result).toContain('data-timestamp="0"')
    expect(result).toContain('data-timestamp="168"')
  })

  it('should wrap line-ending timestamps on newline-split lines within one text node', async () => {
    const value = '<p>Intro – 0:00\nOutro – 11:23</p>'
    const result = await transform(value)

    expect(result.match(/data-timestamp/g)).toHaveLength(2)
    expect(result).toContain('data-timestamp="683"')
  })

  it('should wrap a line-ending timestamp without a separator', async () => {
    const value = '<p>Final Thoughts 11:23</p>'
    const result = await transform(value)

    expect(result).toContain('data-timestamp="683"')
  })

  it('should keep trailing whitespace outside the span', async () => {
    const value = '<p>Intro – 0:00 \nOutro – 0:24</p>'
    const result = await transform(value)

    expect(result.match(/data-timestamp/g)).toHaveLength(2)
    expect(result).toContain('<span data-timestamp="0">0:00</span>')
  })

  it('should wrap both leading and trailing timestamps on one line', async () => {
    const value = '<p>0:00 - 2:48</p>'
    const result = await transform(value)

    expect(result.match(/data-timestamp/g)).toHaveLength(2)
    expect(result).toContain('data-timestamp="0"')
    expect(result).toContain('data-timestamp="168"')
  })

  it('should not wrap a timestamp in the middle of a line', async () => {
    const value = '<p>We met at 12:30 today</p>'
    const result = await transform(value)

    expect(result).not.toContain('data-timestamp')
  })

  it('should not wrap an out-of-range seconds value', async () => {
    const value = '<p>12:99 - nope</p>'
    const result = await transform(value)

    expect(result).not.toContain('data-timestamp')
  })

  it('should not wrap an out-of-range minutes value in HH:MM:SS', async () => {
    const value = '<p>1:99:30 - nope</p>'
    const result = await transform(value)

    expect(result).not.toContain('data-timestamp')
  })

  for (const tag of ['a', 'pre', 'code', 'kbd', 'samp', 'var']) {
    it(`should not wrap a timestamp inside ${tag} tag`, async () => {
      const value = `<${tag}>00:00 - Intro</${tag}>`
      const result = await transform(value)

      expect(result).not.toContain('data-timestamp')
    })
  }

  it('should not modify content without timestamps', async () => {
    const value = '<p>No times here</p>'
    const result = await transform(value)

    expect(result).toContain('<p>No times here</p>')
    expect(result).not.toContain('data-timestamp')
  })

  it('should not double-wrap on a repeated run', async () => {
    const value = '<p>01:21 - Intro</p>'
    const result = await applyDomTransforms(parseHtml(value), [
      markTimestamps(baseContext),
      markTimestamps(baseContext),
    ])

    expect(result.match(/data-timestamp/g)).toHaveLength(1)
  })

  it('should be idempotent', async () => {
    const value = '<p>01:21 - Intro</p>'
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toBe(once)
  })

  it('should be idempotent for line-ending timestamps', async () => {
    const value = '<p>Intro – 0:00</p>'
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toBe(once)
  })
})
