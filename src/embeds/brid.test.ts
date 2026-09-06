import { describe, expect, it } from 'bun:test'
import { transformContent } from '../index.js'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { bridEmbedResolver } from './brid.js'

const readPlaceholder = (
  result: string,
  parseHtml: (value: string) => Document,
): Record<string, string> => {
  const element = parseHtml(result).querySelector('[data-embed-src]')
  const fields: Record<string, string> = {}

  for (const name of element?.getAttributeNames() ?? []) {
    const value = element?.getAttribute(name)

    if (name.startsWith('data-embed-') && value) {
      fields[name.replace('data-embed-', '')] = value
    }
  }

  return fields
}

describeForEachParser('bridEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, bridEmbedResolver)

  describe('happy paths', () => {
    it('should read the player and the video out of the pushed config', async () => {
      const value = html`
        <div
          id="Brid_117832366813273"
          class="brid"
          style="width: 16; height: 9;"
        ></div>
        <script type="text/javascript">
          var _bp = _bp||[]; _bp.push({ "div": "Brid_117832366813273", "obj": {"id":"23442","stats":{"wp":1},"title":"FEAR%20STREET%20PART%202%201978%20%20Official%20Trailer","video":"820211","width":"16","height":"9"}});
        </script>
        <script
          type="text/javascript"
          async
          src="//services.brid.tv/player/build/brid.min.js"
        ></script>
      `
      const expected: EmbedResolverResult = {
        provider: 'brid',
        id: '820211/23442',
        src: 'https://services.brid.tv/services/iframe/video/820211/23442',
        title: 'FEAR STREET PART 2 1978  Official Trailer',
        ratio: '16/9',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should read the older call form and its pixel box', async () => {
      const value = html`
        <script
          type="text/javascript"
          src="//services.brid.tv/player/build/brid.min.js"
        ></script>
        <div
          id="Brid_19464537"
          class="brid"
          style="width: 540; height: 300;"
        ></div>
        <script type="text/javascript">
          $bp("Brid_19464537", {"id":"26602","width":"540","height":"300","video":"755958"});
        </script>
      `
      const expected: EmbedResolverResult = {
        provider: 'brid',
        id: '755958/26602',
        src: 'https://services.brid.tv/services/iframe/video/755958/26602',
        width: 540,
        height: 300,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should pick its own config out of a script that holds several', async () => {
      const value = html`
        <div
          id="Brid_2"
          class="brid"
        ></div>
        <script type="text/javascript">
          $bp("Brid_1", {"id":"26602","video":"755940"});
          $bp("Brid_2", {"id":"26602","video":"755958"});
        </script>
      `
      const expected: EmbedResolverResult = {
        provider: 'brid',
        id: '755958/26602',
        src: 'https://services.brid.tv/services/iframe/video/755958/26602',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should keep a title whose encoding is broken as written', async () => {
      const value = html`
        <div
          id="Brid_3"
          class="brid"
        ></div>
        <script type="text/javascript">
          $bp("Brid_3", {"id":"26602","title":"100%25%","video":"755958"});
        </script>
      `
      const expected: EmbedResolverResult = {
        provider: 'brid',
        id: '755958/26602',
        src: 'https://services.brid.tv/services/iframe/video/755958/26602',
        title: '100%25%',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should ignore a div with no config script beside it', async () => {
      const value = html`
        <div
          id="Brid_19464537"
          class="brid"
        ></div>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore a config that names no video', async () => {
      const value = html`
        <div
          id="Brid_19464537"
          class="brid"
        ></div>
        <script type="text/javascript">
          $bp("Brid_19464537", {"id":"26602","width":"540","height":"300"});
        </script>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })
})

describeForEachParser('brid facades through the pipeline', (parseHtml) => {
  const convert = (value: string) => {
    return transformContent(value, { parseHtmlFn: parseHtml, baseUrl: 'https://example.com/post' })
  }
  const placeholder = async (value: string) => {
    return readPlaceholder(await convert(value), parseHtml)
  }

  it('should replace the facade with the player and drop the config script it read', async () => {
    const value = html`
      <p>Before</p>
      <div
        id="Brid_19464537"
        class="brid"
        style="width: 540; height: 300;"
      ></div>
      <script type="text/javascript">
        $bp("Brid_19464537", {"id":"26602","width":"540","height":"300","video":"755958"});
      </script>
      <script
        type="text/javascript"
        src="//services.brid.tv/player/build/brid.min.js"
      ></script>
      <p>After</p>
    `
    const expected = {
      provider: 'brid',
      id: '755958/26602',
      src: 'https://services.brid.tv/services/iframe/video/755958/26602',
      width: '540',
      height: '300',
    }

    expect(await placeholder(value)).toEqual(expected)
    expect(await convert(value)).not.toContain('$bp(')
  })

  it('should keep both players when one script configures two containers', async () => {
    const value = html`
      <div
        id="Brid_111"
        class="brid"
      ></div>
      <div
        id="Brid_222"
        class="brid"
      ></div>
      <script type="text/javascript">
        $bp("Brid_111", {"id":"26602","video":"755940"});
        $bp("Brid_222", {"id":"26602","video":"755958"});
      </script>
    `
    const expected = [
      'https://services.brid.tv/services/iframe/video/755940/26602',
      'https://services.brid.tv/services/iframe/video/755958/26602',
    ]
    const sources = [...parseHtml(await convert(value)).querySelectorAll('[data-embed-src]')].map(
      (element) => element.getAttribute('data-embed-src'),
    )

    expect(sources).toEqual(expected)
  })
})
