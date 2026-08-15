import { describe } from 'bun:test'

describe.todo('Discourse', () => {
  // discourseCiteResolver turns generic onebox cards into cites, passing through the
  // engines in omittedOneboxClasses and the social posts recognized via socialPostHosts
  // and the Mastodon status signals. discourseMediaResolver rebuilds uploaded videos from
  // their placeholder divs, and the engines that emit bare iframes are left to the
  // host-keyed embed resolvers.
})
