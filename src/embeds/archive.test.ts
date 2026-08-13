import { describe, expect, it } from 'bun:test'
import { transformContent } from '../index.js'
import { describeForEachParser, html } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import {
  archiveFlashEmbedResolver,
  archiveResolveEmbed,
  extractArchiveIdentifier,
} from './archive.js'

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

describeForEachParser('archiveFlashEmbedResolver', (parseHtml) => {
  const extract = (value: string): EmbedResolverResult | undefined => {
    const element = parseHtml(value).querySelector(archiveFlashEmbedResolver.selector)

    return element ? (archiveFlashEmbedResolver.extract(element) as EmbedResolverResult) : undefined
  }

  describe('happy paths', () => {
    it('should read the identifier from a playlist url', () => {
      const value = html`
        <embed
          type="application/x-shockwave-flash"
          src="http://www.archive.org/flow/flowplayer.commercial-3.0.3.swf"
          flashvars='config={"key":"#$b6eb72a0f2f1e29f3d4","playlist":[{"url":"http://www.archive.org/download/TheGoodOldGasMask/TheGoodOldGasMask_512kb.mp4","autoPlay":false}]}'
        />
      `
      const expected: EmbedResolverResult = {
        provider: 'archive',
        id: 'TheGoodOldGasMask',
        src: 'https://archive.org/embed/TheGoodOldGasMask',
        url: 'https://archive.org/details/TheGoodOldGasMask',
        thumbnail: 'https://archive.org/services/img/TheGoodOldGasMask',
      }

      expect(extract(value)).toEqual(expected)
    })

    // The audio player names the file on its own and puts the item on the clip instead.
    it('should read the identifier from the clip base url', () => {
      const value = html`
        <embed
          type="application/x-shockwave-flash"
          src="http://www.archive.org/flow/flowplayer.commercial-3.2.1.swf"
          flashvars="config={'playlist':[{'url':'EndCameTooSoon-Mixtape.mp3'}],'clip':{'baseUrl':'http://www.archive.org/download/EndCameTooSoon/'}}"
        />
      `

      expect(extract(value)).toMatchObject({
        id: 'EndCameTooSoon',
      })
    })

    it('should read the config from a sibling param', () => {
      const value = html`
        <object width="640" height="504">
          <param
            name="flashvars"
            value='config={"playlist":[{"url":"http://www.archive.org/download/BlackSummerPodcast/podcast.mp3"}]}'
          />
          <embed src="http://www.archive.org/flow/flowplayer.commercial-3.2.1.swf" />
        </object>
      `
      const element = parseHtml(value).querySelector('embed')
      const result = element
        ? (archiveFlashEmbedResolver.extract(element) as EmbedResolverResult)
        : undefined

      expect(result).toMatchObject({
        id: 'BlackSummerPodcast',
      })
    })

    // The player that predates flashvars took the same config as a query parameter.
    it('should read the config from the player query', () => {
      const value = html`
        <embed
          src="http://www.archive.org/flow/FlowPlayerLight.swf?config=%7BplayList%3A%5B%7Burl%3A%27http%3A%2F%2Fwww.archive.org%2Fdownload%2Fmarkofzorro-1920%2Fmarkofzorro.flv%27%7D%5D%7D"
        />
      `

      expect(extract(value)).toMatchObject({
        id: 'markofzorro-1920',
      })
    })
  })

  describe('sad paths', () => {
    // The archive's player will play anybody's file, and somebody else's file is not an item.
    it('should ignore a config pointing at a file the archive does not host', () => {
      const value = html`
        <embed
          src="http://www.archive.org/flow/FlowPlayerLight.swf?config=%7BplayList%3A%5B%7Burl%3A%27http%3A%2F%2Ftrailers.labutaca.net%2Fplanet-51-clip-4.flv%27%7D%5D%7D"
        />
      `

      expect(extract(value)).toBeUndefined()
    })

    it('should ignore a player on another host that names an archive file', () => {
      const value = html`
        <embed
          src="http://evil.test/flow/flowplayer.commercial-3.2.1.swf"
          flashvars='config={"playlist":[{"url":"http://www.archive.org/download/nasa_hubble/clip.mp4"}]}'
        />
      `

      expect(extract(value)).toBeUndefined()
    })

    it('should ignore an archive url that is not the flash player', () => {
      const value = '<embed src="https://archive.org/embed/nasa_hubble">'

      expect(extract(value)).toBeUndefined()
    })

    it('should ignore a player carrying no config', () => {
      const value = '<embed src="http://www.archive.org/flow/flowplayer.commercial-3.2.1.swf">'

      expect(extract(value)).toBeUndefined()
    })

    // A base url on its own names the download endpoint rather than any item under it.
    it('should ignore a config whose only download url names no item', () => {
      const value = html`
        <embed
          src="http://www.archive.org/flow/FlowPlayerLight.swf"
          flashvars="config={'baseURL':'http://www.archive.org/download/'}"
        />
      `

      expect(extract(value)).toBeUndefined()
    })
  })
})

// Without the resolver the pipeline reads the swf as the destination, so the placeholder points
// at the dead player and names no item. This is the whole of what the change buys.
describeForEachParser('archive flash embed through the pipeline', (parseHtml) => {
  it('should become a placeholder naming the item rather than the player', async () => {
    const value = html`
      <object width="640" height="504">
        <param name="movie" value="http://www.archive.org/flow/flowplayer.commercial-3.0.3.swf" />
        <embed
          type="application/x-shockwave-flash"
          width="640"
          height="504"
          src="http://www.archive.org/flow/flowplayer.commercial-3.0.3.swf"
          flashvars='config={"playlist":[{"url":"http://www.archive.org/download/nasa_hubble/nasa_hubble_512kb.mp4"}]}'
        />
      </object>
    `
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com/post',
    })

    expect(result).toContain('data-embed-provider="archive"')
    expect(result).toContain('data-embed-id="nasa_hubble"')
    expect(result).toContain('data-embed-src="https://archive.org/embed/nasa_hubble"')
    expect(result).toContain('data-embed-thumbnail="https://archive.org/services/img/nasa_hubble"')
    expect(result).not.toContain('flowplayer')
  })
})
