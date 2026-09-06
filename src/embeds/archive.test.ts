import { describe, expect, it } from 'bun:test'
import { transformContent } from '../index.js'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import {
  archiveFlashEmbedResolver,
  archiveResolveEmbed,
  extractArchiveIdentifier,
} from './archive.js'

describe('extractArchiveIdentifier', () => {
  it('should read the identifier from an embed url', () => {
    const value = 'https://archive.org/embed/gov.archives.arc.1257628'
    const expected = 'gov.archives.arc.1257628'

    expect(extractArchiveIdentifier(value)).toBe(expected)
  })

  // The details page is the same item by the same name.
  it('should read the identifier from a details url', () => {
    const value = 'https://archive.org/details/nasa_hubble'
    const expected = 'nasa_hubble'

    expect(extractArchiveIdentifier(value)).toBe(expected)
  })

  it('should return undefined for an archive url naming no item', () => {
    const value = 'https://archive.org/about'

    expect(extractArchiveIdentifier(value)).toBeUndefined()
  })

  it('should return undefined for an identifier that is not the documented shape', () => {
    const value = 'https://archive.org/embed/../../etc'

    expect(extractArchiveIdentifier(value)).toBeUndefined()
  })

  it('should return undefined for a url that cannot be parsed', () => {
    const value = 'https://['

    expect(extractArchiveIdentifier(value)).toBeUndefined()
  })
})

