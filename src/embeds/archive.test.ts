import { describe, expect, it } from 'bun:test'
import { archiveResolveEmbed, extractArchiveIdentifier } from './archive.js'

describe('extractArchiveIdentifier', () => {
  it('should read the identifier from an embed url', () => {
    expect(extractArchiveIdentifier('https://archive.org/embed/gov.archives.arc.1257628')).toBe(
      'gov.archives.arc.1257628',
    )
  })

  // The details page is the same item by the same name.
  it('should read the identifier from a details url', () => {
    expect(extractArchiveIdentifier('https://archive.org/details/nasa_hubble')).toBe('nasa_hubble')
  })

  it('should return undefined for an archive url naming no item', () => {
    expect(extractArchiveIdentifier('https://archive.org/about')).toBeUndefined()
  })

  it('should return undefined for an identifier that is not the documented shape', () => {
    expect(extractArchiveIdentifier('https://archive.org/embed/../../etc')).toBeUndefined()
  })

  it('should return undefined for a url that cannot be parsed', () => {
    expect(extractArchiveIdentifier('https://[')).toBeUndefined()
  })
})

describe('archiveResolveEmbed', () => {
  describe('happy paths', () => {
    // Every item has a thumbnail derivable from the identifier, which is the whole case here.
    it('should carry the poster and the item page', () => {
      expect(archiveResolveEmbed('https://archive.org/embed/gov.archives.arc.1257628')).toEqual({
        provider: 'archive',
        id: 'gov.archives.arc.1257628',
        src: 'https://archive.org/embed/gov.archives.arc.1257628',
        url: 'https://archive.org/details/gov.archives.arc.1257628',
        thumbnail: 'https://archive.org/services/img/gov.archives.arc.1257628',
      })
    })

    // The query says which track or offset the publisher embedded.
    it('should keep the query the publisher wrote', () => {
      const value = 'https://archive.org/embed/some_album?playlist=1&start=42'

      expect(archiveResolveEmbed(value)).toMatchObject({
        src: 'https://archive.org/embed/some_album?playlist=1&start=42',
      })
    })

    it('should mint the embed url from a details url', () => {
      expect(archiveResolveEmbed('https://archive.org/details/nasa_hubble')).toMatchObject({
        src: 'https://archive.org/embed/nasa_hubble',
      })
    })
  })

  describe('sad paths', () => {
    it('should return undefined for an archive url naming no item', () => {
      expect(archiveResolveEmbed('https://archive.org/about')).toBeUndefined()
    })

    it('should return undefined for a url that cannot be parsed', () => {
      expect(archiveResolveEmbed('https://[')).toBeUndefined()
    })
  })
})
