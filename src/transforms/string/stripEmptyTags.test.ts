import { describe, expect, it } from 'bun:test'
import {
  defaultEmbedResolvers,
  defaultLazySrcAttributes,
  defaultLazySrcsetAttributes,
  defaultResolveUrlFn,
  defaultTrackingHosts,
  defaultTrackingPathSegments,
  defaultUrlUnwrappers,
} from '../../defaults.js'
import type { TransformContext } from '../../types.js'
import { stripEmptyTags } from './stripEmptyTags.js'

const context: TransformContext = {
  embedResolvers: defaultEmbedResolvers,
  lazySrcAttributes: defaultLazySrcAttributes,
  lazySrcsetAttributes: defaultLazySrcsetAttributes,
  trackingHosts: defaultTrackingHosts,
  trackingPathSegments: defaultTrackingPathSegments,
  urlUnwrappers: defaultUrlUnwrappers,
  resolveUrlFn: defaultResolveUrlFn,
}

describe('stripEmptyTags', () => {
  const strip = stripEmptyTags(context)

  it('should strip empty div', () => {
    expect(strip('<div></div>')).toBe('')
  })

  it('should strip empty paragraph', () => {
    expect(strip('<p></p>')).toBe('')
  })

  it('should strip empty span', () => {
    expect(strip('<span></span>')).toBe('')
  })

  it('should strip empty heading tags', () => {
    expect(strip('<h1></h1>')).toBe('')
    expect(strip('<h3></h3>')).toBe('')
  })

  it('should strip empty table elements', () => {
    expect(strip('<table></table>')).toBe('')
    expect(strip('<tr></tr>')).toBe('')
    expect(strip('<td></td>')).toBe('')
  })

  it('should replace whitespace-only tags with a space', () => {
    expect(strip('<div>   </div>')).toBe(' ')
  })

  it('should replace tags with only newlines with a space', () => {
    expect(strip('<div>\n</div>')).toBe(' ')
  })

  it('should replace tags containing non-breaking space with a space', () => {
    expect(strip('<span>\u00A0</span>')).toBe(' ')
  })

  it('should strip tags with attributes but no content', () => {
    expect(strip('<div class="wrapper"></div>')).toBe('')
  })

  it('should strip nested empty tags', () => {
    expect(strip('<div><p></p></div>')).toBe('')
  })

  it('should strip deeply nested empty tags', () => {
    expect(strip('<section><div><p></p></div></section>')).toBe('')
  })

  it('should strip multiple empty tags', () => {
    expect(strip('<div></div><p></p><span></span>')).toBe('')
  })

  it('should strip empty tags around content', () => {
    expect(strip('<div></div><p>Keep</p><div></div>')).toBe('<p>Keep</p>')
  })

  it('should preserve tags with text content', () => {
    expect(strip('<div>Hello</div>')).toBe('<div>Hello</div>')
  })

  it('should preserve tags with child elements', () => {
    expect(strip('<div><img src="x.jpg"></div>')).toBe('<div><img src="x.jpg"></div>')
  })

  it('should preserve paragraph with br', () => {
    expect(strip('<p><br /></p>')).toBe('<p><br /></p>')
  })

  it('should preserve paragraph with br and newline from autop', () => {
    expect(strip('<p><br />\n</p>')).toBe('<p><br />\n</p>')
  })

  it('should preserve self-closing tags', () => {
    expect(strip('<br />')).toBe('<br />')
    expect(strip('<hr />')).toBe('<hr />')
    expect(strip('<img src="x.jpg">')).toBe('<img src="x.jpg">')
  })

  it('should not strip tags containing &nbsp;', () => {
    expect(strip('<p>&nbsp;</p>')).toBe('<p>&nbsp;</p>')
  })

  it('should handle empty string', () => {
    expect(strip('')).toBe('')
  })

  it('should handle plain text without tags', () => {
    expect(strip('just text')).toBe('just text')
  })

  it('should handle Ghost CMS real-world scenario', () => {
    const value = '<div></div>\n<p>Article text with <strong>formatting</strong></p>'
    const expected = '\n<p>Article text with <strong>formatting</strong></p>'

    expect(strip(value)).toBe(expected)
  })

  it('should preserve empty iframe with src', () => {
    const value =
      '<iframe src="https://www.youtube-nocookie.com/embed/abc123" frameborder="0"></iframe>'

    expect(strip(value)).toBe(value)
  })

  it('should preserve empty video tag', () => {
    const value = '<video src="https://example.com/video.mp4" controls></video>'

    expect(strip(value)).toBe(value)
  })

  it('should preserve empty audio tag', () => {
    const value = '<audio src="https://example.com/audio.mp3" controls></audio>'

    expect(strip(value)).toBe(value)
  })

  it('should preserve empty source tag', () => {
    const value = '<source src="https://example.com/video.mp4" type="video/mp4"></source>'

    expect(strip(value)).toBe(value)
  })

  it('should preserve iframe while stripping empty div wrapper', () => {
    const value = '<div><iframe src="https://www.youtube-nocookie.com/embed/abc123"></iframe></div>'

    expect(strip(value)).toBe(value)
  })

  it('should strip empty div but preserve adjacent iframe', () => {
    const value = '<div></div><iframe src="https://example.com/embed"></iframe>'
    const expected = '<iframe src="https://example.com/embed"></iframe>'

    expect(strip(value)).toBe(expected)
  })

  it('should preserve embed placeholder with fallback link', () => {
    const value =
      '<div data-embed="iframe" data-embed-src="https://example.com/embed"><a href="https://example.com/embed">https://example.com/embed</a></div>'

    expect(strip(value)).toBe(value)
  })

  it('should strip empty sibling but preserve embed placeholder with fallback link', () => {
    const value =
      '<p></p><div data-embed="audio" data-embed-src="https://example.com/episode.mp3"><a href="https://example.com/episode.mp3">https://example.com/episode.mp3</a></div>'
    const expected =
      '<div data-embed="audio" data-embed-src="https://example.com/episode.mp3"><a href="https://example.com/episode.mp3">https://example.com/episode.mp3</a></div>'

    expect(strip(value)).toBe(expected)
  })
})