describe('archiveResolveEmbed', () => {
  describe('happy paths', () => {
    // Every item has a thumbnail derivable from the identifier, which is the whole case here.
    it('should carry the poster and the item page', () => {
      const value = 'https://archive.org/embed/gov.archives.arc.1257628'
      const expected: EmbedResolverResult = {
        provider: 'archive',
        id: 'gov.archives.arc.1257628',
        src: 'https://archive.org/embed/gov.archives.arc.1257628',
        url: 'https://archive.org/details/gov.archives.arc.1257628',
        thumbnail: 'https://archive.org/services/img/gov.archives.arc.1257628',
      }

      expect(archiveResolveEmbed(value)).toEqual(expected)
    })

    // The query says which track or offset the publisher embedded.
    it('should keep the query the publisher wrote', () => {
      const value = 'https://archive.org/embed/some_album?playlist=1&start=42'
      const expected: EmbedResolverResult = {
        provider: 'archive',
        id: 'some_album',
        src: 'https://archive.org/embed/some_album?playlist=1&start=42',
        url: 'https://archive.org/details/some_album',
        thumbnail: 'https://archive.org/services/img/some_album',
      }

      expect(archiveResolveEmbed(value)).toEqual(expected)
    })

    // Publishers spelled the query with a leading ampersand, and that url answers 404 today
    // while the `?` spelling answers 200.
    it('should repair a query the ampersand form stranded in the path', () => {
      const value = 'https://archive.org/embed/some_album&playlist=1'
      const expected: EmbedResolverResult = {
        provider: 'archive',
        id: 'some_album',
        src: 'https://archive.org/embed/some_album?playlist=1',
        url: 'https://archive.org/details/some_album',
        thumbnail: 'https://archive.org/services/img/some_album',
      }

      expect(archiveResolveEmbed(value)).toEqual(expected)
    })

    it('should keep every stranded parameter, not just the first', () => {
      const value = 'https://archive.org/embed/some_album&playlist=1&autoplay=1'
      const expected: EmbedResolverResult = {
        provider: 'archive',
        id: 'some_album',
        src: 'https://archive.org/embed/some_album?playlist=1&autoplay=1',
        url: 'https://archive.org/details/some_album',
        thumbnail: 'https://archive.org/services/img/some_album',
      }

      expect(archiveResolveEmbed(value)).toEqual(expected)
    })

    it('should mint the embed url from a details url', () => {
      const value = 'https://archive.org/details/nasa_hubble'
      const expected: EmbedResolverResult = {
        provider: 'archive',
        id: 'nasa_hubble',
        src: 'https://archive.org/embed/nasa_hubble',
        url: 'https://archive.org/details/nasa_hubble',
        thumbnail: 'https://archive.org/services/img/nasa_hubble',
      }

      expect(archiveResolveEmbed(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should return undefined for an archive url naming no item', () => {
      const value = 'https://archive.org/about'

      expect(archiveResolveEmbed(value)).toBeUndefined()
    })

    it('should return undefined for a url that cannot be parsed', () => {
      const value = 'https://['

      expect(archiveResolveEmbed(value)).toBeUndefined()
    })
  })
})

describeForEachParser('archiveFlashEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, archiveFlashEmbedResolver)

  describe('happy paths', () => {
    it('should read the identifier from a playlist url', async () => {
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

      expect(await extract(value)).toEqual(expected)
    })

    // The audio player names the file on its own and puts the item on the clip instead. An
    // audio item takes the modern bar's height, since the bar the carrier was sized for is gone.
    it('should read the identifier from the clip base url', async () => {
      const value = html`
        <embed
          type="application/x-shockwave-flash"
          src="http://www.archive.org/flow/flowplayer.commercial-3.2.1.swf"
          flashvars="config={'playlist':[{'url':'EndCameTooSoon-Mixtape.mp3'}],'clip':{'baseUrl':'http://www.archive.org/download/EndCameTooSoon/'}}"
        />
      `
      const expected: EmbedResolverResult = {
        provider: 'archive',
        id: 'EndCameTooSoon',
        src: 'https://archive.org/embed/EndCameTooSoon',
        url: 'https://archive.org/details/EndCameTooSoon',
        thumbnail: 'https://archive.org/services/img/EndCameTooSoon',
        height: 30,
      }

      expect(await extract(value)).toEqual(expected)
    })

    // The carrier states the 26 pixels of the Flash bar, and the modern bar measures 30, so the
    // resolver's height wins over it. The width is the carrier's business either way.
    it('should replace the audio bar height with the modern player height', async () => {
      const value = html`
        <embed
          type="application/x-shockwave-flash"
          src="https://www.archive.org/flow/flowplayer.commercial-3.2.1.swf"
          flashvars="config={'playlist':[{'url':'EndCameTooSoon-Mixtape.mp3','autoPlay':false}],'clip':{'autoPlay':true,'baseUrl':'https://www.archive.org/download/EndCameTooSoon/'},'plugins':{'audio':{'url':'https://www.archive.org/flow/flowplayer.audio-3.2.1-dev.swf'}}}"
          width="640"
          height="26"
        />
      `
      const expected: EmbedResolverResult = {
        provider: 'archive',
        id: 'EndCameTooSoon',
        src: 'https://archive.org/embed/EndCameTooSoon',
        url: 'https://archive.org/details/EndCameTooSoon',
        thumbnail: 'https://archive.org/services/img/EndCameTooSoon',
        height: 30,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should keep the declared size for a video item', async () => {
      const value = html`
        <embed
          type="application/x-shockwave-flash"
          src="http://www.archive.org/flow/flowplayer.commercial-3.0.3.swf"
          flashvars='config={"playlist":[{"url":"http://www.archive.org/download/TheGoodOldGasMask/TheGoodOldGasMask_512kb.mp4"}]}'
          width="640"
          height="504"
        />
      `
      const expected: EmbedResolverResult = {
        provider: 'archive',
        id: 'TheGoodOldGasMask',
        src: 'https://archive.org/embed/TheGoodOldGasMask',
        url: 'https://archive.org/details/TheGoodOldGasMask',
        thumbnail: 'https://archive.org/services/img/TheGoodOldGasMask',
        width: 640,
        height: 504,
      }

      expect(await extract(value)).toEqual(expected)
    })

    // The archive serves the file itself from whichever storage node holds the item.
    it('should read the identifier from a download url on a storage node', async () => {
      const value = html`
        <embed
          type="application/x-shockwave-flash"
          src="http://www.archive.org/flow/flowplayer.commercial-3.2.1.swf"
          flashvars='config={"playlist":[{"url":"http://ia801234.us.archive.org/download/nasa_hubble/clip.mp4"}]}'
        />
      `
      const expected: EmbedResolverResult = {
        provider: 'archive',
        id: 'nasa_hubble',
        src: 'https://archive.org/embed/nasa_hubble',
        url: 'https://archive.org/details/nasa_hubble',
        thumbnail: 'https://archive.org/services/img/nasa_hubble',
      }

      expect(await extract(value)).toEqual(expected)
    })

    // The player that predates flashvars took the same config as a query parameter.
    it('should read the config from the player query', async () => {
      const value = html`
        <embed
          src="http://www.archive.org/flow/FlowPlayerLight.swf?config=%7BplayList%3A%5B%7Burl%3A%27http%3A%2F%2Fwww.archive.org%2Fdownload%2Fmarkofzorro-1920%2Fmarkofzorro.flv%27%7D%5D%7D"
        />
      `
      const expected: EmbedResolverResult = {
        provider: 'archive',
        id: 'markofzorro-1920',
        src: 'https://archive.org/embed/markofzorro-1920',
        url: 'https://archive.org/details/markofzorro-1920',
        thumbnail: 'https://archive.org/services/img/markofzorro-1920',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    // The archive's player will play anybody's file, and somebody else's file is not an item.
    it('should ignore a config pointing at a file the archive does not host', async () => {
      const value = html`
        <embed
          src="http://www.archive.org/flow/FlowPlayerLight.swf?config=%7BplayList%3A%5B%7Burl%3A%27http%3A%2F%2Ftrailers.labutaca.net%2Fplanet-51-clip-4.flv%27%7D%5D%7D"
        />
      `

      expect(await extract(value)).toBeUndefined()
    })

    // A host that only ends in the archive's name is somebody else's host.
    it('should ignore a config whose download host merely looks like the archive', async () => {
      const value = html`
        <embed
          src="http://www.archive.org/flow/flowplayer.commercial-3.2.1.swf"
          flashvars='config={"playlist":[{"url":"http://example-archive.org/download/nasa_hubble/clip.mp4"}]}'
        />
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore a player on another host that names an archive file', async () => {
      const value = html`
        <embed
          src="http://evil.test/flow/flowplayer.commercial-3.2.1.swf"
          flashvars='config={"playlist":[{"url":"http://www.archive.org/download/nasa_hubble/clip.mp4"}]}'
        />
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore an archive url that is not the flash player', async () => {
      const value = '<embed src="https://archive.org/embed/nasa_hubble">'

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore a player carrying no config', async () => {
      const value = '<embed src="http://www.archive.org/flow/flowplayer.commercial-3.2.1.swf">'

      expect(await extract(value)).toBeUndefined()
    })

    // A base url on its own names the download endpoint rather than any item under it.
    it('should ignore a config whose only download url names no item', async () => {
      const value = html`
        <embed
          src="http://www.archive.org/flow/FlowPlayerLight.swf"
          flashvars="config={'baseURL':'http://www.archive.org/download/'}"
        />
      `

      expect(await extract(value)).toBeUndefined()
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

    const expected = html`
      <div
        data-embed-src="https://archive.org/embed/nasa_hubble"
        data-embed-provider="archive"
        data-embed-id="nasa_hubble"
        data-embed-url="https://archive.org/details/nasa_hubble"
        data-embed-thumbnail="https://archive.org/services/img/nasa_hubble"
        data-embed-width="640"
        data-embed-height="504"
      ></div>
    `

    expect(result).toEqualHtml(expected)
  })
})
