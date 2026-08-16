import { attr } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createMarkupEmbedResolver } from '../utils/widgets.js'

// Podigee ships a generic loader script whose `data-configuration` is the player url itself,
// so the embed is recoverable without executing anything. 86 of 100 corpus feeds carry it in
// that form. The other 14 point the attribute at an inline config object (`data-configuration
// ="podigee"` or `="playerConfiguration"`), where the data lives in a script body this
// resolver deliberately does not read — those keep the generic treatment.
const podigeeHosts = ['podigee.io', 'podigee.com', 'podigee-cdn.net']

export const podigeeEmbedResolver = createMarkupEmbedResolver(
  'script.podigee-podcast-player[data-configuration]',
  (element) => {
    const configuration = attr(element, 'data-configuration')
    const parsed = parseUrlOnHosts(configuration, podigeeHosts)

    // Only a real player url counts; the inline-config spellings are not urls.
    if (!parsed || !configuration?.includes('//')) {
      return
    }

    // `{show}.podigee.io/{n}-{slug}/embed` — the show is the subdomain and the episode the
    // first path segment, which together make a stable id without parsing the query.
    const show = parsed.hostname.split('.')[0]
    const episode = parsed.pathname.split('/').find(Boolean)

    if (!show || !episode) {
      return
    }

    return {
      provider: 'podigee',
      id: `${show}/${episode}`,
      src: parsed.href,
    }
  },
)
